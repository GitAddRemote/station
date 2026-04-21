import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';
import {
  AUDIT_LOG_KEY,
  AuditLogMetadata,
} from '../decorators/audit-log.decorator';

interface AuditLogResponse {
  id?: number | string;
  [key: string]: unknown;
}

interface AuditLogRequest {
  user?: {
    userId?: number;
    username?: string;
  };
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  method: string;
  url: string;
  ip: string;
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditLogsService: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditMetadata = this.reflector.getAllAndOverride<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest() as AuditLogRequest;
    const user = request.user;
    const { action, entityType } = auditMetadata;

    return next.handle().pipe(
      tap(async (response: unknown) => {
        const typedResponse = response as AuditLogResponse | undefined;

        // Extract entity ID from response or params
        let entityId: number | undefined;
        const rawEntityId =
          typedResponse?.id ||
          request.params?.id ||
          request.params?.organizationId ||
          request.params?.roleId;

        if (rawEntityId !== undefined) {
          if (typeof rawEntityId === 'number') {
            entityId = Number.isNaN(rawEntityId) ? undefined : rawEntityId;
          } else if (
            typeof rawEntityId === 'string' &&
            /^\d+$/.test(rawEntityId)
          ) {
            entityId = parseInt(rawEntityId, 10);
          }
          // Non-numeric IDs (e.g. UUIDs) are intentionally left as undefined
          // to avoid silent truncation like parseInt('1e3...') → 1.
        }

        await this.auditLogsService.log({
          userId: user?.userId,
          username: user?.username,
          action,
          entityType,
          entityId,
          metadata: {
            method: request.method,
            url: request.url,
            params: request.params,
            query: request.query,
          },
          newValues: typedResponse as Record<string, unknown> | undefined,
          ipAddress: request.ip,
          userAgent:
            typeof request.headers['user-agent'] === 'string'
              ? request.headers['user-agent']
              : undefined,
        });
      }),
    );
  }
}
