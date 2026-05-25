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
    // Skip guard: respect UEX 12-hour cache TTL.
    // Use MAX(synced_at) from the target table — reliable even on first deploy.
    const [row] = await this.dataSource.query<{ last_synced: Date | null }[]>(
      `SELECT MAX(synced_at) AS last_synced FROM station_terminal_distance`,
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

    // Collect valid rows, emit warnings for unresolvable codes
    const validRows: {
      originId: number;
      destinationId: number;
      distance: number;
    }[] = [];
    let skipped = 0;

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

      validRows.push({ originId, destinationId, distance: record.distance });
    }

    // Batch upsert to reduce round trips on the ~500k-row dataset
    for (let i = 0; i < validRows.length; i += UPSERT_BATCH_SIZE) {
      const batch = validRows.slice(i, i + UPSERT_BATCH_SIZE);
      const params: (number | string)[] = [];
      const valuePlaceholders = batch.map((r, idx) => {
        const base = idx * 3;
        params.push(r.originId, r.destinationId, r.distance);
        return `($${base + 1}, $${base + 2}, $${base + 3}, NOW())`;
      });

      await this.dataSource.query(
        `INSERT INTO station_terminal_distance
           (terminal_origin_id, terminal_destination_id, distance_gm, synced_at)
         VALUES ${valuePlaceholders.join(', ')}
         ON CONFLICT (terminal_origin_id, terminal_destination_id) DO UPDATE SET
           distance_gm=EXCLUDED.distance_gm,
           synced_at=NOW()`,
        params,
      );
    }

    this.logger.info(
      {
        runId: ctx.runId,
        total: distances.length,
        upserted: validRows.length,
        skipped,
      },
      'terminal-distances-sync step complete',
    );
  }
}
