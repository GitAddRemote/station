import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CategoriesSyncService } from '../services/categories-sync.service';
import { ItemsSyncService } from '../services/items-sync.service';
import { LocationsSyncService } from '../services/locations-sync.service';

@Injectable()
export class UEXSyncScheduler {
  private readonly logger = new Logger(UEXSyncScheduler.name);

  constructor(
    private readonly categoriesSync: CategoriesSyncService,
    private readonly itemsSync: ItemsSyncService,
    private readonly locationsSync: LocationsSyncService,
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

  // Runs daily at 3:00 AM UTC (after categories sync)
  @Cron('0 3 * * *', {
    name: 'sync-uex-items',
  })
  async scheduledItemsSync(): Promise<void> {
    const syncEnabled = this.configService.get<boolean>(
      'UEX_SYNC_ENABLED',
      true,
    );
    const itemsSyncEnabled = this.configService.get<boolean>(
      'UEX_ITEMS_SYNC_ENABLED',
      true,
    );

    if (!syncEnabled || !itemsSyncEnabled) {
      this.logger.log('Items sync is disabled via configuration');
      return;
    }

    this.logger.log('Starting scheduled items sync');

    try {
      const result = await this.itemsSync.syncItems();
      this.logger.log(
        `Scheduled items sync completed successfully: ` +
          `created: ${result.created}, updated: ${result.updated}, ` +
          `deleted: ${result.deleted}, duration: ${result.durationMs}ms`,
      );
    } catch (error: any) {
      this.logger.error(
        `Scheduled items sync failed: ${error.message}`,
        error.stack,
      );
      // Error already recorded in sync state by service
      // Add alerting here if needed
    }
  }

  // Runs daily at 4:00 AM UTC (after items sync)
  @Cron('0 4 * * *', {
    name: 'sync-uex-locations',
  })
  async scheduledLocationsSync(): Promise<void> {
    const syncEnabled = this.configService.get<boolean>(
      'UEX_SYNC_ENABLED',
      true,
    );
    const locationsSyncEnabled = this.configService.get<boolean>(
      'UEX_LOCATIONS_SYNC_ENABLED',
      true,
    );

    if (!syncEnabled || !locationsSyncEnabled) {
      this.logger.log('Locations sync is disabled via configuration');
      return;
    }

    this.logger.log('Starting scheduled locations sync');

    try {
      const result = await this.locationsSync.syncAllLocations();
      this.logger.log(
        `Scheduled locations sync completed successfully: ` +
          `total created: ${result.totalCreated}, updated: ${result.totalUpdated}, ` +
          `deleted: ${result.totalDeleted}, duration: ${result.totalDurationMs}ms`,
      );
    } catch (error: any) {
      this.logger.error(
        `Scheduled locations sync failed: ${error.message}`,
        error.stack,
      );
      // Error already recorded in sync state by service
      // Add alerting here if needed
    }
  }
}
