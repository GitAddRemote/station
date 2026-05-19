import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  seenUexIds: number[];
}

@Injectable()
export class ItemsSyncService {
  private readonly batchSize: number;
  private readonly concurrentCategories: number;
  private readonly maxRetries: number;
  private readonly backoffBase: number;
  private readonly rateLimitPauseMs: number;

  constructor(
    @InjectPinoLogger(ItemsSyncService.name)
    private readonly logger: PinoLogger,
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
      10,
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
      await this.syncService.acquireSyncLock(endpoint);

      const syncDecision = await this.syncService.shouldUseDeltaSync(endpoint);
      const useDelta = !forceFull && syncDecision.useDelta;

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

      this.logger.info(
        `Starting items sync: ${useDelta ? 'delta' : 'full'} mode, ` +
          `${categories.length} categories to process`,
      );

      const companySet = await this.buildCompanySet();

      const categoryResults = await this.processCategoriesInBatches(
        categories,
        useDelta ? syncDecision.lastSyncAt : undefined,
        companySet,
      );

      const totalResult = categoryResults.reduce(
        (acc, r) => ({
          created: acc.created + r.created,
          updated: acc.updated + r.updated,
        }),
        { created: 0, updated: 0 },
      );

      let deleted = 0;

      if (!useDelta) {
        const failedCategories = categoryResults.filter((r) => r.errors > 0);
        if (failedCategories.length > 0) {
          throw new Error(
            `Full sync incomplete: ${failedCategories.length} categor${failedCategories.length === 1 ? 'y' : 'ies'} failed to sync ` +
              `(${failedCategories.map((r) => r.categoryName).join(', ')}). ` +
              'Soft-delete skipped to avoid data loss. Sync recorded as failed so the next run retries a full sync.',
          );
        }

        const seenUexIds = new Set<number>(
          categoryResults.flatMap((r) => r.seenUexIds),
        );
        deleted = await this.markMissingItemsAsDeleted(seenUexIds);
      }

      const durationMs = Date.now() - startTime;
      const syncMode = useDelta ? 'delta' : 'full';

      await this.syncService.recordSyncSuccess(endpoint, {
        recordsCreated: totalResult.created,
        recordsUpdated: totalResult.updated,
        recordsDeleted: deleted,
        syncMode,
        durationMs,
      });

      this.logger.info(
        `Items sync completed: ${syncMode} mode, ` +
          `created: ${totalResult.created}, updated: ${totalResult.updated}, ` +
          `deleted: ${deleted}, duration: ${durationMs}ms`,
      );

      return {
        ...totalResult,
        deleted,
        durationMs,
        syncMode,
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;
      const syncError =
        error instanceof Error ? error : new Error(String(error));
      await this.syncService.recordSyncFailure(endpoint, syncError, durationMs);
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

    for (let i = 0; i < categories.length; i += this.concurrentCategories) {
      const chunk = categories.slice(i, i + this.concurrentCategories);

      const chunkResults = await Promise.allSettled(
        chunk.map((category) =>
          this.syncCategoryItems(category, lastSyncAt, companySet),
        ),
      );

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
            seenUexIds: [],
          });
        }
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

