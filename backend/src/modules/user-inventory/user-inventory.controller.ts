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
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { QueryParams, asString } from '../../common/types/query-params.type';

@Controller('api/inventory')
@UseGuards(JwtAuthGuard)
export class UserInventoryController {
  constructor(
    private readonly inventorySharingService: InventorySharingService,
    private readonly userInventoryService: UserInventoryService,
  ) {}

  private readOptionalNumber(
    query: QueryParams,
    keys: string[],
    fieldName: string,
    options?: { integer?: boolean; min?: number },
  ): number | undefined {
    const rawValue = keys
      .map((key) => query[key])
      .find((value) => value !== undefined);

    if (rawValue === undefined || rawValue === '') {
      return undefined;
    }

    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException(`${fieldName} must be a number`);
    }
    if (options?.integer && !Number.isInteger(parsed)) {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }
    if (options?.min !== undefined && parsed < options.min) {
      throw new BadRequestException(
        `${fieldName} must be greater than or equal to ${options.min}`,
      );
    }
    return parsed;
  }

  @Get()
  async list(
    @Query() query: QueryParams,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;

    const gameId = this.readOptionalNumber(
      query,
      ['game_id', 'gameId'],
      'game_id',
      { integer: true },
    );
    if (!gameId) {
      throw new BadRequestException('game_id is required');
    }

    const searchDto: UserInventorySearchDto = {
      gameId,
      categoryId: this.readOptionalNumber(
        query,
        ['category_id', 'categoryId'],
        'category_id',
        { integer: true },
      ),
      uexItemId: this.readOptionalNumber(
        query,
        ['uex_item_id', 'uexItemId'],
        'uex_item_id',
        { integer: true },
      ),
      locationId: this.readOptionalNumber(
        query,
        ['location_id', 'locationId'],
        'location_id',
        { integer: true },
      ),
      sharedOrgId: this.readOptionalNumber(
        query,
        ['shared_org_id', 'sharedOrgId'],
        'shared_org_id',
        { integer: true },
      ),
      search: asString(query.search),
      limit: this.readOptionalNumber(query, ['limit'], 'limit', {
        integer: true,
        min: 1,
      }),
      offset: this.readOptionalNumber(query, ['offset'], 'offset', {
        integer: true,
        min: 0,
      }),
      sort: asString(query.sort) as
        | 'name'
        | 'quantity'
        | 'location'
        | 'date_added'
        | 'date_modified'
        | undefined,
      order: asString(query.order) as 'asc' | 'desc' | undefined,
      sharedOnly:
        query.shared_only !== undefined
          ? query.shared_only === 'true'
          : undefined,
      minQuantity: this.readOptionalNumber(
        query,
        ['min_quantity', 'minQuantity'],
        'min_quantity',
      ),
      maxQuantity: this.readOptionalNumber(
        query,
        ['max_quantity', 'maxQuantity'],
        'max_quantity',
      ),
    };

    return this.userInventoryService.findAll(userId, searchDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateUserInventoryItemDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    return this.userInventoryService.create(userId, createDto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateUserInventoryItemDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    return this.userInventoryService.update(id, userId, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    await this.userInventoryService.delete(id, userId);
  }

  @Post(':itemId/share')
  async shareItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() shareDto: ShareItemDto,
    @Request() req: AuthenticatedRequest,
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
    @Request() req: AuthenticatedRequest,
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
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    return this.inventorySharingService.findUserSharedItems(userId, orgId);
  }

  @Get('audit-log')
  @UseGuards(PermissionsGuard)
  @RequirePermission(OrgPermission.CAN_ADMIN_ORG_INVENTORY)
  async getAuditLog(
    @Request() req: AuthenticatedRequest,
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
