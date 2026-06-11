import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';

@Injectable()
export class UexSyncMetricsService {
  constructor(
    @InjectMetric('uex_sync_success_total')
    private readonly successCounter: Counter<string>,
    @InjectMetric('uex_sync_failure_total')
    private readonly failureCounter: Counter<string>,
    @InjectMetric('uex_sync_records_total')
    private readonly recordsCounter: Counter<string>,
    @InjectMetric('uex_sync_last_success_timestamp_seconds')
    private readonly lastSuccessGauge: Gauge<string>,
    @InjectMetric('uex_sync_duration_ms')
    private readonly durationGauge: Gauge<string>,
  ) {}

  recordSuccess(params: {
    endpoint: string;
    mode: 'delta' | 'full';
    created: number;
    updated: number;
    deleted: number;
    durationMs: number;
  }): void {
    const { endpoint, mode, created, updated, deleted, durationMs } = params;
    this.successCounter.inc({ endpoint, mode });
    this.recordsCounter.inc({ endpoint, operation: 'created' }, created);
    this.recordsCounter.inc({ endpoint, operation: 'updated' }, updated);
    this.recordsCounter.inc({ endpoint, operation: 'deleted' }, deleted);
    this.lastSuccessGauge.set({ endpoint }, Date.now() / 1000);
    this.durationGauge.set({ endpoint }, durationMs);
  }

  recordFailure(endpoint: string): void {
    this.failureCounter.inc({ endpoint });
  }
}
