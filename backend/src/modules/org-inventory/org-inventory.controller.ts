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

@Controller('org-inventory')
@UseGuards(JwtAuthGuard)
export class OrgInventoryController {
  constructor(private readonly orgInventoryService: OrgInventoryService) {}

  /**
   * Create a new org inventory item
   * POST /org-inventory
   */
  @Post()
  async create(
    @Request() req: any,
    @Body() createDto: CreateOrgInventoryItemDto,
  ): Promise<OrgInventoryItemDto> {
    return this.orgInventoryService.create(req.user.userId, createDto);
  }

  /**
   * Get inventory items for an org by game
   * GET /org-inventory/org/:orgId/game/:gameId
   */
  @Get('org/:orgId/game/:gameId')
  async findByOrgAndGame(
    @Request() req: any,
    @Param('orgId') orgId: string,
    @Param('gameId') gameId: string,
  ): Promise<OrgInventoryItemDto[]> {
    return this.orgInventoryService.findByOrgAndGame(
      req.user.userId,
      parseInt(orgId, 10),
      parseInt(gameId, 10),
    );
  }

  /**
   * Get a specific inventory item by ID
   * GET /org-inventory/:id
   */
  @Get(':id')
  async findById(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<OrgInventoryItemDto> {
    return this.orgInventoryService.findById(req.user.userId, id);
  }

  /**
   * Update an inventory item
   * PUT /org-inventory/:id
   */
  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateOrgInventoryItemDto,
  ): Promise<OrgInventoryItemDto> {
    return this.orgInventoryService.update(req.user.userId, id, updateDto);
  }

  /**
   * Delete an inventory item (soft delete)
   * DELETE /org-inventory/:id
   */
  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string): Promise<void> {
    return this.orgInventoryService.delete(req.user.userId, id);
  }

  /**
   * Search inventory with filters
   * GET /org-inventory/search
   */
  @Get('search')
  async search(
    @Request() req: any,
    @Query() searchDto: OrgInventorySearchDto,
  ): Promise<OrgInventoryItemDto[]> {
    return this.orgInventoryService.search(req.user.userId, searchDto);
  }

  /**
   * Get inventory summary for an org
   * GET /org-inventory/org/:orgId/game/:gameId/summary
   */
  @Get('org/:orgId/game/:gameId/summary')
  async getSummary(
    @Request() req: any,
    @Param('orgId') orgId: string,
    @Param('gameId') gameId: string,
  ): Promise<OrgInventorySummaryDto> {
    return this.orgInventoryService.getSummary(
      req.user.userId,
      parseInt(orgId, 10),
      parseInt(gameId, 10),
    );
  }

  /**
   * Get inventory by location
   * GET /org-inventory/org/:orgId/location/:locationId
   */
  @Get('org/:orgId/location/:locationId')
  async findByLocation(
    @Request() req: any,
    @Param('orgId') orgId: string,
    @Param('locationId') locationId: string,
  ): Promise<OrgInventoryItemDto[]> {
    return this.orgInventoryService.findByLocation(
      req.user.userId,
      parseInt(orgId, 10),
      parseInt(locationId, 10),
    );
  }

  /**
   * Get inventory by UEX item
   * GET /org-inventory/org/:orgId/item/:uexItemId
   */
  @Get('org/:orgId/item/:uexItemId')
  async findByUexItem(
    @Request() req: any,
    @Param('orgId') orgId: string,
    @Param('uexItemId') uexItemId: string,
  ): Promise<OrgInventoryItemDto[]> {
    return this.orgInventoryService.findByUexItem(
      req.user.userId,
      parseInt(orgId, 10),
      parseInt(uexItemId, 10),
    );
  }
}
