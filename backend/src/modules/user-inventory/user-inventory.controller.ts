import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { OrgPermission } from '../permissions/permissions.constants';
import { InventorySharingService } from './inventory-sharing.service';
import { ShareItemDto } from './dto/share-item.dto';

@Controller('api/inventory')
@UseGuards(JwtAuthGuard)
export class UserInventoryController {
  constructor(
    private readonly inventorySharingService: InventorySharingService,
  ) {}

  @Post(':itemId/share')
  async shareItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() shareDto: ShareItemDto,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const userId = req.user.userId;
    await this.inventorySharingService.shareItemWithOrg(
      userId,
      itemId,
      shareDto,
    );
    return { message: 'Item shared successfully' };
  }

  @Delete(':itemId/share')
  async unshareItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const userId = req.user.userId;
    await this.inventorySharingService.unshareItemFromOrg(userId, itemId);
    return { message: 'Item unshared successfully' };
  }

  @Get('shared')
  @UseGuards(PermissionsGuard)
  @RequirePermission(OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS)
  async getSharedItems(
    @Query('orgId', ParseIntPipe) orgId: number,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    return this.inventorySharingService.findUserSharedItems(userId, orgId);
  }

  @Get('audit-log')
  @UseGuards(PermissionsGuard)
  @RequirePermission(OrgPermission.CAN_ADMIN_ORG_INVENTORY)
  async getAuditLog(
    @Request() req: any,
    @Query('userId') userId?: number,
    @Query('orgId') orgId?: number,
    @Query('limit') limit?: number,
  ) {
    // With admin permission, can view other users' audit logs
    const requestUserId = req.user.userId;
    const targetUserId = userId ? Number(userId) : requestUserId;

    return this.inventorySharingService.getAuditLog(
      targetUserId,
      orgId ? Number(orgId) : undefined,
      limit ? Number(limit) : 100,
    );
  }
}
