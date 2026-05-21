import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UexSyncService } from './uex-sync.service';
import {
  SyncHealthResponseDto,
  EndpointHealthDto,
  SyncTriggerRequestDto,
  SyncTriggerResultDto,
} from './dto/sync-health.dto';
import { SyncStatus } from './uex-sync-state.entity';
import { CategoriesSyncService } from './services/categories-sync.service';
import { CommoditiesSyncService } from './services/commodities-sync.service';
import { ItemsSyncService } from './services/items-sync.service';
import { CompaniesSyncService } from './services/companies-sync.service';

@Controller('admin/uex-sync')
@UseGuards(JwtAuthGuard)
export class UexSyncController {
  constructor(
    private readonly syncService: UexSyncService,
    private readonly categoriesSyncService: CategoriesSyncService,
    private readonly commoditiesSyncService: CommoditiesSyncService,
    private readonly itemsSyncService: ItemsSyncService,
    private readonly companiesSyncService: CompaniesSyncService,
  ) {}

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

  /**
   * Trigger sync immediately for selected endpoints.
   * Optional forceFull=true to bypass delta logic for this invocation.
   */
  @Post('run')
  async runSyncNow(
    @Body() body: SyncTriggerRequestDto,
  ): Promise<{ results: SyncTriggerResultDto[] }> {
    type SyncEndpoint = 'categories' | 'items' | 'companies' | 'commodities';

    const requested =
      body.endpoints && body.endpoints.length > 0
        ? body.endpoints
        : ['categories', 'companies', 'items', 'commodities'];

    const endpoints: SyncEndpoint[] =
      requested.includes('all') || requested.length === 0
        ? ['categories', 'companies', 'items', 'commodities']
        : requested.filter(
            (e): e is SyncEndpoint =>
              e === 'categories' ||
              e === 'items' ||
              e === 'companies' ||
              e === 'commodities',
          );

    const results: SyncTriggerResultDto[] = [];

    for (const endpoint of endpoints) {
      const start = Date.now();
      try {
        let result:
          | Awaited<
              ReturnType<typeof this.categoriesSyncService.syncCategories>
            >
          | Awaited<
              ReturnType<typeof this.commoditiesSyncService.syncCommodities>
            >
          | Awaited<ReturnType<typeof this.itemsSyncService.syncItems>>
          | Awaited<ReturnType<typeof this.companiesSyncService.syncCompanies>>;

        if (endpoint === 'categories') {
          result = await this.categoriesSyncService.syncCategories(
            body.forceFull,
          );
        } else if (endpoint === 'commodities') {
          result = await this.commoditiesSyncService.syncCommodities(
            body.forceFull,
          );
        } else if (endpoint === 'items') {
          result = await this.itemsSyncService.syncItems(body.forceFull);
        } else {
          result = await this.companiesSyncService.syncCompanies(
            body.forceFull,
          );
        }

        results.push({
          endpoint,
          status: SyncStatus.SUCCESS,
          mode: result.syncMode ?? (body.forceFull ? 'full' : 'delta'),
          created: result.created ?? 0,
          updated: result.updated ?? 0,
          deleted: result.deleted ?? 0,
          durationMs: result.durationMs ?? Date.now() - start,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Sync failed';
        results.push({
          endpoint,
          status: SyncStatus.FAILED,
          mode: body.forceFull ? 'full' : 'delta',
          created: 0,
          updated: 0,
          deleted: 0,
          durationMs: Date.now() - start,
          errorMessage,
        });
      }
    }

    return { results };
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
