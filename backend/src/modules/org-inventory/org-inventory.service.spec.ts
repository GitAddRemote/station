import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { OrgInventoryService } from './org-inventory.service';
import { OrgInventoryRepository } from './org-inventory.repository';
import { PermissionsService } from '../permissions/permissions.service';
import { OrgInventoryItem } from './entities/org-inventory-item.entity';
import {
  CreateOrgInventoryItemDto,
  UpdateOrgInventoryItemDto,
  OrgInventorySearchDto,
} from './dto/org-inventory-item.dto';
import { Organization } from '../organizations/organization.entity';
import { Game } from '../games/game.entity';
import { UexItem } from '../uex/entities/uex-item.entity';
import { Location, LocationType } from '../locations/entities/location.entity';
import { User } from '../users/user.entity';
import { OrgPermission } from '../permissions/permissions.constants';

describe('OrgInventoryService', () => {
  let service: OrgInventoryService;
  let repository: OrgInventoryRepository;
  let permissionsService: PermissionsService;

  const mockOrg: Organization = { id: 1, name: 'Test Org' } as Organization;
  const mockGame: Game = { id: 1, name: 'Star Citizen' } as Game;
  const mockItem: UexItem = { id: 1, uexId: 100, name: 'Test Item' } as UexItem;
  const mockLocation: Location = {
    id: 200,
    gameId: 1,
    displayName: 'Test Location',
    shortName: 'Test Location',
    locationType: LocationType.CITY,
    active: true,
    deleted: false,
    dateAdded: new Date(),
    dateModified: new Date(),
  } as unknown as Location;
  const mockUser: User = { id: 1, username: 'testuser' } as User;

  const mockOrgInventoryItem: OrgInventoryItem = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    orgId: 1,
    gameId: 1,
    uexItemId: 100,
    locationId: 200,
    quantity: 10.5,
    notes: 'Test org item',
    active: true,
    deleted: false,
    dateAdded: new Date(),
    dateModified: new Date(),
    addedBy: 1,
    modifiedBy: 1,
    org: mockOrg,
    game: mockGame,
    item: mockItem,
    location: mockLocation,
    addedByUser: mockUser,
    modifiedByUser: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgInventoryService,
        {
          provide: OrgInventoryRepository,
          useValue: {
            findByOrgIdAndGameId: jest.fn(),
            findByIdNotDeleted: jest.fn(),
            findExistingItem: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDeleteItem: jest.fn(),
            searchInventory: jest.fn(),
            getOrgInventorySummary: jest.fn(),
            findByLocationId: jest.fn(),
            findByUexItemId: jest.fn(),
          },
        },
        {
          provide: PermissionsService,
          useValue: {
            hasPermission: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrgInventoryService>(OrgInventoryService);
    repository = module.get<OrgInventoryRepository>(OrgInventoryRepository);
    permissionsService = module.get<PermissionsService>(PermissionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateOrgInventoryItemDto = {
      orgId: 1,
      gameId: 1,
      uexItemId: 100,
      locationId: 200,
      quantity: 10.5,
      notes: 'Test notes',
    };

    it('should create org inventory item with manage permission', async () => {
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(repository, 'findExistingItem').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue(mockOrgInventoryItem);
      jest.spyOn(repository, 'save').mockResolvedValue(mockOrgInventoryItem);
      jest
        .spyOn(repository, 'findByIdNotDeleted')
        .mockResolvedValue(mockOrgInventoryItem);

      const result = await service.create(1, createDto);

      expect(result.id).toBe(mockOrgInventoryItem.id);
      expect(permissionsService.hasPermission).toHaveBeenCalledWith(
        1,
        1,
        OrgPermission.CAN_EDIT_ORG_INVENTORY,
      );
      expect(repository.findExistingItem).toHaveBeenCalledWith({
        orgId: createDto.orgId,
        gameId: createDto.gameId,
        uexItemId: createDto.uexItemId,
        locationId: createDto.locationId,
      });
      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        addedBy: 1,
        modifiedBy: 1,
        active: true,
        deleted: false,
      });
    });

    it('should throw ForbiddenException without manage permission', async () => {
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(false);

      await expect(service.create(1, createDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when item already exists', async () => {
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(true);
      jest
        .spyOn(repository, 'findExistingItem')
        .mockResolvedValue(mockOrgInventoryItem);

      await expect(service.create(1, createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findByOrgAndGame', () => {
    it('should return org inventory items with view permission', async () => {
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(true);
      jest
        .spyOn(repository, 'findByOrgIdAndGameId')
        .mockResolvedValue([mockOrgInventoryItem]);

      const result = await service.findByOrgAndGame(1, 1, 1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockOrgInventoryItem.id);
      expect(permissionsService.hasPermission).toHaveBeenCalledWith(
        1,
        1,
        OrgPermission.CAN_VIEW_ORG_INVENTORY,
      );
    });

    it('should throw ForbiddenException without view permission', async () => {
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(false);

      await expect(service.findByOrgAndGame(1, 1, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findById', () => {
    it('should return org inventory item by id', async () => {
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(true);
      jest
        .spyOn(repository, 'findByIdNotDeleted')
        .mockResolvedValue(mockOrgInventoryItem);

      const result = await service.findById(1, 1, mockOrgInventoryItem.id);

      expect(result.id).toBe(mockOrgInventoryItem.id);
      expect(repository.findByIdNotDeleted).toHaveBeenCalledWith(
        mockOrgInventoryItem.id,
      );
    });

    it('should throw NotFoundException if item not found', async () => {
      jest.spyOn(repository, 'findByIdNotDeleted').mockResolvedValue(null);

      await expect(service.findById(1, 1, 'nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if item belongs to a different org', async () => {
      jest.spyOn(repository, 'findByIdNotDeleted').mockResolvedValue({
        ...mockOrgInventoryItem,
        orgId: 999,
      });
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(true);

      await expect(
        service.findById(1, 1, mockOrgInventoryItem.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException without view permission', async () => {
      jest
        .spyOn(repository, 'findByIdNotDeleted')
        .mockResolvedValue(mockOrgInventoryItem);
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(false);

      await expect(
        service.findById(1, 1, mockOrgInventoryItem.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateOrgInventoryItemDto = {
      quantity: 20,
      notes: 'Updated notes',
    };

    it('should update org inventory item with manage permission', async () => {
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(true);
      jest
        .spyOn(repository, 'findByIdNotDeleted')
        .mockResolvedValue(mockOrgInventoryItem);
      const updatedItem = { ...mockOrgInventoryItem, ...updateDto };
      jest.spyOn(repository, 'save').mockResolvedValue(updatedItem);

      const result = await service.update(
        1,
        1,
        mockOrgInventoryItem.id,
        updateDto,
      );

      expect(result.quantity).toBe(20);
      expect(result.notes).toBe('Updated notes');
      expect(permissionsService.hasPermission).toHaveBeenCalledWith(
        1,
        1,
        OrgPermission.CAN_EDIT_ORG_INVENTORY,
      );
    });

    it('should throw NotFoundException if item not found', async () => {
      jest.spyOn(repository, 'findByIdNotDeleted').mockResolvedValue(null);

      await expect(
        service.update(1, 1, 'nonexistent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when item belongs to a different org', async () => {
      jest.spyOn(repository, 'findByIdNotDeleted').mockResolvedValue({
        ...mockOrgInventoryItem,
        orgId: 999,
      });

      await expect(
        service.update(1, 1, mockOrgInventoryItem.id, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException without manage permission', async () => {
      jest
        .spyOn(repository, 'findByIdNotDeleted')
        .mockResolvedValue(mockOrgInventoryItem);
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(false);

      await expect(
        service.update(1, 1, mockOrgInventoryItem.id, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should soft delete org inventory item with manage permission', async () => {
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(true);
      jest
        .spyOn(repository, 'findByIdNotDeleted')
        .mockResolvedValue(mockOrgInventoryItem);
      jest.spyOn(repository, 'softDeleteItem').mockResolvedValue(true);

      await service.delete(1, 1, mockOrgInventoryItem.id);

      expect(repository.softDeleteItem).toHaveBeenCalledWith(
        mockOrgInventoryItem.id,
        1,
      );
    });

    it('should throw NotFoundException if item not found', async () => {
      jest.spyOn(repository, 'findByIdNotDeleted').mockResolvedValue(null);

      await expect(service.delete(1, 1, 'nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when deleting item from another org', async () => {
      jest.spyOn(repository, 'findByIdNotDeleted').mockResolvedValue({
        ...mockOrgInventoryItem,
        orgId: 999,
      });

      await expect(
        service.delete(1, 1, mockOrgInventoryItem.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException without manage permission', async () => {
      jest
        .spyOn(repository, 'findByIdNotDeleted')
        .mockResolvedValue(mockOrgInventoryItem);
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(false);

      await expect(
        service.delete(1, 1, mockOrgInventoryItem.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('search', () => {
    const searchDto: OrgInventorySearchDto = {
      orgId: 1,
      gameId: 1,
      activeOnly: true,
    };

    it('should search org inventory items with view permission', async () => {
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(true);
      jest
        .spyOn(repository, 'searchInventory')
        .mockResolvedValue({ items: [mockOrgInventoryItem], total: 1 });

      const result = await service.search(1, searchDto);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(repository.searchInventory).toHaveBeenCalledWith({
        orgId: 1,
        gameId: 1,
        activeOnly: true,
        locationId: undefined,
        uexItemId: undefined,
        categoryId: undefined,
        limit: 100,
        offset: 0,
        search: undefined,
        minQuantity: undefined,
        maxQuantity: undefined,
        sort: 'date_modified',
        order: 'desc',
      });
    });

    it('should throw ForbiddenException without view permission', async () => {
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(false);

      await expect(service.search(1, searchDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getSummary', () => {
    it('should return org inventory summary with view permission', async () => {
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(repository, 'getOrgInventorySummary').mockResolvedValue({
        totalItems: 10,
        uniqueItems: 5,
        locationCount: 3,
        lastUpdated: new Date(),
      });

      const result = await service.getSummary(1, 1, 1);

      expect(result.totalItems).toBe(10);
      expect(result.uniqueItems).toBe(5);
      expect(result.locationCount).toBe(3);
    });

    it('should throw ForbiddenException without view permission', async () => {
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(false);

      await expect(service.getSummary(1, 1, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findByLocation', () => {
    it('should return org inventory items by location', async () => {
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(true);
      jest
        .spyOn(repository, 'findByLocationId')
        .mockResolvedValue([mockOrgInventoryItem]);

      const result = await service.findByLocation(1, 1, 200);

      expect(result).toHaveLength(1);
      expect(result[0].locationId).toBe(200);
    });

    it('should filter out items from other orgs', async () => {
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(true);
      const otherOrgItem = { ...mockOrgInventoryItem, orgId: 2 };
      jest
        .spyOn(repository, 'findByLocationId')
        .mockResolvedValue([mockOrgInventoryItem, otherOrgItem]);

      const result = await service.findByLocation(1, 1, 200);

      expect(result).toHaveLength(1);
      expect(result[0].orgId).toBe(1);
    });
  });

  describe('findByUexItem', () => {
    it('should return org inventory items by UEX item', async () => {
      jest.spyOn(permissionsService, 'hasPermission').mockResolvedValue(true);
      jest
        .spyOn(repository, 'findByUexItemId')
        .mockResolvedValue([mockOrgInventoryItem]);

      const result = await service.findByUexItem(1, 1, 100);

      expect(result).toHaveLength(1);
      expect(result[0].uexItemId).toBe(100);
    });
  });
});
