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
  @PrimaryColumn({ type: 'varchar', length: 100 })
  endpointName!: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastSuccessfulSyncAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastFullSyncAt?: Date;

  @Column({
    type: 'enum',
    enum: SyncStatus,
    default: SyncStatus.IDLE,
  })
  syncStatus!: SyncStatus;

  @Column({ type: 'timestamptz', nullable: true })
  syncStartedAt?: Date;

  @Column({ type: 'int', default: 0 })
  recordsCreatedCount!: number;

  @Column({ type: 'int', default: 0 })
  recordsUpdatedCount!: number;

  @Column({ type: 'int', default: 0 })
  recordsDeletedCount!: number;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'text', nullable: true })
  errorStack?: string;

  @Column({ type: 'int', nullable: true })
  syncDurationMs?: number;

  @CreateDateColumn()
  dateAdded!: Date;

  @UpdateDateColumn()
  dateModified!: Date;
}
