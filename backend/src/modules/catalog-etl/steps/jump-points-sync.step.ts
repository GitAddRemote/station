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
  id_orbit_entry: number | null;
  id_orbit_exit: number | null;
  name: string;
  size: string | null;
  is_available_live: number;
  date_added: number;
  date_modified: number;
}

// Fixed namespace for synthetic jump point UUIDs — must never change
const SYNTHETIC_JP_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function syntheticJpId(sourceUexId: number): string {
  return uuidv5(`synthetic-jp-${sourceUexId}`, SYNTHETIC_JP_NS);
}

const SIZE_MAP: Record<string, string> = {
  small: 'S',
  medium: 'M',
  large: 'L',
  'extra-large': 'XL',
  'xx-large': 'XXL',
  s: 'S',
  m: 'M',
  l: 'L',
  xl: 'XL',
  xxl: 'XXL',
};

function toDate(unixTs: number | null | undefined): Date | null {
  if (!unixTs) return null;
  return new Date(unixTs * 1000);
}

function mapSize(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return SIZE_MAP[raw.toLowerCase()] ?? null;
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
      if (!record.name) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: 'Jump point missing name',
            rawPayload: { id: record.id },
          }),
        );
        continue;
      }

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

      // Orbit FKs are optional; unknown values warn and null out
      const orbitEntryUexId = record.id_orbit_entry ?? null;
      if (orbitEntryUexId !== null && !knownOrbits.has(orbitEntryUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Jump point ${record.id} references unknown entry orbit ${orbitEntryUexId} — skipped`,
            rawPayload: {
              jp_id: record.id,
              missing_orbit_entry_id: orbitEntryUexId,
            },
          }),
        );
        continue;
      }

      const orbitExitUexId = record.id_orbit_exit ?? null;
      if (orbitExitUexId !== null && !knownOrbits.has(orbitExitUexId)) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Jump point ${record.id} references unknown exit orbit ${orbitExitUexId} — skipped`,
            rawPayload: {
              jp_id: record.id,
              missing_orbit_exit_id: orbitExitUexId,
            },
          }),
        );
        continue;
      }

      const size = mapSize(record.size);
      if (record.size && size === null) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Jump point ${record.id} has unknown size '${record.size}' — stored as null`,
            rawPayload: { jp_id: record.id, raw_size: record.size },
          }),
        );
      }

      // Upsert the real row — UUIDv7 id (time-ordered, supplied by application)
      await this.dataSource.query(
        `INSERT INTO station_jump_point
           (id, uex_id, star_system_origin_uex_id, star_system_dest_uex_id,
            orbit_origin_uex_id, orbit_dest_uex_id,
            name, size, is_available_live,
            is_synthetic, source_uex_id,
            uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,FALSE,NULL,$10,$11,NOW())
         ON CONFLICT (uex_id) WHERE is_synthetic = FALSE DO UPDATE SET
           star_system_origin_uex_id=EXCLUDED.star_system_origin_uex_id,
           star_system_dest_uex_id=EXCLUDED.star_system_dest_uex_id,
           orbit_origin_uex_id=EXCLUDED.orbit_origin_uex_id,
           orbit_dest_uex_id=EXCLUDED.orbit_dest_uex_id,
           name=EXCLUDED.name,
           size=EXCLUDED.size,
           is_available_live=EXCLUDED.is_available_live,
           uex_date_added=EXCLUDED.uex_date_added,
           uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          uuidv7(),
          record.id,
          record.id_star_system_origin,
          record.id_star_system_destination,
          orbitEntryUexId,
          orbitExitUexId,
          record.name,
          size,
          Boolean(record.is_available_live),
          toDate(record.date_added),
          toDate(record.date_modified),
        ],
      );

      // Upsert the synthetic reverse row — deterministic UUIDv5 so re-runs
      // hit the same row via ON CONFLICT (source_uex_id)
      await this.dataSource.query(
        `INSERT INTO station_jump_point
           (id, uex_id, star_system_origin_uex_id, star_system_dest_uex_id,
            orbit_origin_uex_id, orbit_dest_uex_id,
            name, size, is_available_live,
            is_synthetic, source_uex_id,
            uex_date_added, uex_date_modified, synced_at)
         VALUES ($1,NULL,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,$10,$11,NOW())
         ON CONFLICT (source_uex_id) WHERE is_synthetic = TRUE DO UPDATE SET
           star_system_origin_uex_id=EXCLUDED.star_system_origin_uex_id,
           star_system_dest_uex_id=EXCLUDED.star_system_dest_uex_id,
           orbit_origin_uex_id=EXCLUDED.orbit_origin_uex_id,
           orbit_dest_uex_id=EXCLUDED.orbit_dest_uex_id,
           name=EXCLUDED.name,
           size=EXCLUDED.size,
           is_available_live=EXCLUDED.is_available_live,
           uex_date_added=EXCLUDED.uex_date_added,
           uex_date_modified=EXCLUDED.uex_date_modified,
           synced_at=NOW()`,
        [
          syntheticJpId(record.id),
          // Swap origin ↔ destination for reverse direction
          record.id_star_system_destination,
          record.id_star_system_origin,
          orbitExitUexId,
          orbitEntryUexId,
          record.name,
          size,
          Boolean(record.is_available_live),
          record.id,
          toDate(record.date_added),
          toDate(record.date_modified),
        ],
      );
    }

    this.logger.info({ runId: ctx.runId }, 'jump-points-sync step complete');
  }
}
