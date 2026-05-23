import { EtlRunStatus } from '../entities/etl-run.entity';

export class EtlRunDto {
  runId!: string;
  startedAt!: Date;
  completedAt?: Date | null;
  stepsTotal!: number;
  stepsSucceeded!: number;
  stepsFailed!: number;
  status!: EtlRunStatus;
  createdAt!: Date;
}
