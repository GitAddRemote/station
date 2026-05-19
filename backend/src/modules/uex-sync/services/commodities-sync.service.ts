import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UexCommodity } from '../../uex/entities/uex-commodity.entity';
import { UexSyncService } from '../uex-sync.service';
import { SystemUserService } from '../../users/system-user.service';
import {
  UEXCommoditiesClient,
  UEXCommodityResponse,
} from '../clients/uex-commodities.client';
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
export class CommoditiesSyncService {
  private readonly batchSize: number;
  private readonly maxRetries: number;
  private readonly backoffBase: number;

  constructor(
    @InjectPinoLogger(CommoditiesSyncService.name)
    private readonly logger: PinoLogger,
    @InjectRepository(UexCommodity)
    private readonly commodityRepository: Repository<UexCommodity>,
    private readonly uexClient: UEXCommoditiesClient,
    private readonly syncService: UexSyncService,
    private readonly systemUserService: SystemUserService,
    private readonly configService: ConfigService,
  ) {
    this.batchSize = this.configService.get<number>('UEX_BATCH_SIZE', 100);
    this.maxRetries = Math.max(
      1,
      this.configService.get<number>('UEX_RETRY_ATTEMPTS', 3),
    );
    this.backoffBase = this.configService.get<number>(
      'UEX_BACKOFF_BASE_MS',
      1000,
    );
  }

