import { Injectable, ConflictException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogEtlService } from '../catalog-etl.service';

const TERMINAL_SKIP_HOURS = 12;
const CATALOG_SKIP_HOURS = 12;

// Steps that must succeed in order before catalog promotion steps run
const CATALOG_SYNC_STEPS = ['commodities-sync', 'vehicles-sync'] as const;

// Catalog promotion steps depend on their corresponding UEX sync steps above
const CATALOG_PROMOTE_STEPS = [
  'commodities-catalog-sync',
  'vehicles-catalog-sync',
  'items-catalog-sync',
] as const;

@Injectable()
export class CatalogEtlScheduler {
  constructor(
    @InjectPinoLogger(CatalogEtlScheduler.name)
    private readonly logger: PinoLogger,
    private readonly catalogEtlService: CatalogEtlService,
  ) {}

  @Cron('0 * * * *', { name: 'terminal-etl' })
  async scheduledTerminalEtl(): Promise<void> {
    let skipTerminalsSync: boolean;
    let skipTerminalDistancesSync: boolean;

    try {
      [skipTerminalsSync, skipTerminalDistancesSync] = await Promise.all([
        this.shouldSkip('terminals-sync', TERMINAL_SKIP_HOURS),
        this.shouldSkip('terminal-distances-sync', TERMINAL_SKIP_HOURS),
      ]);
    } catch (err: unknown) {
      this.logger.error({ err }, 'terminal ETL skip guard failed');
      return;
    }

    if (skipTerminalsSync && skipTerminalDistancesSync) return;

    this.logger.info('Starting scheduled terminal ETL');

    if (!skipTerminalsSync) {
      try {
        await this.catalogEtlService.runStep('terminals-sync');
      } catch (err: unknown) {
        if (err instanceof ConflictException) {
          this.logger.debug(
            { err },
            'Scheduled terminal ETL skipped: ETL lock already held',
          );
          return;
        }
        this.logger.error(
          { err },
          'terminals-sync failed; skipping terminal-distances-sync',
        );
        return;
      }
    }

    if (skipTerminalDistancesSync) return;

    try {
      await this.catalogEtlService.runStep('terminal-distances-sync');
    } catch (err: unknown) {
      if (err instanceof ConflictException) {
        this.logger.debug(
          { err },
          'terminal-distances-sync skipped: ETL lock already held',
        );
        return;
      }
      this.logger.error({ err }, 'terminal-distances-sync failed');
    }
  }

  // Runs at 30 minutes past every 12th hour (00:30 and 12:30 UTC).
  // Offset from the terminal cron (top of the hour) to avoid lock contention.
  @Cron('30 */12 * * *', { name: 'catalog-sync-etl' })
  async scheduledCatalogSyncEtl(): Promise<void> {
    let skipFlags: boolean[];

    const allSteps = [...CATALOG_SYNC_STEPS, ...CATALOG_PROMOTE_STEPS];

    try {
      skipFlags = await Promise.all(
        allSteps.map((s) => this.shouldSkip(s, CATALOG_SKIP_HOURS)),
      );
    } catch (err: unknown) {
      this.logger.error({ err }, 'catalog sync ETL skip guard failed');
      return;
    }

    if (skipFlags.every(Boolean)) return;

    this.logger.info('Starting scheduled catalog sync ETL');

    // Run UEX sync steps first; abort the whole run if any fail so that
    // the catalog-promote steps don't operate on stale data.
    for (let i = 0; i < CATALOG_SYNC_STEPS.length; i++) {
      const stepName = CATALOG_SYNC_STEPS[i];
      if (skipFlags[i]) continue;

      try {
        await this.catalogEtlService.runStep(stepName);
      } catch (err: unknown) {
        if (err instanceof ConflictException) {
          this.logger.debug(
            { err },
            `catalog sync ETL skipped (${stepName}): ETL lock already held`,
          );
          return;
        }
        this.logger.error(
          { err, stepName },
          `${stepName} failed; aborting catalog sync ETL run`,
        );
        return;
      }
    }

    // Run catalog-promote steps; a failure in one does not block the others.
    for (let i = 0; i < CATALOG_PROMOTE_STEPS.length; i++) {
      const stepName = CATALOG_PROMOTE_STEPS[i];
      const flagIdx = CATALOG_SYNC_STEPS.length + i;
      if (skipFlags[flagIdx]) continue;

      try {
        await this.catalogEtlService.runStep(stepName);
      } catch (err: unknown) {
        if (err instanceof ConflictException) {
          this.logger.debug(
            { err },
            `catalog sync ETL skipped (${stepName}): ETL lock already held`,
          );
          return;
        }
        this.logger.error({ err, stepName }, `${stepName} failed`);
      }
    }

    this.logger.info('Scheduled catalog sync ETL complete');
  }

  private async shouldSkip(
    stepName: string,
    windowHours: number,
  ): Promise<boolean> {
    const lastCompleted =
      await this.catalogEtlService.getLastSuccessfulStepRun(stepName);
    if (!lastCompleted) return false;
    const hoursSince =
      (Date.now() - new Date(lastCompleted).getTime()) / (1000 * 60 * 60);
    if (hoursSince < windowHours) {
      this.logger.debug(
        { stepName, hoursSince: hoursSince.toFixed(1) },
        `${stepName} skipped: last successful run was within ${windowHours}h`,
      );
      return true;
    }
    return false;
  }
}
