import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  BadRequestException,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgInventoryService } from './org-inventory.service';
import {
  CreateOrgInventoryItemDto,
  UpdateOrgInventoryItemDto,
  OrgInventorySearchDto,
  OrgInventoryItemDto,
  OrgInventorySummaryDto,
} from './dto/org-inventory-item.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

interface QueryParams {
  [key: string]: string | undefined;
}

@ApiTags('Organization Inventory')
@ApiBearerAuth()
@Controller('api/orgs/:orgId/inventory')
@UseGuards(JwtAuthGuard)
export class OrgInventoryController {
  constructor(private readonly orgInventoryService: OrgInventoryService) {}

  private readOptionalNumber(
    query: QueryParams,
    keys: string[],
    fieldName: string,
    options?: {
      integer?: boolean;
      min?: number;
    },
  ): number | undefined {
    const rawValue = keys
      .map((key) => query[key])
      .find((value) => value !== undefined);

    if (rawValue === undefined || rawValue === '') {
      return undefined;
    }

    const parsedValue = Number(rawValue);
    if (Number.isNaN(parsedValue)) {
      throw new BadRequestException(`${fieldName} must be a number`);
    }

    if (options?.integer && !Number.isInteger(parsedValue)) {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    if (options?.min !== undefined && parsedValue < options.min) {
      throw new BadRequestException(
        `${fieldName} must be greater than or equal to ${options.min}`,
      );
    }

    return parsedValue;
  }

  /**
   * List org inventory items with filtering
   * GET /api/orgs/:orgId/inventory
   */
  @Get()
  @ApiOperation({ summary: 'List organization inventory items' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of org inventory items',
    type: [OrgInventoryItemDto],
  })
  async list(
    @Request() req: AuthenticatedRequest,
    @Param('orgId', ParseIntPipe) orgId: number,
    @Query() query: QueryParams,
  ): Promise<{
    items: OrgInventoryItemDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const userId = req.user.userId;
    const gameId = this.readOptionalNumber(
      query,
      ['game_id', 'gameId'],
      'game_id',
      {
        integer: true,
        min: 1,
      },
    );

    const searchDto: OrgInventorySearchDto = {
      orgId,
      gameId: gameId ?? 0,
      categoryId: this.readOptionalNumber(
        query,
        ['category_id', 'categoryId'],
        'category_id',
        {
          integer: true,
          min: 1,
        },
      ),
      uexItemId: this.readOptionalNumber(
        query,
        ['uex_item_id', 'uexItemId'],
        'uex_item_id',
        {
          integer: true,
          min: 1,
        },
      ),
      locationId: this.readOptionalNumber(
        query,
        ['location_id', 'locationId'],
        'location_id',
        {
          integer: true,
          min: 1,
        },
      ),
      search: query.search,
      limit: this.readOptionalNumber(query, ['limit'], 'limit', {
        integer: true,
        min: 1,
      }),
      offset: this.readOptionalNumber(query, ['offset'], 'offset', {
        integer: true,
        min: 0,
      }),
      sort: query.sort as
        | 'name'
        | 'quantity'
        | 'location'
        | 'date_added'
        | 'date_modified'
        | undefined,
      order: query.order as 'asc' | 'desc' | undefined,
      activeOnly:
        query.active_only !== undefined
          ? query.active_only === 'true'
          : query.activeOnly !== undefined
            ? query.activeOnly === 'true'
            : undefined,
      minQuantity: this.readOptionalNumber(
        query,
        ['min_quantity', 'minQuantity'],
        'min_quantity',
        {
          min: 0,
        },
      ),
      maxQuantity: this.readOptionalNumber(
        query,
        ['max_quantity', 'maxQuantity'],
        'max_quantity',
        {
          min: 0,
        },
      ),
    };

    if (!searchDto.gameId) {
      throw new BadRequestException('game_id is required');
    }

    return this.orgInventoryService.search(userId, searchDto);
  }

  /**
   * Create a new org inventory item
   * POST /api/orgs/:orgId/inventory
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new organization inventory item' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: 201,
    description: 'Inventory item created successfully',
    type: OrgInventoryItemDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 409, description: 'Inventory item already exists' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Param('orgId', ParseIntPipe) orgId: number,
    @Body() createDto: CreateOrgInventoryItemDto,
  ): Promise<OrgInventoryItemDto> {
    return this.orgInventoryService.create(req.user.userId, {
      ...createDto,
      orgId,
    });
  }

  /**
   * Get org inventory summary statistics
   * GET /api/orgs/:orgId/inventory/summary
   */
  @Get('summary')
  @ApiOperation({ summary: 'Get organization inventory summary statistics' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns inventory summary',
    type: OrgInventorySummaryDto,
  })
  async getSummary(
    @Request() req: AuthenticatedRequest,
    @Param('orgId', ParseIntPipe) orgId: number,
    @Query('gameId', ParseIntPipe) gameId: number,
  ): Promise<OrgInventorySummaryDto> {
    return this.orgInventoryService.getSummary(req.user.userId, orgId, gameId);
  }

  /**
   * Get a specific inventory item by ID
   * GET /api/orgs/:orgId/inventory/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific organization inventory item' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Inventory item ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Returns inventory item',
    type: OrgInventoryItemDto,
  })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async findById(
    @Request() req: AuthenticatedRequest,
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrgInventoryItemDto> {
    return this.orgInventoryService.findById(req.user.userId, orgId, id);
  }

  /**
   * Update an inventory item
   * PUT /api/orgs/:orgId/inventory/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update an organization inventory item' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Inventory item ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Inventory item updated successfully',
    type: OrgInventoryItemDto,
  })
  @ApiResponse({ status: 404, description: 'Item not found' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateOrgInventoryItemDto,
  ): Promise<OrgInventoryItemDto> {
    return this.orgInventoryService.update(
      req.user.userId,
      orgId,
      id,
      updateDto,
    );
  }

  /**
   * Delete an inventory item (soft delete)
   * DELETE /api/orgs/:orgId/inventory/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an organization inventory item' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Inventory item ID (UUID)' })
  @ApiResponse({ status: 204, description: 'Item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  async delete(
    @Request() req: AuthenticatedRequest,
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.orgInventoryService.delete(req.user.userId, orgId, id);
  }
}
