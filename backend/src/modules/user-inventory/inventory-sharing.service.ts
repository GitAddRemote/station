import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserInventoryItem } from './entities/user-inventory-item.entity';
import { InventoryAuditLog } from './entities/inventory-audit-log.entity';
import { ShareItemDto } from './dto/share-item.dto';

@Injectable()
export class InventorySharingService {
  private readonly logger = new Logger(InventorySharingService.name);

  constructor(
    @InjectRepository(UserInventoryItem)
    private readonly inventoryRepository: Repository<UserInventoryItem>,
    @InjectRepository(InventoryAuditLog)
    private readonly auditLogRepository: Repository<InventoryAuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async shareItemWithOrg(
    userId: number,
    itemId: string,
    shareDto: ShareItemDto,
  ): Promise<void> {
    const { orgId, quantity } = shareDto;

    await this.dataSource.transaction(async (manager) => {
      // 1. Validate user is member of org
      const membershipCheck = await manager.query(
        `
        SELECT 1 FROM "user_organization_role"
        WHERE "userId" = $1 AND "organizationId" = $2
        LIMIT 1
      `,
        [userId, orgId],
      );

      if (!membershipCheck || membershipCheck.length === 0) {
        throw new ForbiddenException(
          'User is not a member of this organization',
        );
      }

      // 2. Get current inventory item
      const item = await manager.findOne(UserInventoryItem, {
        where: { id: itemId },
      });

      if (!item || item.userId !== userId) {
        throw new NotFoundException('Inventory item not found');
      }

      if (item.deleted) {
        throw new BadRequestException('Cannot share deleted item');
      }

      if (item.sharedOrgId === orgId) {
        throw new BadRequestException(
          'Item already shared with this organization',
        );
      }

      if (quantity > Number(item.quantity)) {
        throw new BadRequestException(
          'Quantity to share exceeds available quantity',
        );
      }

      // 3. Determine split strategy
      if (quantity === Number(item.quantity) && !item.sharedOrgId) {
        // Simple case: share entire unshared item
        item.sharedOrgId = orgId;
        item.modifiedBy = userId;
        item.dateModified = new Date();
        await manager.save(UserInventoryItem, item);

        this.logger.log(
          `User ${userId} shared item ${itemId} (full quantity: ${quantity}) with org ${orgId}`,
        );
      } else if (quantity < Number(item.quantity)) {
        // Split case: reduce original quantity, create new shared record
        const originalQuantity = Number(item.quantity);
        item.quantity = originalQuantity - quantity;
        item.modifiedBy = userId;
        item.dateModified = new Date();
        await manager.save(UserInventoryItem, item);

        // Create new shared record
        const newItem = manager.create(UserInventoryItem, {
          userId: item.userId,
          gameId: item.gameId,
          uexItemId: item.uexItemId,
          locationId: item.locationId,
          quantity,
          sharedOrgId: orgId,
          active: true,
          deleted: false,
          notes: item.notes,
          addedBy: userId,
          modifiedBy: userId,
          dateAdded: new Date(),
          dateModified: new Date(),
        });

        await manager.save(UserInventoryItem, newItem);

        this.logger.log(
          `User ${userId} split item ${itemId}: kept ${item.quantity}, shared ${quantity} with org ${orgId} as new item`,
        );
      } else {
        throw new BadRequestException(
          'Quantity to share cannot exceed available quantity',
        );
      }

      // 4. Log the share event
      const auditLog = manager.create(InventoryAuditLog, {
        eventType: 'MANUAL_SHARE',
        userId,
        orgId,
        inventoryItemId: itemId,
        recordsAffected: 1,
        reason: 'User manually shared item',
        metadata: { quantityShared: quantity },
        dateCreated: new Date(),
      });

      await manager.save(InventoryAuditLog, auditLog);
    });
  }

  async unshareItemFromOrg(userId: number, itemId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(UserInventoryItem, {
        where: { id: itemId },
      });

      if (!item || item.userId !== userId) {
        throw new ForbiddenException('Cannot unshare item');
      }

      if (!item.sharedOrgId) {
        throw new BadRequestException('Item is not currently shared');
      }

      const orgId = item.sharedOrgId;

      item.sharedOrgId = null;
      item.modifiedBy = userId;
      item.dateModified = new Date();
      await manager.save(UserInventoryItem, item);

      // Log the unshare event
      const auditLog = manager.create(InventoryAuditLog, {
        eventType: 'MANUAL_UNSHARE',
        userId,
        orgId,
        inventoryItemId: itemId,
        recordsAffected: 1,
        reason: 'User manually unshared item',
        dateCreated: new Date(),
      });

      await manager.save(InventoryAuditLog, auditLog);

      this.logger.log(
        `User ${userId} unshared item ${itemId} from org ${orgId}`,
      );
    });
  }

  async findUserSharedItems(
    userId: number,
    orgId: number,
  ): Promise<UserInventoryItem[]> {
    return this.inventoryRepository.find({
      where: {
        userId,
        sharedOrgId: orgId,
        deleted: false,
        active: true,
      },
      relations: ['item', 'location', 'sharedOrg'],
      order: {
        dateModified: 'DESC',
      },
    });
  }

  async getAuditLog(
    userId?: number,
    orgId?: number,
    limit: number = 100,
  ): Promise<InventoryAuditLog[]> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .leftJoinAndSelect('audit.organization', 'org')
      .leftJoinAndSelect('audit.inventoryItem', 'item')
      .orderBy('audit.dateCreated', 'DESC')
      .limit(limit);

    if (userId) {
      queryBuilder.andWhere('audit.user_id = :userId', { userId });
    }

    if (orgId) {
      queryBuilder.andWhere('audit.org_id = :orgId', { orgId });
    }

    return queryBuilder.getMany();
  }
}
