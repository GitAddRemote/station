import { EtlWarningSeverity } from '../entities/etl-warning.entity';

export class EtlWarningDto {
  id!: string;
  runId!: string;
  stepName!: string;
  severity!: EtlWarningSeverity;
  message!: string;
  rawPayload?: Record<string, unknown> | null;
  createdAt!: Date;
}
