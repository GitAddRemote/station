import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolesService } from './roles.service';
import { Role } from './role.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('RolesService', () => {
  let service: RolesService;
  let repository: Repository<Role>;

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
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    repository = module.get<Repository<Role>>(getRepositoryToken(Role));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new role', async () => {
      const createRoleDto = {
        name: 'Admin',
        permissions: { canEdit: true },
        description: 'Administrator role',
      };

      const savedRole = { id: 1, ...createRoleDto, createdAt: new Date(), updatedAt: new Date() };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(savedRole);
      mockRepository.save.mockResolvedValue(savedRole);

      const result = await service.create(createRoleDto);

      expect(result).toEqual(savedRole);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { name: 'Admin' } });
      expect(mockRepository.create).toHaveBeenCalledWith(createRoleDto);
      expect(mockRepository.save).toHaveBeenCalledWith(savedRole);
    });

    it('should throw ConflictException if role with same name exists', async () => {
      const createRoleDto = { name: 'Admin', permissions: {}, description: '' };
      const existingRole = { id: 1, ...createRoleDto };

      mockRepository.findOne.mockResolvedValue(existingRole);

      await expect(service.create(createRoleDto)).rejects.toThrow(ConflictException);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of roles', async () => {
      const roles = [
        { id: 1, name: 'Admin', permissions: {}, description: '' },
        { id: 2, name: 'User', permissions: {}, description: '' },
      ];

      mockRepository.find.mockResolvedValue(roles);

      const result = await service.findAll();

      expect(result).toEqual(roles);
      expect(mockRepository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    });
  });

  describe('findOne', () => {
    it('should return a role by id', async () => {
      const role = { id: 1, name: 'Admin', permissions: {}, description: '' };

      mockRepository.findOne.mockResolvedValue(role);

      const result = await service.findOne(1);

      expect(result).toEqual(role);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException if role not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a role', async () => {
      const existingRole = { id: 1, name: 'Admin', permissions: {}, description: '' };
      const updateDto = { description: 'Updated description' };
      const updatedRole = { ...existingRole, ...updateDto };

      mockRepository.findOne.mockResolvedValue(existingRole);
      mockRepository.save.mockResolvedValue(updatedRole);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(updatedRole);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when updating to existing role name', async () => {
      const existingRole = { id: 1, name: 'Admin', permissions: {}, description: '' };
      const conflictingRole = { id: 2, name: 'SuperAdmin', permissions: {}, description: '' };

      mockRepository.findOne
        .mockResolvedValueOnce(existingRole)
        .mockResolvedValueOnce(conflictingRole);

      await expect(service.update(1, { name: 'SuperAdmin' })).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should remove a role', async () => {
      const role = { id: 1, name: 'Admin', permissions: {}, description: '' };

      mockRepository.findOne.mockResolvedValue(role);
      mockRepository.remove.mockResolvedValue(role);

      await service.remove(1);

      expect(mockRepository.remove).toHaveBeenCalledWith(role);
    });

    it('should throw NotFoundException if role not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByName', () => {
    it('should return a role by name', async () => {
      const role = { id: 1, name: 'Admin', permissions: {}, description: '' };

      mockRepository.findOne.mockResolvedValue(role);

      const result = await service.findByName('Admin');

      expect(result).toEqual(role);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { name: 'Admin' } });
    });

    it('should return null if role not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByName('NonExistent');

      expect(result).toBeNull();
    });
  });
});
