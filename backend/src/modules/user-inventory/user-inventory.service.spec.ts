import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { getLoggerToken } from 'nestjs-pino';
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
  let transactionRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOneByOrFail: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let transactionQueryBuilder: {
    setLock: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getOne: jest.Mock;
  };

  const mockInventoryItem: UserInventoryItem = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 1,
    gameId: 1,
    uexItemId: 100,
    quantity: 10.5,
    unitOfMeasure: 'unit',
    quality: undefined,
    locationType: undefined,
    locationUexId: undefined,
    notes: 'Test item',
    sharedOrgId: undefined,
    active: true,
    deleted: false,
    dateAdded: new Date(),
    dateModified: new Date(),
    addedBy: 1,
    modifiedBy: 1,
    user: undefined as unknown as UserInventoryItem['user'],
    game: undefined as unknown as UserInventoryItem['game'],
    item: { name: 'Test Item' } as unknown as UserInventoryItem['item'],
    sharedOrg: undefined,
    addedByUser: undefined as unknown as UserInventoryItem['addedByUser'],
    modifiedByUser: undefined as unknown as UserInventoryItem['modifiedByUser'],
  };

  const mockQueryBuilder: Record<string, jest.Mock> = {
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
    transactionQueryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    transactionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOneByOrFail: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(transactionQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserInventoryService,
        {
          provide: getLoggerToken(UserInventoryService.name),
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserInventoryItem),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            manager: {
              transaction: jest
                .fn()
                .mockImplementation(
                  (
                    callback: (manager: {
                      getRepository: () => typeof transactionRepository;
                      query: jest.Mock;
                    }) => Promise<unknown>,
                  ) =>
                    callback({
                      getRepository: jest
                        .fn()
                        .mockReturnValue(transactionRepository),
                      query: jest.fn().mockResolvedValue([{ id: 'mock-uuid' }]),
                    }),
                ),
            },
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

    it('should filter by min and max quantity', async () => {
      const searchDto: UserInventorySearchDto = {
        gameId: 1,
        minQuantity: 5,
        maxQuantity: 20,
      };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockInventoryItem],
        1,
      ]);

      await service.findAll(1, searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'inventory.quantity >= :minQuantity',
        { minQuantity: 5 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'inventory.quantity <= :maxQuantity',
        { maxQuantity: 20 },
      );
    });

    it('should filter by minQuality and maxQuality', async () => {
      const searchDto: UserInventorySearchDto = {
        gameId: 1,
        minQuality: 10,
        maxQuality: 50,
      };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockInventoryItem],
        1,
      ]);

      await service.findAll(1, searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'inventory.quality >= :minQuality',
        { minQuality: 10 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'inventory.quality <= :maxQuality',
        { maxQuality: 50 },
      );
    });

    it('should filter by unitOfMeasure', async () => {
      const searchDto: UserInventorySearchDto = {
        gameId: 1,
        unitOfMeasure: 'scu',
      };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockInventoryItem],
        1,
      ]);

      await service.findAll(1, searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'inventory.unit_of_measure = :unitOfMeasure',
        { unitOfMeasure: 'scu' },
      );
    });

    it('should sort by date_modified by default', async () => {
      const searchDto: UserInventorySearchDto = {
        gameId: 1,
        order: 'asc',
      };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockInventoryItem],
        1,
      ]);

      await service.findAll(1, searchDto);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'inventory.dateModified',
        'ASC',
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
        relations: ['item', 'sharedOrg'],
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
    it('should create a new inventory item when none exists', async () => {
      const createDto: CreateUserInventoryItemDto = {
        gameId: 1,
        uexItemId: 100,
        quantity: 10.5,
        notes: 'New item',
      };

      transactionRepository.create.mockReturnValue(mockInventoryItem);
      transactionRepository.save.mockResolvedValue(mockInventoryItem);
      transactionQueryBuilder.getOne.mockResolvedValue(null);
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockInventoryItem);

      const result = await service.create(1, createDto);

      expect(result.id).toBe(mockInventoryItem.id);
      expect(transactionRepository.create).toHaveBeenCalledWith({
        ...createDto,
        userId: 1,
        addedBy: 1,
        modifiedBy: 1,
      });
      expect(transactionRepository.save).toHaveBeenCalled();
    });

    it('should merge quantity when item with same keys exists', async () => {
      const createDto: CreateUserInventoryItemDto = {
        gameId: 1,
        uexItemId: 100,
        quantity: 2,
        notes: 'merge note',
      };

      const existingItem = { ...mockInventoryItem, quantity: 3, notes: 'old' };

      const mergedItem = { ...existingItem, quantity: 5, notes: 'merge note' };
      transactionQueryBuilder.getOne.mockResolvedValue(existingItem);
      transactionRepository.findOneByOrFail.mockResolvedValue(mergedItem);
      jest.spyOn(repository, 'findOne').mockResolvedValue(mergedItem);

      const result = await service.create(1, createDto);

      expect(transactionRepository.save).not.toHaveBeenCalled();
      expect(result.quantity).toBe(5);
    });

    it('should throw BadRequestException when merged quantity exceeds max', async () => {
      const createDto: CreateUserInventoryItemDto = {
        gameId: 1,
        uexItemId: 100,
        quantity: 999999.999999,
      };

      const existingItem = { ...mockInventoryItem, quantity: 1 };
      transactionQueryBuilder.getOne.mockResolvedValue(existingItem);
      // Simulate overflow: manager.query returns [] (WHERE quantity check failed)
      (repository.manager.transaction as jest.Mock).mockImplementationOnce(
        (
          callback: (manager: {
            getRepository: () => typeof transactionRepository;
            query: jest.Mock;
          }) => Promise<unknown>,
        ) =>
          callback({
            getRepository: jest.fn().mockReturnValue(transactionRepository),
            query: jest.fn().mockResolvedValue([]),
          }),
      );

      await expect(service.create(1, createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(transactionRepository.save).not.toHaveBeenCalled();
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

    it('should throw ConflictException on unique constraint violation (23505)', async () => {
      const updateDto: UpdateUserInventoryItemDto = { unitOfMeasure: 'scu' };
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockInventoryItem);
      jest.spyOn(repository, 'save').mockRejectedValue({ code: '23505' });

      await expect(
        service.update(mockInventoryItem.id, 1, updateDto),
      ).rejects.toThrow(ConflictException);
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
        sharedItemsCount: '2',
        lastUpdated: new Date(),
      });

      const result = await service.getSummary(1, 1);

      expect(result.totalItems).toBe(10);
      expect(result.uniqueItems).toBe(5);
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
        relations: ['item', 'user'],
        order: { dateModified: 'DESC' },
        take: 100,
      });
    });
  });
});
