import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

interface UexPlanet {
  id: number;
  id_star_system: number | null;
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
  is_lagrange: number;
  date_added: number;
  date_modified: number;
}

function toDate(unixTs: number | null | undefined): Date | null {
  if (!unixTs) return null;
  return new Date(unixTs * 1000);
}

@Injectable()
export class PlanetsSyncStep implements EtlStep {
  readonly name = 'planets-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(PlanetsSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    const planets = await this.uexApiClient.get<UexPlanet[]>('/planets');
    this.logger.info(
      { runId: ctx.runId, count: planets.length },
      'Fetched planets from UEX',
    );

    const starSystemRows = await this.dataSource.query<{ uex_id: number }[]>(
      `SELECT uex_id FROM station_star_system`,
    );
    const knownStarSystems = new Set(starSystemRows.map((r) => r.uex_id));

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

    for (const record of planets) {
      if (!record.name) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: 'Planet missing name',
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
            message: `Planet ${record.id} references unknown star system ${record.id_star_system} — skipped`,
            rawPayload: {
              planet_id: record.id,
              id_star_system: record.id_star_system,
            },
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
            message: `Planet ${record.id} references unknown orbit ${orbitUexId} — stored as null`,
            rawPayload: { planet_id: record.id, missing_orbit_id: orbitUexId },
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
            message: `Planet ${record.id} references unknown faction ${factionUexId} — stored as null`,
            rawPayload: {
              planet_id: record.id,
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
            message: `Planet ${record.id} references unknown jurisdiction ${jurisdictionUexId} — stored as null`,
            rawPayload: {
              planet_id: record.id,
              missing_jurisdiction_id: jurisdictionUexId,
            },
          }),
        );
        jurisdictionUexId = null;
      }

      await this.dataSource.query(
        `INSERT INTO station_planet
           (uex_id, star_system_uex_id, orbit_uex_id, faction_uex_id, jurisdiction_uex_id,
            name, name_origin, code,
            is_available, is_available_live, is_visible, is_default, is_lagrange,
            uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
         ON CONFLICT (uex_id) DO UPDATE SET
           star_system_uex_id=EXCLUDED.star_system_uex_id,
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
           is_lagrange=EXCLUDED.is_lagrange,
           uex_date_added=EXCLUDED.uex_date_added,
           uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          record.id,
          record.id_star_system,
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
          Boolean(record.is_lagrange),
          toDate(record.date_added),
          toDate(record.date_modified),
        ],
      );
    }

    this.logger.info({ runId: ctx.runId }, 'planets-sync step complete');
  }
}
