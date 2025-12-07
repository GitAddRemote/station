import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SyncStatus {
  IDLE = 'idle',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('uex_sync_state')
@Index(['syncStatus', 'lastSuccessfulSyncAt'])
export class UexSyncState {
  @PrimaryColumn({ name: 'endpoint_name', type: 'varchar', length: 100 })
  endpointName!: string;

  @Column({
    name: 'last_successful_sync_at',
    type: 'timestamptz',
    nullable: true,
  })
  lastSuccessfulSyncAt?: Date;

  @Column({
    name: 'last_full_sync_at',
    type: 'timestamptz',
    nullable: true,
  })
  lastFullSyncAt?: Date;

  @Column({
    name: 'sync_status',
    type: 'enum',
    enum: SyncStatus,
    default: SyncStatus.IDLE,
  })
  syncStatus!: SyncStatus;

  @Column({ name: 'sync_started_at', type: 'timestamptz', nullable: true })
  syncStartedAt?: Date;

  @Column({ name: 'records_created_count', type: 'int', default: 0 })
  recordsCreatedCount!: number;

  @Column({ name: 'records_updated_count', type: 'int', default: 0 })
  recordsUpdatedCount!: number;

  @Column({ name: 'records_deleted_count', type: 'int', default: 0 })
  recordsDeletedCount!: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack?: string;

  @Column({ name: 'sync_duration_ms', type: 'int', nullable: true })
  syncDurationMs?: number;

  @CreateDateColumn({ name: 'date_added' })
  dateAdded!: Date;

  @UpdateDateColumn({ name: 'date_modified' })
  dateModified!: Date;
}
