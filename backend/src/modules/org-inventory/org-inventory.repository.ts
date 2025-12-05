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
      relations: [
        'item',
        'location',
        'game',
        'org',
        'addedByUser',
        'modifiedByUser',
      ],
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
      relations: ['item', 'location', 'game', 'addedByUser', 'modifiedByUser'],
      order: { dateModified: 'DESC' },
    });
  }

  /**
   * Find a specific item by ID (non-deleted only)
   */
  async findByIdNotDeleted(id: string): Promise<OrgInventoryItem | null> {
    return this.findOne({
      where: { id, deleted: false },
      relations: [
        'item',
        'location',
        'game',
        'org',
        'addedByUser',
        'modifiedByUser',
      ],
    });
  }

  /**
   * Find inventory items by location
   */
  async findByLocationId(locationId: number): Promise<OrgInventoryItem[]> {
    return this.find({
      where: { locationId, deleted: false },
      relations: [
        'item',
        'location',
        'game',
        'org',
        'addedByUser',
        'modifiedByUser',
      ],
      order: { dateModified: 'DESC' },
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
      relations: ['item', 'location', 'game', 'addedByUser', 'modifiedByUser'],
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
   * Get inventory summary for an org
   */
  async getOrgInventorySummary(
    orgId: number,
    gameId: number,
  ): Promise<{
    totalItems: number;
    uniqueItems: number;
    locationCount: number;
    lastUpdated: Date | null;
  }> {
    const result = await this.createQueryBuilder('oii')
      .select('COUNT(*)', 'totalItems')
      .addSelect('COUNT(DISTINCT oii.uex_item_id)', 'uniqueItems')
      .addSelect('COUNT(DISTINCT oii.location_id)', 'locationCount')
      .addSelect('MAX(oii.date_modified)', 'lastUpdated')
      .where('oii.org_id = :orgId', { orgId })
      .andWhere('oii.game_id = :gameId', { gameId })
      .andWhere('oii.deleted = false')
      .andWhere('oii.active = true')
      .getRawOne();

    return {
      totalItems: parseInt(result.totalItems, 10) || 0,
      uniqueItems: parseInt(result.uniqueItems, 10) || 0,
      locationCount: parseInt(result.locationCount, 10) || 0,
      lastUpdated: result.lastUpdated || null,
    };
  }

  /**
   * Search inventory items with filters
   */
  async searchInventory(filters: {
    orgId: number;
    gameId: number;
    uexItemId?: number;
    locationId?: number;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<OrgInventoryItem[]> {
    const query = this.createQueryBuilder('oii')
      .leftJoinAndSelect('oii.item', 'item')
      .leftJoinAndSelect('oii.location', 'location')
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

    if (filters.locationId) {
      query.andWhere('oii.location_id = :locationId', {
        locationId: filters.locationId,
      });
    }

    if (filters.activeOnly) {
      query.andWhere('oii.active = true');
    }

    query.orderBy('oii.date_modified', 'DESC');

    if (filters.limit) {
      query.limit(filters.limit);
    }

    if (filters.offset) {
      query.offset(filters.offset);
    }

    return query.getMany();
  }
}
