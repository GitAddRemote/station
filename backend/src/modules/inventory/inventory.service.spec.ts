import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, DeleteResult } from 'typeorm';
import { StationCatalogEntry } from '../catalog/entities/station-catalog-entry.entity';
import { StationCatalogCategory } from '../catalog/entities/station-catalog-category.entity';
import { StationLocation } from '../locations/entities/station-location.entity';
import { Organization } from '../organizations/organization.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { UserOrganizationRolesService } from '../user-organization-roles/user-organization-roles.service';
import { User } from '../users/user.entity';
import { StationInventoryItem } from './entities/station-inventory-item.entity';
import { StationInventoryListItem } from './entities/station-inventory-list-item.entity';
import { StationInventoryList } from './entities/station-inventory-list.entity';
import { StationUnitOfMeasure } from './entities/station-unit-of-measure.entity';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let savedInventoryItem: StationInventoryItem | null;

  const user = {
    id: 7,
    idUuid: '00000000-0000-0000-0000-000000000007',
    username: 'pilot',
    isSystemUser: false,
  } satisfies Partial<User>;

  const category = {
    id: '00000000-0000-0000-0000-000000000301',
    name: 'Weapons',
    path: 'item.weapons',
  } satisfies Partial<StationCatalogCategory>;

  const itemCatalogEntry = {
    id: '00000000-0000-0000-0000-000000000101',
    catalogKind: 'item',
    categoryId: category.id,
    category,
    name: 'Laser Rifle',
    isAvailableLive: true,
  } as StationCatalogEntry;

  const commodityCatalogEntry = {
    id: '00000000-0000-0000-0000-000000000102',
    catalogKind: 'commodity',
    categoryId: category.id,
    category,
    name: 'Quantanium',
    isAvailableLive: true,
  } as StationCatalogEntry;

  const unknownLocation = {
    id: '00000000-0000-0000-0000-000000000401',
    slug: 'unknown',
    name: 'Unknown',
  } as StationLocation;

  const unit = {
    id: '00000000-0000-0000-0000-000000000201',
    code: 'unit',
    label: 'Unit',
    description: 'Discrete item',
  } as StationUnitOfMeasure;

  const scu = {
    id: '00000000-0000-0000-0000-000000000202',
    code: 'scu',
    label: 'SCU',
    description: 'Cargo unit',
  } as StationUnitOfMeasure;

  const organization = {
    id: 99,
    idUuid: '00000000-0000-0000-0000-000000000099',
    isActive: true,
    name: 'Station Logistics',
  } as Organization;

  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockOrganizationRepository = {
    findOne: jest.fn(),
  };

  const mockCatalogEntryRepository = {
    findOne: jest.fn(),
  };

  const mockLocationRepository = {
    findOne: jest.fn(),
  };

  const mockUnitOfMeasureRepository = {
    findOne: jest.fn(),
  };

  const mockInventoryItemRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
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

  const mockPermissionsService = {
    hasPermission: jest.fn(),
  };

  const mockUserOrganizationRolesService = {
    getUserOrganizations: jest.fn(),
    getOrganizationMembers: jest.fn(),
  };

  const createQueryBuilder = () => {
    const builder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getMany: jest.fn(),
    };

    mockInventoryItemRepository.createQueryBuilder.mockReturnValue(builder);
    return builder;
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
          provide: getRepositoryToken(Organization),
          useValue: mockOrganizationRepository,
        },
        {
          provide: getRepositoryToken(StationCatalogEntry),
          useValue: mockCatalogEntryRepository,
        },
        {
          provide: getRepositoryToken(StationLocation),
          useValue: mockLocationRepository,
        },
        {
          provide: getRepositoryToken(StationUnitOfMeasure),
          useValue: mockUnitOfMeasureRepository,
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
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
        {
          provide: UserOrganizationRolesService,
          useValue: mockUserOrganizationRolesService,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  beforeEach(() => {
    savedInventoryItem = null;
    mockUserRepository.findOne.mockResolvedValue(user);
    mockUserRepository.find.mockResolvedValue([user]);
    mockCatalogEntryRepository.findOne.mockResolvedValue(itemCatalogEntry);
    mockLocationRepository.findOne.mockResolvedValue(unknownLocation);
    mockUnitOfMeasureRepository.findOne.mockResolvedValue(unit);
    mockInventoryItemRepository.create.mockImplementation((value) => value);
    mockInventoryItemRepository.save.mockImplementation(async (value) => {
      savedInventoryItem = {
        id: '00000000-0000-0000-0000-000000000501',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        catalogEntry:
          value.catalogEntryId === commodityCatalogEntry.id
            ? commodityCatalogEntry
            : itemCatalogEntry,
        location: unknownLocation,
        unitOfMeasure: value.unitOfMeasureId === scu.id ? scu : unit,
        ...value,
      } as StationInventoryItem;
      return savedInventoryItem;
    });
    mockInventoryItemRepository.findOne.mockImplementation(
      async ({ where }: { where: { id: string } }) => {
        if (
          where.id === '00000000-0000-0000-0000-000000000501' &&
          savedInventoryItem
        ) {
          return savedInventoryItem;
        }
        return null;
      },
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a personal inventory item using the authenticated user UUID owner', async () => {
    const result = await service.createItem(7, {
      catalogEntryId: itemCatalogEntry.id,
      quantity: 2,
      unitOfMeasureId: unit.id,
    });

    expect(mockInventoryItemRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerType: 'user',
        ownerId: user.idUuid,
        catalogEntryId: itemCatalogEntry.id,
        unitOfMeasureId: unit.id,
        quantity: '2.000000',
      }),
    );
    expect(result.ownerId).toBe(user.idUuid);
    expect(result.itemName).toBe('Laser Rifle');
  });

  it('rejects fractional quantities for discrete items', async () => {
    await expect(
      service.createItem(7, {
        catalogEntryId: itemCatalogEntry.id,
        quantity: 1.5,
        unitOfMeasureId: unit.id,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects incompatible commodity units of measure', async () => {
    mockCatalogEntryRepository.findOne.mockResolvedValue(commodityCatalogEntry);

    await expect(
      service.createItem(7, {
        catalogEntryId: commodityCatalogEntry.id,
        quantity: 1,
        unitOfMeasureId: unit.id,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates an organization inventory item when the user has org inventory permission', async () => {
    mockOrganizationRepository.findOne.mockResolvedValue(organization);
    mockPermissionsService.hasPermission.mockResolvedValue(true);
    mockUserOrganizationRolesService.getUserOrganizations.mockResolvedValue([
      { organizationId: organization.id },
    ]);
    mockCatalogEntryRepository.findOne.mockResolvedValue(commodityCatalogEntry);
    mockUnitOfMeasureRepository.findOne.mockResolvedValue(scu);

    const result = await service.createItem(7, {
      ownerType: 'org',
      ownerId: organization.idUuid,
      catalogEntryId: commodityCatalogEntry.id,
      quantity: 3.25,
      unitOfMeasureId: scu.id,
    });

    expect(result.ownerType).toBe('org');
    expect(result.ownerId).toBe(organization.idUuid);
  });

  it('rejects organization inventory creation without permission', async () => {
    mockOrganizationRepository.findOne.mockResolvedValue(organization);
    mockPermissionsService.hasPermission.mockResolvedValue(false);
    mockUserOrganizationRolesService.getUserOrganizations.mockResolvedValue([
      { organizationId: organization.id },
    ]);

    await expect(
      service.createItem(7, {
        ownerType: 'org',
        ownerId: organization.idUuid,
        catalogEntryId: itemCatalogEntry.id,
        quantity: 1,
        unitOfMeasureId: unit.id,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists the authenticated user inventory by default', async () => {
    const builder = createQueryBuilder();
    builder.getManyAndCount.mockResolvedValue([
      [
        {
          id: '00000000-0000-0000-0000-000000000501',
          ownerType: 'user',
          ownerId: user.idUuid,
          catalogEntryId: itemCatalogEntry.id,
          catalogKind: itemCatalogEntry.catalogKind,
          catalogEntry: itemCatalogEntry,
          locationId: unknownLocation.id,
          location: unknownLocation,
          unitOfMeasureId: unit.id,
          unitOfMeasure: unit,
          quantity: '2.000000',
          quality: null,
          isOrgAvailable: false,
          alias: null,
          notes: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      1,
    ]);

    const result = await service.listItems(7, {});

    expect(builder.where).toHaveBeenCalled();
    expect(builder.skip).toHaveBeenCalledWith(0);
    expect(result.total).toBe(1);
    expect(result.data[0].ownerId).toBe(user.idUuid);
  });

  it('lists org inventory including member-contributed shared items and returns a summary', async () => {
    const member = {
      id: 8,
      idUuid: '00000000-0000-0000-0000-000000000008',
      isSystemUser: false,
    } as User;
    mockOrganizationRepository.findOne.mockResolvedValue(organization);
    mockUserOrganizationRolesService.getUserOrganizations.mockResolvedValue([
      { organizationId: organization.id },
    ]);
    mockUserOrganizationRolesService.getOrganizationMembers.mockResolvedValue([
      { userId: user.id },
      { userId: member.id },
    ]);
    mockUserRepository.find.mockResolvedValue([user, member]);

    const builder = createQueryBuilder();
    const orgItem = {
      id: '00000000-0000-0000-0000-000000000601',
      ownerType: 'org',
      ownerId: organization.idUuid,
      catalogEntryId: commodityCatalogEntry.id,
      catalogKind: commodityCatalogEntry.catalogKind,
      catalogEntry: commodityCatalogEntry,
      locationId: unknownLocation.id,
      location: unknownLocation,
      unitOfMeasureId: scu.id,
      unitOfMeasure: scu,
      quantity: '4.000000',
      quality: null,
      isOrgAvailable: false,
      alias: null,
      notes: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as StationInventoryItem;
    const sharedUserItem = {
      ...orgItem,
      id: '00000000-0000-0000-0000-000000000602',
      ownerType: 'user',
      ownerId: member.idUuid,
      isOrgAvailable: true,
      quantity: '2.500000',
    } as StationInventoryItem;
    builder.getManyAndCount.mockResolvedValue([[orgItem, sharedUserItem], 2]);
    builder.getMany.mockResolvedValue([orgItem, sharedUserItem]);

    const result = await service.listItems(7, {
      ownerType: 'org',
      ownerId: organization.idUuid,
      includeSummary: true,
    });

    expect(result.total).toBe(2);
    expect(result.summary?.totalQuantity).toBe(6.5);
    expect(result.summary?.byCategory[0].categoryId).toBe(category.id);
  });

  it('updates a user-owned inventory item', async () => {
    savedInventoryItem = {
      id: '00000000-0000-0000-0000-000000000501',
      ownerType: 'user',
      ownerId: user.idUuid,
      catalogEntryId: itemCatalogEntry.id,
      catalogKind: itemCatalogEntry.catalogKind,
      catalogEntry: itemCatalogEntry,
      locationId: unknownLocation.id,
      location: unknownLocation,
      unitOfMeasureId: unit.id,
      unitOfMeasure: unit,
      quantity: '2.000000',
      quality: null,
      isOrgAvailable: false,
      alias: null,
      notes: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as StationInventoryItem;

    const result = await service.updateItem(
      7,
      '00000000-0000-0000-0000-000000000501',
      {
        quantity: 4,
        notes: 'Restocked',
      },
    );

    expect(mockInventoryItemRepository.save).toHaveBeenCalled();
    expect(result.quantity).toBe(4);
  });

  it('prevents updating another users inventory item', async () => {
    mockInventoryItemRepository.findOne.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000501',
      ownerType: 'user',
      ownerId: '00000000-0000-0000-0000-000000000999',
      catalogEntryId: itemCatalogEntry.id,
      catalogKind: itemCatalogEntry.catalogKind,
      catalogEntry: itemCatalogEntry,
      locationId: unknownLocation.id,
      location: unknownLocation,
      unitOfMeasureId: unit.id,
      unitOfMeasure: unit,
      quantity: '2.000000',
      quality: null,
      isOrgAvailable: false,
      alias: null,
      notes: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as StationInventoryItem);

    await expect(
      service.updateItem(7, '00000000-0000-0000-0000-000000000501', {
        quantity: 4,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deletes a user-owned inventory item', async () => {
    savedInventoryItem = {
      id: '00000000-0000-0000-0000-000000000501',
      ownerType: 'user',
      ownerId: user.idUuid,
      catalogEntryId: itemCatalogEntry.id,
      catalogKind: itemCatalogEntry.catalogKind,
      catalogEntry: itemCatalogEntry,
      locationId: unknownLocation.id,
      location: unknownLocation,
      unitOfMeasureId: unit.id,
      unitOfMeasure: unit,
      quantity: '2.000000',
      quality: null,
      isOrgAvailable: false,
      alias: null,
      notes: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as StationInventoryItem;
    mockInventoryItemRepository.delete.mockResolvedValue({
      raw: [],
      affected: 1,
    } satisfies DeleteResult);

    await service.deleteItem(7, '00000000-0000-0000-0000-000000000501');

    expect(mockInventoryItemRepository.delete).toHaveBeenCalledWith({
      id: '00000000-0000-0000-0000-000000000501',
    });
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
      ownerId: user.idUuid,
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

  it('prevents adding another user inventory item to a list', async () => {
    mockInventoryListRepository.findOne.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000101',
      ownerType: 'user',
      ownerId: user.idUuid,
    } satisfies Partial<StationInventoryList>);
    mockInventoryItemRepository.findOne.mockResolvedValueOnce(null);

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
