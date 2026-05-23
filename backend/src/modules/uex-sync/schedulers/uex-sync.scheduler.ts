import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CategoriesSyncService } from '../services/categories-sync.service';
import { CommoditiesSyncService } from '../services/commodities-sync.service';
import { ItemsSyncService } from '../services/items-sync.service';

@Injectable()
export class UEXSyncScheduler {
  constructor(
    @InjectPinoLogger(UEXSyncScheduler.name)
    private readonly logger: PinoLogger,
    private readonly categoriesSync: CategoriesSyncService,
    private readonly commoditiesSync: CommoditiesSyncService,
    private readonly itemsSync: ItemsSyncService,
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
      this.logger.info('Categories sync is disabled via configuration');
      return;
    }

    this.logger.info('Starting scheduled categories sync');

    try {
      const result = await this.categoriesSync.syncCategories();
      this.logger.info(
        `Scheduled categories sync completed successfully: ` +
          `created: ${result.created}, updated: ${result.updated}, ` +
          `deleted: ${result.deleted}, duration: ${result.durationMs}ms`,
      );
    } catch (error: unknown) {
      this.logger.error({ err: error }, 'Scheduled categories sync failed');
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
      this.logger.info('Items sync is disabled via configuration');
      return;
    }

    this.logger.info('Starting scheduled items sync');

    try {
      const result = await this.itemsSync.syncItems();
      this.logger.info(
        `Scheduled items sync completed successfully: ` +
          `created: ${result.created}, updated: ${result.updated}, ` +
          `deleted: ${result.deleted}, duration: ${result.durationMs}ms`,
      );
    } catch (error: unknown) {
      this.logger.error({ err: error }, 'Scheduled items sync failed');
    }
  }

  // Runs daily at 3:30 AM UTC (after items sync)
  @Cron('30 3 * * *', {
    name: 'sync-uex-commodities',
  })
  async scheduledCommoditiesSync(): Promise<void> {
    const syncEnabled = this.configService.get<boolean>(
      'UEX_SYNC_ENABLED',
      true,
    );
    const commoditiesSyncEnabled = this.configService.get<boolean>(
      'UEX_COMMODITIES_SYNC_ENABLED',
      true,
    );

    if (!syncEnabled || !commoditiesSyncEnabled) {
      this.logger.info('Commodities sync is disabled via configuration');
      return;
    }

    this.logger.info('Starting scheduled commodities sync');

    try {
      const result = await this.commoditiesSync.syncCommodities();
      this.logger.info(
        `Scheduled commodities sync completed successfully: ` +
          `created: ${result.created}, updated: ${result.updated}, ` +
          `deleted: ${result.deleted}, duration: ${result.durationMs}ms`,
      );
    } catch (error: unknown) {
      this.logger.error({ err: error }, 'Scheduled commodities sync failed');
    }
  }
}
