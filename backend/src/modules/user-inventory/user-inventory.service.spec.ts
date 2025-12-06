import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UserInventoryService } from './user-inventory.service';
import { UserInventoryItem } from './entities/user-inventory-item.entity';
import {
  CreateUserInventoryItemDto,
  UpdateUserInventoryItemDto,
  UserInventorySearchDto,
} from './dto/user-inventory-item.dto';

describe('UserInventoryService', () => {
  let service: UserInventoryService;
  let repository: Repository<UserInventoryItem>;

  const mockInventoryItem: UserInventoryItem = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 1,
    gameId: 1,
    uexItemId: 100,
    locationId: 200,
    quantity: 10.5,
    notes: 'Test item',
    sharedOrgId: undefined,
    active: true,
    deleted: false,
    dateAdded: new Date(),
    dateModified: new Date(),
    addedBy: 1,
    modifiedBy: 1,
    user: undefined as any,
    game: undefined as any,
    item: { name: 'Test Item' } as any,
    location: { displayName: 'Test Location' } as any,
    sharedOrg: undefined,
    addedByUser: undefined as any,
    modifiedByUser: undefined as any,
  };

  const mockQueryBuilder: any = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserInventoryService,
        {
          provide: getRepositoryToken(UserInventoryItem),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<UserInventoryService>(UserInventoryService);
    repository = module.get<Repository<UserInventoryItem>>(
      getRepositoryToken(UserInventoryItem),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all inventory items for a user', async () => {
      const searchDto: UserInventorySearchDto = { gameId: 1 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockInventoryItem],
        1,
      ]);

      const result = await service.findAll(1, searchDto);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe(mockInventoryItem.id);
      expect(result.items[0].itemName).toBe('Test Item');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'inventory.user_id = :userId',
        { userId: 1 },
      );
    });

    it('should filter by uexItemId', async () => {
      const searchDto: UserInventorySearchDto = { gameId: 1, uexItemId: 100 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockInventoryItem],
        1,
      ]);

      await service.findAll(1, searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'inventory.uex_item_id = :uexItemId',
        { uexItemId: 100 },
      );
    });

    it('should filter by locationId', async () => {
      const searchDto: UserInventorySearchDto = {
        gameId: 1,
        locationId: 200,
      };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockInventoryItem],
        1,
      ]);

      await service.findAll(1, searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'inventory.location_id = :locationId',
        { locationId: 200 },
      );
    });

    it('should filter by search text', async () => {
      const searchDto: UserInventorySearchDto = {
        gameId: 1,
        search: 'test',
      };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockInventoryItem],
        1,
      ]);

      await service.findAll(1, searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(item.name ILIKE :search OR inventory.notes ILIKE :search)',
        { search: '%test%' },
      );
    });
  });

  describe('findById', () => {
    it('should return an inventory item by id', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockInventoryItem);

      const result = await service.findById(mockInventoryItem.id, 1);

      expect(result.id).toBe(mockInventoryItem.id);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockInventoryItem.id, userId: 1, deleted: false },
        relations: ['item', 'location', 'sharedOrg'],
      });
    });

    it('should throw NotFoundException if item not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findById('invalid-id', 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new inventory item', async () => {
      const createDto: CreateUserInventoryItemDto = {
        gameId: 1,
        uexItemId: 100,
        locationId: 200,
        quantity: 10.5,
        notes: 'New item',
      };

      jest.spyOn(repository, 'create').mockReturnValue(mockInventoryItem);
      jest.spyOn(repository, 'save').mockResolvedValue(mockInventoryItem);
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockInventoryItem);

      const result = await service.create(1, createDto);

      expect(result.id).toBe(mockInventoryItem.id);
      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        userId: 1,
        addedBy: 1,
        modifiedBy: 1,
      });
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing inventory item', async () => {
      const updateDto: UpdateUserInventoryItemDto = {
        quantity: 20,
        notes: 'Updated notes',
      };

      const updatedItem = { ...mockInventoryItem, ...updateDto };
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockInventoryItem);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedItem);

      const result = await service.update(mockInventoryItem.id, 1, updateDto);

      expect(result.quantity).toBe(20);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          modifiedBy: 1,
        }),
      );
    });

    it('should throw NotFoundException if item not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(
        service.update('invalid-id', 1, { quantity: 20 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should soft delete an inventory item', async () => {
      const deletedItem = {
        ...mockInventoryItem,
        deleted: true,
        active: false,
      };
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockInventoryItem);
      jest.spyOn(repository, 'save').mockResolvedValue(deletedItem);

      await service.delete(mockInventoryItem.id, 1);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted: true,
          active: false,
          modifiedBy: 1,
        }),
      );
    });

    it('should throw NotFoundException if item not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.delete('invalid-id', 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSummary', () => {
    it('should return inventory summary for a user', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({
        totalItems: '10',
        uniqueItems: '5',
        locationCount: '3',
        sharedItemsCount: '2',
        lastUpdated: new Date(),
      });

      const result = await service.getSummary(1, 1);

      expect(result.totalItems).toBe(10);
      expect(result.uniqueItems).toBe(5);
      expect(result.locationCount).toBe(3);
      expect(result.sharedItemsCount).toBe(2);
    });
  });

  describe('findSharedByOrg', () => {
    it('should return shared items for an organization', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([mockInventoryItem]);

      const result = await service.findSharedByOrg(1, 1);

      expect(result).toHaveLength(1);
      expect(repository.find).toHaveBeenCalledWith({
        where: {
          sharedOrgId: 1,
          gameId: 1,
          deleted: false,
          active: true,
        },
        relations: ['item', 'location', 'user'],
        order: { dateModified: 'DESC' },
        take: 100,
      });
    });
  });
});
