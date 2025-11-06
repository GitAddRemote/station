import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationsService } from './organizations.service';
import { Organization } from './organization.entity';
import { NotFoundException } from '@nestjs/common';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let repository: Repository<Organization>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    repository = module.get<Repository<Organization>>(getRepositoryToken(Organization));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new organization', async () => {
      const createOrgDto = {
        name: 'Acme Corp',
        description: 'A test organization',
        isActive: true,
      };

      const savedOrg = {
        id: 1,
        ...createOrgDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(savedOrg);
      mockRepository.save.mockResolvedValue(savedOrg);

      const result = await service.create(createOrgDto);

      expect(result).toEqual(savedOrg);
      expect(mockRepository.create).toHaveBeenCalledWith(createOrgDto);
      expect(mockRepository.save).toHaveBeenCalledWith(savedOrg);
    });
  });

  describe('findAll', () => {
    it('should return an array of active organizations', async () => {
      const organizations = [
        { id: 1, name: 'Org 1', description: '', isActive: true },
        { id: 2, name: 'Org 2', description: '', isActive: true },
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
        id: 1,
        name: 'Acme Corp',
        description: '',
        isActive: true,
      };

      mockRepository.findOne.mockResolvedValue(organization);

      const result = await service.findOne(1);

      expect(result).toEqual(organization);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findWithMembers', () => {
    it('should return an organization with its members', async () => {
      const organization = {
        id: 1,
        name: 'Acme Corp',
        description: '',
        isActive: true,
        userOrganizationRoles: [
          {
            id: 1,
            userId: 1,
            organizationId: 1,
            roleId: 1,
            user: { id: 1, username: 'john' },
            role: { id: 1, name: 'Admin' },
          },
        ],
      };

      mockRepository.findOne.mockResolvedValue(organization);

      const result = await service.findWithMembers(1);

      expect(result).toEqual(organization);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['userOrganizationRoles', 'userOrganizationRoles.user', 'userOrganizationRoles.role'],
      });
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findWithMembers(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an organization', async () => {
      const existingOrg = {
        id: 1,
        name: 'Acme Corp',
        description: 'Old description',
        isActive: true,
      };
      const updateDto = { description: 'New description' };
      const updatedOrg = { ...existingOrg, ...updateDto };

      mockRepository.findOne.mockResolvedValue(existingOrg);
      mockRepository.save.mockResolvedValue(updatedOrg);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(updatedOrg);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { name: 'New Name' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove an organization', async () => {
      const organization = {
        id: 1,
        name: 'Acme Corp',
        description: '',
        isActive: true,
      };

      mockRepository.findOne.mockResolvedValue(organization);
      mockRepository.remove.mockResolvedValue(organization);

      await service.remove(1);

      expect(mockRepository.remove).toHaveBeenCalledWith(organization);
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
