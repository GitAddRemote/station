import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

@Injectable()
export class InventoryMetricsService {
  constructor(
    @InjectMetric('inventory_operations_total')
    private readonly operationsCounter: Counter<string>,
  ) {}

  recordOperation(
    operation: 'create' | 'update' | 'delete',
    ownerType: 'user' | 'org',
  ): void {
    this.operationsCounter.inc({ operation, owner_type: ownerType });
  }
}
