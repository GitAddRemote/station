import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { UexSyncState } from './uex-sync-state.entity';

@Entity('uex_sync_config')
export class UexSyncConfig {
  @PrimaryColumn({ name: 'endpoint_name', type: 'varchar', length: 100 })
  endpointName!: string;

  @OneToOne(() => UexSyncState)
  @JoinColumn({ name: 'endpoint_name' })
  syncState?: UexSyncState;

  @Column({ name: 'enabled', type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ name: 'delta_sync_enabled', type: 'boolean', default: true })
  deltaSyncEnabled!: boolean;

  @Column({ name: 'full_sync_interval_days', type: 'int', default: 7 })
  fullSyncIntervalDays!: number;

  @Column({
    name: 'sync_schedule_cron',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  syncScheduleCron?: string;

  @Column({ name: 'rate_limit_calls_per_hour', type: 'int', default: 100 })
  rateLimitCallsPerHour!: number;

  @Column({ name: 'timeout_seconds', type: 'int', default: 300 })
  timeoutSeconds!: number;

  @Column({ name: 'retry_attempts', type: 'int', default: 3 })
  retryAttempts!: number;

  @Column({
    name: 'retry_backoff_multiplier',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 2.0,
  })
  retryBackoffMultiplier!: number;

  @CreateDateColumn({ name: 'date_added' })
  dateAdded!: Date;

  @UpdateDateColumn({ name: 'date_modified' })
  dateModified!: Date;
}
