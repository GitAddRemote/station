import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { UexSyncState, SyncStatus } from './uex-sync-state.entity';
import { UexSyncConfig } from './uex-sync-config.entity';

export interface SyncDecision {
  useDelta: boolean;
  reason: string;
  lastSyncAt?: Date;
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
  private readonly logger = new Logger(UexSyncService.name);
  private readonly LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  constructor(
    @InjectRepository(UexSyncState)
    private syncStateRepository: Repository<UexSyncState>,
    @InjectRepository(UexSyncConfig)
    private syncConfigRepository: Repository<UexSyncConfig>,
  ) {}

  async acquireSyncLock(endpointName: string): Promise<void> {
    const lockTimeoutDate = new Date(Date.now() - this.LOCK_TIMEOUT_MS);

    const result = await this.syncStateRepository
      .createQueryBuilder()
      .update(UexSyncState)
      .set({
        syncStatus: SyncStatus.IN_PROGRESS,
        syncStartedAt: new Date(),
      })
      .where('endpointName = :endpointName', { endpointName })
      .andWhere(
        '(syncStatus != :inProgress OR syncStartedAt < :lockTimeoutDate)',
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

    this.logger.log(`Acquired sync lock for endpoint: ${endpointName}`);
  }

  async releaseSyncLock(endpointName: string): Promise<void> {
    await this.syncStateRepository.update(
      { endpointName },
      { syncStatus: SyncStatus.IDLE },
    );

    this.logger.log(`Released sync lock for endpoint: ${endpointName}`);
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

    this.logger.log(
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

    this.logger.log(
      `Sync completed successfully for ${endpointName}: ${result.syncMode} mode, ` +
        `created: ${result.recordsCreated}, updated: ${result.recordsUpdated}, ` +
        `deleted: ${result.recordsDeleted}, duration: ${result.durationMs}ms`,
    );
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
      `Sync failed for ${endpointName}: ${error.message}`,
      error.stack,
    );
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
          lastSuccessfulSyncAt: null as any,
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

    this.logger.log(`Initialized sync tracking for endpoint: ${endpointName}`);
  }
}
