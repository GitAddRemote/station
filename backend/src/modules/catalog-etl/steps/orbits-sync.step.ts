import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

interface UexOrbit {
  id: number;
  id_star_system: number | null;
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
  is_man_made: number;
  is_asteroid: number;
  is_planet: number;
  is_star: number;
  is_jump_point: number;
  date_added: number;
  date_modified: number;
}

interface UexOrbitDistance {
  id: number;
  id_star_system_origin: number | null;
  id_star_system_destination: number | null;
  id_orbit_origin: number;
  id_orbit_destination: number;
  distance_gm: number;
  game_version: string | null;
  date_added: number;
  date_modified: number;
}

function toDate(unixTs: number | null | undefined): Date | null {
  if (!unixTs) return null;
  return new Date(unixTs * 1000);
}

@Injectable()
export class OrbitsSyncStep implements EtlStep {
  readonly name = 'orbits-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(OrbitsSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    await this.syncOrbits(ctx);
    await this.syncOrbitDistances(ctx);
    this.logger.info({ runId: ctx.runId }, 'orbits-sync step complete');
  }

  private async syncOrbits(ctx: EtlStepContext): Promise<void> {
    const orbits = await this.uexApiClient.get<UexOrbit[]>('/orbits');
    this.logger.info(
      { runId: ctx.runId, count: orbits.length },
      'Fetched orbits from UEX',
    );

    // Build set of known star system uex_ids from DB for FK validation
    const ssRows = await this.dataSource.query<{ uex_id: number }[]>(
      `SELECT uex_id FROM station_star_system`,
    );
    const knownStarSystems = new Set(ssRows.map((r) => r.uex_id));

    if (knownStarSystems.size === 0) {
      const warning = this.warningsRepo.create({
        runId: ctx.runId,
        stepName: this.name,
        severity: 'warn',
        message:
          'station_star_system is empty — all orbits will be skipped. ' +
          'Ensure star-systems-sync runs before orbits-sync.',
        rawPayload: {},
      });
      await this.warningsRepo.save(warning);
    }

    const factionRows = await this.dataSource.query<{ uex_id: number }[]>(
      `SELECT uex_id FROM station_faction`,
    );
    const knownFactions = new Set(factionRows.map((r) => r.uex_id));

    const jurisdictionRows = await this.dataSource.query<{ uex_id: number }[]>(
      `SELECT uex_id FROM station_jurisdiction`,
    );
    const knownJurisdictions = new Set(jurisdictionRows.map((r) => r.uex_id));

    for (const record of orbits) {
      if (!record.name) {
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message: 'Orbit missing name',
          rawPayload: { id: record.id },
        });
        await this.warningsRepo.save(warning);
        continue;
      }

      if (
        record.id_star_system === null ||
        !knownStarSystems.has(record.id_star_system)
      ) {
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message: `Orbit ${record.id} references unknown star system ${record.id_star_system} — skipped`,
          rawPayload: {
            orbit_id: record.id,
            id_star_system: record.id_star_system,
          },
        });
        await this.warningsRepo.save(warning);
        continue;
      }

      let factionUexId = record.id_faction ?? null;
      if (factionUexId !== null && !knownFactions.has(factionUexId)) {
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message: `Orbit ${record.id} references unknown faction ${factionUexId} — stored as null`,
          rawPayload: { orbit_id: record.id, missing_faction_id: factionUexId },
        });
        await this.warningsRepo.save(warning);
        factionUexId = null;
      }

      let jurisdictionUexId = record.id_jurisdiction ?? null;
      if (
        jurisdictionUexId !== null &&
        !knownJurisdictions.has(jurisdictionUexId)
      ) {
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message: `Orbit ${record.id} references unknown jurisdiction ${jurisdictionUexId} — stored as null`,
          rawPayload: {
            orbit_id: record.id,
            missing_jurisdiction_id: jurisdictionUexId,
          },
        });
        await this.warningsRepo.save(warning);
        jurisdictionUexId = null;
      }

      await this.dataSource.query(
        `INSERT INTO station_orbit
           (uex_id, star_system_uex_id, faction_uex_id, jurisdiction_uex_id,
            name, name_origin, code,
            is_available, is_available_live, is_visible, is_default,
            is_lagrange, is_man_made, is_asteroid, is_planet, is_star, is_jump_point,
            uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW())
         ON CONFLICT (uex_id) DO UPDATE SET
           star_system_uex_id=EXCLUDED.star_system_uex_id,
           faction_uex_id=EXCLUDED.faction_uex_id,
           jurisdiction_uex_id=EXCLUDED.jurisdiction_uex_id,
           name=EXCLUDED.name, name_origin=EXCLUDED.name_origin, code=EXCLUDED.code,
           is_available=EXCLUDED.is_available,
           is_available_live=EXCLUDED.is_available_live,
           is_visible=EXCLUDED.is_visible,
           is_default=EXCLUDED.is_default,
           is_lagrange=EXCLUDED.is_lagrange,
           is_man_made=EXCLUDED.is_man_made,
           is_asteroid=EXCLUDED.is_asteroid,
           is_planet=EXCLUDED.is_planet,
           is_star=EXCLUDED.is_star,
           is_jump_point=EXCLUDED.is_jump_point,
           uex_date_added=EXCLUDED.uex_date_added,
           uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          record.id,
          record.id_star_system,
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
          Boolean(record.is_man_made),
          Boolean(record.is_asteroid),
          Boolean(record.is_planet),
          Boolean(record.is_star),
          Boolean(record.is_jump_point),
          toDate(record.date_added),
          toDate(record.date_modified),
        ],
      );
    }
  }

  private async syncOrbitDistances(ctx: EtlStepContext): Promise<void> {
    const distances =
      await this.uexApiClient.get<UexOrbitDistance[]>('/orbit_distances');
    this.logger.info(
      { runId: ctx.runId, count: distances.length },
      'Fetched orbit distances from UEX',
    );

    const orbitRows = await this.dataSource.query<{ uex_id: number }[]>(
      `SELECT uex_id FROM station_orbit`,
    );
    const knownOrbits = new Set(orbitRows.map((r) => r.uex_id));

    const ssRows = await this.dataSource.query<{ uex_id: number }[]>(
      `SELECT uex_id FROM station_star_system`,
    );
    const knownStarSystems = new Set(ssRows.map((r) => r.uex_id));

    for (const record of distances) {
      if (
        !knownOrbits.has(record.id_orbit_origin) ||
        !knownOrbits.has(record.id_orbit_destination)
      ) {
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message:
            `Orbit distance ${record.id} references unknown orbit(s) ` +
            `(origin=${record.id_orbit_origin}, dest=${record.id_orbit_destination}) — skipped`,
          rawPayload: {
            id: record.id,
            id_orbit_origin: record.id_orbit_origin,
            id_orbit_destination: record.id_orbit_destination,
          },
        });
        await this.warningsRepo.save(warning);
        continue;
      }

      let starSystemOriginUexId = record.id_star_system_origin ?? null;
      if (
        starSystemOriginUexId !== null &&
        !knownStarSystems.has(starSystemOriginUexId)
      ) {
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message: `Orbit distance ${record.id} references unknown origin star system ${starSystemOriginUexId} — stored as null`,
          rawPayload: {
            id: record.id,
            missing_star_system_origin_id: starSystemOriginUexId,
          },
        });
        await this.warningsRepo.save(warning);
        starSystemOriginUexId = null;
      }

      let starSystemDestUexId = record.id_star_system_destination ?? null;
      if (
        starSystemDestUexId !== null &&
        !knownStarSystems.has(starSystemDestUexId)
      ) {
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message: `Orbit distance ${record.id} references unknown destination star system ${starSystemDestUexId} — stored as null`,
          rawPayload: {
            id: record.id,
            missing_star_system_dest_id: starSystemDestUexId,
          },
        });
        await this.warningsRepo.save(warning);
        starSystemDestUexId = null;
      }

      await this.dataSource.query(
        `INSERT INTO station_orbit_distance
           (uex_id, star_system_origin_uex_id, star_system_dest_uex_id,
            orbit_origin_uex_id, orbit_dest_uex_id,
            distance_gm, game_version, uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT (orbit_origin_uex_id, orbit_dest_uex_id) DO UPDATE SET
           star_system_origin_uex_id=EXCLUDED.star_system_origin_uex_id,
           star_system_dest_uex_id=EXCLUDED.star_system_dest_uex_id,
           distance_gm=EXCLUDED.distance_gm,
           game_version=EXCLUDED.game_version,
           uex_date_added=EXCLUDED.uex_date_added,
           uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          record.id,
          starSystemOriginUexId,
          starSystemDestUexId,
          record.id_orbit_origin,
          record.id_orbit_destination,
          record.distance_gm,
          record.game_version ?? null,
          toDate(record.date_added),
          toDate(record.date_modified),
        ],
      );
    }
  }
}
