import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolesService } from './roles.service';
import { Role } from './role.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

const ROLE_ID = '00000000-0000-0000-0000-000000000001';
const ROLE_ID_2 = '00000000-0000-0000-0000-000000000002';

describe('RolesService', () => {
  let service: RolesService;

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
        { provide: getRepositoryToken(Role), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
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
      const savedRole = { id: ROLE_ID, ...createRoleDto };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(savedRole);
      mockRepository.save.mockResolvedValue(savedRole);

      const result = await service.create(createRoleDto);

      expect(result).toEqual(savedRole);
      expect(mockRepository.create).toHaveBeenCalledWith(createRoleDto);
    });

    it('should throw ConflictException if role with same name exists', async () => {
      const createRoleDto = { name: 'Admin', permissions: {}, description: '' };
      mockRepository.findOne.mockResolvedValue({
        id: ROLE_ID,
        ...createRoleDto,
      });

      await expect(service.create(createRoleDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of roles', async () => {
      const roles = [
        { id: ROLE_ID, name: 'Admin', permissions: {}, description: '' },
        { id: ROLE_ID_2, name: 'User', permissions: {}, description: '' },
      ];
      mockRepository.find.mockResolvedValue(roles);

      const result = await service.findAll();

      expect(result).toEqual(roles);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a role by id', async () => {
      const role = {
        id: ROLE_ID,
        name: 'Admin',
        permissions: {},
        description: '',
      };
      mockRepository.findOne.mockResolvedValue(role);

      const result = await service.findOne(ROLE_ID);

      expect(result).toEqual(role);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: ROLE_ID },
      });
    });

    it('should throw NotFoundException if role not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(
        service.findOne('00000000-0000-0000-0000-000000000999'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a role', async () => {
      const existingRole = {
        id: ROLE_ID,
        name: 'Admin',
        permissions: {},
        description: '',
      };
      const updateDto = { description: 'Updated description' };
      const updatedRole = { ...existingRole, ...updateDto };

      mockRepository.findOne.mockResolvedValue(existingRole);
      mockRepository.save.mockResolvedValue(updatedRole);

      const result = await service.update(ROLE_ID, updateDto);

      expect(result).toEqual(updatedRole);
    });

    it('should throw ConflictException when updating to existing role name', async () => {
      const existingRole = {
        id: ROLE_ID,
        name: 'Admin',
        permissions: {},
        description: '',
      };
      const conflictingRole = {
        id: ROLE_ID_2,
        name: 'SuperAdmin',
        permissions: {},
        description: '',
      };

      mockRepository.findOne
        .mockResolvedValueOnce(existingRole)
        .mockResolvedValueOnce(conflictingRole);

      await expect(
        service.update(ROLE_ID, { name: 'SuperAdmin' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should remove a role', async () => {
      const role = {
        id: ROLE_ID,
        name: 'Admin',
        permissions: {},
        description: '',
      };
      mockRepository.findOne.mockResolvedValue(role);
      mockRepository.remove.mockResolvedValue(role);

      await service.remove(ROLE_ID);

      expect(mockRepository.remove).toHaveBeenCalledWith(role);
    });

    it('should throw NotFoundException if role not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(
        service.remove('00000000-0000-0000-0000-000000000999'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByName', () => {
    it('should return a role by name', async () => {
      const role = {
        id: ROLE_ID,
        name: 'Admin',
        permissions: {},
        description: '',
      };
      mockRepository.findOne.mockResolvedValue(role);

      const result = await service.findByName('Admin');

      expect(result).toEqual(role);
    });

    it('should return null if role not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await service.findByName('NonExistent');
      expect(result).toBeNull();
    });
  });
});
