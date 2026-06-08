import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { AddInventoryListItemDto } from './dto/add-inventory-list-item.dto';
import { CreateInventoryListDto } from './dto/create-inventory-list.dto';
import { InventoryListDto } from './dto/inventory-list.dto';
import { InventoryListItemDto } from './dto/inventory-list-item.dto';
import { StationInventoryItem } from './entities/station-inventory-item.entity';
import { StationInventoryListItem } from './entities/station-inventory-list-item.entity';
import { StationInventoryList } from './entities/station-inventory-list.entity';

@Injectable()
export class InventoryService {
  private static readonly MAX_USER_LISTS = 5;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StationInventoryItem)
    private readonly inventoryItemRepository: Repository<StationInventoryItem>,
    @InjectRepository(StationInventoryList)
    private readonly inventoryListRepository: Repository<StationInventoryList>,
    @InjectRepository(StationInventoryListItem)
    private readonly inventoryListItemRepository: Repository<StationInventoryListItem>,
    private readonly dataSource: DataSource,
  ) {}

  async createList(
    userId: number,
    dto: CreateInventoryListDto,
  ): Promise<InventoryListDto> {
    const ownerId = await this.getUserOwnerUuid(userId);
    const name = dto.name.trim();

    const saved = await this.dataSource.transaction(
      'REPEATABLE READ',
      async (manager) => {
        const existingCount = await manager.count(StationInventoryList, {
          where: { ownerType: 'user', ownerId },
        });

        if (existingCount >= InventoryService.MAX_USER_LISTS) {
          throw new UnprocessableEntityException(
            'Users may only have up to 5 inventory lists',
          );
        }

        const list = manager.create(StationInventoryList, {
          ownerType: 'user',
          ownerId,
          name,
          isShared: false,
        });

        return manager.save(StationInventoryList, list);
      },
    );

    return this.toInventoryListDto(saved);
  }

  async listLists(userId: number): Promise<InventoryListDto[]> {
    const ownerId = await this.getUserOwnerUuid(userId);
    const lists = await this.inventoryListRepository.find({
      where: { ownerType: 'user', ownerId },
      order: { createdAt: 'ASC' },
    });

    return lists.map((list) => this.toInventoryListDto(list));
  }

  async deleteList(userId: number, listId: string): Promise<void> {
    const list = await this.getOwnedUserListOrThrow(userId, listId);
    await this.inventoryListRepository.delete({ id: list.id });
  }

  async addItemToList(
    userId: number,
    listId: string,
    dto: AddInventoryListItemDto,
  ): Promise<InventoryListItemDto> {
    const ownerId = await this.getUserOwnerUuid(userId);
    await this.getOwnedUserListByOwnerIdOrThrow(ownerId, listId);

    const inventoryItem = await this.inventoryItemRepository.findOne({
      where: {
        id: dto.inventoryItemId,
        ownerType: 'user',
        ownerId,
      },
    });

    if (!inventoryItem) {
      throw new NotFoundException('Inventory item not found');
    }

    const listItem = this.inventoryListItemRepository.create({
      listId,
      inventoryItemId: dto.inventoryItemId,
    });

    try {
      const saved = await this.inventoryListItemRepository.save(listItem);
      return this.toInventoryListItemDto(saved);
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        const existing = await this.inventoryListItemRepository.findOne({
          where: { listId, inventoryItemId: dto.inventoryItemId },
        });
        return this.toInventoryListItemDto(existing!);
      }
      throw error;
    }
  }

  async removeItemFromList(
    userId: number,
    listId: string,
    inventoryItemId: string,
  ): Promise<void> {
    await this.getOwnedUserListOrThrow(userId, listId);

    const result = await this.inventoryListItemRepository.delete({
      listId,
      inventoryItemId,
    });

    if (!result.affected) {
      throw new NotFoundException('Inventory list item not found');
    }
  }

  private async getUserOwnerUuid(userId: number): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isSystemUser: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.idUuid;
  }

  private async getOwnedUserListOrThrow(
    userId: number,
    listId: string,
  ): Promise<StationInventoryList> {
    const ownerId = await this.getUserOwnerUuid(userId);
    return this.getOwnedUserListByOwnerIdOrThrow(ownerId, listId);
  }

  // Intentionally user-only; org lists are not yet supported
  private async getOwnedUserListByOwnerIdOrThrow(
    ownerId: string,
    listId: string,
  ): Promise<StationInventoryList> {
    const list = await this.inventoryListRepository.findOne({
      where: {
        id: listId,
        ownerType: 'user',
        ownerId,
      },
    });

    if (!list) {
      throw new NotFoundException('Inventory list not found');
    }

    return list;
  }

  private toInventoryListDto(list: StationInventoryList): InventoryListDto {
    return {
      id: list.id,
      name: list.name,
      isShared: list.isShared,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    };
  }

  private toInventoryListItemDto(
    listItem: StationInventoryListItem,
  ): InventoryListItemDto {
    return {
      listId: listItem.listId,
      inventoryItemId: listItem.inventoryItemId,
      createdAt: listItem.createdAt,
    };
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    (('code' in error && error.code === '23505') ||
      ('driverError' in error &&
        error.driverError !== null &&
        typeof error.driverError === 'object' &&
        'code' in error.driverError &&
        error.driverError.code === '23505'))
  );
}
