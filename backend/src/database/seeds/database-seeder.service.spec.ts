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
import { OrgPermission } from '../../modules/permissions/permissions.constants';
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
    // cache-manager v7: stores is an array of Keyv instances. Tests use an
    // empty array (no Redis) so the seeder logs a warning instead of clearing.
    stores: [] as unknown[],
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
    (mockCacheManager as { stores: unknown[] }).stores = [];
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

    it('should update role permissions and warn when no Redis store is available', async () => {
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
      // No Redis store — must warn, not call clear() (which only clears the
      // seeder's own throwaway cache, not the running backend's).
      expect(mockCacheManager.clear).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No Redis store found'),
      );

      // The first saved role is Owner — assert legacy keys were stripped and seed
      // permissions were applied correctly.
      const savedOwner = saveSpy.mock.calls[0][0] as Partial<Role>;
      expect(savedOwner.permissions).not.toHaveProperty('canViewOrganization');
      expect(savedOwner.permissions).not.toHaveProperty('canInviteUsers');
      expect(savedOwner.permissions).toEqual(
        expect.objectContaining(ownerSeedData.permissions),
      );
    });

    it('should update description without clearing cache when only description differs', async () => {
      const ownerSeedData = defaultRoles.find((r) => r.name === 'Owner')!;

      jest
        .spyOn(gamesRepository, 'findOne')
        .mockResolvedValue(mockGame as unknown as Game);

      // Return roles with correct permissions but a known legacy description
      // that the seeder is allowed to replace.
      jest
        .spyOn(rolesRepository, 'findOne')
        .mockImplementation(async (opts) => {
          const name = (opts as { where: { name: string } }).where.name;
          const seedRole = defaultRoles.find((r) => r.name === name);
          return {
            ...mockRole,
            name,
            description:
              'Full access to organization. Can delete organization and manage all settings.',
            permissions: { ...(seedRole?.permissions ?? {}) },
          } as unknown as Role;
        });

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

      // Save must have been called to patch the description.
      expect(saveSpy).toHaveBeenCalled();
      const savedOwner = saveSpy.mock.calls[0][0] as Partial<Role>;
      expect(savedOwner.description).toBe(ownerSeedData.description);
      // Permissions did not change so cache must NOT be cleared.
      expect(mockCacheManager.clear).not.toHaveBeenCalled();
    });

    it('should not save or clear cache when permissions are already up to date', async () => {
      jest
        .spyOn(gamesRepository, 'findOne')
        .mockResolvedValue(mockGame as unknown as Game);

      // Return the exact seed permissions AND description for each role so no
      // change is detected and the idempotency path skips save entirely.
      jest
        .spyOn(rolesRepository, 'findOne')
        .mockImplementation(async (opts) => {
          const name = (opts as { where: { name: string } }).where.name;
          const seedRole = defaultRoles.find((r) => r.name === name);
          return {
            ...mockRole,
            name,
            description: seedRole?.description ?? mockRole.description,
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
      // Use a key that is not in the seed matrix for Owner so it cannot be
      // overwritten by the merge and truly exercises the custom-key path.
      const customKey = 'custom:guild:officer' as unknown as OrgPermission;

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
              // Unknown custom key — should be preserved.
              [customKey]: true,
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
      // Unknown custom key must survive.
      expect(savedOwner.permissions).toHaveProperty(customKey, true);
      // Seed permissions are applied on top.
      expect(savedOwner.permissions).toEqual(
        expect.objectContaining(ownerSeedData.permissions),
      );
    });

    it('should use targeted Redis SCAN/DEL in batches when a Redis store is present', async () => {
      // Simulate 150 matched keys so two DEL batches are issued (100 + 50).
      const matchedKeys = Array.from(
        { length: 150 },
        (_, i) => `permissions:user:${i}:org:1`,
      );
      const mockRedisClient = {
        scanIterator: jest
          .fn()
          .mockImplementation(() => matchedKeys[Symbol.iterator]()),
        del: jest.fn().mockResolvedValue(undefined),
      };
      const mockRedisStore = { store: { client: mockRedisClient } };

      (mockCacheManager as { stores: unknown[] }).stores = [mockRedisStore];

      jest
        .spyOn(gamesRepository, 'findOne')
        .mockResolvedValue(mockGame as unknown as Game);
      jest.spyOn(rolesRepository, 'findOne').mockImplementation(
        async () =>
          ({
            ...mockRole,
            permissions: { canViewOrganization: true },
          }) as unknown as Role,
      );
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

      await service.seedAll();

      expect(mockRedisClient.scanIterator).toHaveBeenCalledWith({
        MATCH: 'permissions:user:*',
        COUNT: 100,
      });
      // Two batches: first 100 keys, then the remaining 50.
      expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenNthCalledWith(
        1,
        matchedKeys.slice(0, 100),
      );
      expect(mockRedisClient.del).toHaveBeenNthCalledWith(
        2,
        matchedKeys.slice(100),
      );
      expect(mockCacheManager.clear).not.toHaveBeenCalled();
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

      // Independent per-role assertions — hardcoded so a bug in the seed matrix
      // itself (e.g. Owner losing view access, Viewer gaining edit) is caught.
      const byName = Object.fromEntries(
        savedRoles.map((r) => [r.name, r.permissions]),
      );

      // Full-access roles: Owner, Admin, Director, Inventory Manager
      for (const roleName of [
        'Owner',
        'Admin',
        'Director',
        'Inventory Manager',
      ]) {
        expect(byName[roleName]?.[OrgPermission.CAN_VIEW_ORG_INVENTORY]).toBe(
          true,
        );
        expect(byName[roleName]?.[OrgPermission.CAN_EDIT_ORG_INVENTORY]).toBe(
          true,
        );
        expect(byName[roleName]?.[OrgPermission.CAN_ADMIN_ORG_INVENTORY]).toBe(
          true,
        );
        expect(
          byName[roleName]?.[OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS],
        ).toBe(true);
      }

      // Member: can view and view shared, but not edit or admin
      expect(byName['Member']?.[OrgPermission.CAN_VIEW_ORG_INVENTORY]).toBe(
        true,
      );
      expect(byName['Member']?.[OrgPermission.CAN_EDIT_ORG_INVENTORY]).toBe(
        false,
      );
      expect(byName['Member']?.[OrgPermission.CAN_ADMIN_ORG_INVENTORY]).toBe(
        false,
      );
      expect(
        byName['Member']?.[OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS],
      ).toBe(true);

      // Viewer: cannot view inventory
      expect(byName['Viewer']?.[OrgPermission.CAN_VIEW_ORG_INVENTORY]).toBe(
        false,
      );
      expect(byName['Viewer']?.[OrgPermission.CAN_EDIT_ORG_INVENTORY]).toBe(
        false,
      );
      expect(byName['Viewer']?.[OrgPermission.CAN_ADMIN_ORG_INVENTORY]).toBe(
        false,
      );
      expect(
        byName['Viewer']?.[OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS],
      ).toBe(false);
    });

    it('should not overwrite a user-customized role description when permissions are current', async () => {
      const customDescription = 'Custom org-specific description set by admin';

      jest
        .spyOn(gamesRepository, 'findOne')
        .mockResolvedValue(mockGame as unknown as Game);

      jest
        .spyOn(rolesRepository, 'findOne')
        .mockImplementation(async (opts) => {
          const name = (opts as { where: { name: string } }).where.name;
          const seedRole = defaultRoles.find((r) => r.name === name);
          return {
            ...mockRole,
            name,
            description: customDescription,
            permissions: { ...(seedRole?.permissions ?? {}) },
          } as unknown as Role;
        });

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

      expect(saveSpy).not.toHaveBeenCalled();
      expect(mockCacheManager.clear).not.toHaveBeenCalled();
    });

    it('should update stale permissions but preserve a custom description', async () => {
      const customDescription = 'Custom org-specific description set by admin';
      const ownerSeedData = defaultRoles.find((r) => r.name === 'Owner')!;

      jest
        .spyOn(gamesRepository, 'findOne')
        .mockResolvedValue(mockGame as unknown as Game);

      jest.spyOn(rolesRepository, 'findOne').mockImplementation(
        async () =>
          ({
            ...mockRole,
            // Stale permissions — will trigger a save.
            permissions: { canViewOrganization: true },
            // Custom description — must survive the save untouched.
            description: customDescription,
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

      // Role must have been saved (permissions were stale).
      expect(saveSpy).toHaveBeenCalled();
      const savedOwner = saveSpy.mock.calls[0][0] as Partial<Role>;
      // Permissions must be updated to current seed values.
      expect(savedOwner.permissions).toEqual(
        expect.objectContaining(ownerSeedData.permissions),
      );
      // Custom description must be preserved — not overwritten by seed text.
      expect(savedOwner.description).toBe(customDescription);
    });

    it('should skip demo data seeding in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        jest
          .spyOn(gamesRepository, 'findOne')
          .mockResolvedValue(mockGame as unknown as Game);
        jest
          .spyOn(rolesRepository, 'findOne')
          .mockImplementation(async (opts) => {
            const name = (opts as { where: { name: string } }).where.name;
            const seedRole = defaultRoles.find((r) => r.name === name);
            return {
              ...mockRole,
              name,
              description: seedRole?.description ?? mockRole.description,
              permissions: { ...(seedRole?.permissions ?? {}) },
            } as unknown as Role;
          });
        jest
          .spyOn(rolesRepository, 'save')
          .mockImplementation(async (role) => role as Role);

        await service.seedAll();

        // Demo-data repositories must never be touched in production.
        expect(organizationsRepository.findOne).not.toHaveBeenCalled();
        expect(usersRepository.findOne).not.toHaveBeenCalled();
        expect(userOrgRolesRepository.findOne).not.toHaveBeenCalled();
        expect(organizationsRepository.save).not.toHaveBeenCalled();
        expect(usersRepository.save).not.toHaveBeenCalled();
        expect(userOrgRolesRepository.save).not.toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
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
