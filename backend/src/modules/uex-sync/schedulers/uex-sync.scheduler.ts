import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CategoriesSyncService } from '../services/categories-sync.service';

@Injectable()
export class UEXSyncScheduler {
  private readonly logger = new Logger(UEXSyncScheduler.name);

  constructor(
    private readonly categoriesSync: CategoriesSyncService,
    private readonly configService: ConfigService,
  ) {}

  // Runs daily at 2:00 AM UTC
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'sync-uex-categories',
  })
  async scheduledCategoriesSync(): Promise<void> {
    const syncEnabled = this.configService.get<boolean>(
      'UEX_SYNC_ENABLED',
      true,
    );
    const categoriesSyncEnabled = this.configService.get<boolean>(
      'UEX_CATEGORIES_SYNC_ENABLED',
      true,
    );

    if (!syncEnabled || !categoriesSyncEnabled) {
      this.logger.log('Categories sync is disabled via configuration');
      return;
    }

    this.logger.log('Starting scheduled categories sync');

    try {
      const result = await this.categoriesSync.syncCategories();
      this.logger.log(
        `Scheduled categories sync completed successfully: ` +
          `created: ${result.created}, updated: ${result.updated}, ` +
          `deleted: ${result.deleted}, duration: ${result.durationMs}ms`,
      );
    } catch (error: any) {
      this.logger.error(
        `Scheduled categories sync failed: ${error.message}`,
        error.stack,
      );
      // Error already recorded in sync state by service
      // Add alerting here if needed
    }
  }
}
