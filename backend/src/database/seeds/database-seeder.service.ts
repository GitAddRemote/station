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
import { BusinessUnit } from '../../modules/business-units/business-unit.entity';
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
    @InjectRepository(BusinessUnit)
    private businessUnitsRepository: Repository<BusinessUnit>,
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
        await this.seedBusinessUnits();
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

  private async seedBusinessUnits(): Promise<void> {
    this.logger.info('Seeding business units...');

    // Each entry describes a full sub-tree. Re-running is safe — units are
    // matched by (organizationId, name) so duplicates are never created and
    // units added by users are left untouched.
    type UnitSpec = {
      name: string;
      kind: 'division' | 'department' | 'team' | 'squad' | 'wing' | 'custom';
      description: string;
      children?: UnitSpec[];
    };

    const HIERARCHY: UnitSpec[] = [
      {
        name: 'Exploration Division',
        kind: 'division',
        description:
          'Deep-space survey, cartography, and first-contact operations.',
        children: [
          {
            name: 'Stellar Cartography',
            kind: 'department',
            description: 'Mapping star systems, jump points, and anomalies.',
            children: [
              {
                name: 'Void Scouts',
                kind: 'team',
                description: 'Forward recon into unmapped systems.',
              },
              {
                name: 'Jump Point Survey',
                kind: 'team',
                description: 'Jump point stability analysis and cataloguing.',
              },
            ],
          },
          {
            name: 'Xenobiology',
            kind: 'department',
            description:
              'Flora, fauna, and atmospheric research on alien worlds.',
            children: [
              {
                name: 'Surface Analysis',
                kind: 'team',
                description: 'Ground-team sample collection and bio-scans.',
              },
              {
                name: 'Orbital Sciences',
                kind: 'team',
                description: 'Remote-sensor atmospheric and orbital surveys.',
              },
            ],
          },
        ],
      },
      {
        name: 'Combat Division',
        kind: 'division',
        description: 'Security, escort, patrol, and offensive operations.',
        children: [
          {
            name: 'Fighter Corps',
            kind: 'department',
            description:
              'All fighter and interceptor assets under unified command.',
            children: [
              {
                name: 'Raptor Wing',
                kind: 'wing',
                description:
                  'Fast-attack wing specialising in hostile interception and suppression.',
                children: [
                  {
                    name: 'Alpha Squadron',
                    kind: 'squad',
                    description: 'Primary strike and intercept.',
                  },
                  {
                    name: 'Vanguard Squadron',
                    kind: 'squad',
                    description: 'Escort and close-air support.',
                  },
                ],
              },
              {
                name: 'Phantom Wing',
                kind: 'wing',
                description:
                  'Stealth ops, electronic warfare, and reconnaissance runs.',
                children: [
                  {
                    name: 'Ghost Squadron',
                    kind: 'squad',
                    description: 'Stealth recon and shadow escort.',
                  },
                ],
              },
            ],
          },
          {
            name: 'Ground Forces',
            kind: 'department',
            description: 'EVA boarding operations and base defence.',
            children: [
              {
                name: 'Breach Team',
                kind: 'team',
                description: 'Hostile ship boarding and extraction.',
              },
              {
                name: 'Shield Wall',
                kind: 'team',
                description: 'Defensive perimeter and fortification.',
              },
              {
                name: 'Pathfinders',
                kind: 'squad',
                description: 'Light infantry and advance scouting.',
              },
            ],
          },
          {
            name: 'Capital Operations',
            kind: 'department',
            description:
              'Capital ship crews, fleet coordination, and large-scale engagements.',
            children: [
              {
                name: 'Bridge Crew',
                kind: 'team',
                description: 'Command and navigation staff.',
              },
              {
                name: 'Turret Battery',
                kind: 'team',
                description: 'Fixed and turreted weapons systems.',
              },
            ],
          },
        ],
      },
      {
        name: 'Commerce Division',
        kind: 'division',
        description: 'Trade, hauling, arbitrage, and market intelligence.',
        children: [
          {
            name: 'Logistics',
            kind: 'department',
            description: 'Cargo routing, fleet coordination, and supply chain.',
            children: [
              {
                name: 'Hauler Fleet',
                kind: 'team',
                description: 'Bulk commodity transport runs.',
              },
              {
                name: 'Route Optimization',
                kind: 'team',
                description: 'Trade lane analysis and scheduling.',
              },
              {
                name: 'Quartermaster Corps',
                kind: 'squad',
                description: 'On-site inventory and requisitions.',
              },
            ],
          },
          {
            name: 'Market Intelligence',
            kind: 'department',
            description:
              'Price tracking, arbitrage identification, and commodity forecasting.',
            children: [
              {
                name: 'Data Brokers',
                kind: 'team',
                description: 'Real-time market data collection and analysis.',
              },
              {
                name: 'Arbitrage Desk',
                kind: 'squad',
                description:
                  'Cross-system price spread identification and execution.',
              },
            ],
          },
          {
            name: 'Diplomatic Corps',
            kind: 'department',
            description:
              'Inter-org relations, alliance negotiations, and trade treaty management.',
            children: [
              {
                name: 'Alliance Envoys',
                kind: 'team',
                description: 'Liaison officers and treaty negotiators.',
              },
            ],
          },
        ],
      },
      {
        name: 'Industrial Division',
        kind: 'division',
        description: 'Mining, refining, salvage, and manufacturing operations.',
        children: [
          {
            name: 'Extraction',
            kind: 'department',
            description: 'Asteroid and planetary mining operations.',
            children: [
              {
                name: 'Rock Breakers',
                kind: 'team',
                description: 'Heavy ship-mining operations.',
              },
              {
                name: 'Hand Mining Corps',
                kind: 'team',
                description: 'Cave and surface hand-mining runs.',
              },
              {
                name: 'Deep Core Squad',
                kind: 'squad',
                description: 'High-yield core-fracture specialist team.',
              },
            ],
          },
          {
            name: 'Refinery & Processing',
            kind: 'department',
            description:
              'Raw material refining, alloy production, and quantum fuel processing.',
            children: [
              {
                name: 'Refinery Crew',
                kind: 'team',
                description: 'Station and ship-based ore processing.',
              },
              {
                name: 'Quality Control',
                kind: 'squad',
                description: 'Yield auditing and impurity monitoring.',
              },
            ],
          },
          {
            name: 'Salvage & Reclamation',
            kind: 'department',
            description: 'Wreck salvage, scrapping, and materials recovery.',
            children: [
              {
                name: 'Wreck Raiders',
                kind: 'team',
                description: 'Deep-space derelict salvage.',
              },
              {
                name: 'Tow & Reclaim',
                kind: 'team',
                description: 'Ship towing and on-site recycling.',
              },
            ],
          },
        ],
      },
      {
        name: 'Command & Administration',
        kind: 'division',
        description: 'Org leadership, HR, finance, and internal governance.',
        children: [
          {
            name: 'Leadership Council',
            kind: 'department',
            description: 'Executive decision-making and strategic direction.',
            children: [
              {
                name: 'High Command',
                kind: 'team',
                description: 'Senior officers and org leaders.',
              },
              {
                name: 'Strategy Cell',
                kind: 'squad',
                description: 'Planning, objectives, and after-action review.',
              },
            ],
          },
          {
            name: 'Internal Affairs',
            kind: 'department',
            description: 'Recruitment, discipline, and member relations.',
            children: [
              {
                name: 'Recruitment',
                kind: 'team',
                description: 'New member outreach and onboarding.',
              },
              {
                name: 'Conduct Board',
                kind: 'squad',
                description:
                  'Discipline, dispute resolution, and code of conduct.',
              },
            ],
          },
        ],
      },
    ];

    // Upsert helper — finds by (orgId, name) or creates new.
    const upsertUnit = async (
      orgId: string,
      spec: UnitSpec,
      parentId: string | null,
      sortOrder: number,
    ): Promise<string> => {
      let unit = await this.businessUnitsRepository.findOne({
        where: { organizationId: orgId, name: spec.name },
      });

      if (!unit) {
        unit = this.businessUnitsRepository.create({
          organizationId: orgId,
          name: spec.name,
          kind: spec.kind,
          description: spec.description,
          parentId,
          sortOrder,
        });
        await this.businessUnitsRepository.save(unit);
        this.logger.info(`    + ${spec.kind}: ${spec.name}`);
      }

      for (let i = 0; i < (spec.children ?? []).length; i++) {
        await upsertUnit(orgId, spec.children![i], unit.id, i);
      }

      return unit.id;
    };

    const orgs = await this.organizationsRepository.find();

    for (const org of orgs) {
      this.logger.info(`  Seeding business units for org: ${org.name}`);
      for (let i = 0; i < HIERARCHY.length; i++) {
        await upsertUnit(org.id, HIERARCHY[i], null, i);
      }
      this.logger.info(`  ✓ Done: ${org.name}`);
    }
  }
}
