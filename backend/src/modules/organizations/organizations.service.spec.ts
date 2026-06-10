import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { OrganizationsService } from './organizations.service';
import { Organization } from './organization.entity';
import { NotFoundException } from '@nestjs/common';
import { GamesService } from '../games/games.service';

const ORG_ID = '00000000-0000-0000-0000-000000000001';
const ORG_ID_2 = '00000000-0000-0000-0000-000000000002';
const GAME_ID = '00000000-0000-0000-0000-000000000011';
const GAME_ID_2 = '00000000-0000-0000-0000-000000000012';
const USER_ID = '00000000-0000-0000-0000-000000000021';
const ROLE_ID = '00000000-0000-0000-0000-000000000031';
const UOR_ID = '00000000-0000-0000-0000-000000000041';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockGamesService = {
    getDefaultGame: jest.fn(),
    getGameById: jest.fn(),
    getGameByCode: jest.fn(),
    getActiveGames: jest.fn(),
    validateGameId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: getRepositoryToken(Organization), useValue: mockRepository },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: GamesService, useValue: mockGamesService },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new organization using default game', async () => {
      const createOrgDto = {
        name: 'Acme Corp',
        description: 'A test organization',
        isActive: true,
      };
      const defaultGame = {
        id: GAME_ID,
        name: 'Star Citizen',
        code: 'sc',
        active: true,
      };
      const savedOrg = { id: ORG_ID, ...createOrgDto, gameId: GAME_ID };

      mockGamesService.getDefaultGame.mockResolvedValue(defaultGame);
      mockRepository.create.mockReturnValue(savedOrg);
      mockRepository.save.mockResolvedValue(savedOrg);

      const result = await service.create(createOrgDto);

      expect(result).toEqual(savedOrg);
      expect(mockGamesService.getDefaultGame).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createOrgDto,
        gameId: GAME_ID,
      });
    });

    it('should create a new organization with provided gameId', async () => {
      const createOrgDto = {
        name: 'Acme Corp',
        description: 'A test organization',
        isActive: true,
        gameId: GAME_ID_2,
      };
      const savedOrg = { id: ORG_ID, ...createOrgDto };

      mockRepository.create.mockReturnValue(savedOrg);
      mockRepository.save.mockResolvedValue(savedOrg);

      const result = await service.create(createOrgDto);

      expect(result).toEqual(savedOrg);
      expect(mockGamesService.getDefaultGame).not.toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith(createOrgDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of active organizations', async () => {
      const organizations = [
        { id: ORG_ID, name: 'Org 1', description: '', isActive: true },
        { id: ORG_ID_2, name: 'Org 2', description: '', isActive: true },
      ];
      mockRepository.find.mockResolvedValue(organizations);

      const result = await service.findAll();

      expect(result).toEqual(organizations);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return an organization by id', async () => {
      const organization = {
        id: ORG_ID,
        name: 'Acme Corp',
        description: '',
        isActive: true,
      };
      mockRepository.findOne.mockResolvedValue(organization);

      const result = await service.findOne(ORG_ID);

      expect(result).toEqual(organization);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: ORG_ID },
      });
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(
        service.findOne('00000000-0000-0000-0000-000000000999'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findWithMembers', () => {
    it('should return an organization with its members', async () => {
      const organization = {
        id: ORG_ID,
        name: 'Acme Corp',
        description: '',
        isActive: true,
        userOrganizationRoles: [
          {
            id: UOR_ID,
            userId: USER_ID,
            organizationId: ORG_ID,
            roleId: ROLE_ID,
            user: { id: USER_ID, username: 'john' },
            role: { id: ROLE_ID, name: 'Admin' },
          },
        ],
      };
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(organization);

      const result = await service.findWithMembers(ORG_ID);

      expect(result).toEqual(organization);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should return cached organization if available', async () => {
      const cached = {
        id: ORG_ID,
        name: 'Acme Corp',
        description: '',
        isActive: true,
        userOrganizationRoles: [],
      };
      mockCacheManager.get.mockResolvedValue(cached);

      const result = await service.findWithMembers(ORG_ID);

      expect(result).toEqual(cached);
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(null);
      await expect(
        service.findWithMembers('00000000-0000-0000-0000-000000000999'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an organization', async () => {
      const existingOrg = {
        id: ORG_ID,
        name: 'Acme Corp',
        description: 'Old',
        isActive: true,
      };
      const updateDto = { description: 'New description' };
      const updatedOrg = { ...existingOrg, ...updateDto };

      mockRepository.findOne.mockResolvedValue(existingOrg);
      mockRepository.save.mockResolvedValue(updatedOrg);

      const result = await service.update(ORG_ID, updateDto);

      expect(result).toEqual(updatedOrg);
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(
        service.update('00000000-0000-0000-0000-000000000999', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove an organization', async () => {
      const organization = {
        id: ORG_ID,
        name: 'Acme Corp',
        description: '',
        isActive: true,
      };
      mockRepository.findOne.mockResolvedValue(organization);
      mockRepository.remove.mockResolvedValue(organization);

      await service.remove(ORG_ID);

      expect(mockRepository.remove).toHaveBeenCalledWith(organization);
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(
        service.remove('00000000-0000-0000-0000-000000000999'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
