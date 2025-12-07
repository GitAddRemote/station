import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UexItem } from '../../uex/entities/uex-item.entity';
import { UexCategory } from '../../uex/entities/uex-category.entity';
import { UexCompany } from '../../uex/entities/uex-company.entity';
import { UexSyncService } from '../uex-sync.service';
import { SystemUserService } from '../../users/system-user.service';
import { UEXItemsClient, UEXItemResponse } from '../clients/uex-items.client';
import {
  RateLimitException,
  UEXServerException,
} from '../exceptions/uex-exceptions';

export interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  durationMs: number;
}

export interface CategorySyncResult {
  categoryId: number;
  categoryName: string;
  created: number;
  updated: number;
  errors: number;
}

@Injectable()
export class ItemsSyncService {
  private readonly logger = new Logger(ItemsSyncService.name);
  private readonly batchSize: number;
  private readonly concurrentCategories: number;
  private readonly maxRetries: number;
  private readonly backoffBase: number;
  private readonly rateLimitPauseMs: number;

  constructor(
    @InjectRepository(UexItem)
    private readonly itemRepository: Repository<UexItem>,
    @InjectRepository(UexCategory)
    private readonly categoryRepository: Repository<UexCategory>,
    @InjectRepository(UexCompany)
    private readonly companyRepository: Repository<UexCompany>,
    private readonly uexClient: UEXItemsClient,
    private readonly syncService: UexSyncService,
    private readonly systemUserService: SystemUserService,
    private readonly configService: ConfigService,
  ) {
    this.batchSize = this.configService.get<number>('UEX_BATCH_SIZE', 100);
    this.concurrentCategories = this.configService.get<number>(
      'UEX_CONCURRENT_CATEGORIES',
      3,
    );
    this.maxRetries = this.configService.get<number>('UEX_RETRY_ATTEMPTS', 3);
    this.backoffBase = this.configService.get<number>(
      'UEX_BACKOFF_BASE_MS',
      1000,
    );
    this.rateLimitPauseMs = this.configService.get<number>(
      'UEX_RATE_LIMIT_PAUSE_MS',
      2000,
    );
  }

  async syncItems(
    forceFull?: boolean,
  ): Promise<SyncResult & { syncMode: 'delta' | 'full' }> {
    const endpoint = 'items';
    const startTime = Date.now();

    try {
      // Acquire sync lock
      await this.syncService.acquireSyncLock(endpoint);

      // Determine sync mode (delta vs full)
      const syncDecision = await this.syncService.shouldUseDeltaSync(endpoint);
      const useDelta = !forceFull && syncDecision.useDelta;

      // Get all active item categories
      const categories = await this.categoryRepository.find({
        where: {
          deleted: false,
          active: true,
          type: 'item',
        },
        select: ['uexId', 'name'],
      });

      if (categories.length === 0) {
        this.logger.warn(
          'No active item categories found. Skipping items sync',
        );
        const durationMs = Date.now() - startTime;
        return {
          created: 0,
          updated: 0,
          deleted: 0,
          durationMs,
          syncMode: useDelta ? 'delta' : 'full',
        };
      }

      this.logger.log(
        `Starting items sync: ${useDelta ? 'delta' : 'full'} mode, ` +
          `${categories.length} categories to process`,
      );

      const companySet = await this.buildCompanySet();

      // Process categories with controlled concurrency
      const categoryResults = await this.processCategoriesInBatches(
        categories,
        useDelta ? syncDecision.lastSyncAt : undefined,
        companySet,
      );

      // Aggregate results
      const totalResult = categoryResults.reduce(
        (acc, r) => ({
          created: acc.created + r.created,
          updated: acc.updated + r.updated,
        }),
        { created: 0, updated: 0 },
      );

      let deleted = 0;

      // Mark missing items as deleted (full sync only)
      if (!useDelta) {
        deleted = await this.markMissingItemsAsDeleted();
      }

      const durationMs = Date.now() - startTime;

      // Update sync state
      await this.syncService.recordSyncSuccess(endpoint, {
        recordsCreated: totalResult.created,
        recordsUpdated: totalResult.updated,
        recordsDeleted: deleted,
        syncMode: useDelta ? 'delta' : 'full',
        durationMs,
      });

      this.logger.log(
        `Items sync completed: ${useDelta ? 'delta' : 'full'} mode, ` +
          `created: ${totalResult.created}, updated: ${totalResult.updated}, ` +
          `deleted: ${deleted}, duration: ${durationMs}ms`,
      );

      return {
        ...totalResult,
        deleted,
        durationMs,
        syncMode: useDelta ? 'delta' : 'full',
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      await this.syncService.recordSyncFailure(endpoint, error, durationMs);
      throw error;
    } finally {
      await this.syncService.releaseSyncLock(endpoint);
    }
  }

  private async processCategoriesInBatches(
    categories: Array<{ uexId: number; name: string }>,
    lastSyncAt?: Date,
    companySet?: Set<number>,
  ): Promise<CategorySyncResult[]> {
    const results: CategorySyncResult[] = [];

    // Process in chunks for controlled concurrency
    for (let i = 0; i < categories.length; i += this.concurrentCategories) {
      const chunk = categories.slice(i, i + this.concurrentCategories);

      const chunkResults = await Promise.allSettled(
        chunk.map((category) =>
          this.syncCategoryItems(category, lastSyncAt, companySet),
        ),
      );

      // Process results
      for (let j = 0; j < chunkResults.length; j++) {
        const result = chunkResults[j];
        const category = chunk[j];

        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          this.logger.error(
            `Failed to sync category ${category.name} (${category.uexId}): ${result.reason?.message || 'Unknown error'}`,
          );
          results.push({
            categoryId: category.uexId,
            categoryName: category.name,
            created: 0,
            updated: 0,
            errors: 1,
          });
        }
      }

      // Rate limiting: pause between chunks
      if (i + this.concurrentCategories < categories.length) {
        this.logger.debug(
          `Pausing for ${this.rateLimitPauseMs}ms between category batches`,
        );
        await this.sleep(this.rateLimitPauseMs);
      }
    }

    return results;
  }

