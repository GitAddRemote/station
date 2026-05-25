import { Injectable, ConflictException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CatalogEtlService } from '../catalog-etl.service';

@Injectable()
export class CatalogEtlScheduler {
  constructor(
    @InjectPinoLogger(CatalogEtlScheduler.name)
    private readonly logger: PinoLogger,
    private readonly catalogEtlService: CatalogEtlService,
  ) {}

  @Cron('0 * * * *', { name: 'terminals-sync' })
  async scheduledTerminalsSync(): Promise<void> {
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
}
