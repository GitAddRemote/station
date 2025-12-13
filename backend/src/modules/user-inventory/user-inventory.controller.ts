import {
  Controller,
  Post,
  Put,
  Delete,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseIntPipe,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { OrgPermission } from '../permissions/permissions.constants';
import { InventorySharingService } from './inventory-sharing.service';
import { ShareItemDto } from './dto/share-item.dto';
import { UserInventoryService } from './user-inventory.service';
import {
  CreateUserInventoryItemDto,
  UpdateUserInventoryItemDto,
  UserInventorySearchDto,
} from './dto/user-inventory-item.dto';

@Controller('api/inventory')
@UseGuards(JwtAuthGuard)
export class UserInventoryController {
  constructor(
    private readonly inventorySharingService: InventorySharingService,
    private readonly userInventoryService: UserInventoryService,
  ) {}

  @Get()
  async list(@Query() query: Record<string, any>, @Request() req: any) {
    const userId = req.user.userId;
    const parsedMinQuantity = Number(
      query.min_quantity ?? query.minQuantity ?? Number.NaN,
    );
    const parsedMaxQuantity = Number(
      query.max_quantity ?? query.maxQuantity ?? Number.NaN,
    );

    const searchDto: UserInventorySearchDto = {
      gameId: Number(query.game_id ?? query.gameId),
      categoryId: query.category_id ? Number(query.category_id) : undefined,
      uexItemId: query.uex_item_id ? Number(query.uex_item_id) : undefined,
      locationId: query.location_id ? Number(query.location_id) : undefined,
      sharedOrgId: query.shared_org_id
        ? Number(query.shared_org_id)
        : undefined,
      search: query.search,
      limit: query.limit ? Number(query.limit) : undefined,
      offset: query.offset ? Number(query.offset) : undefined,
      sort: query.sort,
      order: query.order,
      sharedOnly:
        query.shared_only !== undefined
          ? query.shared_only === 'true' || query.shared_only === true
          : undefined,
      minQuantity: Number.isNaN(parsedMinQuantity)
        ? undefined
        : parsedMinQuantity,
      maxQuantity: Number.isNaN(parsedMaxQuantity)
        ? undefined
        : parsedMaxQuantity,
    };

    if (!searchDto.gameId) {
      throw new BadRequestException('game_id is required');
    }

    return this.userInventoryService.findAll(userId, searchDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateUserInventoryItemDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    return this.userInventoryService.create(userId, createDto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateUserInventoryItemDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    return this.userInventoryService.update(id, userId, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const userId = req.user.userId;
    await this.userInventoryService.delete(id, userId);
  }

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
