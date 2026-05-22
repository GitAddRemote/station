import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrgInventoryRepository } from './org-inventory.repository';
import { PermissionsService } from '../permissions/permissions.service';
import { OrgInventoryItem } from './entities/org-inventory-item.entity';
import {
  CreateOrgInventoryItemDto,
  UpdateOrgInventoryItemDto,
  OrgInventorySearchDto,
  OrgInventorySummaryDto,
  OrgInventoryItemDto,
  SplitOrgInventoryItemDto,
} from './dto/org-inventory-item.dto';
import { OrgPermission } from '../permissions/permissions.constants';

@Injectable()
export class OrgInventoryService {
  constructor(
    private readonly orgInventoryRepository: OrgInventoryRepository,
    private readonly permissionsService: PermissionsService,
    private readonly dataSource: DataSource,
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
      quantity: parseFloat(entity.quantity.toString()),
      unitOfMeasure: entity.unitOfMeasure,
      quality: entity.quality,
      locationType: entity.locationType,
      locationUexId: entity.locationUexId,
      notes: entity.notes,
      active: entity.active,
      dateAdded: entity.dateAdded,
      dateModified: entity.dateModified,
      addedBy: entity.addedBy,
      modifiedBy: entity.modifiedBy,
      itemName: entity.item?.name,
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

    const unitOfMeasure = dto.unitOfMeasure ?? 'unit';
    const locationType = dto.locationType ?? null;
    const locationUexId = dto.locationUexId ?? null;

    const savedId = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(OrgInventoryItem);

      // Advisory lock keyed on the identity serializes concurrent "no
      // existing row" requests so they don't both pass the check-then-insert
      // race and produce duplicates. Released automatically at txn end.
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
        `oii:${dto.orgId}:${dto.gameId}:${dto.uexItemId}:${unitOfMeasure}:${locationType ?? ''}:${locationUexId ?? -1}`,
      ]);

      const existing = await repo
        .createQueryBuilder('oii')
        .where('oii.org_id = :orgId', { orgId: dto.orgId })
        .andWhere('oii.game_id = :gameId', { gameId: dto.gameId })
        .andWhere('oii.uex_item_id = :uexItemId', { uexItemId: dto.uexItemId })
        .andWhere('oii.unit_of_measure = :unitOfMeasure', { unitOfMeasure })
        .andWhere('oii.location_type IS NOT DISTINCT FROM :locationType', {
          locationType,
        })
        .andWhere('oii.location_uex_id IS NOT DISTINCT FROM :locationUexId', {
          locationUexId,
        })
        .andWhere('oii.deleted = FALSE')
        .andWhere('oii.active = TRUE')
        .getOne();

      if (existing) {
        const result = await manager.query(
          `UPDATE "org_inventory_item"
           SET quantity      = quantity + $1::numeric,
               notes         = COALESCE($2, notes),
               modified_by   = $3,
               date_modified = NOW()
           WHERE id = $4
             AND quantity + $1::numeric <= 999999.999999
           RETURNING id`,
          [dto.quantity, dto.notes ?? null, userId, existing.id],
        );
        if (result.length === 0) {
          throw new BadRequestException(
            'Merged quantity would exceed the maximum allowed value of 999999.999999',
          );
        }
        return existing.id;
      }

      const item = repo.create({
        ...dto,
        orgId: dto.orgId,
        unitOfMeasure,
        locationType,
        locationUexId,
        addedBy: userId,
        modifiedBy: userId,
        active: true,
        deleted: false,
      });

      try {
        const saved = await repo.save(item);
        return saved.id;
      } catch (err: unknown) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === '23505'
        ) {
          throw new ConflictException(
            'Inventory item already exists for this organization',
          );
        }
        throw err;
      }
    });

    const loaded =
      await this.orgInventoryRepository.findByIdNotDeleted(savedId);

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
   * Split an inventory item into two independent rows
   */
  async split(
    userId: number,
    orgId: number,
    id: string,
    dto: SplitOrgInventoryItemDto,
  ): Promise<{ remaining: OrgInventoryItemDto; split: OrgInventoryItemDto }> {
    await this.verifyInventoryPermission(userId, orgId, 'manage');

    const [remainingId, splitId] = await this.dataSource.transaction(
      async (manager) => {
        const repo = manager.getRepository(OrgInventoryItem);

        const source = await repo
          .createQueryBuilder('oii')
          .setLock('pessimistic_write')
          .where('oii.id = :id', { id })
          .andWhere('oii.org_id = :orgId', { orgId })
          .andWhere('oii.deleted = FALSE')
          .andWhere('oii.active = TRUE')
          .getOne();

        if (!source) {
          throw new NotFoundException(`Inventory item with ID ${id} not found`);
        }

        const sourceQty = parseFloat(source.quantity.toString());
        if (dto.splitQuantity >= sourceQty) {
          throw new BadRequestException(
            'Split quantity must be less than the current quantity',
          );
        }

        const remainingQty = sourceQty - dto.splitQuantity;

        // Soft-delete the source so both new rows can be inserted without
        // colliding against the partial unique index (active=TRUE, deleted=FALSE)
        await manager.query(
          `UPDATE "org_inventory_item" SET deleted = TRUE, active = FALSE, modified_by = $1, date_modified = NOW() WHERE id = $2`,
          [userId, source.id],
        );

        const rowA = repo.create({
          orgId: source.orgId,
          gameId: source.gameId,
          uexItemId: source.uexItemId,
          quantity: remainingQty,
          unitOfMeasure: source.unitOfMeasure,
          quality: source.quality,
          locationType: source.locationType,
          locationUexId: source.locationUexId,
          notes: source.notes,
          active: true,
          deleted: false,
          addedBy: source.addedBy,
          modifiedBy: userId,
        });

        const rowB = repo.create({
          orgId: source.orgId,
          gameId: source.gameId,
          uexItemId: source.uexItemId,
          quantity: dto.splitQuantity,
          unitOfMeasure: source.unitOfMeasure,
          quality: source.quality,
          locationType: source.locationType,
          locationUexId: source.locationUexId,
          notes: source.notes,
          active: true,
          deleted: false,
          addedBy: source.addedBy,
          modifiedBy: userId,
        });

        const savedA = await repo.save(rowA);
        const savedB = await repo.save(rowB);

        return [savedA.id, savedB.id] as [string, string];
      },
    );

    const [remainingItem, splitItem] = await Promise.all([
      this.orgInventoryRepository.findByIdNotDeleted(remainingId),
      this.orgInventoryRepository.findByIdNotDeleted(splitId),
    ]);

    if (!remainingItem || !splitItem) {
      throw new NotFoundException('Failed to load split inventory items');
    }

    return {
      remaining: this.toDto(remainingItem),
      split: this.toDto(splitItem),
    };
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

    if (dto.quantity !== undefined) {
      item.quantity = dto.quantity;
    }
    if (dto.unitOfMeasure !== undefined) {
      item.unitOfMeasure = dto.unitOfMeasure;
    }
    if (dto.quality !== undefined) {
      item.quality = dto.quality;
    }
    if (dto.locationType !== undefined) {
      item.locationType = dto.locationType;
    }
    if (dto.locationUexId !== undefined) {
      item.locationUexId = dto.locationUexId;
    }
    if (dto.notes !== undefined) {
      item.notes = dto.notes;
    }
    if (dto.active !== undefined) {
      item.active = dto.active;
    }

    item.modifiedBy = userId;

    const savedId = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(OrgInventoryItem);

      // Lock the post-update identity so concurrent create() or update()
      // calls targeting the same identity serialize against this transaction.
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
        `oii:${orgId}:${item.gameId}:${item.uexItemId}:${item.unitOfMeasure ?? 'unit'}:${item.locationType ?? ''}:${item.locationUexId ?? -1}`,
      ]);

      if (item.active) {
        const collision = await repo
          .createQueryBuilder('oii')
          .where('oii.id != :id', { id })
          .andWhere('oii.org_id = :orgId', { orgId })
          .andWhere('oii.game_id = :gameId', { gameId: item.gameId })
          .andWhere('oii.uex_item_id = :uexItemId', {
            uexItemId: item.uexItemId,
          })
          .andWhere('oii.unit_of_measure = :unitOfMeasure', {
            unitOfMeasure: item.unitOfMeasure,
          })
          .andWhere('oii.location_type IS NOT DISTINCT FROM :locationType', {
            locationType: item.locationType ?? null,
          })
          .andWhere('oii.location_uex_id IS NOT DISTINCT FROM :locationUexId', {
            locationUexId: item.locationUexId ?? null,
          })
          .andWhere('oii.deleted = FALSE')
          .andWhere('oii.active = TRUE')
          .getOne();

        if (collision) {
          throw new ConflictException(
            'An inventory item with this combination already exists for this organization',
          );
        }
      }

      try {
        const saved = await repo.save(item);
        return saved.id;
      } catch (err: unknown) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === '23505'
        ) {
          throw new ConflictException(
            'An inventory item with this combination already exists for this organization',
          );
        }
        throw err;
      }
    });

    const loaded =
      await this.orgInventoryRepository.findByIdNotDeleted(savedId);

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
      activeOnly: searchDto.activeOnly,
      limit,
      offset,
      search: searchDto.search,
      minQuantity: searchDto.minQuantity,
      maxQuantity: searchDto.maxQuantity,
      minQuality: searchDto.minQuality,
      maxQuality: searchDto.maxQuality,
      unitOfMeasure: searchDto.unitOfMeasure,
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
  ): Promise<OrgInventorySummaryDto> {
    await this.verifyInventoryPermission(userId, orgId, 'view');

    const rows =
      await this.orgInventoryRepository.getOrgInventorySummary(orgId);

    return {
      orgId,
      aggregates: rows,
    };
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
