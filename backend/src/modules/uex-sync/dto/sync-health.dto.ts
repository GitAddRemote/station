import { SyncStatus } from '../uex-sync-state.entity';
import { IsArray, IsBoolean, IsIn, IsOptional } from 'class-validator';

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

export class SyncTriggerRequestDto {
  @IsOptional()
  @IsArray()
  @IsIn(['categories', 'items', 'companies', 'locations', 'all'], {
    each: true,
  })
  endpoints?: ('categories' | 'items' | 'companies' | 'locations' | 'all')[];

  @IsOptional()
  @IsBoolean()
  forceFull?: boolean;
}

export class SyncTriggerResultDto {
  endpoint!: string;
  status!: SyncStatus;
  mode!: 'delta' | 'full';
  created!: number;
  updated!: number;
  deleted!: number;
  durationMs!: number;
  errorMessage?: string;
}
