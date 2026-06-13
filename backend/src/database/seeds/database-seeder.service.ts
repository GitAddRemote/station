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

// Known legacy descriptions seeded before the inventory-focused rewrite. Only
// these values are replaced on reseed — any other description is treated as
// a user customization and left untouched.
const LEGACY_ROLE_DESCRIPTIONS = new Set<string>([
  'Full access to organization. Can delete organization and manage all settings.',
  'Administrative access. Can manage users and settings.',
  'Standard member access. Can view and participate.',
  'Read-only access. Can only view information.',
  // Seeded by migration 1764961461064-SeedInventoryManagerRole
  'Manages organization inventory with full permissions for viewing, editing, and administering items',
]);

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
  'canManageInventory',
]);

const PERMISSION_CACHE_PATTERN = 'permissions:user:*';

const DEMO_PASSWORD = 'password123';

interface SeedUser {
  username: string;
  email: string;
  isSuperAdmin?: boolean;
}

interface SeedAssignment {
  username: string;
  orgName: string;
  roleName: string;
}

const SEED_ORGS = [
  { name: 'Demo Organization', slug: 'demo' },
  { name: 'Dreadnought Industries', slug: 'drdnt' },
];

const SEED_USERS: SeedUser[] = [
  { username: 'demo', email: 'demo@example.com' },
  { username: 'admin', email: 'admin@demo.station', isSuperAdmin: true },
  { username: 'demo.member1', email: 'demo.member1@example.com' },
  { username: 'demo.member2', email: 'demo.member2@example.com' },
  { username: 'ddi.admin', email: 'ddi.admin@example.com' },
  { username: 'ddi.member1', email: 'ddi.member1@example.com' },
  { username: 'ddi.member2', email: 'ddi.member2@example.com' },
];

