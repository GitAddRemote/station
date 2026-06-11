import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorResult,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { UexSyncService } from '../modules/uex-sync/uex-sync.service';
import { SyncStatus } from '../modules/uex-sync/uex-sync-state.entity';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly uexSyncService: UexSyncService,
  ) {}

  @ApiOperation({
    summary: 'Health check — database, Redis, and UEX sync status',
  })
  @ApiResponse({ status: 200, description: 'All checks passed' })
  @ApiResponse({ status: 503, description: 'One or more checks failed' })
  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database', { connection: this.dataSource }),
      () => this.checkRedis(),
      () => this.checkUexSync(),
    ]);
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    const useRedis =
      this.configService.get<string>('USE_REDIS_CACHE', 'true') === 'true';

    if (!useRedis) {
      return { redis: { status: 'up', message: 'using in-memory cache' } };
    }

    const client = createClient({
      socket: {
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        connectTimeout: 3000,
      },
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
    });

    try {
      await client.connect();
      await client.ping();
      await client.quit();
      return { redis: { status: 'up' } };
    } catch (err: unknown) {
      try {
        await client.quit();
      } catch {
        /* ignore */
      }
      const message = err instanceof Error ? err.message : String(err);
      return { redis: { status: 'down', message } };
    }
  }

  private async checkUexSync(): Promise<HealthIndicatorResult> {
    try {
      const states = await this.uexSyncService.getAllSyncStates();

      const failed = states.filter((s) => s.syncStatus === SyncStatus.FAILED);
      const stale = states.filter((s) => {
        if (!s.lastSuccessfulSyncAt) return true;
        const hours = (Date.now() - s.lastSuccessfulSyncAt.getTime()) / 36e5;
        return hours > 48;
      });

      const summary = states.map((s) => ({
        endpoint: s.endpointName,
        status: s.syncStatus,
        lastSync: s.lastSuccessfulSyncAt ?? null,
      }));

      if (failed.length > 0 || stale.length > 0) {
        return {
          'uex-sync': {
            status: 'down',
            failedEndpoints: failed.map((s) => s.endpointName),
            staleEndpoints: stale.map((s) => s.endpointName),
            endpoints: summary,
          },
        };
      }

      return { 'uex-sync': { status: 'up', endpoints: summary } };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { 'uex-sync': { status: 'down', message } };
    }
  }
}
