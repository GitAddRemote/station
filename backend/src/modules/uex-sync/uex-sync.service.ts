import { Injectable, ConflictException, Optional } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { UexSyncState, SyncStatus } from './uex-sync-state.entity';
import { UexSyncConfig } from './uex-sync-config.entity';
import { UexSyncMetricsService } from '../../metrics/uex-sync-metrics.service';

export interface SyncDecision {
  useDelta: boolean;
  reason: string;
  lastSyncAt?: Date;
}

export interface EtlStepSyncParams {
  syncMode: 'delta' | 'full';
  /** Query params to pass to UexApiClient.get() — undefined means no filtering */
  params: Record<string, string> | undefined;
  reason: string;
}

export interface SyncResult {
  endpointName: string;
  syncMode: 'delta' | 'full';
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  durationMs: number;
}

@Injectable()
export class UexSyncService {
  private readonly LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  constructor(
    @InjectPinoLogger(UexSyncService.name)
    private readonly logger: PinoLogger,
    @InjectRepository(UexSyncState)
    private syncStateRepository: Repository<UexSyncState>,
    @InjectRepository(UexSyncConfig)
    private syncConfigRepository: Repository<UexSyncConfig>,
    @Optional() private readonly metricsService?: UexSyncMetricsService,
  ) {}

  async acquireSyncLock(endpointName: string): Promise<void> {
    const lockTimeoutDate = new Date(Date.now() - this.LOCK_TIMEOUT_MS);

    // Ensure sync state row exists
    const existing = await this.syncStateRepository.findOne({
      where: { endpointName },
    });
    if (!existing) {
      await this.syncStateRepository.insert({
        endpointName,
        syncStatus: SyncStatus.IDLE,
      });
    }

    const result = await this.syncStateRepository
      .createQueryBuilder()
      .update(UexSyncState)
      .set({
        syncStatus: SyncStatus.IN_PROGRESS,
        syncStartedAt: new Date(),
      })
      .where('endpoint_name = :endpointName', { endpointName })
      .andWhere(
        '(sync_status != :inProgress OR sync_started_at < :lockTimeoutDate)',
        {
          inProgress: SyncStatus.IN_PROGRESS,
          lockTimeoutDate,
        },
      )
      .execute();

    if (result.affected === 0) {
      throw new ConflictException(
        `Sync already in progress for endpoint: ${endpointName}`,
      );
    }

    this.logger.info(`Acquired sync lock for endpoint: ${endpointName}`);
  }

  async releaseSyncLock(endpointName: string): Promise<void> {
    await this.syncStateRepository.update(
      { endpointName },
      { syncStatus: SyncStatus.IDLE },
    );

    this.logger.info(`Released sync lock for endpoint: ${endpointName}`);
  }

  async shouldUseDeltaSync(endpointName: string): Promise<SyncDecision> {
    const state = await this.syncStateRepository.findOne({
      where: { endpointName },
    });

    const config = await this.syncConfigRepository.findOne({
      where: { endpointName },
    });

    if (!state) {
      return {
        useDelta: false,
        reason: 'SYNC_STATE_NOT_FOUND',
      };
    }

    if (!state.lastSuccessfulSyncAt) {
      return {
        useDelta: false,
        reason: 'FIRST_SYNC',
      };
    }

    if (!config || !config.deltaSyncEnabled) {
      return {
        useDelta: false,
        reason: 'DELTA_DISABLED',
      };
    }

    if (!config.enabled) {
      return {
        useDelta: false,
        reason: 'ENDPOINT_DISABLED',
      };
    }

    if (state.lastFullSyncAt) {
      const daysSinceFullSync = this.calculateDaysBetween(
        state.lastFullSyncAt,
        new Date(),
      );

      if (daysSinceFullSync >= config.fullSyncIntervalDays) {
        return {
          useDelta: false,
          reason: 'FULL_SYNC_INTERVAL_EXCEEDED',
          lastSyncAt: state.lastFullSyncAt,
        };
      }
    } else {
      return {
        useDelta: false,
        reason: 'NO_FULL_SYNC_RECORDED',
      };
    }

    return {
      useDelta: true,
      reason: 'DELTA_ELIGIBLE',
      lastSyncAt: state.lastSuccessfulSyncAt,
    };
  }

  async updateSyncState(
    endpointName: string,
    updates: Partial<UexSyncState>,
  ): Promise<void> {
    await this.syncStateRepository.update({ endpointName }, updates);

    this.logger.info(
      `Updated sync state for ${endpointName}: ${JSON.stringify(updates)}`,
    );
  }

  async getSyncState(endpointName: string): Promise<UexSyncState | null> {
    return this.syncStateRepository.findOne({
      where: { endpointName },
    });
  }

  async getSyncConfig(endpointName: string): Promise<UexSyncConfig | null> {
    return this.syncConfigRepository.findOne({
      where: { endpointName },
    });
  }

  async getAllSyncStates(): Promise<UexSyncState[]> {
    return this.syncStateRepository.find({
      order: { endpointName: 'ASC' },
    });
  }

  async getActiveSyncStates(): Promise<UexSyncState[]> {
    return this.syncStateRepository.find({
      where: {
        syncStatus: SyncStatus.IN_PROGRESS,
      },
      order: { syncStartedAt: 'DESC' },
    });
  }