  private async syncCategoryItems(
    category: { uexId: number; name: string },
    lastSyncAt?: Date,
    companySet?: Set<number>,
  ): Promise<CategorySyncResult> {
    this.logger.debug(
      `Syncing items for category: ${category.name} (${category.uexId})`,
    );

    const filters: any = {};
    if (lastSyncAt) {
      filters.date_modified = lastSyncAt;
    }

    const items = await this.fetchWithRetry(category.uexId, filters);

    if (items.length === 0) {
      this.logger.debug(
        `No items to sync for category: ${category.name} (${category.uexId})`,
      );
      return {
        categoryId: category.uexId,
        categoryName: category.name,
        created: 0,
        updated: 0,
        errors: 0,
      };
    }

    const result = await this.processItemsBatch(
      items,
      category.uexId,
      companySet,
    );

    this.logger.log(
      `Synced ${items.length} items for category ${category.name}: ` +
        `created: ${result.created}, updated: ${result.updated}`,
    );

    return {
      categoryId: category.uexId,
      categoryName: category.name,
      created: result.created,
      updated: result.updated,
      errors: 0,
    };
  }

  private async fetchWithRetry(
    categoryId: number,
    filters: any,
  ): Promise<UEXItemResponse[]> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.uexClient.fetchItemsByCategory(categoryId, filters);
      } catch (error: any) {
        lastError = error;

        // Don't retry rate limits
        if (error instanceof RateLimitException) {
          this.logger.warn('Rate limit hit, aborting category sync');
          throw error;
        }

        // Retry with exponential backoff for server errors
        if (error instanceof UEXServerException) {
          if (attempt < this.maxRetries - 1) {
            const backoffMs = this.backoffBase * Math.pow(2, attempt);
            this.logger.warn(
              `Sync attempt ${attempt + 1} failed for category ${categoryId}, ` +
                `retrying in ${backoffMs}ms: ${error.message}`,
            );
            await this.sleep(backoffMs);
            continue;
          }
        }

        // For other errors, throw immediately
        throw error;
      }
    }

    throw lastError!;
  }

  private async processItemsBatch(
    items: UEXItemResponse[],
    categoryId: number,
    companySet?: Set<number>,
  ): Promise<{ created: number; updated: number }> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;

    // Process in batches to avoid memory issues
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);

      await this.itemRepository.manager.transaction(
        async (transactionalEntityManager) => {
          for (const item of batch) {
            const existing = await transactionalEntityManager.findOne(UexItem, {
              where: { uexId: item.id },
            });

            const itemData = {
              idCategory: categoryId,
              idCompany:
                item.id_company && companySet?.has(item.id_company)
                  ? item.id_company
                  : undefined,
              name: item.name,
              section: item.section,
              categoryName: item.category,
              companyName: item.company_name,
              size: item.size,
              starCitizenUuid: item.uuid,
              weightScu:
                item.weight_scu !== undefined && item.weight_scu !== null
                  ? parseFloat(item.weight_scu.toString())
                  : undefined,
              isCommodity: item.kind === 'commodity',
              isBuyable: item.is_buyable || false,
              isSellable: item.is_sellable || false,
              deleted: false,
              uexDateModified: item.date_modified
                ? new Date(item.date_modified)
                : undefined,
              modifiedById: systemUserId,
            };

            if (existing) {
              // Update existing item
              await transactionalEntityManager.update(
                UexItem,
                { uexId: item.id },
                itemData,
              );
              updated++;
            } else {
              // Create new item
              await transactionalEntityManager.save(UexItem, {
                uexId: item.id,
                ...itemData,
                active: true,
                addedById: systemUserId,
              });
              created++;
            }
          }
        },
      );

      this.logger.debug(
        `Processed batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(items.length / this.batchSize)} ` +
          `for category ${categoryId}`,
      );
    }

    return { created, updated };
  }

  private async markMissingItemsAsDeleted(): Promise<number> {
    // Mark items as deleted if they belong to active categories
    // but weren't updated recently (last sync time)
    // This is tricky - we need to use the last sync time to determine
    // which items should be marked as deleted

    // For now, we'll skip the auto-delete functionality for items
    // since it's complex to determine which items should be deleted
    // without tracking which specific items were seen in this sync
    // This is a known limitation and can be addressed in a future iteration

    this.logger.debug(
      'Skipping auto-delete for items - not implemented in current version',
    );

    return 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async buildCompanySet(): Promise<Set<number>> {
    const companies = await this.companyRepository.find({
      select: ['uexId'],
    });

    const set = new Set<number>();
    for (const company of companies) {
      if (company.uexId !== undefined && company.uexId !== null) {
        set.add(company.uexId);
      }
    }

    return set;
  }
}
