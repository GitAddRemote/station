import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OrgInventoryRepository } from './org-inventory.repository';
import { PermissionsService } from '../permissions/permissions.service';
import { OrgInventoryItem } from './entities/org-inventory-item.entity';
import {
  CreateOrgInventoryItemDto,
  UpdateOrgInventoryItemDto,
  OrgInventorySearchDto,
  OrgInventorySummaryDto,
  OrgInventoryItemDto,
} from './dto/org-inventory-item.dto';
import { OrgPermission } from '../permissions/permissions.constants';

@Injectable()
export class OrgInventoryService {
  constructor(
    private readonly orgInventoryRepository: OrgInventoryRepository,
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * Verify user has permission to manage org inventory
   */
  private async verifyInventoryPermission(
    userId: number,
    orgId: number,
    action: 'view' | 'manage',
  ): Promise<void> {
    const permission =
      action === 'view'
        ? OrgPermission.CAN_VIEW_ORG_INVENTORY
        : OrgPermission.CAN_EDIT_ORG_INVENTORY;

    const hasPermission = await this.permissionsService.hasPermission(
      userId,
      orgId,
      permission,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to ${action} inventory for this organization`,
      );
    }
  }

  /**
   * Convert entity to DTO
   */
  private toDto(entity: OrgInventoryItem): OrgInventoryItemDto {
    return {
      id: entity.id,
      orgId: entity.orgId,
      gameId: entity.gameId,
      uexItemId: entity.uexItemId,
      locationId: entity.locationId,
      quantity: entity.quantity,
      notes: entity.notes,
      active: entity.active,
      dateAdded: entity.dateAdded,
      dateModified: entity.dateModified,
      addedBy: entity.addedBy,
      modifiedBy: entity.modifiedBy,
      itemName: entity.item?.name,
      locationName: entity.location?.displayName,
      orgName: entity.org?.name,
      addedByUsername: entity.addedByUser?.username,
      modifiedByUsername: entity.modifiedByUser?.username,
      categoryName: entity.item?.category?.name || entity.item?.categoryName,
    };
  }

  /**
   * Create a new org inventory item
   */
  async create(
    userId: number,
    dto: CreateOrgInventoryItemDto,
  ): Promise<OrgInventoryItemDto> {
    if (!dto.orgId) {
      throw new BadRequestException('Organization ID is required');
    }

    await this.verifyInventoryPermission(userId, dto.orgId, 'manage');

    const item = this.orgInventoryRepository.create({
      ...dto,
      orgId: dto.orgId, // Ensure orgId is set
      addedBy: userId,
      modifiedBy: userId,
      active: true,
      deleted: false,
    });

    const saved = await this.orgInventoryRepository.save(item);
    const loaded = await this.orgInventoryRepository.findByIdNotDeleted(
      saved.id,
    );

    if (!loaded) {
      throw new NotFoundException('Failed to load created inventory item');
    }

    return this.toDto(loaded);
  }

  /**
   * Get all inventory items for an org (by game)
   */
  async findByOrgAndGame(
    userId: number,
    orgId: number,
    gameId: number,
  ): Promise<OrgInventoryItemDto[]> {
    await this.verifyInventoryPermission(userId, orgId, 'view');

    const items = await this.orgInventoryRepository.findByOrgIdAndGameId(
      orgId,
      gameId,
    );
    return items.map((item) => this.toDto(item));
  }

  /**
   * Get a specific inventory item by ID
   */
  async findById(
    userId: number,
    orgId: number,
    id: string,
  ): Promise<OrgInventoryItemDto> {
    const item = await this.orgInventoryRepository.findByIdNotDeleted(id);

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    if (item.orgId !== orgId) {
      throw new NotFoundException('Inventory item not found in this org');
    }

    await this.verifyInventoryPermission(userId, item.orgId, 'view');

    return this.toDto(item);
  }

  /**
   * Update an inventory item
   */
  async update(
    userId: number,
    orgId: number,
    id: string,
    dto: UpdateOrgInventoryItemDto,
  ): Promise<OrgInventoryItemDto> {
    const item = await this.orgInventoryRepository.findByIdNotDeleted(id);

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    if (item.orgId !== orgId) {
      throw new NotFoundException('Inventory item not found in this org');
    }

    await this.verifyInventoryPermission(userId, item.orgId, 'manage');

    // Update fields
    if (dto.locationId !== undefined) {
      item.locationId = dto.locationId;
    }
    if (dto.quantity !== undefined) {
      item.quantity = dto.quantity;
    }
    if (dto.notes !== undefined) {
      item.notes = dto.notes;
    }
    if (dto.active !== undefined) {
      item.active = dto.active;
    }

    item.modifiedBy = userId;

    const saved = await this.orgInventoryRepository.save(item);
    const loaded = await this.orgInventoryRepository.findByIdNotDeleted(
      saved.id,
    );

    if (!loaded) {
      throw new NotFoundException('Failed to load updated inventory item');
    }

    return this.toDto(loaded);
  }

  /**
   * Soft delete an inventory item
   */
  async delete(userId: number, orgId: number, id: string): Promise<void> {
    const item = await this.orgInventoryRepository.findByIdNotDeleted(id);

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    if (item.orgId !== orgId) {
      throw new NotFoundException('Inventory item not found in this org');
    }

    await this.verifyInventoryPermission(userId, item.orgId, 'manage');

    const deleted = await this.orgInventoryRepository.softDeleteItem(
      id,
      userId,
    );

    if (!deleted) {
      throw new BadRequestException('Failed to delete inventory item');
    }
  }

  /**
   * Search inventory with filters
   */
  async search(
    userId: number,
    searchDto: OrgInventorySearchDto,
  ): Promise<{
    items: OrgInventoryItemDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    await this.verifyInventoryPermission(userId, searchDto.orgId, 'view');

    const limit = Math.min(searchDto.limit || 100, 500);
    const offset = searchDto.offset || 0;

    const { items, total } = await this.orgInventoryRepository.searchInventory({
      orgId: searchDto.orgId,
      gameId: searchDto.gameId,
      uexItemId: searchDto.uexItemId,
      categoryId: searchDto.categoryId,
      locationId: searchDto.locationId,
      activeOnly: searchDto.activeOnly,
      limit,
      offset,
      search: searchDto.search,
      minQuantity: searchDto.minQuantity,
      maxQuantity: searchDto.maxQuantity,
      sort: searchDto.sort || 'date_modified',
      order: searchDto.order || 'desc',
    });

    return {
      items: items.map((item) => this.toDto(item)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get inventory summary for an org
   */
  async getSummary(
    userId: number,
    orgId: number,
    gameId: number,
  ): Promise<OrgInventorySummaryDto> {
    await this.verifyInventoryPermission(userId, orgId, 'view');

    const summary = await this.orgInventoryRepository.getOrgInventorySummary(
      orgId,
      gameId,
    );

    return {
      orgId,
      gameId,
      totalItems: summary.totalItems,
      uniqueItems: summary.uniqueItems,
      locationCount: summary.locationCount,
      lastUpdated: summary.lastUpdated!,
    };
  }

  /**
   * Get inventory by location
   */
  async findByLocation(
    userId: number,
    orgId: number,
    locationId: number,
  ): Promise<OrgInventoryItemDto[]> {
    await this.verifyInventoryPermission(userId, orgId, 'view');

    const items =
      await this.orgInventoryRepository.findByLocationId(locationId);

    // Filter to ensure only items from this org are returned
    const orgItems = items.filter((item) => item.orgId === orgId);

    return orgItems.map((item) => this.toDto(item));
  }

  /**
   * Get inventory by UEX item
   */
  async findByUexItem(
    userId: number,
    orgId: number,
    uexItemId: number,
  ): Promise<OrgInventoryItemDto[]> {
    await this.verifyInventoryPermission(userId, orgId, 'view');

    const items = await this.orgInventoryRepository.findByUexItemId(
      orgId,
      uexItemId,
    );

    return items.map((item) => this.toDto(item));
  }
}
