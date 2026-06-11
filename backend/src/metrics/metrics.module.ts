import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { UexSyncMetricsService } from './uex-sync-metrics.service';
import { InventoryMetricsService } from './inventory-metrics.service';
import {
  makeCounterProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
      path: '/metrics',
    }),
  ],
  providers: [
    // UEX sync counters
    makeCounterProvider({
      name: 'uex_sync_success_total',
      help: 'Total number of successful UEX sync runs per endpoint',
      labelNames: ['endpoint', 'mode'],
    }),
    makeCounterProvider({
      name: 'uex_sync_failure_total',
      help: 'Total number of failed UEX sync runs per endpoint',
      labelNames: ['endpoint'],
    }),
    makeCounterProvider({
      name: 'uex_sync_records_total',
      help: 'Total records processed per UEX sync run',
      labelNames: ['endpoint', 'operation'],
    }),
    makeGaugeProvider({
      name: 'uex_sync_last_success_timestamp_seconds',
      help: 'Unix timestamp of the last successful UEX sync per endpoint',
      labelNames: ['endpoint'],
    }),
    makeGaugeProvider({
      name: 'uex_sync_duration_ms',
      help: 'Duration of the last UEX sync run in milliseconds',
      labelNames: ['endpoint'],
    }),
    // Inventory operation counters
    makeCounterProvider({
      name: 'inventory_operations_total',
      help: 'Total inventory operations',
      labelNames: ['operation', 'owner_type'],
    }),
    UexSyncMetricsService,
    InventoryMetricsService,
  ],
  exports: [UexSyncMetricsService, InventoryMetricsService],
})
export class MetricsModule {}
