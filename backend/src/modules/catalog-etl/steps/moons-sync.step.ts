import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

interface UexMoon {
  id: number;
  id_star_system: number | null;
  id_planet: number | null;
  id_orbit: number | null;
  id_faction: number | null;
  id_jurisdiction: number | null;
  name: string;
  name_origin: string | null;
  code: string | null;
  is_available: number;
  is_available_live: number;
  is_visible: number;
  is_default: number;
  date_added: number;
  date_modified: number;
}

function toDate(unixTs: number | null | undefined): Date | null {
  if (!unixTs) return null;
  return new Date(unixTs * 1000);
}

@Injectable()
export class MoonsSyncStep implements EtlStep {
  readonly name = 'moons-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(MoonsSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    const moons = await this.uexApiClient.get<UexMoon[]>('/moons');
    this.logger.info(
      { runId: ctx.runId, count: moons.length },
      'Fetched moons from UEX',
    );

    const starSystemRows = await this.dataSource.query<{ uex_id: number }[]>(
      `SELECT uex_id FROM station_star_system`,
    );
    const knownStarSystems = new Set(starSystemRows.map((r) => r.uex_id));

    const planetRows = await this.dataSource.query<{ uex_id: number }[]>(
      `SELECT uex_id FROM station_planet`,
    );
    const knownPlanets = new Set(planetRows.map((r) => r.uex_id));

    const orbitRows = await this.dataSource.query<{ uex_id: number }[]>(
      `SELECT uex_id FROM station_orbit`,
    );
    const knownOrbits = new Set(orbitRows.map((r) => r.uex_id));

    const factionRows = await this.dataSource.query<{ uex_id: number }[]>(
      `SELECT uex_id FROM station_faction`,
    );
    const knownFactions = new Set(factionRows.map((r) => r.uex_id));

    const jurisdictionRows = await this.dataSource.query<{ uex_id: number }[]>(
      `SELECT uex_id FROM station_jurisdiction`,
    );
    const knownJurisdictions = new Set(jurisdictionRows.map((r) => r.uex_id));

    for (const record of moons) {
      if (!record.name) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: 'Moon missing name',
            rawPayload: { id: record.id },
          }),
        );
        continue;
      }

      if (
        record.id_star_system === null ||
        !knownStarSystems.has(record.id_star_system)
      ) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Moon ${record.id} references unknown star system ${record.id_star_system} — skipped`,
            rawPayload: {
              moon_id: record.id,
              id_star_system: record.id_star_system,
            },
          }),
        );
        continue;
      }

      if (record.id_planet === null || !knownPlanets.has(record.id_planet)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Moon ${record.id} references unknown planet ${record.id_planet} — skipped`,
            rawPayload: { moon_id: record.id, id_planet: record.id_planet },
          }),
        );
        continue;
      }

      let orbitUexId = record.id_orbit ?? null;
      if (orbitUexId !== null && !knownOrbits.has(orbitUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Moon ${record.id} references unknown orbit ${orbitUexId} — stored as null`,
            rawPayload: { moon_id: record.id, missing_orbit_id: orbitUexId },
          }),
        );
        orbitUexId = null;
      }

      let factionUexId = record.id_faction ?? null;
      if (factionUexId !== null && !knownFactions.has(factionUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Moon ${record.id} references unknown faction ${factionUexId} — stored as null`,
            rawPayload: {
              moon_id: record.id,
              missing_faction_id: factionUexId,
            },
          }),
        );
        factionUexId = null;
      }

      let jurisdictionUexId = record.id_jurisdiction ?? null;
      if (
        jurisdictionUexId !== null &&
        !knownJurisdictions.has(jurisdictionUexId)
      ) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Moon ${record.id} references unknown jurisdiction ${jurisdictionUexId} — stored as null`,
            rawPayload: {
              moon_id: record.id,
              missing_jurisdiction_id: jurisdictionUexId,
            },
          }),
        );
        jurisdictionUexId = null;
      }

      await this.dataSource.query(
        `INSERT INTO station_moon
           (uex_id, star_system_uex_id, planet_uex_id, orbit_uex_id, faction_uex_id, jurisdiction_uex_id,
            name, name_origin, code,
            is_available, is_available_live, is_visible, is_default,
            uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
         ON CONFLICT (uex_id) DO UPDATE SET
           star_system_uex_id=EXCLUDED.star_system_uex_id,
           planet_uex_id=EXCLUDED.planet_uex_id,
           orbit_uex_id=EXCLUDED.orbit_uex_id,
           faction_uex_id=EXCLUDED.faction_uex_id,
           jurisdiction_uex_id=EXCLUDED.jurisdiction_uex_id,
           name=EXCLUDED.name,
           name_origin=EXCLUDED.name_origin,
           code=EXCLUDED.code,
           is_available=EXCLUDED.is_available,
           is_available_live=EXCLUDED.is_available_live,
           is_visible=EXCLUDED.is_visible,
           is_default=EXCLUDED.is_default,
           uex_date_added=EXCLUDED.uex_date_added,
           uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          record.id,
          record.id_star_system,
          record.id_planet,
          orbitUexId,
          factionUexId,
          jurisdictionUexId,
          record.name,
          record.name_origin ?? null,
          record.code ?? null,
          Boolean(record.is_available),
          Boolean(record.is_available_live),
          Boolean(record.is_visible),
          Boolean(record.is_default),
          toDate(record.date_added),
          toDate(record.date_modified),
        ],
      );
    }

    this.logger.info({ runId: ctx.runId }, 'moons-sync step complete');
  }
}
