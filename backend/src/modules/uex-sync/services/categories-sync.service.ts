import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UexCategory } from '../../uex/entities/uex-category.entity';
import { UexSyncService } from '../uex-sync.service';
import { SystemUserService } from '../../users/system-user.service';
import {
  UEXCategoriesClient,
  UEXCategoryResponse,
} from '../clients/uex-categories.client';
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

@Injectable()
export class CategoriesSyncService {
  private readonly logger = new Logger(CategoriesSyncService.name);
  private readonly maxRetries: number;
  private readonly backoffBase: number;

  constructor(
    @InjectRepository(UexCategory)
    private readonly categoryRepository: Repository<UexCategory>,
    private readonly uexClient: UEXCategoriesClient,
    private readonly syncService: UexSyncService,
    private readonly systemUserService: SystemUserService,
    private readonly configService: ConfigService,
  ) {
    this.maxRetries = this.configService.get<number>('UEX_RETRY_ATTEMPTS', 3);
    this.backoffBase = this.configService.get<number>(
      'UEX_BACKOFF_BASE_MS',
      1000,
    );
  }

  async syncCategories(
    forceFull?: boolean,
  ): Promise<SyncResult & { syncMode: 'delta' | 'full' }> {
    const endpoint = 'categories';
    const startTime = Date.now();

    try {
      // Acquire sync lock
      await this.syncService.acquireSyncLock(endpoint);

      // Determine sync mode (delta vs full)
      const syncDecision = await this.syncService.shouldUseDeltaSync(endpoint);
      const useDelta = !forceFull && syncDecision.useDelta;
      const filters: any = { type: 'item' }; // MVP: only item categories

      if (useDelta && syncDecision.lastSyncAt) {
        filters.date_modified = syncDecision.lastSyncAt;
        this.logger.log(
          `Using delta sync with lastSyncAt: ${syncDecision.lastSyncAt.toISOString()}`,
        );
      } else {
        this.logger.log(`Using full sync. Reason: ${syncDecision.reason}`);
      }

      // Fetch with retry logic
      const categories = await this.fetchWithRetry(filters);

      // Process records
      const result = await this.processCategories(
        categories,
        useDelta ? 'delta' : 'full',
      );

      const durationMs = Date.now() - startTime;

      // Update sync state
      await this.syncService.recordSyncSuccess(endpoint, {
        recordsCreated: result.created,
        recordsUpdated: result.updated,
        recordsDeleted: result.deleted,
        syncMode: useDelta ? 'delta' : 'full',
        durationMs,
      });

      this.logger.log(
        `Categories sync completed: ${useDelta ? 'delta' : 'full'} mode, ` +
          `created: ${result.created}, updated: ${result.updated}, ` +
          `deleted: ${result.deleted}, duration: ${durationMs}ms`,
      );

      return { ...result, durationMs, syncMode: useDelta ? 'delta' : 'full' };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      await this.syncService.recordSyncFailure(endpoint, error, durationMs);
      throw error;
    } finally {
      await this.syncService.releaseSyncLock(endpoint);
    }
  }

  private async fetchWithRetry(filters: any): Promise<UEXCategoryResponse[]> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.uexClient.fetchCategories(filters);
      } catch (error: any) {
        lastError = error;

        // Don't retry rate limits
        if (error instanceof RateLimitException) {
          this.logger.warn('Rate limit hit, aborting sync');
          throw error;
        }

        // Retry with exponential backoff for server errors
        if (error instanceof UEXServerException) {
          if (attempt < this.maxRetries - 1) {
            const backoffMs = this.backoffBase * Math.pow(2, attempt);
            this.logger.warn(
              `Sync attempt ${attempt + 1} failed, retrying in ${backoffMs}ms: ${error.message}`,
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

  private async processCategories(
    categories: UEXCategoryResponse[],
    syncMode: 'delta' | 'full',
  ): Promise<Omit<SyncResult, 'durationMs'>> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;
    let deleted = 0;

    // Process in a transaction
    await this.categoryRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Upsert categories
        for (const category of categories) {
          const existing = await transactionalEntityManager.findOne(
            UexCategory,
            {
              where: { uexId: category.id },
            },
          );

          if (existing) {
            // Update existing category
            await transactionalEntityManager.update(
              UexCategory,
              { uexId: category.id },
              {
                type: category.type,
                section: category.section,
                name: category.name,
                isGameRelated: category.is_game_related || false,
                deleted: false, // Undelete if was previously deleted
                uexDateModified: category.date_modified
                  ? new Date(category.date_modified)
                  : undefined,
                modifiedById: systemUserId,
              },
            );
            updated++;
          } else {
            // Create new category
            await transactionalEntityManager.save(UexCategory, {
              uexId: category.id,
              type: category.type,
              section: category.section,
              name: category.name,
              isGameRelated: category.is_game_related || false,
              active: true,
              deleted: false,
              uexDateAdded: category.date_added
                ? new Date(category.date_added)
                : undefined,
              uexDateModified: category.date_modified
                ? new Date(category.date_modified)
                : undefined,
              addedById: systemUserId,
              modifiedById: systemUserId,
            });
            created++;
          }
        }

        // Mark missing categories as deleted (full sync only)
        if (syncMode === 'full' && categories.length > 0) {
          const uexIds = categories.map((c) => c.id);

          const result = await transactionalEntityManager
            .createQueryBuilder()
            .update(UexCategory)
            .set({
              deleted: true,
              active: false,
              modifiedById: systemUserId,
            })
            .where('uex_id NOT IN (:...uexIds)', { uexIds })
            .andWhere('deleted = :deleted', { deleted: false })
            .andWhere('type = :type', { type: 'item' })
            .execute();

          deleted = result.affected || 0;

          if (deleted > 0) {
            this.logger.log(`Marked ${deleted} categories as deleted`);
          }
        }
      },
    );

    return { created, updated, deleted };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
