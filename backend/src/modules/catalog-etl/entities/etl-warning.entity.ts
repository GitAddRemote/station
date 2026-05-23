import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { EtlRun } from './etl-run.entity';

export type EtlWarningSeverity = 'warn' | 'error';

@Entity('station_etl_warning')
@Index('idx_station_etl_warning_run_id', ['runId', 'createdAt'])
export class EtlWarning {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'run_id', type: 'uuid' })
  runId!: string;

  @ManyToOne(() => EtlRun, (run) => run.warnings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'run_id' })
  run!: EtlRun;

  @Column({ name: 'step_name', type: 'varchar', length: 100 })
  stepName!: string;

  @Column({
    name: 'severity',
    type: 'varchar',
    length: 10,
    default: 'warn',
  })
  severity!: EtlWarningSeverity;

  @Column({ name: 'message', type: 'text' })
  message!: string;

  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
