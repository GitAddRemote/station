import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionsService } from './permissions.service';
import { UserOrganizationRole } from '../user-organization-roles/user-organization-role.entity';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let repository: Repository<UserOrganizationRole>;

  const mockRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getRepositoryToken(UserOrganizationRole),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    repository = module.get<Repository<UserOrganizationRole>>(
      getRepositoryToken(UserOrganizationRole),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserPermissions', () => {
    it('should aggregate permissions from multiple roles', async () => {
      const userRoles = [
        {
          id: 1,
          userId: 1,
          organizationId: 1,
          roleId: 1,
          role: {
            id: 1,
            name: 'Admin',
            permissions: {
              canEditUsers: true,
              canDeleteUsers: true,
            },
          },
        },
        {
          id: 2,
          userId: 1,
          organizationId: 1,
          roleId: 2,
          role: {
            id: 2,
            name: 'Developer',
            permissions: {
              canDeployCode: true,
              canEditUsers: false,
            },
          },
        },
      ];

      mockRepository.find.mockResolvedValue(userRoles);

      const result = await service.getUserPermissions(1, 1);

      expect(result).toBeInstanceOf(Set);
      expect(result.has('canEditUsers')).toBe(true);
      expect(result.has('canDeleteUsers')).toBe(true);
      expect(result.has('canDeployCode')).toBe(true);
      expect(result.size).toBe(3);
    });

    it('should return empty set if user has no roles', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getUserPermissions(1, 1);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('should handle roles without permissions', async () => {
      const userRoles = [
        {
          id: 1,
          userId: 1,
          organizationId: 1,
          roleId: 1,
          role: {
            id: 1,
            name: 'Viewer',
            permissions: null,
          },
        },
      ];

      mockRepository.find.mockResolvedValue(userRoles);

      const result = await service.getUserPermissions(1, 1);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });
  });

  describe('hasPermission', () => {
    it('should return true if user has the permission', async () => {
      const userRoles = [
        {
          id: 1,
          userId: 1,
          organizationId: 1,
          roleId: 1,
          role: {
            id: 1,
            name: 'Admin',
            permissions: {
              canEditUsers: true,
            },
          },
        },
      ];

      mockRepository.find.mockResolvedValue(userRoles);

      const result = await service.hasPermission(1, 1, 'canEditUsers');

      expect(result).toBe(true);
    });

    it('should return false if user does not have the permission', async () => {
      const userRoles = [
        {
          id: 1,
          userId: 1,
          organizationId: 1,
          roleId: 1,
          role: {
            id: 1,
            name: 'Viewer',
            permissions: {
              canViewUsers: true,
            },
          },
        },
      ];

      mockRepository.find.mockResolvedValue(userRoles);

      const result = await service.hasPermission(1, 1, 'canEditUsers');

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has any of the permissions', async () => {
      const userRoles = [
        {
          id: 1,
          userId: 1,
          organizationId: 1,
          roleId: 1,
          role: {
            id: 1,
            name: 'Developer',
            permissions: {
              canDeployCode: true,
            },
          },
        },
      ];

      mockRepository.find.mockResolvedValue(userRoles);

      const result = await service.hasAnyPermission(1, 1, ['canEditUsers', 'canDeployCode']);

      expect(result).toBe(true);
    });

    it('should return false if user has none of the permissions', async () => {
      const userRoles = [
        {
          id: 1,
          userId: 1,
          organizationId: 1,
          roleId: 1,
          role: {
            id: 1,
            name: 'Viewer',
            permissions: {
              canViewUsers: true,
            },
          },
        },
      ];

      mockRepository.find.mockResolvedValue(userRoles);

      const result = await service.hasAnyPermission(1, 1, ['canEditUsers', 'canDeleteUsers']);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', async () => {
      const userRoles = [
        {
          id: 1,
          userId: 1,
          organizationId: 1,
          roleId: 1,
          role: {
            id: 1,
            name: 'Admin',
            permissions: {
              canEditUsers: true,
              canDeleteUsers: true,
              canViewUsers: true,
            },
          },
        },
      ];

      mockRepository.find.mockResolvedValue(userRoles);

      const result = await service.hasAllPermissions(1, 1, ['canEditUsers', 'canDeleteUsers']);

      expect(result).toBe(true);
    });

    it('should return false if user is missing any permission', async () => {
      const userRoles = [
        {
          id: 1,
          userId: 1,
          organizationId: 1,
          roleId: 1,
          role: {
            id: 1,
            name: 'Developer',
            permissions: {
              canEditUsers: true,
            },
          },
        },
      ];

      mockRepository.find.mockResolvedValue(userRoles);

      const result = await service.hasAllPermissions(1, 1, ['canEditUsers', 'canDeleteUsers']);

      expect(result).toBe(false);
    });
  });

  describe('getUserPermissionsArray', () => {
    it('should return permissions as an array', async () => {
      const userRoles = [
        {
          id: 1,
          userId: 1,
          organizationId: 1,
          roleId: 1,
          role: {
            id: 1,
            name: 'Admin',
            permissions: {
              canEditUsers: true,
              canDeleteUsers: true,
            },
          },
        },
      ];

      mockRepository.find.mockResolvedValue(userRoles);

      const result = await service.getUserPermissionsArray(1, 1);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('canEditUsers');
      expect(result).toContain('canDeleteUsers');
      expect(result.length).toBe(2);
    });
  });
});
