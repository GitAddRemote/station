import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditLogsService } from './audit-logs.service';
import { AuditAction, AuditEntityType } from './audit-log.entity';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async findAll(
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: AuditEntityType,
    @Query('entityId') entityId?: string,
    @Query('action') action?: AuditAction,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters = {
      userId: userId ? parseInt(userId, 10) : undefined,
      entityType,
      entityId: entityId ? parseInt(entityId, 10) : undefined,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    };

    return this.auditLogsService.findAll(filters);
  }

  @Get('user/:userId')
  async findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditLogsService.findByUser(
      userId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('entity/:entityType/:entityId')
  async findByEntity(
    @Param('entityType') entityType: AuditEntityType,
    @Param('entityId', ParseIntPipe) entityId: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditLogsService.findByEntity(
      entityType,
      entityId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('recent')
  async findRecent(@Query('limit') limit?: string) {
    return this.auditLogsService.findRecent(limit ? parseInt(limit, 10) : 100);
  }
}
