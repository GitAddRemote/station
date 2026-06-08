import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, DeleteResult } from 'typeorm';
import { User } from '../users/user.entity';
import { StationInventoryItem } from './entities/station-inventory-item.entity';
import { StationInventoryListItem } from './entities/station-inventory-list-item.entity';
import { StationInventoryList } from './entities/station-inventory-list.entity';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockInventoryItemRepository = {
    findOne: jest.fn(),
  };

  const mockInventoryListRepository = {
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockInventoryListItemRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  // Simulates DataSource.transaction by running the callback with a manager
  // that delegates to the same mock repositories.
  const mockTransactionManager = {
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(
      (_isolation: string, cb: (manager: unknown) => Promise<unknown>) =>
        cb(mockTransactionManager),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(StationInventoryItem),
          useValue: mockInventoryItemRepository,
        },
        {
          provide: getRepositoryToken(StationInventoryList),
          useValue: mockInventoryListRepository,
        },
        {
          provide: getRepositoryToken(StationInventoryListItem),
          useValue: mockInventoryListItemRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  beforeEach(() => {
    mockUserRepository.findOne.mockResolvedValue({
      id: 7,
      idUuid: '00000000-0000-0000-0000-000000000007',
      isSystemUser: false,
    } satisfies Partial<User>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a list for the authenticated user inside a transaction', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    mockTransactionManager.count.mockResolvedValue(0);
    mockTransactionManager.create.mockImplementation(
      (_entity: unknown, value: unknown) => value,
    );
    mockTransactionManager.save.mockImplementation(
      async (_entity: unknown, value: unknown) => ({
        id: '00000000-0000-0000-0000-000000000101',
        createdAt,
        updatedAt,
        ...(value as object),
      }),
    );

    const result = await service.createList(7, { name: '  To Sell  ' });

    expect(mockDataSource.transaction).toHaveBeenCalledWith(
      'REPEATABLE READ',
      expect.any(Function),
    );
    expect(mockTransactionManager.create).toHaveBeenCalledWith(
      StationInventoryList,
      {
        ownerType: 'user',
        ownerId: '00000000-0000-0000-0000-000000000007',
        name: 'To Sell',
        isShared: false,
      },
    );
    expect(result).toEqual({
      id: '00000000-0000-0000-0000-000000000101',
      name: 'To Sell',
      isShared: false,
      createdAt,
      updatedAt,
    });
  });

  it('enforces the max 5 lists per user limit inside the transaction', async () => {
    mockTransactionManager.count.mockResolvedValue(5);

    await expect(
      service.createList(7, { name: 'Loadout' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('lists only the authenticated user inventory lists', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    mockInventoryListRepository.find.mockResolvedValue([
      {
        id: '00000000-0000-0000-0000-000000000101',
        name: 'To Sell',
        isShared: false,
        createdAt,
        updatedAt,
      },
    ]);

    const result = await service.listLists(7);

    expect(mockInventoryListRepository.find).toHaveBeenCalledWith({
      where: {
        ownerType: 'user',
        ownerId: '00000000-0000-0000-0000-000000000007',
      },
      order: { createdAt: 'ASC' },
    });
    expect(result).toEqual([
      {
        id: '00000000-0000-0000-0000-000000000101',
        name: 'To Sell',
        isShared: false,
        createdAt,
        updatedAt,
      },
    ]);
  });

  it('deletes an owned inventory list without touching inventory items', async () => {
    mockInventoryListRepository.findOne.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000101',
      ownerType: 'user',
      ownerId: '00000000-0000-0000-0000-000000000007',
    } satisfies Partial<StationInventoryList>);

    await service.deleteList(7, '00000000-0000-0000-0000-000000000101');

    expect(mockInventoryListRepository.delete).toHaveBeenCalledWith({
      id: '00000000-0000-0000-0000-000000000101',
    });
  });

  it('adds an owned inventory item to an owned list', async () => {
    const createdAt = new Date('2026-01-03T00:00:00.000Z');
    mockInventoryListRepository.findOne.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000101',
      ownerType: 'user',
      ownerId: '00000000-0000-0000-0000-000000000007',
    } satisfies Partial<StationInventoryList>);
    mockInventoryItemRepository.findOne.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000202',
      ownerType: 'user',
      ownerId: '00000000-0000-0000-0000-000000000007',
    } satisfies Partial<StationInventoryItem>);
    mockInventoryListItemRepository.create.mockImplementation((value) => value);
    mockInventoryListItemRepository.save.mockImplementation(async (value) => ({
      createdAt,
      ...value,
    }));

    const result = await service.addItemToList(
      7,
      '00000000-0000-0000-0000-000000000101',
      {
        inventoryItemId: '00000000-0000-0000-0000-000000000202',
      },
    );

    expect(result).toEqual({
      listId: '00000000-0000-0000-0000-000000000101',
      inventoryItemId: '00000000-0000-0000-0000-000000000202',
      createdAt,
    });
  });

  it('returns the existing list item idempotently on concurrent duplicate insert', async () => {
    const createdAt = new Date('2026-01-03T00:00:00.000Z');
    const existingItem = {
      listId: '00000000-0000-0000-0000-000000000101',
      inventoryItemId: '00000000-0000-0000-0000-000000000202',
      createdAt,
    };

    mockInventoryListRepository.findOne.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000101',
      ownerType: 'user',
      ownerId: '00000000-0000-0000-0000-000000000007',
    } satisfies Partial<StationInventoryList>);
    mockInventoryItemRepository.findOne.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000202',
      ownerType: 'user',
      ownerId: '00000000-0000-0000-0000-000000000007',
    } satisfies Partial<StationInventoryItem>);
    mockInventoryListItemRepository.create.mockImplementation((value) => value);
    mockInventoryListItemRepository.save.mockRejectedValue({ code: '23505' });
    mockInventoryListItemRepository.findOne.mockResolvedValue(existingItem);

    const result = await service.addItemToList(
      7,
      '00000000-0000-0000-0000-000000000101',
      { inventoryItemId: '00000000-0000-0000-0000-000000000202' },
    );

    expect(result).toEqual(existingItem);
  });

  it('allows the same inventory item to belong to multiple lists', async () => {
    mockInventoryListRepository.findOne.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000102',
      ownerType: 'user',
      ownerId: '00000000-0000-0000-0000-000000000007',
    } satisfies Partial<StationInventoryList>);
    mockInventoryItemRepository.findOne.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000202',
      ownerType: 'user',
      ownerId: '00000000-0000-0000-0000-000000000007',
    } satisfies Partial<StationInventoryItem>);
    mockInventoryListItemRepository.create.mockImplementation((value) => value);
    mockInventoryListItemRepository.save.mockImplementation(async (value) => ({
      createdAt: new Date('2026-01-04T00:00:00.000Z'),
      ...value,
    }));

    await service.addItemToList(7, '00000000-0000-0000-0000-000000000102', {
      inventoryItemId: '00000000-0000-0000-0000-000000000202',
    });

    expect(mockInventoryListItemRepository.save).toHaveBeenCalledWith({
      listId: '00000000-0000-0000-0000-000000000102',
      inventoryItemId: '00000000-0000-0000-0000-000000000202',
    });
  });

  it('removes an inventory item from an owned list', async () => {
    mockInventoryListRepository.findOne.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000101',
      ownerType: 'user',
      ownerId: '00000000-0000-0000-0000-000000000007',
    } satisfies Partial<StationInventoryList>);
    mockInventoryListItemRepository.delete.mockResolvedValue({
      raw: [],
      affected: 1,
    } satisfies DeleteResult);

    await service.removeItemFromList(
      7,
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000202',
    );

    expect(mockInventoryListItemRepository.delete).toHaveBeenCalledWith({
      listId: '00000000-0000-0000-0000-000000000101',
      inventoryItemId: '00000000-0000-0000-0000-000000000202',
    });
  });

  it('prevents modifying another user list', async () => {
    mockInventoryListRepository.findOne.mockResolvedValue(null);

    await expect(
      service.deleteList(7, '00000000-0000-0000-0000-000000000999'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents adding another user inventory item to a list', async () => {
    mockInventoryListRepository.findOne.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000101',
      ownerType: 'user',
      ownerId: '00000000-0000-0000-0000-000000000007',
    } satisfies Partial<StationInventoryList>);
    mockInventoryItemRepository.findOne.mockResolvedValue(null);

    await expect(
      service.addItemToList(7, '00000000-0000-0000-0000-000000000101', {
        inventoryItemId: '00000000-0000-0000-0000-000000000202',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when the user is not found', async () => {
    mockUserRepository.findOne.mockResolvedValue(null);

    await expect(service.listLists(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
