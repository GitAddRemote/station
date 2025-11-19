import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditEntityType } from './audit-log.entity';

export interface CreateAuditLogDto {
  userId?: number;
  username?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: number;
  metadata?: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Create a new audit log entry
   */
  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create(dto);
    return await this.auditLogRepository.save(auditLog);
  }

  /**
   * Get audit logs with optional filters
   */
  async findAll(filters?: {
    userId?: number;
    entityType?: AuditEntityType;
    entityId?: number;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const query = this.auditLogRepository.createQueryBuilder('audit_log');

    if (filters?.userId) {
      query.andWhere('audit_log.userId = :userId', {
        userId: filters.userId,
      });
    }

    if (filters?.entityType) {
      query.andWhere('audit_log.entityType = :entityType', {
        entityType: filters.entityType,
      });
    }

    if (filters?.entityId) {
      query.andWhere('audit_log.entityId = :entityId', {
        entityId: filters.entityId,
      });
    }

    if (filters?.action) {
      query.andWhere('audit_log.action = :action', {
        action: filters.action,
      });
    }

    if (filters?.startDate) {
      query.andWhere('audit_log.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      query.andWhere('audit_log.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    query.orderBy('audit_log.createdAt', 'DESC');

    if (filters?.limit) {
      query.take(filters.limit);
    }

    if (filters?.offset) {
      query.skip(filters.offset);
    }

    const [logs, total] = await query.getManyAndCount();

    return { logs, total };
  }

  /**
   * Get audit logs for a specific user
   */
  async findByUser(
    userId: number,
    limit = 50,
    offset = 0,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    return this.findAll({ userId, limit, offset });
  }

  /**
   * Get audit logs for a specific entity
   */
  async findByEntity(
    entityType: AuditEntityType,
    entityId: number,
    limit = 50,
    offset = 0,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    return this.findAll({ entityType, entityId, limit, offset });
  }

  /**
   * Get recent audit logs
   */
  async findRecent(limit = 100): Promise<AuditLog[]> {
    const result = await this.findAll({ limit });
    return result.logs;
  }

  /**
   * Delete old audit logs (for cleanup jobs)
   */
  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :date', { date })
      .execute();

    return result.affected || 0;
  }
}