const SEED_ASSIGNMENTS: SeedAssignment[] = [
  { username: 'demo', orgName: 'Demo Organization', roleName: 'Owner' },
  { username: 'admin', orgName: 'Demo Organization', roleName: 'Owner' },
  {
    username: 'demo.member1',
    orgName: 'Demo Organization',
    roleName: 'Member',
  },
  {
    username: 'demo.member2',
    orgName: 'Demo Organization',
    roleName: 'Member',
  },
  {
    username: 'ddi.admin',
    orgName: 'Dreadnought Industries',
    roleName: 'Owner',
  },
  {
    username: 'ddi.member1',
    orgName: 'Dreadnought Industries',
    roleName: 'Member',
  },
  {
    username: 'ddi.member2',
    orgName: 'Dreadnought Industries',
    roleName: 'Member',
  },
];

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
      await this.seedGames();
      await this.seedRoles();

      if (process.env.NODE_ENV !== 'production') {
        await this.seedDemoOrganizations();
        await this.seedDemoUsers();
        await this.seedDemoRoleAssignments();
      } else {
        this.logger.info(
          '⊙ Skipping demo data seeding in production environment',
        );
      }

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
      const existing = await this.gamesRepository.findOne({
        where: { code: gameData.code },
      });

      if (!existing) {
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
        const sanitizedExisting = Object.fromEntries(
          Object.entries(existingRole.permissions ?? {}).filter(
            ([k]) => !LEGACY_PERMISSION_KEYS.has(k),
          ),
        );
        const merged = { ...sanitizedExisting, ...roleData.permissions };

        const sortedKeys = (obj: Record<string, unknown>) =>
          JSON.stringify(obj, Object.keys(obj).sort());
        const permissionsChanged =
          sortedKeys(existingRole.permissions ?? {}) !== sortedKeys(merged);
        const isReplaceableDescription =
          existingRole.description !== undefined &&
          (LEGACY_ROLE_DESCRIPTIONS.has(existingRole.description) ||
            existingRole.description === roleData.description);
        const descriptionChanged =
          roleData.description !== undefined &&
          existingRole.description !== roleData.description &&
          isReplaceableDescription;

        if (permissionsChanged || descriptionChanged) {
          if (permissionsChanged) existingRole.permissions = merged;
          if (descriptionChanged)
            existingRole.description = roleData.description!;
          await this.rolesRepository.save(existingRole);
          this.logger.info(`  ✓ Updated role: ${roleData.name}`);
          if (permissionsChanged) permissionsUpdated = true;
        } else {
          this.logger.info(`  ⊙ Role unchanged: ${roleData.name}`);
        }
      }
    }

    if (permissionsUpdated) {
      const cacheCleared = await this.invalidatePermissionCache();
      if (cacheCleared) this.logger.info('  ✓ Cleared permission cache');
    }
  }

  private async invalidatePermissionCache(): Promise<boolean> {
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

    const BATCH_SIZE = 100;
    let invalidated = false;
    for (const keyv of stores) {
      const client = keyv.store?.client;
      if (client?.scanIterator && client?.del) {
        let batch: string[] = [];
        for await (const key of client.scanIterator({
          MATCH: PERMISSION_CACHE_PATTERN,
          COUNT: BATCH_SIZE,
        })) {
          batch.push(key);
          if (batch.length >= BATCH_SIZE) {
            await client.del(batch);
            batch = [];
          }
        }
        if (batch.length > 0) await client.del(batch);
        invalidated = true;
      }
    }

    if (!invalidated) {
      this.logger.warn(
        '  ⚠️  No Redis store found — backend in-memory permission cache cannot be invalidated from this process. Restart the backend or wait for TTL expiry.',
      );
    }

    return invalidated;
  }

  private async seedDemoOrganizations(): Promise<void> {
    this.logger.info('Seeding demo organizations...');

    const starCitizen = await this.gamesRepository.findOne({
      where: { code: 'sc' },
    });

    for (const orgData of SEED_ORGS) {
      const existing = await this.organizationsRepository.findOne({
        where: { name: orgData.name },
      });

      if (!existing) {
        const org = this.organizationsRepository.create({
          name: orgData.name,
          slug: orgData.slug,
          description: `Seeded demo organization — ${orgData.name}`,
          isActive: true,
          gameId: starCitizen!.id,
        });
        await this.organizationsRepository.save(org);
        this.logger.info(`  ✓ Created organization: ${org.name} (${org.slug})`);
      } else {
        this.logger.info(`  ⊙ Organization already exists: ${orgData.name}`);
      }
    }
  }

  private async seedDemoUsers(): Promise<void> {
    this.logger.info('Seeding demo users...');

    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

    for (const userData of SEED_USERS) {
      const existing = await this.usersRepository.findOne({
        where: { username: userData.username },
      });

      if (!existing) {
        const user = this.usersRepository.create({
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          isActive: true,
          isSuperAdmin: userData.isSuperAdmin ?? false,
        });
        await this.usersRepository.save(user);
        this.logger.info(`  ✓ Created user: ${userData.username}`);
      } else {
        this.logger.info(`  ⊙ User already exists: ${userData.username}`);
      }
    }
  }

  private async seedDemoRoleAssignments(): Promise<void> {
    this.logger.info('Seeding demo role assignments...');

    for (const assignment of SEED_ASSIGNMENTS) {
      const user = await this.usersRepository.findOne({
        where: { username: assignment.username },
      });
      const org = await this.organizationsRepository.findOne({
        where: { name: assignment.orgName },
      });
      const role = await this.rolesRepository.findOne({
        where: { name: assignment.roleName },
      });

      if (!user || !org || !role) {
        this.logger.warn(
          `  ⚠️  Skipping assignment for ${assignment.username} → ${assignment.orgName} (${assignment.roleName}): missing entity`,
        );
        continue;
      }

      const existing = await this.userOrgRolesRepository.findOne({
        where: { userId: user.id, organizationId: org.id, roleId: role.id },
      });

      if (!existing) {
        const record = this.userOrgRolesRepository.create({
          userId: user.id,
          organizationId: org.id,
          roleId: role.id,
        });
        await this.userOrgRolesRepository.save(record);
        this.logger.info(
          `  ✓ Assigned ${assignment.roleName} to ${assignment.username} in ${assignment.orgName}`,
        );
      } else {
        this.logger.info(
          `  ⊙ Assignment already exists: ${assignment.username} → ${assignment.orgName}`,
        );
      }
    }
  }
}
