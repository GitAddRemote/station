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
  @PrimaryColumn({ type: 'varchar', length: 100 })
  endpointName!: string;

  @OneToOne(() => UexSyncState)
  @JoinColumn({ name: 'endpointName' })
  syncState?: UexSyncState;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'boolean', default: true })
  deltaSyncEnabled!: boolean;

  @Column({ type: 'int', default: 7 })
  fullSyncIntervalDays!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  syncScheduleCron?: string;

  @Column({ type: 'int', default: 100 })
  rateLimitCallsPerHour!: number;

  @Column({ type: 'int', default: 300 })
  timeoutSeconds!: number;

  @Column({ type: 'int', default: 3 })
  retryAttempts!: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 2.0 })
  retryBackoffMultiplier!: number;

  @CreateDateColumn()
  dateAdded!: Date;

  @UpdateDateColumn()
  dateModified!: Date;
}
