import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Role } from '../../modules/roles/role.entity';
import { Organization } from '../../modules/organizations/organization.entity';
import { User } from '../../modules/users/user.entity';
import { UserOrganizationRole } from '../../modules/user-organization-roles/user-organization-role.entity';
import { Game } from '../../modules/games/game.entity';
import { defaultRoles } from './roles.seed';
import * as bcrypt from 'bcrypt';

// Known legacy camelCase keys introduced before the OrgPermission enum. Only
// these are stripped on merge — unknown custom keys are preserved.
const LEGACY_PERMISSION_KEYS = new Set<string>([
  'canDeleteOrganization',
  'canEditOrganization',
  'canViewOrganization',
  'canInviteUsers',
  'canRemoveUsers',
  'canEditUserRoles',
  'canViewUsers',
  'canCreateRoles',
  'canEditRoles',
  'canDeleteRoles',
  'canViewRoles',
  'canManageSettings',
  'canViewSettings',
]);
const PERMISSION_CACHE_PATTERN = 'permissions:user:*';

@Injectable()
export class DatabaseSeederService {
  constructor(
    @InjectPinoLogger(DatabaseSeederService.name)
    private readonly logger: PinoLogger,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserOrganizationRole)
    private userOrgRolesRepository: Repository<UserOrganizationRole>,
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
  ) {}

  async seedAll(): Promise<void> {
    this.logger.info('🌱 Starting database seeding...');

    try {
      // Seed in order of dependencies
      await this.seedGames();
      await this.seedRoles();
      await this.seedTestOrganization();
      await this.seedTestUser();
      await this.seedUserOrganizationRoles();

      this.logger.info('✅ Database seeding completed successfully!');
    } catch (error) {
      this.logger.error({ err: error }, '❌ Database seeding failed');
      throw error;
    }
  }

  private async seedGames(): Promise<void> {
    this.logger.info('Seeding games...');

    const games = [
      {
        name: 'Star Citizen',
        code: 'sc',
        description:
          'Star Citizen is a multiplayer space trading and combat simulation game.',
        active: true,
      },
      {
        name: 'Squadron 42',
        code: 'sq42',
        description:
          'Squadron 42 is a single-player space combat game set in the Star Citizen universe.',
        active: true,
      },
    ];

    for (const gameData of games) {
      const existingGame = await this.gamesRepository.findOne({
        where: { code: gameData.code },
      });

      if (!existingGame) {
        const game = this.gamesRepository.create(gameData);
        await this.gamesRepository.save(game);
        this.logger.info(`  ✓ Created game: ${game.name}`);
      } else {
        this.logger.info(`  ⊙ Game already exists: ${gameData.name}`);
      }
    }
  }

  private async seedRoles(): Promise<void> {
    this.logger.info('Seeding roles...');

    let permissionsUpdated = false;

    for (const roleData of defaultRoles) {
      const existingRole = await this.rolesRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = this.rolesRepository.create(roleData);
        await this.rolesRepository.save(role);
        this.logger.info(`  ✓ Created role: ${role.name}`);
      } else {
        // Strip only known legacy camelCase keys from existing permissions;
        // unknown custom keys are preserved and carried forward.
        const sanitizedExisting = Object.fromEntries(
          Object.entries(existingRole.permissions ?? {}).filter(
            ([k]) => !LEGACY_PERMISSION_KEYS.has(k),
          ),
        );
        const merged = { ...sanitizedExisting, ...roleData.permissions };

        // Only save if permissions actually changed (idempotency).
        // Use key-sorted stringify because JSONB does not preserve key order,
        // so a naive stringify can differ even for semantically equal objects.
        const sortedKeys = (obj: Record<string, unknown>) =>
          JSON.stringify(obj, Object.keys(obj).sort());
        if (sortedKeys(existingRole.permissions ?? {}) !== sortedKeys(merged)) {
          existingRole.permissions = merged;
          await this.rolesRepository.save(existingRole);
          this.logger.info(
            `  ✓ Updated permissions for role: ${roleData.name}`,
          );
          permissionsUpdated = true;
        } else {
          this.logger.info(
            `  ⊙ Permissions unchanged for role: ${roleData.name}`,
          );
        }
      }
    }

    if (permissionsUpdated) {
      await this.invalidatePermissionCache();
      this.logger.info('  ✓ Cleared permission cache');
    }
  }

  private async invalidatePermissionCache(): Promise<void> {
    // cache-manager v7 exposes backing stores via `cacheManager.stores` (Keyv[]).
    // Each Keyv wraps a store adapter; for cache-manager-redis-yet the adapter
    // exposes `.client` (the node-redis 4.x client).
    // Use SCAN (non-blocking cursor iteration) instead of KEYS to avoid stalling
    // Redis on large keyspaces. node-redis 4.x del() takes an array, not variadic args.
    type RedisClient = {
      scanIterator?: (opts: {
        MATCH: string;
        COUNT: number;
      }) => AsyncIterable<string>;
      del?: (keys: string[]) => Promise<unknown>;
    };
    type KeyvLike = { store?: { client?: RedisClient } };

    const stores: KeyvLike[] =
      (this.cacheManager as unknown as { stores?: KeyvLike[] }).stores ?? [];

    let invalidated = false;
    for (const keyv of stores) {
      const client = keyv.store?.client;
      if (client?.scanIterator && client?.del) {
        const keys: string[] = [];
        for await (const key of client.scanIterator({
          MATCH: PERMISSION_CACHE_PATTERN,
          COUNT: 100,
        })) {
          keys.push(key);
        }
        if (keys.length > 0) {
          await client.del(keys);
        }
        invalidated = true;
      }
    }

    if (!invalidated) {
      await this.cacheManager.clear();
    }
  }

  private async seedTestOrganization(): Promise<void> {
    this.logger.info('Seeding test organization...');

    const existingOrg = await this.organizationsRepository.findOne({
      where: { name: 'Demo Organization' },
    });

    if (!existingOrg) {
      // Get Star Citizen game (default)
      const starCitizen = await this.gamesRepository.findOne({
        where: { code: 'sc' },
      });

      const organization = this.organizationsRepository.create({
        name: 'Demo Organization',
        description: 'A demo organization for testing and development',
        isActive: true,
        gameId: starCitizen!.id,
      });
      await this.organizationsRepository.save(organization);
      this.logger.info(`  ✓ Created organization: ${organization.name}`);
    } else {
      this.logger.info('  ⊙ Test organization already exists');
    }
  }

  private async seedTestUser(): Promise<void> {
    this.logger.info('Seeding test user...');

    const existingUser = await this.usersRepository.findOne({
      where: { username: 'demo' },
    });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = this.usersRepository.create({
        username: 'demo',
        email: 'demo@example.com',
        password: hashedPassword,
        isActive: true,
      });
      await this.usersRepository.save(user);
      this.logger.info('  ✓ Created test user: demo');
    } else {
      this.logger.info('  ⊙ Test user already exists');
    }
  }

  private async seedUserOrganizationRoles(): Promise<void> {
    this.logger.info('Seeding user-organization-role assignments...');

    const user = await this.usersRepository.findOne({
      where: { username: 'demo' },
    });
    const organization = await this.organizationsRepository.findOne({
      where: { name: 'Demo Organization' },
    });
    const ownerRole = await this.rolesRepository.findOne({
      where: { name: 'Owner' },
    });

    if (user && organization && ownerRole) {
      const existingAssignment = await this.userOrgRolesRepository.findOne({
        where: {
          userId: user.id,
          organizationId: organization.id,
          roleId: ownerRole.id,
        },
      });

      if (!existingAssignment) {
        const assignment = this.userOrgRolesRepository.create({
          userId: user.id,
          organizationId: organization.id,
          roleId: ownerRole.id,
        });
        await this.userOrgRolesRepository.save(assignment);
        this.logger.info(
          `  ✓ Assigned "${ownerRole.name}" role to "${user.username}" in "${organization.name}"`,
        );
      } else {
        this.logger.info(
          '  ⊙ User-organization-role assignment already exists',
        );
      }
    } else {
      this.logger.warn(
        '  ⚠️  Could not create assignment - missing user, org, or role',
      );
    }
  }
}
