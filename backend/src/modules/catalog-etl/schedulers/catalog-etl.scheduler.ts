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

  @Cron('0 * * * *', { name: 'terminals-sync' })
  async scheduledTerminalsSync(): Promise<void> {
    if (await this.shouldSkip('terminals-sync')) return;
    this.logger.info('Starting scheduled terminals sync');
    try {
      await this.catalogEtlService.runStep('terminals-sync');
    } catch (err: unknown) {
      if (err instanceof ConflictException) {
        this.logger.debug(
          { err },
          'Scheduled terminals sync skipped: ETL lock already held',
        );
        return;
      }
      this.logger.error({ err }, 'Scheduled terminals sync failed');
    }
  }

  // Runs 5 minutes after terminals-sync to ensure station_terminal is populated first
  @Cron('5 * * * *', { name: 'terminal-distances-sync' })
  async scheduledTerminalDistancesSync(): Promise<void> {
    if (await this.shouldSkip('terminal-distances-sync')) return;
    this.logger.info('Starting scheduled terminal distances sync');
    try {
      await this.catalogEtlService.runStep('terminal-distances-sync');
    } catch (err: unknown) {
      if (err instanceof ConflictException) {
        this.logger.debug(
          { err },
          'Scheduled terminal distances sync skipped: ETL lock already held',
        );
        return;
      }
      this.logger.error({ err }, 'Scheduled terminal distances sync failed');
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
