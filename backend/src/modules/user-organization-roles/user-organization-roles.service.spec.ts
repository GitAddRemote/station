import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserOrganizationRolesService } from './user-organization-roles.service';
import { UserOrganizationRole } from './user-organization-role.entity';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/organization.entity';
import { Role } from '../roles/role.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

const USER_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID_2 = '00000000-0000-0000-0000-000000000002';
const ORG_ID = '00000000-0000-0000-0000-000000000011';
const ORG_ID_2 = '00000000-0000-0000-0000-000000000012';
const ROLE_ID = '00000000-0000-0000-0000-000000000021';
const ROLE_ID_2 = '00000000-0000-0000-0000-000000000022';
const ROLE_ID_3 = '00000000-0000-0000-0000-000000000023';
const UOR_ID = '00000000-0000-0000-0000-000000000031';
const UOR_ID_2 = '00000000-0000-0000-0000-000000000032';
const UOR_ID_3 = '00000000-0000-0000-0000-000000000033';

describe('UserOrganizationRolesService', () => {
  let service: UserOrganizationRolesService;

  const mockUorRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const mockUserRepository = { findOne: jest.fn() };
  const mockOrgRepository = { findOne: jest.fn() };
  const mockRoleRepository = { findOne: jest.fn(), findByIds: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserOrganizationRolesService,
        {
          provide: getRepositoryToken(UserOrganizationRole),
          useValue: mockUorRepository,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrgRepository,
        },
        { provide: getRepositoryToken(Role), useValue: mockRoleRepository },
      ],
    }).compile();

    service = module.get<UserOrganizationRolesService>(
      UserOrganizationRolesService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignRole', () => {
    it('should assign a role to a user in an organization', async () => {
      const assignDto = {
        userId: USER_ID,
        organizationId: ORG_ID,
        roleId: ROLE_ID,
      };
      const savedAssignment = {
        id: UOR_ID,
        ...assignDto,
        assignedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue({
        id: USER_ID,
        username: 'john',
      });
      mockOrgRepository.findOne.mockResolvedValue({ id: ORG_ID, name: 'Acme' });
      mockRoleRepository.findOne.mockResolvedValue({
        id: ROLE_ID,
        name: 'Admin',
      });
      mockUorRepository.findOne.mockResolvedValue(null);
      mockUorRepository.create.mockReturnValue(savedAssignment);
      mockUorRepository.save.mockResolvedValue(savedAssignment);

      const result = await service.assignRole(assignDto);

      expect(result).toEqual(savedAssignment);
      expect(mockUorRepository.save).toHaveBeenCalledWith(savedAssignment);
    });

    it('should throw NotFoundException if user not found', async () => {
      const assignDto = {
        userId: '00000000-0000-0000-0000-000000000999',
        organizationId: ORG_ID,
        roleId: ROLE_ID,
      };
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.assignRole(assignDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if assignment already exists', async () => {
      const assignDto = {
        userId: USER_ID,
        organizationId: ORG_ID,
        roleId: ROLE_ID,
      };

      mockUserRepository.findOne.mockResolvedValue({ id: USER_ID });
      mockOrgRepository.findOne.mockResolvedValue({ id: ORG_ID });
      mockRoleRepository.findOne.mockResolvedValue({ id: ROLE_ID });
      mockUorRepository.findOne.mockResolvedValue({ id: UOR_ID, ...assignDto });

      await expect(service.assignRole(assignDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('assignMultipleRoles', () => {
    it('should assign multiple roles to a user', async () => {
      const assignDto = {
        userId: USER_ID,
        organizationId: ORG_ID,
        roleIds: [ROLE_ID, ROLE_ID_2, ROLE_ID_3],
      };
      const roles = [
        { id: ROLE_ID, name: 'Admin' },
        { id: ROLE_ID_2, name: 'Developer' },
        { id: ROLE_ID_3, name: 'Viewer' },
      ];

      mockUserRepository.findOne.mockResolvedValue({ id: USER_ID });
      mockOrgRepository.findOne.mockResolvedValue({ id: ORG_ID });
      mockRoleRepository.findByIds.mockResolvedValue(roles);
      mockUorRepository.find.mockResolvedValue([]);
      mockUorRepository.create.mockImplementation((dto) => dto);
      mockUorRepository.save.mockResolvedValue([
        {
          id: UOR_ID,
          userId: USER_ID,
          organizationId: ORG_ID,
          roleId: ROLE_ID,
        },
        {
          id: UOR_ID_2,
          userId: USER_ID,
          organizationId: ORG_ID,
          roleId: ROLE_ID_2,
        },
        {
          id: UOR_ID_3,
          userId: USER_ID,
          organizationId: ORG_ID,
          roleId: ROLE_ID_3,
        },
      ]);

      const result = await service.assignMultipleRoles(assignDto);

      expect(result).toHaveLength(3);
    });

    it('should throw ConflictException if all roles already assigned', async () => {
      const assignDto = {
        userId: USER_ID,
        organizationId: ORG_ID,
        roleIds: [ROLE_ID, ROLE_ID_2],
      };
      const roles = [
        { id: ROLE_ID, name: 'Admin' },
        { id: ROLE_ID_2, name: 'Developer' },
      ];

      mockUserRepository.findOne.mockResolvedValue({ id: USER_ID });
      mockOrgRepository.findOne.mockResolvedValue({ id: ORG_ID });
      mockRoleRepository.findByIds.mockResolvedValue(roles);
      mockUorRepository.find.mockResolvedValue([
        {
          id: UOR_ID,
          userId: USER_ID,
          organizationId: ORG_ID,
          roleId: ROLE_ID,
        },
        {
          id: UOR_ID_2,
          userId: USER_ID,
          organizationId: ORG_ID,
          roleId: ROLE_ID_2,
        },
      ]);

      await expect(service.assignMultipleRoles(assignDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('removeRole', () => {
    it('should remove a role assignment', async () => {
      const assignment = {
        id: UOR_ID,
        userId: USER_ID,
        organizationId: ORG_ID,
        roleId: ROLE_ID,
      };
      mockUorRepository.findOne.mockResolvedValue(assignment);
      mockUorRepository.remove.mockResolvedValue(assignment);

      await service.removeRole(USER_ID, ORG_ID, ROLE_ID);

      expect(mockUorRepository.remove).toHaveBeenCalledWith(assignment);
    });

    it('should throw NotFoundException if assignment not found', async () => {
      mockUorRepository.findOne.mockResolvedValue(null);
      await expect(
        service.removeRole(USER_ID, ORG_ID, ROLE_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserRolesInOrganization', () => {
    it('should return user roles in an organization', async () => {
      const assignments = [
        {
          id: UOR_ID,
          userId: USER_ID,
          organizationId: ORG_ID,
          roleId: ROLE_ID,
          role: { id: ROLE_ID, name: 'Admin' },
        },
        {
          id: UOR_ID_2,
          userId: USER_ID,
          organizationId: ORG_ID,
          roleId: ROLE_ID_2,
          role: { id: ROLE_ID_2, name: 'Developer' },
        },
      ];
      mockUorRepository.find.mockResolvedValue(assignments);

      const result = await service.getUserRolesInOrganization(USER_ID, ORG_ID);

      expect(result).toEqual(assignments);
      expect(mockUorRepository.find).toHaveBeenCalledWith({
        where: { userId: USER_ID, organizationId: ORG_ID },
        relations: ['role'],
      });
    });
  });

  describe('getUserOrganizations', () => {
    it('should return all organizations for a user', async () => {
      const assignments = [
        {
          id: UOR_ID,
          userId: USER_ID,
          organizationId: ORG_ID,
          roleId: ROLE_ID,
          organization: { id: ORG_ID, name: 'Org 1' },
          role: { id: ROLE_ID, name: 'Admin' },
        },
        {
          id: UOR_ID_2,
          userId: USER_ID,
          organizationId: ORG_ID_2,
          roleId: ROLE_ID_2,
          organization: { id: ORG_ID_2, name: 'Org 2' },
          role: { id: ROLE_ID_2, name: 'Developer' },
        },
      ];
      mockUorRepository.find.mockResolvedValue(assignments);

      const result = await service.getUserOrganizations(USER_ID);

      expect(result).toEqual(assignments);
      expect(mockUorRepository.find).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        relations: ['organization', 'role'],
        order: { orgPriority: 'ASC', assignedAt: 'ASC' },
      });
    });
  });

  describe('getOrganizationMembers', () => {
    it('should return all members of an organization', async () => {
      const assignments = [
        {
          id: UOR_ID,
          userId: USER_ID,
          organizationId: ORG_ID,
          roleId: ROLE_ID,
          user: { id: USER_ID, username: 'john' },
          role: { id: ROLE_ID, name: 'Admin' },
        },
        {
          id: UOR_ID_2,
          userId: USER_ID_2,
          organizationId: ORG_ID,
          roleId: ROLE_ID_2,
          user: { id: USER_ID_2, username: 'jane' },
          role: { id: ROLE_ID_2, name: 'Developer' },
        },
      ];
      mockUorRepository.find.mockResolvedValue(assignments);

      const result = await service.getOrganizationMembers(ORG_ID);

      expect(result).toEqual(assignments);
      expect(mockUorRepository.find).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
        relations: ['user', 'role', 'businessUnit'],
      });
    });
  });
});