  async getSyncStateWithConfig(
    endpointName: string,
  ): Promise<{ state: UexSyncState | null; config: UexSyncConfig | null }> {
    const [state, config] = await Promise.all([
      this.getSyncState(endpointName),
      this.getSyncConfig(endpointName),
    ]);

    return { state, config };
  }

  async recordSyncSuccess(
    endpointName: string,
    result: Omit<SyncResult, 'endpointName'>,
  ): Promise<void> {
    const updates: Partial<UexSyncState> = {
      syncStatus: SyncStatus.SUCCESS,
      lastSuccessfulSyncAt: new Date(),
      recordsCreatedCount: result.recordsCreated,
      recordsUpdatedCount: result.recordsUpdated,
      recordsDeletedCount: result.recordsDeleted,
      syncDurationMs: result.durationMs,
      errorMessage: undefined,
      errorStack: undefined,
    };

    if (result.syncMode === 'full') {
      updates.lastFullSyncAt = new Date();
    }

    await this.updateSyncState(endpointName, updates);

    this.logger.info(
      {
        endpoint: endpointName,
        syncMode: result.syncMode,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsDeleted: result.recordsDeleted,
        durationMs: result.durationMs,
      },
      `Sync completed successfully for ${endpointName}`,
    );

    this.metricsService?.recordSuccess({
      endpoint: endpointName,
      mode: result.syncMode,
      created: result.recordsCreated,
      updated: result.recordsUpdated,
      deleted: result.recordsDeleted,
      durationMs: result.durationMs,
    });
  }

  async recordSyncFailure(
    endpointName: string,
    error: Error,
    durationMs?: number,
  ): Promise<void> {
    const updates: Partial<UexSyncState> = {
      syncStatus: SyncStatus.FAILED,
      errorMessage: error.message,
      errorStack: error.stack,
    };

    if (durationMs !== undefined) {
      updates.syncDurationMs = durationMs;
    }

    await this.updateSyncState(endpointName, updates);

    this.logger.error(
      { err: error, endpoint: endpointName, durationMs },
      `Sync failed for ${endpointName}`,
    );

    this.metricsService?.recordFailure(endpointName);
  }

  async getStaleEndpoints(
    hoursThreshold: number = 48,
  ): Promise<UexSyncState[]> {
    const thresholdDate = new Date(
      Date.now() - hoursThreshold * 60 * 60 * 1000,
    );

    return this.syncStateRepository.find({
      where: [
        {
          lastSuccessfulSyncAt: MoreThan(thresholdDate),
        },
        {
          lastSuccessfulSyncAt: IsNull(),
        },
      ],
      order: { lastSuccessfulSyncAt: 'ASC' },
    });
  }

  private calculateDaysBetween(startDate: Date, endDate: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.floor(timeDiff / msPerDay);
  }

  /**
   * Returns the sync mode and UEX query params for a catalog ETL step.
   *
   * Delta sync passes date_modified_min=<unix-seconds> to the UEX endpoint so
   * only records modified since the last successful sync are returned. Full
   * refresh passes no date filter and re-fetches the entire dataset.
   *
   * Callers should pass the returned params directly to UexApiClient.get() and
   * record the outcome via recordEtlStepSync() after a successful run.
   *
   * Endpoints that do NOT support date_modified_min (e.g. /terminals_distances,
   * /terminals, /categories, all spatial-layer endpoints) should not call this
   * method — they always do a full fetch and manage their own stale-delete logic.
   */
  async getEtlStepSyncParams(endpointName: string): Promise<EtlStepSyncParams> {
    const decision = await this.shouldUseDeltaSync(endpointName);

    if (!decision.useDelta || !decision.lastSyncAt) {
      return { syncMode: 'full', params: undefined, reason: decision.reason };
    }

    // UEX date_modified_min accepts a Unix timestamp in seconds.
    const dateModifiedMin = Math.floor(
      decision.lastSyncAt.getTime() / 1000,
    ).toString();

    return {
      syncMode: 'delta',
      params: { date_modified_min: dateModifiedMin },
      reason: decision.reason,
    };
  }

  /**
   * Records a successful catalog ETL step sync.  Updates lastSuccessfulSyncAt
   * on every success, and lastFullSyncAt only when the step ran in full mode.
   * This is intentionally lightweight — steps don't need full SyncResult metrics.
   */
  async recordEtlStepSync(
    endpointName: string,
    syncMode: 'delta' | 'full',
  ): Promise<void> {
    const now = new Date();
    const updates: Partial<UexSyncState> = {
      syncStatus: SyncStatus.SUCCESS,
      lastSuccessfulSyncAt: now,
    };
    if (syncMode === 'full') {
      updates.lastFullSyncAt = now;
    }
    await this.syncStateRepository.upsert({ endpointName, ...updates }, [
      'endpointName',
    ]);
  }

  async initializeEndpoint(
    endpointName: string,
    config?: Partial<UexSyncConfig>,
  ): Promise<void> {
    const existingState = await this.syncStateRepository.findOne({
      where: { endpointName },
    });

    if (!existingState) {
      await this.syncStateRepository.save({
        endpointName,
        syncStatus: SyncStatus.IDLE,
      });
    }

    const existingConfig = await this.syncConfigRepository.findOne({
      where: { endpointName },
    });

    if (!existingConfig) {
      await this.syncConfigRepository.save({
        endpointName,
        ...config,
      });
    }

    this.logger.info(`Initialized sync tracking for endpoint: ${endpointName}`);
  }
}
