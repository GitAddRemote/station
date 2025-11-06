import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserOrganizationRolesService } from './user-organization-roles.service';
import { UserOrganizationRole } from './user-organization-role.entity';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/organization.entity';
import { Role } from '../roles/role.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('UserOrganizationRolesService', () => {
  let service: UserOrganizationRolesService;
  let uorRepository: Repository<UserOrganizationRole>;
  let userRepository: Repository<User>;
  let orgRepository: Repository<Organization>;
  let roleRepository: Repository<Role>;

  const mockUorRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockOrgRepository = {
    findOne: jest.fn(),
  };

  const mockRoleRepository = {
    findOne: jest.fn(),
    findByIds: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserOrganizationRolesService,
        {
          provide: getRepositoryToken(UserOrganizationRole),
          useValue: mockUorRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrgRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
      ],
    }).compile();

    service = module.get<UserOrganizationRolesService>(UserOrganizationRolesService);
    uorRepository = module.get<Repository<UserOrganizationRole>>(
      getRepositoryToken(UserOrganizationRole),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    orgRepository = module.get<Repository<Organization>>(getRepositoryToken(Organization));
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignRole', () => {
    it('should assign a role to a user in an organization', async () => {
      const assignDto = { userId: 1, organizationId: 1, roleId: 1 };
      const savedAssignment = { id: 1, ...assignDto, assignedAt: new Date() };

      mockUserRepository.findOne.mockResolvedValue({ id: 1, username: 'john' });
      mockOrgRepository.findOne.mockResolvedValue({ id: 1, name: 'Acme' });
      mockRoleRepository.findOne.mockResolvedValue({ id: 1, name: 'Admin' });
      mockUorRepository.findOne.mockResolvedValue(null);
      mockUorRepository.create.mockReturnValue(savedAssignment);
      mockUorRepository.save.mockResolvedValue(savedAssignment);

      const result = await service.assignRole(assignDto);

      expect(result).toEqual(savedAssignment);
      expect(mockUorRepository.save).toHaveBeenCalledWith(savedAssignment);
    });

    it('should throw NotFoundException if user not found', async () => {
      const assignDto = { userId: 999, organizationId: 1, roleId: 1 };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.assignRole(assignDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if assignment already exists', async () => {
      const assignDto = { userId: 1, organizationId: 1, roleId: 1 };

      mockUserRepository.findOne.mockResolvedValue({ id: 1 });
      mockOrgRepository.findOne.mockResolvedValue({ id: 1 });
      mockRoleRepository.findOne.mockResolvedValue({ id: 1 });
      mockUorRepository.findOne.mockResolvedValue({ id: 1, ...assignDto });

      await expect(service.assignRole(assignDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('assignMultipleRoles', () => {
    it('should assign multiple roles to a user', async () => {
      const assignDto = { userId: 1, organizationId: 1, roleIds: [1, 2, 3] };
      const roles = [
        { id: 1, name: 'Admin' },
        { id: 2, name: 'Developer' },
        { id: 3, name: 'Viewer' },
      ];

      mockUserRepository.findOne.mockResolvedValue({ id: 1 });
      mockOrgRepository.findOne.mockResolvedValue({ id: 1 });
      mockRoleRepository.findByIds.mockResolvedValue(roles);
      mockUorRepository.find.mockResolvedValue([]);
      mockUorRepository.create.mockImplementation((dto) => dto);
      mockUorRepository.save.mockResolvedValue([
        { id: 1, userId: 1, organizationId: 1, roleId: 1 },
        { id: 2, userId: 1, organizationId: 1, roleId: 2 },
        { id: 3, userId: 1, organizationId: 1, roleId: 3 },
      ]);

      const result = await service.assignMultipleRoles(assignDto);

      expect(result).toHaveLength(3);
      expect(mockUorRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if all roles already assigned', async () => {
      const assignDto = { userId: 1, organizationId: 1, roleIds: [1, 2] };
      const roles = [
        { id: 1, name: 'Admin' },
        { id: 2, name: 'Developer' },
      ];

      mockUserRepository.findOne.mockResolvedValue({ id: 1 });
      mockOrgRepository.findOne.mockResolvedValue({ id: 1 });
      mockRoleRepository.findByIds.mockResolvedValue(roles);
      mockUorRepository.find.mockResolvedValue([
        { id: 1, userId: 1, organizationId: 1, roleId: 1 },
        { id: 2, userId: 1, organizationId: 1, roleId: 2 },
      ]);

      await expect(service.assignMultipleRoles(assignDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('removeRole', () => {
    it('should remove a role assignment', async () => {
      const assignment = { id: 1, userId: 1, organizationId: 1, roleId: 1 };

      mockUorRepository.findOne.mockResolvedValue(assignment);
      mockUorRepository.remove.mockResolvedValue(assignment);

      await service.removeRole(1, 1, 1);

      expect(mockUorRepository.remove).toHaveBeenCalledWith(assignment);
    });

    it('should throw NotFoundException if assignment not found', async () => {
      mockUorRepository.findOne.mockResolvedValue(null);

      await expect(service.removeRole(1, 1, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserRolesInOrganization', () => {
    it('should return user roles in an organization', async () => {
      const assignments = [
        {
          id: 1,
          userId: 1,
          organizationId: 1,
          roleId: 1,
          role: { id: 1, name: 'Admin' },
        },
        {
          id: 2,
          userId: 1,
          organizationId: 1,
          roleId: 2,
          role: { id: 2, name: 'Developer' },
        },
      ];

      mockUorRepository.find.mockResolvedValue(assignments);

      const result = await service.getUserRolesInOrganization(1, 1);

      expect(result).toEqual(assignments);
      expect(mockUorRepository.find).toHaveBeenCalledWith({
        where: { userId: 1, organizationId: 1 },
        relations: ['role'],
      });
    });
  });

  describe('getUserOrganizations', () => {
    it('should return all organizations for a user', async () => {
      const assignments = [
        {
          id: 1,
          userId: 1,
          organizationId: 1,
          roleId: 1,
          organization: { id: 1, name: 'Org 1' },
          role: { id: 1, name: 'Admin' },
        },
        {
          id: 2,
          userId: 1,
          organizationId: 2,
          roleId: 2,
          organization: { id: 2, name: 'Org 2' },
          role: { id: 2, name: 'Developer' },
        },
      ];

      mockUorRepository.find.mockResolvedValue(assignments);

      const result = await service.getUserOrganizations(1);

      expect(result).toEqual(assignments);
      expect(mockUorRepository.find).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: ['organization', 'role'],
      });
    });
  });

  describe('getOrganizationMembers', () => {
    it('should return all members of an organization', async () => {
      const assignments = [
        {
          id: 1,
          userId: 1,
          organizationId: 1,
          roleId: 1,
          user: { id: 1, username: 'john' },
          role: { id: 1, name: 'Admin' },
        },
        {
          id: 2,
          userId: 2,
          organizationId: 1,
          roleId: 2,
          user: { id: 2, username: 'jane' },
          role: { id: 2, name: 'Developer' },
        },
      ];

      mockUorRepository.find.mockResolvedValue(assignments);

      const result = await service.getOrganizationMembers(1);

      expect(result).toEqual(assignments);
      expect(mockUorRepository.find).toHaveBeenCalledWith({
        where: { organizationId: 1 },
        relations: ['user', 'role'],
      });
    });
  });
});
