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
    userId?: string;
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
      tap((response: unknown) => {
        const isPlainObject =
          typeof response === 'object' &&
          response !== null &&
          !Array.isArray(response);
        const typedResponse = isPlainObject
          ? (response as AuditLogResponse)
          : undefined;

        // Extract entity ID from response or params
        const rawEntityId =
          typedResponse?.id ||
          request.params?.id ||
          request.params?.organizationId ||
          request.params?.roleId;

        const entityId: string | undefined =
          rawEntityId !== undefined ? String(rawEntityId) : undefined;

        this.auditLogsService
          .log({
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
            newValues: typedResponse,
            ipAddress: request.ip,
            userAgent:
              typeof request.headers['user-agent'] === 'string'
                ? request.headers['user-agent']
                : undefined,
          })
          .catch(() => {
            // Audit log failures must not affect the response pipeline
          });
      }),
    );
  }
}
