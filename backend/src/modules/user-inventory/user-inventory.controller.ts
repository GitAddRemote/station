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
  async getSharedItems(
    @Query('orgId', ParseIntPipe) orgId: number,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    return this.inventorySharingService.findUserSharedItems(userId, orgId);
  }

  @Get('audit-log')
  async getAuditLog(
    @Request() req: any,
    @Query('userId') userId?: number,
    @Query('orgId') orgId?: number,
    @Query('limit') limit?: number,
  ) {
    // Only allow users to see their own audit logs unless they have proper permissions
    const requestUserId = req.user.userId;
    const targetUserId = userId ? Number(userId) : requestUserId;

    // TODO: Add proper permission checks for viewing other users' audit logs
    if (targetUserId !== requestUserId) {
      // For now, only allow viewing own logs
      // In future, add org admin check here
      return [];
    }

    return this.inventorySharingService.getAuditLog(
      targetUserId,
      orgId ? Number(orgId) : undefined,
      limit ? Number(limit) : 100,
    );
  }
}
