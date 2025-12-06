import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserInventoryItem } from './entities/user-inventory-item.entity';
import {
  UserInventoryItemDto,
  CreateUserInventoryItemDto,
  UpdateUserInventoryItemDto,
  UserInventorySearchDto,
  UserInventorySummaryDto,
} from './dto/user-inventory-item.dto';

@Injectable()
export class UserInventoryService {
  private readonly logger = new Logger(UserInventoryService.name);

  constructor(
    @InjectRepository(UserInventoryItem)
    private readonly inventoryRepository: Repository<UserInventoryItem>,
  ) {}

  async findAll(
    userId: number,
    searchDto: UserInventorySearchDto,
  ): Promise<{
    items: UserInventoryItemDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryBuilder = this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.item', 'item')
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('inventory.location', 'location')
      .leftJoinAndSelect('inventory.sharedOrg', 'sharedOrg')
      .where('inventory.user_id = :userId', { userId })
      .andWhere('inventory.game_id = :gameId', { gameId: searchDto.gameId })
      .andWhere('inventory.deleted = FALSE')
      .andWhere('inventory.active = TRUE');

    if (searchDto.uexItemId) {
      queryBuilder.andWhere('inventory.uex_item_id = :uexItemId', {
        uexItemId: searchDto.uexItemId,
      });
    }

    if (searchDto.categoryId) {
      queryBuilder.andWhere('item.idCategory = :categoryId', {
        categoryId: searchDto.categoryId,
      });
    }

    if (searchDto.locationId) {
      queryBuilder.andWhere('inventory.location_id = :locationId', {
        locationId: searchDto.locationId,
      });
    }

    if (searchDto.sharedOrgId) {
      queryBuilder.andWhere('inventory.shared_org_id = :sharedOrgId', {
        sharedOrgId: searchDto.sharedOrgId,
      });
    }

    if (searchDto.sharedOnly) {
      queryBuilder.andWhere('inventory.shared_org_id IS NOT NULL');
    }

    if (searchDto.search) {
      queryBuilder.andWhere(
        '(item.name ILIKE :search OR inventory.notes ILIKE :search)',
        { search: `%${searchDto.search}%` },
      );
    }

    const sortColumn = this.resolveSortColumn(searchDto.sort);
    const sortDirection = (searchDto.order || 'desc').toUpperCase() as
      | 'ASC'
      | 'DESC';
    queryBuilder.orderBy(sortColumn, sortDirection);

    const limit = Math.min(searchDto.limit ?? 50, 200);
    const offset = searchDto.offset ?? 0;

    queryBuilder.take(limit);
    queryBuilder.skip(offset);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items: items.map((item) => this.toDto(item)),
      total,
      limit,
      offset,
    };
  }

  async findById(id: string, userId: number): Promise<UserInventoryItemDto> {
    const item = await this.inventoryRepository.findOne({
      where: { id, userId, deleted: false },
      relations: ['item', 'location', 'sharedOrg'],
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    return this.toDto(item);
  }

  async create(
    userId: number,
    createDto: CreateUserInventoryItemDto,
  ): Promise<UserInventoryItemDto> {
    const item = this.inventoryRepository.create({
      ...createDto,
      userId,
      addedBy: userId,
      modifiedBy: userId,
    });

    const saved = await this.inventoryRepository.save(item);

    this.logger.log(
      `Created inventory item ${saved.id} for user ${userId}: ${createDto.quantity}x item ${createDto.uexItemId}`,
    );

    return this.findById(saved.id, userId);
  }

  async update(
    id: string,
    userId: number,
    updateDto: UpdateUserInventoryItemDto,
  ): Promise<UserInventoryItemDto> {
    const item = await this.findInventoryItem(id, userId);

    Object.assign(item, updateDto);
    item.modifiedBy = userId;

    const saved = await this.inventoryRepository.save(item);

    this.logger.log(`Updated inventory item ${saved.id} for user ${userId}`);

    return this.findById(saved.id, userId);
  }

  async delete(id: string, userId: number): Promise<void> {
    const item = await this.findInventoryItem(id, userId);

    item.deleted = true;
    item.active = false;
    item.modifiedBy = userId;

    await this.inventoryRepository.save(item);

    this.logger.log(`Deleted inventory item ${id} for user ${userId}`);
  }

  async getSummary(
    userId: number,
    gameId: number,
  ): Promise<UserInventorySummaryDto> {
    const result = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .select('COUNT(*)', 'totalItems')
      .addSelect('COUNT(DISTINCT inventory.uex_item_id)', 'uniqueItems')
      .addSelect('COUNT(DISTINCT inventory.location_id)', 'locationCount')
      .addSelect(
        'SUM(CASE WHEN inventory.shared_org_id IS NOT NULL THEN 1 ELSE 0 END)',
        'sharedItemsCount',
      )
      .addSelect('MAX(inventory.date_modified)', 'lastUpdated')
      .where('inventory.user_id = :userId', { userId })
      .andWhere('inventory.game_id = :gameId', { gameId })
      .andWhere('inventory.deleted = FALSE')
      .andWhere('inventory.active = TRUE')
      .getRawOne();

    return {
      userId,
      gameId,
      totalItems: parseInt(result.totalItems || '0', 10),
      uniqueItems: parseInt(result.uniqueItems || '0', 10),
      locationCount: parseInt(result.locationCount || '0', 10),
      sharedItemsCount: parseInt(result.sharedItemsCount || '0', 10),
      lastUpdated: result.lastUpdated || new Date(),
    };
  }

  async findSharedByOrg(
    orgId: number,
    gameId: number,
  ): Promise<UserInventoryItemDto[]> {
    const items = await this.inventoryRepository.find({
      where: {
        sharedOrgId: orgId,
        gameId,
        deleted: false,
        active: true,
      },
      relations: ['item', 'location', 'user'],
      order: { dateModified: 'DESC' },
      take: 100,
    });

    return items.map((item) => this.toDto(item));
  }

  private async findInventoryItem(
    id: string,
    userId: number,
  ): Promise<UserInventoryItem> {
    const item = await this.inventoryRepository.findOne({
      where: { id, userId, deleted: false },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    return item;
  }

  private toDto(item: UserInventoryItem): UserInventoryItemDto {
    return {
      id: item.id,
      userId: item.userId,
      gameId: item.gameId,
      uexItemId: item.uexItemId,
      locationId: item.locationId,
      quantity: parseFloat(item.quantity.toString()),
      notes: item.notes,
      sharedOrgId: item.sharedOrgId,
      active: item.active,
      dateAdded: item.dateAdded,
      dateModified: item.dateModified,
      itemName: item.item?.name,
      locationName: item.location?.displayName,
      sharedOrgName: item.sharedOrg?.name,
      categoryName: item.item?.category?.name || item.item?.categoryName,
    };
  }

  private resolveSortColumn(sort?: string): string {
    switch (sort) {
      case 'name':
        return 'item.name';
      case 'quantity':
        return 'inventory.quantity';
      case 'date_added':
        return 'inventory.dateAdded';
      case 'date_modified':
      default:
        return 'inventory.dateModified';
    }
  }
}
