import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(UserInventoryService.name)
    private readonly logger: PinoLogger,
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

    if (searchDto.sharedOrgId) {
      queryBuilder.andWhere('inventory.shared_org_id = :sharedOrgId', {
        sharedOrgId: searchDto.sharedOrgId,
      });
    }

    if (searchDto.sharedOnly) {
      queryBuilder.andWhere('inventory.shared_org_id IS NOT NULL');
    }

    if (searchDto.minQuantity !== undefined) {
      queryBuilder.andWhere('inventory.quantity >= :minQuantity', {
        minQuantity: searchDto.minQuantity,
      });
    }

    if (searchDto.maxQuantity !== undefined) {
      queryBuilder.andWhere('inventory.quantity <= :maxQuantity', {
        maxQuantity: searchDto.maxQuantity,
      });
    }

    if (searchDto.minQuality !== undefined) {
      queryBuilder.andWhere('inventory.quality >= :minQuality', {
        minQuality: searchDto.minQuality,
      });
    }

    if (searchDto.maxQuality !== undefined) {
      queryBuilder.andWhere('inventory.quality <= :maxQuality', {
        maxQuality: searchDto.maxQuality,
      });
    }

    if (searchDto.unitOfMeasure !== undefined) {
      queryBuilder.andWhere('inventory.unit_of_measure = :unitOfMeasure', {
        unitOfMeasure: searchDto.unitOfMeasure,
      });
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
      relations: ['item', 'sharedOrg'],
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
    let merged = false;

    const saved = await this.inventoryRepository.manager.transaction(
      async (manager) => {
        const repo = manager.getRepository(UserInventoryItem);

        const existing = await repo
          .createQueryBuilder('inventory')
          .setLock('pessimistic_write')
          .where('inventory.user_id = :userId', { userId })
          .andWhere('inventory.game_id = :gameId', {
            gameId: createDto.gameId,
          })
          .andWhere('inventory.uex_item_id = :uexItemId', {
            uexItemId: createDto.uexItemId,
          })
          .andWhere('inventory.unit_of_measure = :unitOfMeasure', {
            unitOfMeasure: createDto.unitOfMeasure ?? 'unit',
          })
          .andWhere(
            'inventory.location_type IS NOT DISTINCT FROM :locationType',
            { locationType: createDto.locationType ?? null },
          )
          .andWhere(
            'inventory.location_uex_id IS NOT DISTINCT FROM :locationUexId',
            { locationUexId: createDto.locationUexId ?? null },
          )
          .andWhere(
            'inventory.shared_org_id IS NOT DISTINCT FROM :sharedOrgId',
            { sharedOrgId: createDto.sharedOrgId ?? null },
          )
          .andWhere('inventory.deleted = FALSE')
          .andWhere('inventory.active = TRUE')
          .getOne();

        if (existing && !createDto.allowDuplicate) {
          // Use SQL NUMERIC addition to avoid JS floating-point drift
          const result = await manager.query(
            `UPDATE "user_inventory_item"
             SET quantity      = quantity + $1::numeric,
                 notes         = COALESCE($2, notes),
                 modified_by   = $3,
                 date_modified = NOW()
             WHERE id = $4
               AND quantity + $1::numeric <= 999999.999999
             RETURNING id`,
            [createDto.quantity, createDto.notes ?? null, userId, existing.id],
          );
          if (result.length === 0) {
            throw new BadRequestException(
              'Merged quantity would exceed the maximum allowed value of 999999.999999',
            );
          }
          merged = true;
          return repo.findOneByOrFail({ id: existing.id });
        }

        const item = repo.create({
          ...createDto,
          userId,
          addedBy: userId,
          modifiedBy: userId,
        });

        try {
          return await repo.save(item);
        } catch (err: unknown) {
          if (
            typeof err === 'object' &&
            err !== null &&
            'code' in err &&
            (err as { code: string }).code === '23505'
          ) {
            throw new ConflictException(
              'An inventory item with this combination already exists',
            );
          }
          throw err;
        }
      },
    );

    if (merged) {
      this.logger.info(
        `Merged inventory item ${saved.id} for user ${userId}: added ${createDto.quantity} to item ${createDto.uexItemId}`,
      );
    } else {
      this.logger.info(
        `Created inventory item ${saved.id} for user ${userId}: ${createDto.quantity}x item ${createDto.uexItemId}`,
      );
    }

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

    let saved: UserInventoryItem;
    try {
      saved = await this.inventoryRepository.save(item);
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        (err as { code: string }).code === '23505'
      ) {
        throw new ConflictException(
          'An active inventory item with the same identity already exists',
        );
      }
      throw err;
    }

    this.logger.info(`Updated inventory item ${saved.id} for user ${userId}`);

    return this.findById(saved.id, userId);
  }

  async delete(id: string, userId: number): Promise<void> {
    const item = await this.findInventoryItem(id, userId);

    item.deleted = true;
    item.active = false;
    item.modifiedBy = userId;

    await this.inventoryRepository.save(item);

    this.logger.info(`Deleted inventory item ${id} for user ${userId}`);
  }

  async getSummary(
    userId: number,
    gameId: number,
  ): Promise<UserInventorySummaryDto> {
    const result = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .select('COUNT(*)', 'totalItems')
      .addSelect('COUNT(DISTINCT inventory.uex_item_id)', 'uniqueItems')
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
      relations: ['item', 'user'],
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
      quantity: parseFloat(item.quantity.toString()),
      unitOfMeasure: item.unitOfMeasure,
      quality: item.quality,
      locationType: item.locationType,
      locationUexId: item.locationUexId,
      notes: item.notes,
      sharedOrgId: item.sharedOrgId,
      active: item.active,
      dateAdded: item.dateAdded,
      dateModified: item.dateModified,
      itemName: item.item?.name,
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
      case 'quality':
        return 'inventory.quality';
      case 'date_added':
        return 'inventory.dateAdded';
      case 'date_modified':
      default:
        return 'inventory.dateModified';
    }
  }
}
