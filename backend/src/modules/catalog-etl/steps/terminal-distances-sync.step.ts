import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';
import { UEXClientException } from '../../uex-sync/exceptions/uex-exceptions';

const UPSERT_BATCH_SIZE = 500;

interface UexTerminalDistance {
  terminal_code_origin: string;
  terminal_code_destination: string;
  distance: number;
}

@Injectable()
export class TerminalDistancesSyncStep implements EtlStep {
  readonly name = 'terminal-distances-sync';

  constructor(
    private readonly uexApiClient: UexApiClient,
    private readonly dataSource: DataSource,
    @InjectRepository(EtlWarning)
    private readonly warningsRepo: Repository<EtlWarning>,
    @InjectPinoLogger(TerminalDistancesSyncStep.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(ctx: EtlStepContext): Promise<void> {
    let distances: UexTerminalDistance[];
    try {
      distances = await this.uexApiClient.get<UexTerminalDistance[]>(
        '/terminals_distances',
      );
    } catch (err) {
      if (err instanceof UEXClientException) {
        // UEX /terminals_distances bulk endpoint is unavailable (requires per-terminal
        // query params that are not yet implemented). Record a visible ETL warning so
        // the run is not silently marked successful and the skip guard fires correctly.
        const warning = this.warningsRepo.create({
          runId: ctx.runId,
          stepName: this.name,
          severity: 'warn',
          message:
            'terminal-distances-sync skipped: UEX /terminals_distances bulk endpoint unavailable (HTTP 4xx). ' +
            'Per-terminal fetch strategy is not yet implemented. ' +
            'Existing rows are preserved; no stale-delete performed this run.',
          rawPayload: {
            error: err instanceof Error ? err.message : String(err),
          },
        });
        await this.warningsRepo.save(warning);
        this.logger.warn(
          { runId: ctx.runId },
          'terminal-distances-sync skipped: UEX bulk endpoint unavailable',
        );
        return;
      }
      throw err;
    }

    this.logger.info(
      { runId: ctx.runId, count: distances.length },
      'Fetched terminal distances from UEX',
    );

    // Load terminal ids indexed by code for FK resolution.
    const terminalRows = await this.dataSource.query<
      { code: string; id: number }[]
    >(`SELECT code, id FROM station_terminal`);

    const terminalByCode = new Map(terminalRows.map((r) => [r.code, r.id]));

    // First pass: validate all records and build the set of (origin_id, dest_id)
    // pairs that UEX considers current. We need this set before writing so we can
    // issue an accurate DELETE for stale rows after the upsert completes.
    const validPairs: {
      originId: number;
      destinationId: number;
      distance: number;
    }[] = [];

    for (const record of distances) {
      const originId = terminalByCode.get(record.terminal_code_origin) ?? null;
      if (originId === null) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Terminal distance references unknown origin terminal code '${record.terminal_code_origin}' — skipped`,
            rawPayload: {
              terminal_code_origin: record.terminal_code_origin,
              terminal_code_destination: record.terminal_code_destination,
            },
          }),
        );
        continue;
      }

      const destinationId =
        terminalByCode.get(record.terminal_code_destination) ?? null;
      if (destinationId === null) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Terminal distance references unknown destination terminal code '${record.terminal_code_destination}' — skipped`,
            rawPayload: {
              terminal_code_origin: record.terminal_code_origin,
              terminal_code_destination: record.terminal_code_destination,
            },
          }),
        );
        continue;
      }

      validPairs.push({ originId, destinationId, distance: record.distance });
    }

    // Second pass: upsert valid pairs in batches.
    let batch: (number | string)[] = [];
    let valuePlaceholders: string[] = [];
    let batchRowCount = 0;
    let upserted = 0;

    const flushBatch = async () => {
      if (batchRowCount === 0) return;
      await this.dataSource.query(
        `INSERT INTO station_terminal_distance
           (terminal_origin_id, terminal_destination_id, distance_gm, synced_at)
         VALUES ${valuePlaceholders.join(', ')}
         ON CONFLICT (terminal_origin_id, terminal_destination_id) DO UPDATE SET
           distance_gm=EXCLUDED.distance_gm,
           synced_at=NOW()`,
        batch,
      );
      upserted += batchRowCount;
      batch = [];
      valuePlaceholders = [];
      batchRowCount = 0;
    };

    for (const { originId, destinationId, distance } of validPairs) {
      const base = batchRowCount * 3;
      valuePlaceholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, NOW())`,
      );
      batch.push(originId, destinationId, distance);
      batchRowCount++;

      if (batchRowCount >= UPSERT_BATCH_SIZE) {
        await flushBatch();
      }
    }
    await flushBatch();

    // Third pass: delete stale rows — any (origin_id, dest_id) pair that existed
    // before this run but is absent from the current UEX payload. We build a
    // temporary set of current pair ids and delete everything outside it.
    //
    // Because station_terminal_distance can be large we use a NOT EXISTS
    // anti-join against a VALUES list rather than loading all existing rows
    // into application memory. For very large datasets (>10k rows) this query
    // is efficient thanks to the composite unique index.
    let deleted = 0;
    if (validPairs.length > 0) {
      // Build the current pair set as a VALUES list for the anti-join.
      // Each pair is (origin_id::bigint, dest_id::bigint).
      const pairParams: number[] = [];
      const pairPlaceholders: string[] = [];
      for (let i = 0; i < validPairs.length; i++) {
        const base = i * 2;
        pairPlaceholders.push(`($${base + 1}::bigint, $${base + 2}::bigint)`);
        pairParams.push(validPairs[i].originId, validPairs[i].destinationId);
      }

      const deleteResult = await this.dataSource.query<{ count: string }[]>(
        `WITH current_pairs (o, d) AS (
           VALUES ${pairPlaceholders.join(', ')}
         )
         DELETE FROM station_terminal_distance
         WHERE NOT EXISTS (
           SELECT 1 FROM current_pairs
           WHERE current_pairs.o = station_terminal_distance.terminal_origin_id
             AND current_pairs.d = station_terminal_distance.terminal_destination_id
         )
         RETURNING 1`,
        pairParams,
      );
      deleted = deleteResult.length;
    } else {
      // UEX returned a non-empty payload (we got past the fetch) but every record
      // had an unknown terminal code, so validPairs is empty. We do NOT delete all
      // existing rows in this case — that would be catastrophically wrong. Instead
      // emit a warning so the operator can investigate.
      const skipped = distances.length;
      if (skipped > 0) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message:
              `terminal-distances-sync: all ${skipped} records from UEX had unknown terminal codes — ` +
              'stale-row deletion skipped to prevent data loss. Investigate terminal code mapping.',
            rawPayload: { total_from_uex: skipped },
          }),
        );
      }
    }

    this.logger.info(
      {
        runId: ctx.runId,
        total: distances.length,
        upserted,
        skipped: distances.length - validPairs.length,
        deleted,
      },
      'terminal-distances-sync step complete',
    );
  }
}
