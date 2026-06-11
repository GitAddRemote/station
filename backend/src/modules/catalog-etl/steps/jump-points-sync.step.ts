import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { v7 as uuidv7, v5 as uuidv5 } from 'uuid';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

interface UexJumpPoint {
  id: number;
  id_star_system_origin: number;
  id_star_system_destination: number;
  // UEX uses id_orbit_origin / id_orbit_destination (not entry/exit)
  id_orbit_origin: number | null;
  id_orbit_destination: number | null;
  date_added: number;
  date_modified: number;
}

// Fixed namespace for synthetic jump point UUIDs — must never change
const SYNTHETIC_JP_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function syntheticJpId(sourceUexId: number): string {
  return uuidv5(`synthetic-jp-${sourceUexId}`, SYNTHETIC_JP_NS);
}

function toDate(unixTs: number | null | undefined): Date | null {
  if (!unixTs) return null;
  return new Date(unixTs * 1000);
}

@Injectable()
export class JumpPointsSyncStep implements EtlStep {
  readonly name = 'jump-points-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(JumpPointsSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    const jumpPoints =
      await this.uexApiClient.get<UexJumpPoint[]>('/jump_points');
    this.logger.info(
      { runId: ctx.runId, count: jumpPoints.length },
      'Fetched jump points from UEX',
    );

    const [starSystemRows, orbitRows] = await Promise.all([
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_star_system`,
      ),
      this.dataSource.query<{ uex_id: number }[]>(
        `SELECT uex_id FROM station_orbit`,
      ),
    ]);

    const knownStarSystems = new Set(starSystemRows.map((r) => r.uex_id));
    const knownOrbits = new Set(orbitRows.map((r) => r.uex_id));

    for (const record of jumpPoints) {
      // Both star system FKs are NOT NULL in the schema — skip if either is unknown
      if (!knownStarSystems.has(record.id_star_system_origin)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'error',
            message: `Jump point ${record.id} references unknown origin star system ${record.id_star_system_origin} — skipped`,
            rawPayload: {
              jp_id: record.id,
              id_star_system_origin: record.id_star_system_origin,
            },
          }),
        );
        continue;
      }

      if (!knownStarSystems.has(record.id_star_system_destination)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'error',
            message: `Jump point ${record.id} references unknown destination star system ${record.id_star_system_destination} — skipped`,
            rawPayload: {
              jp_id: record.id,
              id_star_system_destination: record.id_star_system_destination,
            },
          }),
        );
        continue;
      }

      // Orbit FKs are optional; unknown values warn and null out — do NOT skip
      let orbitOriginUexId = record.id_orbit_origin ?? null;
      if (orbitOriginUexId !== null && !knownOrbits.has(orbitOriginUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Jump point ${record.id} references unknown origin orbit ${orbitOriginUexId} — stored as null`,
            rawPayload: {
              jp_id: record.id,
              missing_orbit_origin_id: orbitOriginUexId,
            },
          }),
        );
        orbitOriginUexId = null;
      }

      let orbitDestUexId = record.id_orbit_destination ?? null;
      if (orbitDestUexId !== null && !knownOrbits.has(orbitDestUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Jump point ${record.id} references unknown destination orbit ${orbitDestUexId} — stored as null`,
            rawPayload: {
              jp_id: record.id,
              missing_orbit_dest_id: orbitDestUexId,
            },
          }),
        );
        orbitDestUexId = null;
      }

      // Upsert the real row — UUIDv7 id (time-ordered, supplied by application)
      await this.dataSource.query(
        `INSERT INTO station_jump_point
           (id, uex_id, star_system_origin_uex_id, star_system_dest_uex_id,
            orbit_origin_uex_id, orbit_dest_uex_id,
            is_synthetic, source_uex_id,
            uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,FALSE,NULL,$7,$8,NOW())
         ON CONFLICT (uex_id) WHERE is_synthetic = FALSE DO UPDATE SET
           star_system_origin_uex_id=EXCLUDED.star_system_origin_uex_id,
           star_system_dest_uex_id=EXCLUDED.star_system_dest_uex_id,
           orbit_origin_uex_id=EXCLUDED.orbit_origin_uex_id,
           orbit_dest_uex_id=EXCLUDED.orbit_dest_uex_id,
           uex_date_added=EXCLUDED.uex_date_added,
           uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          uuidv7(),
          record.id,
          record.id_star_system_origin,
          record.id_star_system_destination,
          orbitOriginUexId,
          orbitDestUexId,
          toDate(record.date_added),
          toDate(record.date_modified),
        ],
      );

      // Delete any stale synthetic for this source if UEX now provides the real reverse
      await this.dataSource.query(
        `DELETE FROM station_jump_point
         WHERE is_synthetic = TRUE
           AND source_uex_id = $1
           AND star_system_origin_uex_id = $2
           AND star_system_dest_uex_id = $3`,
        [
          record.id,
          record.id_star_system_destination,
          record.id_star_system_origin,
        ],
      );

      // Only create a synthetic reverse row if no real row already covers that direction
      const [reverseCheck] = await this.dataSource.query<{ cnt: string }[]>(
        `SELECT COUNT(*) AS cnt FROM station_jump_point
         WHERE is_synthetic = FALSE
           AND star_system_origin_uex_id = $1
           AND star_system_dest_uex_id = $2`,
        [record.id_star_system_destination, record.id_star_system_origin],
      );
      if (Number(reverseCheck.cnt) > 0) {
        continue;
      }

      // Upsert synthetic reverse row — deterministic UUIDv5 so re-runs hit same row
      await this.dataSource.query(
        `INSERT INTO station_jump_point
           (id, uex_id, star_system_origin_uex_id, star_system_dest_uex_id,
            orbit_origin_uex_id, orbit_dest_uex_id,
            is_synthetic, source_uex_id,
            uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,NULL,$2,$3,$4,$5,TRUE,$6,$7,$8,NOW())
         ON CONFLICT (source_uex_id) WHERE is_synthetic = TRUE DO UPDATE SET
           star_system_origin_uex_id=EXCLUDED.star_system_origin_uex_id,
           star_system_dest_uex_id=EXCLUDED.star_system_dest_uex_id,
           orbit_origin_uex_id=EXCLUDED.orbit_origin_uex_id,
           orbit_dest_uex_id=EXCLUDED.orbit_dest_uex_id,
           uex_date_added=EXCLUDED.uex_date_added,
           uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          syntheticJpId(record.id),
          // Swap origin ↔ destination for reverse direction
          record.id_star_system_destination,
          record.id_star_system_origin,
          orbitDestUexId,
          orbitOriginUexId,
          record.id,
          toDate(record.date_added),
          toDate(record.date_modified),
        ],
      );
    }

    this.logger.info({ runId: ctx.runId }, 'jump-points-sync step complete');
  }
}
