import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { OrgInventoryItem } from './entities/org-inventory-item.entity';

@Injectable()
export class OrgInventoryRepository extends Repository<OrgInventoryItem> {
  constructor(private dataSource: DataSource) {
    super(OrgInventoryItem, dataSource.createEntityManager());
  }

  /**
   * Find all active (non-deleted) inventory items for an org
   */
  async findByOrgId(orgId: number): Promise<OrgInventoryItem[]> {
    return this.find({
      where: { orgId, deleted: false },
      relations: ['item', 'game', 'org', 'addedByUser', 'modifiedByUser'],
      order: { dateModified: 'DESC' },
    });
  }

  /**
   * Find inventory items by org and game
   */
  async findByOrgIdAndGameId(
    orgId: number,
    gameId: number,
  ): Promise<OrgInventoryItem[]> {
    return this.find({
      where: { orgId, gameId, deleted: false },
      relations: ['item', 'game', 'addedByUser', 'modifiedByUser'],
      order: { dateModified: 'DESC' },
    });
  }

  /**
   * Find a specific item by ID (non-deleted only)
   */
  async findByIdNotDeleted(id: string): Promise<OrgInventoryItem | null> {
    return this.findOne({
      where: { id, deleted: false },
      relations: ['item', 'game', 'org', 'addedByUser', 'modifiedByUser'],
    });
  }

  /**
   * Find inventory items by UEX item ID
   */
  async findByUexItemId(
    orgId: number,
    uexItemId: number,
  ): Promise<OrgInventoryItem[]> {
    return this.find({
      where: { orgId, uexItemId, deleted: false },
      relations: ['item', 'game', 'addedByUser', 'modifiedByUser'],
      order: { dateModified: 'DESC' },
    });
  }

  /**
   * Soft delete an inventory item
   */
  async softDeleteItem(id: string, modifiedBy: number): Promise<boolean> {
    const result = await this.update(
      { id, deleted: false },
      { deleted: true, modifiedBy },
    );
    return result.affected ? result.affected > 0 : false;
  }

  /**
   * Get aggregated inventory summary for an org from the view.
   */
  async getOrgInventorySummary(orgId: number): Promise<
    {
      uexItemId: number;
      unitOfMeasure: string;
      totalQuantity: number;
      itemCount: number;
      latestUpdate: Date | null;
    }[]
  > {
    const rows: {
      uex_item_id: string;
      unit_of_measure: string;
      total_quantity: string;
      item_count: string;
      latest_update: Date | null;
    }[] = await this.manager.query(
      `SELECT uex_item_id, unit_of_measure, total_quantity, item_count, latest_update
       FROM org_shared_inventory_summary
       WHERE org_id = $1
       ORDER BY uex_item_id, unit_of_measure`,
      [orgId],
    );

    return rows.map((r) => ({
      uexItemId: Number(r.uex_item_id),
      unitOfMeasure: r.unit_of_measure,
      totalQuantity: parseFloat(r.total_quantity),
      itemCount: Number(r.item_count),
      latestUpdate: r.latest_update,
    }));
  }

  /**
   * Search inventory items with filters
   */
  async searchInventory(filters: {
    orgId: number;
    gameId: number;
    uexItemId?: number;
    categoryId?: number;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
    minQuantity?: number;
    maxQuantity?: number;
    minQuality?: number;
    maxQuality?: number;
    unitOfMeasure?: 'unit' | 'scu' | 'uscu';
    sort?: 'name' | 'quantity' | 'quality' | 'date_added' | 'date_modified';
    order?: 'asc' | 'desc';
  }): Promise<{ items: OrgInventoryItem[]; total: number }> {
    const query = this.createQueryBuilder('oii')
      .leftJoinAndSelect('oii.item', 'item')
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('oii.game', 'game')
      .leftJoinAndSelect('oii.org', 'org')
      .leftJoinAndSelect('oii.addedByUser', 'addedBy')
      .leftJoinAndSelect('oii.modifiedByUser', 'modifiedBy')
      .where('oii.org_id = :orgId', { orgId: filters.orgId })
      .andWhere('oii.game_id = :gameId', { gameId: filters.gameId })
      .andWhere('oii.deleted = false');

    if (filters.uexItemId) {
      query.andWhere('oii.uex_item_id = :uexItemId', {
        uexItemId: filters.uexItemId,
      });
    }

    if (filters.categoryId) {
      query.andWhere('item.idCategory = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters.minQuantity !== undefined) {
      query.andWhere('oii.quantity >= :minQuantity', {
        minQuantity: filters.minQuantity,
      });
    }

    if (filters.maxQuantity !== undefined) {
      query.andWhere('oii.quantity <= :maxQuantity', {
        maxQuantity: filters.maxQuantity,
      });
    }

    if (filters.minQuality !== undefined) {
      query.andWhere('oii.quality >= :minQuality', {
        minQuality: filters.minQuality,
      });
    }

    if (filters.maxQuality !== undefined) {
      query.andWhere('oii.quality <= :maxQuality', {
        maxQuality: filters.maxQuality,
      });
    }

    if (filters.unitOfMeasure !== undefined) {
      query.andWhere('oii.unit_of_measure = :unitOfMeasure', {
        unitOfMeasure: filters.unitOfMeasure,
      });
    }

    if (filters.activeOnly) {
      query.andWhere('oii.active = true');
    }

    if (filters.search) {
      query.andWhere('(item.name ILIKE :search OR oii.notes ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    const limit = Math.min(filters.limit ?? 100, 500);
    const offset = filters.offset ?? 0;

    const sortColumn = this.resolveSortColumn(filters.sort);
    const sortDirection = (filters.order || 'desc').toUpperCase() as
      | 'ASC'
      | 'DESC';

    query.orderBy(sortColumn, sortDirection).take(limit).skip(offset);

    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  private resolveSortColumn(
    sort?: 'name' | 'quantity' | 'quality' | 'date_added' | 'date_modified',
  ): string {
    switch (sort) {
      case 'name':
        return 'item.name';
      case 'quantity':
        return 'oii.quantity';
      case 'quality':
        return 'oii.quality';
      case 'date_added':
        return 'oii.dateAdded';
      case 'date_modified':
      default:
        return 'oii.dateModified';
    }
  }
}
