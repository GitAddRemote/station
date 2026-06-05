import { Injectable, ConflictException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogEtlService } from '../catalog-etl.service';

const SKIP_HOURS = 12;

@Injectable()
export class CatalogEtlScheduler {
  constructor(
    @InjectPinoLogger(CatalogEtlScheduler.name)
    private readonly logger: PinoLogger,
    private readonly catalogEtlService: CatalogEtlService,
  ) {}

  @Cron('0 * * * *', { name: 'terminal-etl' })
  async scheduledTerminalEtl(): Promise<void> {
    this.logger.info('Starting scheduled terminal ETL');
    const skipTerminalsSync = await this.shouldSkip('terminals-sync');

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

    if (await this.shouldSkip('terminal-distances-sync')) return;

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

  private async shouldSkip(stepName: string): Promise<boolean> {
    const lastCompleted =
      await this.catalogEtlService.getLastSuccessfulStepRun(stepName);
    if (!lastCompleted) return false;
    const hoursSince =
      (Date.now() - new Date(lastCompleted).getTime()) / (1000 * 60 * 60);
    if (hoursSince < SKIP_HOURS) {
      this.logger.debug(
        { stepName, hoursSince: hoursSince.toFixed(1) },
        `${stepName} skipped: last successful run was within ${SKIP_HOURS}h`,
      );
      return true;
    }
    return false;
  }
}
