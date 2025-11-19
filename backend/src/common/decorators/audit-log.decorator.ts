import { SetMetadata } from '@nestjs/common';
import {
  AuditAction,
  AuditEntityType,
} from '../../modules/audit-logs/audit-log.entity';

export const AUDIT_LOG_KEY = 'auditLog';

export interface AuditLogMetadata {
  action: AuditAction;
  entityType: AuditEntityType;
}

export const AuditLog = (metadata: AuditLogMetadata) =>
  SetMetadata(AUDIT_LOG_KEY, metadata);
