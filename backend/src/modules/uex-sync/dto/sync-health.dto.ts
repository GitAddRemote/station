import { SyncStatus } from '../uex-sync-state.entity';

export class EndpointHealthDto {
  endpoint!: string;
  status!: SyncStatus;
  lastSync?: Date;
  lastFullSync?: Date;
  nextFullSyncDue?: Date;
  recordsSyncedLastRun!: number;
  avgDurationMs?: number;
  errorMessage?: string;
}

export class SyncHealthResponseDto {
  overallStatus!: 'healthy' | 'warning' | 'error';
  endpoints!: EndpointHealthDto[];
  timestamp!: Date;
}
