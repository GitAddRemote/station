import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getLoggerToken } from 'nestjs-pino';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Repository } from 'typeorm';
import { DatabaseSeederService } from './database-seeder.service';
import { Role } from '../../modules/roles/role.entity';
import { Organization } from '../../modules/organizations/organization.entity';
import { User } from '../../modules/users/user.entity';
import { UserOrganizationRole } from '../../modules/user-organization-roles/user-organization-role.entity';
import { Game } from '../../modules/games/game.entity';
import {
  OrgPermission,
  DEFAULT_ROLE_PERMISSIONS,
} from '../../modules/permissions/permissions.constants';
import { defaultRoles } from './roles.seed';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
}));

describe('DatabaseSeederService', () => {
  let service: DatabaseSeederService;
  let rolesRepository: Repository<Role>;
  let organizationsRepository: Repository<Organization>;
  let usersRepository: Repository<User>;
  let userOrgRolesRepository: Repository<UserOrganizationRole>;
  let gamesRepository: Repository<Game>;
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  const mockCacheManager = {
    clear: jest.fn().mockResolvedValue(undefined),
    // cache-manager v7: stores is an array of Keyv instances. No Redis client
    // in unit tests, so the code falls back to cacheManager.clear().
    stores: [],
  };
  let loggerErrorSpy: jest.Mock;

  const mockGame = {
    id: 1,
    name: 'Star Citizen',
    code: 'sc',
    description: 'Star Citizen MMO',
    active: true,
  };

  const mockRole = {
    id: 1,
    name: 'Owner',
    description: 'Full access',
    permissions: {},
  };

  const mockOrganization = {
    id: 1,
    name: 'Demo Organization',
    description: 'Test org',
    isActive: true,
    gameId: 1,
  };

  const mockUser = {
    id: 1,
    username: 'demo',
    email: 'demo@example.com',
    password: 'hashed',
    isActive: true,
  };

  const mockUserOrgRole = {
    id: 1,
    userId: 1,
    organizationId: 1,
    roleId: 1,
  };

  beforeEach(async () => {
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockLogger.debug.mockClear();
    mockCacheManager.clear.mockClear();
    loggerErrorSpy = mockLogger.error;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseSeederService,
        {
          provide: getLoggerToken(DatabaseSeederService.name),
          useValue: mockLogger,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserOrganizationRole),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Game),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseSeederService>(DatabaseSeederService);
    rolesRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    organizationsRepository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    userOrgRolesRepository = module.get<Repository<UserOrganizationRole>>(
      getRepositoryToken(UserOrganizationRole),
    );
    gamesRepository = module.get<Repository<Game>>(getRepositoryToken(Game));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('seedAll', () => {
    it('should seed all data successfully', async () => {
      // Mock games seeding - first call returns null (new game), second call returns the game for org creation
      jest
        .spyOn(gamesRepository, 'findOne')
        .mockResolvedValueOnce(null) // First game check (sc)
        .mockResolvedValueOnce(null) // Second game check (sq42)
        .mockResolvedValueOnce(mockGame as unknown as Game) // Get sc game for org creation
        .mockResolvedValueOnce(null); // Org check

      jest
        .spyOn(gamesRepository, 'create')
        .mockReturnValue(mockGame as unknown as Game);
      jest
        .spyOn(gamesRepository, 'save')
        .mockResolvedValue(mockGame as unknown as Game);

      jest.spyOn(rolesRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(rolesRepository, 'create')
        .mockReturnValue(mockRole as unknown as Role);
      jest
        .spyOn(rolesRepository, 'save')
        .mockResolvedValue(mockRole as unknown as Role);

      jest.spyOn(organizationsRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(organizationsRepository, 'create')
        .mockReturnValue(mockOrganization as unknown as Organization);
      jest
        .spyOn(organizationsRepository, 'save')
        .mockResolvedValue(mockOrganization as unknown as Organization);

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(usersRepository, 'create')
        .mockReturnValue(mockUser as unknown as User);
      jest
        .spyOn(usersRepository, 'save')
        .mockResolvedValue(mockUser as unknown as User);

      jest.spyOn(userOrgRolesRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(userOrgRolesRepository, 'create')
        .mockReturnValue(mockUserOrgRole as unknown as UserOrganizationRole);
      jest
        .spyOn(userOrgRolesRepository, 'save')
        .mockResolvedValue(mockUserOrgRole as unknown as UserOrganizationRole);

      await expect(service.seedAll()).resolves.toBeUndefined();
    });

    it('should update role permissions and clear cache when roles already exist', async () => {
      const ownerSeedData = defaultRoles.find((r) => r.name === 'Owner')!;

      jest
        .spyOn(gamesRepository, 'findOne')
        .mockResolvedValue(mockGame as unknown as Game);

      // Return a role with legacy camelCase keys for every findOne call so all
      // existing-role paths exercise the strip-and-merge logic.
      jest.spyOn(rolesRepository, 'findOne').mockImplementation(
        async () =>
          ({
            ...mockRole,
            permissions: {
              canViewOrganization: true,
              canInviteUsers: true,
            },
          }) as unknown as Role,
      );

      const saveSpy = jest
        .spyOn(rolesRepository, 'save')
        .mockImplementation(async (role) => role as Role);
      jest
        .spyOn(organizationsRepository, 'findOne')
        .mockResolvedValue(mockOrganization as unknown as Organization);
      jest
        .spyOn(usersRepository, 'findOne')
        .mockResolvedValue(mockUser as unknown as User);
      jest
        .spyOn(userOrgRolesRepository, 'findOne')
        .mockResolvedValue(mockUserOrgRole as unknown as UserOrganizationRole);

      await expect(service.seedAll()).resolves.toBeUndefined();

      expect(gamesRepository.save).not.toHaveBeenCalled();
      expect(rolesRepository.save).toHaveBeenCalled();
      expect(organizationsRepository.save).not.toHaveBeenCalled();
      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(userOrgRolesRepository.save).not.toHaveBeenCalled();
      expect(mockCacheManager.clear).toHaveBeenCalled();

      // The first saved role is Owner — assert legacy keys were stripped and seed
      // permissions were applied correctly.
      const savedOwner = saveSpy.mock.calls[0][0] as Partial<Role>;
      expect(savedOwner.permissions).not.toHaveProperty('canViewOrganization');
      expect(savedOwner.permissions).not.toHaveProperty('canInviteUsers');
      expect(savedOwner.permissions).toEqual(
        expect.objectContaining(ownerSeedData.permissions),
      );
    });

    it('should not save or clear cache when permissions are already up to date', async () => {
      jest
        .spyOn(gamesRepository, 'findOne')
        .mockResolvedValue(mockGame as unknown as Game);

      // Return the exact seed permissions for each role so no change is detected.
      jest
        .spyOn(rolesRepository, 'findOne')
        .mockImplementation(async (opts) => {
          const name = (opts as { where: { name: string } }).where.name;
          const seedRole = defaultRoles.find((r) => r.name === name);
          return {
            ...mockRole,
            name,
            permissions: { ...(seedRole?.permissions ?? {}) },
          } as unknown as Role;
        });
      jest
        .spyOn(rolesRepository, 'save')
        .mockImplementation(async (role) => role as Role);
      jest
        .spyOn(organizationsRepository, 'findOne')
        .mockResolvedValue(mockOrganization as unknown as Organization);
      jest
        .spyOn(usersRepository, 'findOne')
        .mockResolvedValue(mockUser as unknown as User);
      jest
        .spyOn(userOrgRolesRepository, 'findOne')
        .mockResolvedValue(mockUserOrgRole as unknown as UserOrganizationRole);

      await expect(service.seedAll()).resolves.toBeUndefined();

      expect(rolesRepository.save).not.toHaveBeenCalled();
      expect(mockCacheManager.clear).not.toHaveBeenCalled();
    });

    it('should preserve custom (non-legacy) permission keys when merging', async () => {
      const ownerSeedData = defaultRoles.find((r) => r.name === 'Owner')!;
      const customKey = OrgPermission.CAN_VIEW_ORG_INVENTORY; // valid non-legacy key

      jest
        .spyOn(gamesRepository, 'findOne')
        .mockResolvedValue(mockGame as unknown as Game);

      jest.spyOn(rolesRepository, 'findOne').mockImplementation(
        async () =>
          ({
            ...mockRole,
            permissions: {
              // Legacy key — should be stripped.
              canViewOrganization: true,
              // Custom valid key — should be preserved.
              [customKey]: false,
            },
          }) as unknown as Role,
      );

      const saveSpy = jest
        .spyOn(rolesRepository, 'save')
        .mockImplementation(async (role) => role as Role);
      jest
        .spyOn(organizationsRepository, 'findOne')
        .mockResolvedValue(mockOrganization as unknown as Organization);
      jest
        .spyOn(usersRepository, 'findOne')
        .mockResolvedValue(mockUser as unknown as User);
      jest
        .spyOn(userOrgRolesRepository, 'findOne')
        .mockResolvedValue(mockUserOrgRole as unknown as UserOrganizationRole);

      await service.seedAll();

      const savedOwner = saveSpy.mock.calls[0][0] as Partial<Role>;
      // Legacy key must be gone.
      expect(savedOwner.permissions).not.toHaveProperty('canViewOrganization');
      // Custom key must survive (seed value wins if it also defines this key,
      // so just assert the key is present).
      expect(savedOwner.permissions).toHaveProperty(customKey);
      // Seed permissions are applied on top.
      expect(savedOwner.permissions).toEqual(
        expect.objectContaining(ownerSeedData.permissions),
      );
    });

    it('should seed roles with correct OrgPermission keys and per-role permission values', async () => {
      const savedRoles: Partial<Role>[] = [];

      jest.spyOn(rolesRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(rolesRepository, 'create')
        .mockImplementation((data) => data as Role);
      jest.spyOn(rolesRepository, 'save').mockImplementation(async (role) => {
        savedRoles.push(role as Partial<Role>);
        return role as Role;
      });

      jest
        .spyOn(gamesRepository, 'findOne')
        .mockResolvedValue(mockGame as unknown as Game);
      jest
        .spyOn(gamesRepository, 'create')
        .mockReturnValue(mockGame as unknown as Game);
      jest
        .spyOn(gamesRepository, 'save')
        .mockResolvedValue(mockGame as unknown as Game);
      jest.spyOn(organizationsRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(organizationsRepository, 'create')
        .mockReturnValue(mockOrganization as unknown as Organization);
      jest
        .spyOn(organizationsRepository, 'save')
        .mockResolvedValue(mockOrganization as unknown as Organization);
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(usersRepository, 'create')
        .mockReturnValue(mockUser as unknown as User);
      jest
        .spyOn(usersRepository, 'save')
        .mockResolvedValue(mockUser as unknown as User);
      jest.spyOn(userOrgRolesRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(userOrgRolesRepository, 'create')
        .mockReturnValue(mockUserOrgRole as unknown as UserOrganizationRole);
      jest
        .spyOn(userOrgRolesRepository, 'save')
        .mockResolvedValue(mockUserOrgRole as unknown as UserOrganizationRole);

      await service.seedAll();

      const validPermissionKeys = new Set(Object.values(OrgPermission));
      const seededRoleNames = savedRoles.map((r) => r.name);

      expect(seededRoleNames).toEqual(
        expect.arrayContaining(defaultRoles.map((r) => r.name)),
      );

      // All permission keys must be valid OrgPermission enum values.
      for (const role of savedRoles) {
        const keys = Object.keys(role.permissions ?? {});
        for (const key of keys) {
          expect(validPermissionKeys).toContain(key);
        }
      }

      // Per-role permission values must match DEFAULT_ROLE_PERMISSIONS exactly
      // to prevent privilege escalation (e.g. Viewer/Member gaining edit/admin).
      for (const role of savedRoles) {
        const expected = DEFAULT_ROLE_PERMISSIONS[role.name!];
        if (expected) {
          expect(role.permissions).toEqual(expected);
        }
      }

      // Restricted roles must not have elevated permissions.
      const memberRole = savedRoles.find((r) => r.name === 'Member');
      const viewerRole = savedRoles.find((r) => r.name === 'Viewer');

      expect(
        memberRole?.permissions?.[OrgPermission.CAN_EDIT_ORG_INVENTORY],
      ).toBe(false);
      expect(
        memberRole?.permissions?.[OrgPermission.CAN_ADMIN_ORG_INVENTORY],
      ).toBe(false);
      expect(
        viewerRole?.permissions?.[OrgPermission.CAN_EDIT_ORG_INVENTORY],
      ).toBe(false);
      expect(
        viewerRole?.permissions?.[OrgPermission.CAN_ADMIN_ORG_INVENTORY],
      ).toBe(false);
      expect(
        viewerRole?.permissions?.[OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS],
      ).toBe(false);
    });

    it('should throw error on failure', async () => {
      jest
        .spyOn(gamesRepository, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.seedAll()).rejects.toThrow('Database error');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        '❌ Database seeding failed',
      );
    });
  });
});