    const filters: Record<string, Date | string | number> = {};
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
        seenUexIds: [],
      };
    }

    const result = await this.processItemsBatch(
      items,
      category.uexId,
      companySet,
    );

    this.logger.info(
      `Synced ${items.length} items for category ${category.name}: ` +
        `created: ${result.created}, updated: ${result.updated}`,
    );

    return {
      categoryId: category.uexId,
      categoryName: category.name,
      created: result.created,
      updated: result.updated,
      errors: 0,
      seenUexIds: items.map((i) => i.id),
    };
  }

  private async fetchWithRetry(
    categoryId: number,
    filters: Record<string, Date | string | number>,
  ): Promise<UEXItemResponse[]> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.uexClient.fetchItemsByCategory(categoryId, filters);
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof RateLimitException) {
          this.logger.warn(
            `Rate limit hit for category ${categoryId}, pausing ${this.rateLimitPauseMs}ms`,
          );
          await this.sleep(this.rateLimitPauseMs);
          continue;
        }

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

    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);

      const rows = batch.map((item) => {
        if (item.id_category != null && item.id_category !== categoryId) {
          this.logger.warn(
            `Item ${item.id} (${item.name}) returned under category ${categoryId} ` +
              `but reports id_category=${item.id_category} — using API field`,
          );
        }

        return {
          uexId: item.id,
          idCategory: item.id_category ?? categoryId,
          idCompany:
            item.id_company && companySet?.has(item.id_company)
              ? item.id_company
              : undefined,
          name: item.name,
          section: item.section ?? undefined,
          categoryName: item.category ?? undefined,
          companyName: item.company_name ?? undefined,
          size: item.size ?? undefined,
          starCitizenUuid: item.uuid ?? undefined,
          weightScu:
            item.weight_scu != null
              ? parseFloat(item.weight_scu.toString())
              : undefined,
          isCommodity: item.kind === 'commodity',
          isBuyable: item.is_buyable ?? false,
          isSellable: item.is_sellable ?? false,
          active: true,
          deleted: false,
          uexDateModified: item.date_modified
            ? new Date(item.date_modified)
            : undefined,
          addedById: systemUserId,
          modifiedById: systemUserId,
        };
      });

      // Pre-load which uexIds already exist so we can accurately split
      // created vs updated after the upsert (ON CONFLICT RETURNING returns
      // identifiers for both inserted and updated rows in PostgreSQL).
      const batchUexIds = batch.map((item) => item.id);
      const existing = await this.itemRepository
        .createQueryBuilder('item')
        .select('item.uexId')
        .where('item.uexId IN (:...ids)', { ids: batchUexIds })
        .getMany();
      const existingUexIds = new Set(existing.map((e) => e.uexId));

      await this.itemRepository
        .createQueryBuilder()
        .insert()
        .into(UexItem)
        .values(rows)
        .orUpdate(
          [
            'id_category',
            'id_company',
            'name',
            'section',
            'category',
            'company_name',
            'size',
            'star_citizen_uuid',
            'weight_scu',
            'is_commodity',
            'is_buyable',
            'is_sellable',
            'active',
            'deleted',
            'uex_date_modified',
            'modified_by',
          ],
          ['uex_id'],
        )
        .execute();

      const batchCreated = batchUexIds.filter(
        (id) => !existingUexIds.has(id),
      ).length;
      created += batchCreated;
      updated += batch.length - batchCreated;

      this.logger.debug(
        `Bulk upserted batch ${Math.floor(i / this.batchSize) + 1}/` +
          `${Math.ceil(items.length / this.batchSize)} for category ${categoryId}`,
      );
    }

    return { created, updated };
  }

  private async markMissingItemsAsDeleted(
    seenUexIds: Set<number>,
  ): Promise<number> {
    if (seenUexIds.size === 0) {
      this.logger.debug(
        'No items seen in full sync — skipping soft-delete to avoid wiping all data',
      );
      return 0;
    }

    const systemUserId = this.systemUserService.getSystemUserId();
    const ids = [...seenUexIds];

    const result = await this.itemRepository
      .createQueryBuilder()
      .update(UexItem)
      .set({ deleted: true, active: false, modifiedById: systemUserId })
      .where('uex_id NOT IN (:...ids)', { ids })
      .andWhere('deleted = :deleted', { deleted: false })
      .execute();

    const deleted = result.affected ?? 0;

    if (deleted > 0) {
      this.logger.info(`Marked ${deleted} stale items as deleted`);
    }

    return deleted;
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
      if (company.uexId != null) {
        set.add(company.uexId);
      }
    }

    return set;
  }
}
