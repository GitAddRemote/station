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

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditLogsService: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMetadata = this.reflector.getAllAndOverride<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const { action, entityType } = auditMetadata;

    return next.handle().pipe(
      tap(async (response) => {
        // Extract entity ID from response or params
        const entityId =
          response?.id ||
          request.params?.id ||
          request.params?.organizationId ||
          request.params?.roleId;

        await this.auditLogsService.log({
          userId: user?.userId,
          username: user?.username,
          action,
          entityType,
          entityId: entityId ? parseInt(entityId, 10) : undefined,
          metadata: {
            method: request.method,
            url: request.url,
            params: request.params,
            query: request.query,
          },
          newValues: response,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
      }),
    );
  }
}
