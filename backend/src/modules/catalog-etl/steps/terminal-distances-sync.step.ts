import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

const SKIP_HOURS = 12;
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
    // Skip guard: MAX(synced_at) is only advanced by the final UPDATE at the
    // end of a successful run — batch INSERTs write epoch so a mid-run failure
    // never causes the next scheduled run to skip.
    const [row] = await this.dataSource.query<{ last_synced: Date | null }[]>(
      `SELECT MAX(synced_at) AS last_synced FROM station_terminal_distance
       WHERE synced_at > 'epoch'`,
    );

    if (row?.last_synced) {
      const hoursSince =
        (Date.now() - new Date(row.last_synced).getTime()) / (1000 * 60 * 60);
      if (hoursSince < SKIP_HOURS) {
        this.logger.debug(
          { runId: ctx.runId, hoursSince: hoursSince.toFixed(1) },
          'terminal-distances-sync skipped: last run was within 12h',
        );
        return;
      }
    }

    // Reset all existing rows to epoch before the load so that a mid-run
    // failure leaves the table fully at epoch — MAX(synced_at) returns NULL
    // and the next scheduled run retries rather than skipping.
    await this.dataSource.query(
      `UPDATE station_terminal_distance SET synced_at = 'epoch'`,
    );

    const distances = await this.uexApiClient.get<UexTerminalDistance[]>(
      '/terminals_distances',
    );
    this.logger.info(
      { runId: ctx.runId, count: distances.length },
      'Fetched terminal distances from UEX',
    );

    // Load terminal ids indexed by code for FK resolution
    const terminalRows = await this.dataSource.query<
      { code: string; id: number }[]
    >(`SELECT code, id FROM station_terminal`);

    const terminalByCode = new Map(terminalRows.map((r) => [r.code, r.id]));

    // Stream records in batches to bound peak memory usage
    let batch: (number | string)[] = [];
    let valuePlaceholders: string[] = [];
    let batchRowCount = 0;
    let upserted = 0;
    let skipped = 0;

    const flushBatch = async () => {
      if (batchRowCount === 0) return;
      await this.dataSource.query(
        `INSERT INTO station_terminal_distance
           (terminal_origin_id, terminal_destination_id, distance_gm, synced_at)
         VALUES ${valuePlaceholders.join(', ')}
         ON CONFLICT (terminal_origin_id, terminal_destination_id) DO UPDATE SET
           distance_gm=EXCLUDED.distance_gm,
           synced_at='epoch'`,
        batch,
      );
      upserted += batchRowCount;
      batch = [];
      valuePlaceholders = [];
      batchRowCount = 0;
    };

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
        skipped++;
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
        skipped++;
        continue;
      }

      const base = batchRowCount * 3;
      valuePlaceholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, 'epoch')`,
      );
      batch.push(originId, destinationId, record.distance);
      batchRowCount++;

      if (batchRowCount >= UPSERT_BATCH_SIZE) {
        await flushBatch();
      }
    }

    await flushBatch();

    // Advance synced_at only after the full load completes so the skip guard
    // never fires on a partially updated table.
    await this.dataSource.query(
      `UPDATE station_terminal_distance SET synced_at = NOW()`,
    );

    this.logger.info(
      { runId: ctx.runId, total: distances.length, upserted, skipped },
      'terminal-distances-sync step complete',
    );
  }
}
