import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { EtlWarning } from './etl-warning.entity';

export type EtlRunStatus = 'running' | 'completed' | 'partial' | 'failed';

@Entity('station_etl_run')
export class EtlRun {
  @PrimaryGeneratedColumn('uuid', { name: 'run_id' })
  runId!: string;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'NOW()' })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  @Column({ name: 'steps_total', type: 'integer', default: 0 })
  stepsTotal!: number;

  @Column({ name: 'steps_succeeded', type: 'integer', default: 0 })
  stepsSucceeded!: number;

  @Column({ name: 'steps_failed', type: 'integer', default: 0 })
  stepsFailed!: number;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: 'running',
  })
  status!: EtlRunStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => EtlWarning, (warning) => warning.run)
  warnings!: EtlWarning[];
}
