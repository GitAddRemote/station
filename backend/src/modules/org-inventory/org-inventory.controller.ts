import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
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

@ApiTags('Organization Inventory')
@ApiBearerAuth()
@Controller('api/orgs/:orgId/inventory')
@UseGuards(JwtAuthGuard)
export class OrgInventoryController {
  constructor(private readonly orgInventoryService: OrgInventoryService) {}

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
    @Request() req: any,
    @Param('orgId', ParseIntPipe) orgId: number,
    @Query() searchDto: OrgInventorySearchDto,
  ): Promise<OrgInventoryItemDto[]> {
    const userId = req.user.userId;
    // Extract gameId from query params and use search
    return this.orgInventoryService.search(userId, {
      ...searchDto,
      orgId,
    });
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
  async create(
    @Request() req: any,
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
    @Request() req: any,
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
    @Request() req: any,
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('id') id: string,
  ): Promise<OrgInventoryItemDto> {
    return this.orgInventoryService.findById(req.user.userId, id);
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
    @Request() req: any,
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('id') id: string,
    @Body() updateDto: UpdateOrgInventoryItemDto,
  ): Promise<OrgInventoryItemDto> {
    return this.orgInventoryService.update(req.user.userId, id, updateDto);
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
    @Request() req: any,
    @Param('orgId', ParseIntPipe) orgId: number,
    @Param('id') id: string,
  ): Promise<void> {
    return this.orgInventoryService.delete(req.user.userId, id);
  }
}
