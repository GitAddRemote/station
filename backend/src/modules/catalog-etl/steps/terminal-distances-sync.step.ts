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
    // Skip guard: use station_etl_run completion status so we don't need
    // full-table timestamp rewrites on the ~500k-row distances table.
    // A run is "successfully completed this step" when status='completed',
    // steps_failed=0, and no error warning exists for this step name.
    const [row] = await this.dataSource.query<
      { last_completed: Date | null }[]
    >(
      `SELECT MAX(r.completed_at) AS last_completed
       FROM station_etl_run r
       WHERE r.status = 'completed'
         AND r.steps_failed = 0
         AND NOT EXISTS (
           SELECT 1 FROM station_etl_warning w
           WHERE w.run_id = r.run_id
             AND w.step_name = $1
             AND w.severity = 'error'
         )`,
      [this.name],
    );

    if (row?.last_completed) {
      const hoursSince =
        (Date.now() - new Date(row.last_completed).getTime()) /
        (1000 * 60 * 60);
      if (hoursSince < SKIP_HOURS) {
        this.logger.debug(
          { runId: ctx.runId, hoursSince: hoursSince.toFixed(1) },
          'terminal-distances-sync skipped: last run was within 12h',
        );
        return;
      }
    }

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
           synced_at=NOW()`,
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
        `($${base + 1}, $${base + 2}, $${base + 3}, NOW())`,
      );
      batch.push(originId, destinationId, record.distance);
      batchRowCount++;

      if (batchRowCount >= UPSERT_BATCH_SIZE) {
        await flushBatch();
      }
    }

    await flushBatch();

    this.logger.info(
      { runId: ctx.runId, total: distances.length, upserted, skipped },
      'terminal-distances-sync step complete',
    );
  }
}
