import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EtlStep, EtlStepContext } from '../interfaces/etl-step.interface';
import { EtlWarning } from '../entities/etl-warning.entity';
import { UexApiClient } from '../../uex-sync/clients/uex-api.client';

const SKIP_HOURS = 12;

interface UexTerminalDistance {
  id_terminal_origin: number;
  id_terminal_destination: number;
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
      '/terminal_distances',
    );
    this.logger.info(
      { runId: ctx.runId, count: distances.length },
      'Fetched terminal distances from UEX',
    );

    // Load terminal BIGINT ids indexed by uex_id for FK resolution
    const terminalRows = await this.dataSource.query<
      { uex_id: number; id: number }[]
    >(`SELECT uex_id, id FROM station_terminal`);

    const terminalByUexId = new Map(terminalRows.map((r) => [r.uex_id, r.id]));

    let skipped = 0;
    for (const record of distances) {
      const originId = terminalByUexId.get(record.id_terminal_origin) ?? null;
      if (originId === null) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Terminal distance references unknown origin terminal ${record.id_terminal_origin} — skipped`,
            rawPayload: {
              id_terminal_origin: record.id_terminal_origin,
              id_terminal_destination: record.id_terminal_destination,
            },
          }),
        );
        skipped++;
        continue;
      }

      const destinationId =
        terminalByUexId.get(record.id_terminal_destination) ?? null;
      if (destinationId === null) {
        await this.warningsRepo.save(
          this.warningsRepo.create({
            runId: ctx.runId,
            stepName: this.name,
            severity: 'warn',
            message: `Terminal distance references unknown destination terminal ${record.id_terminal_destination} — skipped`,
            rawPayload: {
              id_terminal_origin: record.id_terminal_origin,
              id_terminal_destination: record.id_terminal_destination,
            },
          }),
        );
        skipped++;
        continue;
      }

      await this.dataSource.query(
        `INSERT INTO station_terminal_distance
           (terminal_origin_id, terminal_destination_id, distance_gm, synced_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (terminal_origin_id, terminal_destination_id) DO UPDATE SET
           distance_gm=EXCLUDED.distance_gm,
           synced_at=NOW()`,
        [originId, destinationId, record.distance],
      );
    }

    this.logger.info(
      { runId: ctx.runId, total: distances.length, skipped },
      'terminal-distances-sync step complete',
    );
  }
}
