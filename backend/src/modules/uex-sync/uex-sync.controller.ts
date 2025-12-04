import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UexSyncService } from './uex-sync.service';
import {
  SyncHealthResponseDto,
  EndpointHealthDto,
} from './dto/sync-health.dto';
import { SyncStatus } from './uex-sync-state.entity';

@Controller('admin/uex-sync')
@UseGuards(JwtAuthGuard)
export class UexSyncController {
  constructor(private readonly syncService: UexSyncService) {}

  @Get('health')
  async getHealth(): Promise<SyncHealthResponseDto> {
    const states = await this.syncService.getAllSyncStates();
    const configs = await Promise.all(
      states.map((state) => this.syncService.getSyncConfig(state.endpointName)),
    );

    const endpoints: EndpointHealthDto[] = states.map((state, index) => {
      const config = configs[index];

      let nextFullSyncDue: Date | undefined;
      if (state.lastFullSyncAt && config) {
        const nextDue = new Date(state.lastFullSyncAt);
        nextDue.setDate(nextDue.getDate() + config.fullSyncIntervalDays);
        nextFullSyncDue = nextDue;
      }

      const recordsSyncedLastRun =
        (state.recordsCreatedCount || 0) +
        (state.recordsUpdatedCount || 0) +
        (state.recordsDeletedCount || 0);

      return {
        endpoint: state.endpointName,
        status: state.syncStatus,
        lastSync: state.lastSuccessfulSyncAt,
        lastFullSync: state.lastFullSyncAt,
        nextFullSyncDue,
        recordsSyncedLastRun,
        avgDurationMs: state.syncDurationMs,
        errorMessage: state.errorMessage,
      };
    });

    const overallStatus = this.calculateOverallStatus(endpoints);

    return {
      overallStatus,
      endpoints,
      timestamp: new Date(),
    };
  }

  @Get('state/:endpointName')
  async getEndpointState(@Param('endpointName') endpointName: string) {
    const { state, config } =
      await this.syncService.getSyncStateWithConfig(endpointName);

    if (!state) {
      return {
        endpointName,
        exists: false,
      };
    }

    return {
      endpointName,
      exists: true,
      state,
      config,
    };
  }

  @Get('active')
  async getActiveSyncs() {
    const activeSyncs = await this.syncService.getActiveSyncStates();

    return {
      count: activeSyncs.length,
      syncs: activeSyncs,
      timestamp: new Date(),
    };
  }

  @Get('stale')
  async getStaleEndpoints() {
    const staleEndpoints = await this.syncService.getStaleEndpoints(48);

    return {
      count: staleEndpoints.length,
      endpoints: staleEndpoints,
      timestamp: new Date(),
    };
  }

  private calculateOverallStatus(
    endpoints: EndpointHealthDto[],
  ): 'healthy' | 'warning' | 'error' {
    const failedCount = endpoints.filter(
      (e) => e.status === SyncStatus.FAILED,
    ).length;
    const staleCount = endpoints.filter((e) => {
      if (!e.lastSync) return true;
      const hoursSinceSync =
        (Date.now() - e.lastSync.getTime()) / (1000 * 60 * 60);
      return hoursSinceSync > 48;
    }).length;

    if (failedCount > 0 || staleCount > 0) {
      return 'error';
    }

    const warningCount = endpoints.filter((e) => {
      if (!e.lastSync) return false;
      const hoursSinceSync =
        (Date.now() - e.lastSync.getTime()) / (1000 * 60 * 60);
      return hoursSinceSync > 24;
    }).length;

    if (warningCount > 0) {
      return 'warning';
    }

    return 'healthy';
  }
}