  async syncCommodities(
    forceFull?: boolean,
  ): Promise<SyncResult & { syncMode: 'delta' | 'full' }> {
    const endpoint = 'commodities';
    const startTime = Date.now();

    try {
      await this.syncService.acquireSyncLock(endpoint);

      const syncDecision = await this.syncService.shouldUseDeltaSync(endpoint);
      const useDelta = !forceFull && syncDecision.useDelta;

      const filters: Record<string, Date | string | number> = {};
      if (useDelta && syncDecision.lastSyncAt) {
        filters.date_modified = syncDecision.lastSyncAt;
        this.logger.info(
          `Using delta sync with lastSyncAt: ${syncDecision.lastSyncAt.toISOString()}`,
        );
      } else {
        this.logger.info(`Using full sync. Reason: ${syncDecision.reason}`);
      }

      const commodities = await this.fetchWithRetry(filters);

      if (commodities.length === 0) {
        this.logger.info(
          `No commodities returned from UEX API (${useDelta ? 'delta' : 'full'} mode)`,
        );
      }

      const result = await this.processCommodities(
        commodities,
        useDelta ? 'delta' : 'full',
      );

      const durationMs = Date.now() - startTime;
      const syncMode = useDelta ? 'delta' : 'full';

      await this.syncService.recordSyncSuccess(endpoint, {
        recordsCreated: result.created,
        recordsUpdated: result.updated,
        recordsDeleted: result.deleted,
        syncMode,
        durationMs,
      });

      this.logger.info(
        `Commodities sync completed: ${syncMode} mode, ` +
          `created: ${result.created}, updated: ${result.updated}, ` +
          `deleted: ${result.deleted}, duration: ${durationMs}ms`,
      );

      return { ...result, durationMs, syncMode };
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

  private async fetchWithRetry(
    filters: Record<string, Date | string | number>,
  ): Promise<UEXCommodityResponse[]> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.uexClient.fetchCommodities(
          filters.date_modified instanceof Date
            ? { date_modified: filters.date_modified }
            : undefined,
        );
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof RateLimitException) {
          this.logger.warn('Rate limit hit, aborting commodities sync');
          throw error;
        }

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

        throw error;
      }
    }

    throw lastError!;
  }

  private async processCommodities(
    commodities: UEXCommodityResponse[],
    syncMode: 'delta' | 'full',
  ): Promise<Omit<SyncResult, 'durationMs'>> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;
    let deleted = 0;

    const seenUexIds = new Set<number>();

    for (let i = 0; i < commodities.length; i += this.batchSize) {
      const batch = commodities.slice(i, i + this.batchSize);

      const rows = batch.map((c) => ({
        uexId: c.id,
        idCategory: c.id_category ?? undefined,
        name: c.name,
        code: c.code ?? undefined,
        kind: c.kind ?? undefined,
        section: c.section ?? undefined,
        isRaw: c.is_raw ?? null,
        isHarvestable: c.is_harvestable ?? null,
        isBuyable: c.is_buyable ?? null,
        isSellable: c.is_sellable ?? null,
        isIllegal: c.is_illegal ?? null,
        isFuel: c.is_fuel ?? null,
        priceBuy: c.price_buy ?? undefined,
        priceSell: c.price_sell ?? undefined,
        scu: c.scu ?? undefined,
        mass: c.mass ?? undefined,
        starCitizenUuid: c.uuid ?? undefined,
        active: true,
        deleted: false,
        uexDateModified: c.date_modified
          ? new Date(c.date_modified * 1000)
          : undefined,
        addedById: systemUserId,
        modifiedById: systemUserId,
      }));

      const batchUexIds = batch.map((c) => c.id);
      const existing = await this.commodityRepository
        .createQueryBuilder('commodity')
        .select('commodity.uexId')
        .where('commodity.uexId IN (:...ids)', { ids: batchUexIds })
        .getMany();
      const existingUexIds = new Set(existing.map((e) => e.uexId));

      await this.commodityRepository
        .createQueryBuilder()
        .insert()
        .into(UexCommodity)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values(rows as any[])
        .onConflict(
          `("uex_id") DO UPDATE SET
            name              = EXCLUDED.name,
            id_category       = COALESCE(EXCLUDED.id_category,       uex_commodities.id_category),
            code              = COALESCE(EXCLUDED.code,              uex_commodities.code),
            kind              = COALESCE(EXCLUDED.kind,              uex_commodities.kind),
            section           = COALESCE(EXCLUDED.section,           uex_commodities.section),
            is_raw            = COALESCE(EXCLUDED.is_raw,            uex_commodities.is_raw),
            is_harvestable    = COALESCE(EXCLUDED.is_harvestable,    uex_commodities.is_harvestable),
            is_buyable        = COALESCE(EXCLUDED.is_buyable,        uex_commodities.is_buyable),
            is_sellable       = COALESCE(EXCLUDED.is_sellable,       uex_commodities.is_sellable),
            is_illegal        = COALESCE(EXCLUDED.is_illegal,        uex_commodities.is_illegal),
            is_fuel           = COALESCE(EXCLUDED.is_fuel,           uex_commodities.is_fuel),
            price_buy         = COALESCE(EXCLUDED.price_buy,         uex_commodities.price_buy),
            price_sell        = COALESCE(EXCLUDED.price_sell,        uex_commodities.price_sell),
            scu               = COALESCE(EXCLUDED.scu,               uex_commodities.scu),
            mass              = COALESCE(EXCLUDED.mass,              uex_commodities.mass),
            star_citizen_uuid = COALESCE(EXCLUDED.star_citizen_uuid, uex_commodities.star_citizen_uuid),
            active            = EXCLUDED.active,
            deleted           = EXCLUDED.deleted,
            modified_by       = EXCLUDED.modified_by,
            date_modified     = NOW(),
            uex_date_modified = COALESCE(EXCLUDED.uex_date_modified, uex_commodities.uex_date_modified)`,
        )
        .execute();

      const batchCreated = batchUexIds.filter(
        (id) => !existingUexIds.has(id),
      ).length;
      created += batchCreated;
      updated += batch.length - batchCreated;

      batchUexIds.forEach((id) => seenUexIds.add(id));

      this.logger.debug(
        `Bulk upserted batch ${Math.floor(i / this.batchSize) + 1}/` +
          `${Math.ceil(commodities.length / this.batchSize)}`,
      );
    }

    if (syncMode === 'full' && seenUexIds.size > 0) {
      deleted = await this.markMissingCommoditiesAsDeleted(seenUexIds);
    }

    return { created, updated, deleted };
  }

  private async markMissingCommoditiesAsDeleted(
    seenUexIds: Set<number>,
  ): Promise<number> {
    const systemUserId = this.systemUserService.getSystemUserId();
    const ids = [...seenUexIds];

    const result = await this.commodityRepository
      .createQueryBuilder()
      .update(UexCommodity)
      .set({ deleted: true, active: false, modifiedById: systemUserId })
      .where('uex_id NOT IN (:...ids)', { ids })
      .andWhere('deleted = :deleted', { deleted: false })
      .execute();

    const deleted = result.affected ?? 0;

    if (deleted > 0) {
      this.logger.info(`Marked ${deleted} stale commodities as deleted`);
    }

    return deleted;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
