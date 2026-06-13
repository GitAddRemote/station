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
import { StationInventoryItem } from '../../modules/inventory/entities/station-inventory-item.entity';
import {
  Contract,
  ContractType,
  ContractStatus,
  ContractRisk,
} from '../../modules/contracts/entities/contract.entity';
import {
  ContractItem,
  ContractItemSubtype,
  VehicleSubtype,
} from '../../modules/contracts/entities/contract-item.entity';
import {
  ContractMilestone,
  MilestoneState,
} from '../../modules/contracts/entities/contract-milestone.entity';
import {
  ContractParty,
  ContractPartyRole,
} from '../../modules/contracts/entities/contract-party.entity';
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
    @InjectRepository(StationInventoryItem)
    private inventoryItemRepository: Repository<StationInventoryItem>,
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
    @InjectRepository(ContractItem)
    private contractItemRepository: Repository<ContractItem>,
    @InjectRepository(ContractMilestone)
    private contractMilestoneRepository: Repository<ContractMilestone>,
    @InjectRepository(ContractParty)
    private contractPartyRepository: Repository<ContractParty>,
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
        await this.seedInventory();
        await this.seedContracts();
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

  // ---------------------------------------------------------------------------
  // Inventory seed
  // ---------------------------------------------------------------------------

  private async seedInventory(): Promise<void> {
    this.logger.info('Seeding inventory...');

    // All IDs are stable — sourced from the live DB at seed-write time.
    const LOC = {
      area18: '019ebf08-3d13-7ab4-86b2-e3aa5b3416ef',
      lorville: '019ebf08-3d1b-77ff-a99c-5f00295d7b2a',
      newBabbage: '019ebf08-3d22-768d-b13c-a4e10335fb71',
      orison: '019ebf08-3d29-7a3c-bf33-e81b1d8eb47e',
      baijini: '019ebf08-3d5a-7af5-8131-618973a815ec',
      everus: '019ebf08-3d7d-792e-9279-594ebab87d20',
      portTressler: '019ebf08-3de9-7703-8d70-5e0b264324ef',
      arcL1: '019ebf08-3d32-7715-936c-4e439ca9948c',
      checkmate: '019ebf08-3e31-71a8-814d-c715cd071f81',
      brioBreaker: '019ebf08-3f59-7db3-adb7-09ce290ee8ae',
    };

    const UOM = {
      unit: '019ebefc-1943-73f9-8cf4-97b785a57463',
      scu: '019ebefc-1944-708e-aacc-1fb6edb9343d',
      cscu: '019ebefc-1944-7a59-97db-2c688a67e339',
    };

    // catalog_kind = 'vehicle'
    const SHIP = {
      caterpillar: '019ebf08-f82f-715e-be26-7a4ca799327c',
      constellation: '019ebf08-fe24-74b0-9433-9d920368d1f6',
      freelancer: '019ebf08-fe4b-7fd2-9f5e-b9f3c7f9adeb',
      cutlassBlack: '019ebf08-f873-780e-973b-3218ad0c4b08',
      prospector: '019ebf08-fb1b-7634-9972-853b626310d2',
      vulture: '019ebf08-feb0-70e6-83db-bc47a5d21c45',
      hullC: '019ebf08-fe62-7217-b167-dae8c156428e',
      carrack: '019ebf08-f81f-7778-83f1-50ccef84c076',
      hammerhead: '019ebf08-f9a1-7fbb-b63b-deac5c932e9d',
      reclaimer: '019ebf08-fb62-7201-a031-95496fea5159',
    };

    // catalog_kind = 'commodity'
    const COMM = {
      agricium: '019ebf08-fef2-75fb-b278-c5ca839333c5',
      agriSupply: '019ebf08-ff02-7ba5-8de0-825ec8ae46e3',
      aluminum: '019ebf08-ff12-7c1e-983e-07681f6fe185',
      diamond: '019ebf08-ffa6-7f32-a785-1ea3f30f0f12',
      distilled: '019ebf08-ffb1-7079-af07-519006ddd337',
      gold: '019ebf08-ffd0-7140-8076-73b6f1581c25',
      hydrogen: '019ebf08-fffa-72f5-81d8-09e95ae823d9',
      laranite: '019ebf09-001a-7bf7-b62b-ae13a11c19c2',
      medical: '019ebf09-0033-7f8a-ab57-45ffa519f66e',
      scrap: '019ebf09-009b-72fd-bcdb-775c6cdcd325',
      stims: '019ebf09-00ac-7b51-8b3b-96f70e7b1acb',
      titanium: '019ebf09-00c6-715d-8c12-d4fa3b00264a',
    };

    const orgs = await this.organizationsRepository.find();
    const users = await this.usersRepository.find({
      where: { isSuperAdmin: false },
    });

    // Helper: upsert by (ownerType, ownerId, catalogEntryId, locationId)
    const upsertItem = async (
      ownerType: 'user' | 'org',
      ownerId: string,
      catalogEntryId: string,
      catalogKind: 'item' | 'commodity' | 'vehicle',
      locationId: string,
      unitOfMeasureId: string,
      quantity: string,
      quality: number | null,
      notes: string | null,
    ): Promise<StationInventoryItem> => {
      const existing = await this.inventoryItemRepository.findOne({
        where: { ownerType, ownerId, catalogEntryId, locationId },
      });
      if (existing) return existing;

      const item = this.inventoryItemRepository.create({
        ownerType,
        ownerId,
        catalogEntryId,
        catalogKind,
        locationId,
        unitOfMeasureId,
        quantity,
        quality,
        notes,
        batchId: null,
      });
      return this.inventoryItemRepository.save(item);
    };

    for (const org of orgs) {
      const existingCount = await this.inventoryItemRepository.count({
        where: { ownerType: 'org', ownerId: org.id },
      });
      if (existingCount > 0) {
        this.logger.info(`  ⊙ Org inventory already exists: ${org.name}`);
        continue;
      }

      // --- Ships (vehicles) ---
      await upsertItem(
        'org',
        org.id,
        SHIP.caterpillar,
        'vehicle',
        LOC.area18,
        UOM.unit,
        '2',
        850,
        'Primary cargo haulers',
      );
      await upsertItem(
        'org',
        org.id,
        SHIP.constellation,
        'vehicle',
        LOC.lorville,
        UOM.unit,
        '3',
        920,
        'Multi-crew exploration vessels',
      );
      await upsertItem(
        'org',
        org.id,
        SHIP.cutlassBlack,
        'vehicle',
        LOC.baijini,
        UOM.unit,
        '4',
        780,
        'Combat and escort fighters',
      );
      await upsertItem(
        'org',
        org.id,
        SHIP.hullC,
        'vehicle',
        LOC.area18,
        UOM.unit,
        '1',
        900,
        'Heavy freight transport',
      );
      await upsertItem(
        'org',
        org.id,
        SHIP.prospector,
        'vehicle',
        LOC.arcL1,
        UOM.unit,
        '3',
        810,
        'Mining operations',
      );
      await upsertItem(
        'org',
        org.id,
        SHIP.vulture,
        'vehicle',
        LOC.brioBreaker,
        UOM.unit,
        '2',
        750,
        'Salvage operations',
      );
      await upsertItem(
        'org',
        org.id,
        SHIP.carrack,
        'vehicle',
        LOC.newBabbage,
        UOM.unit,
        '1',
        980,
        'Long-range exploration flagship',
      );
      await upsertItem(
        'org',
        org.id,
        SHIP.hammerhead,
        'vehicle',
        LOC.everus,
        UOM.unit,
        '1',
        960,
        'Capital escort and patrol',
      );
      await upsertItem(
        'org',
        org.id,
        SHIP.reclaimer,
        'vehicle',
        LOC.brioBreaker,
        UOM.unit,
        '1',
        870,
        'Large-scale salvage platform',
      );
      await upsertItem(
        'org',
        org.id,
        SHIP.freelancer,
        'vehicle',
        LOC.portTressler,
        UOM.unit,
        '5',
        690,
        'General purpose utility craft',
      );

      // --- Commodities (high value) ---
      await upsertItem(
        'org',
        org.id,
        COMM.laranite,
        'commodity',
        LOC.arcL1,
        UOM.scu,
        '48',
        920,
        'High-grade laranite stockpile',
      );
      await upsertItem(
        'org',
        org.id,
        COMM.gold,
        'commodity',
        LOC.area18,
        UOM.scu,
        '120',
        875,
        null,
      );
      await upsertItem(
        'org',
        org.id,
        COMM.diamond,
        'commodity',
        LOC.area18,
        UOM.scu,
        '30',
        950,
        'Premium cut',
      );
      await upsertItem(
        'org',
        org.id,
        COMM.titanium,
        'commodity',
        LOC.lorville,
        UOM.scu,
        '200',
        800,
        null,
      );
      await upsertItem(
        'org',
        org.id,
        COMM.agricium,
        'commodity',
        LOC.orison,
        UOM.scu,
        '75',
        860,
        null,
      );

      // --- Commodities (bulk / industrial) ---
      await upsertItem(
        'org',
        org.id,
        COMM.aluminum,
        'commodity',
        LOC.lorville,
        UOM.scu,
        '500',
        null,
        'Bulk structural stock',
      );
      await upsertItem(
        'org',
        org.id,
        COMM.scrap,
        'commodity',
        LOC.brioBreaker,
        UOM.scu,
        '1200',
        null,
        'Salvage yard collection',
      );
      await upsertItem(
        'org',
        org.id,
        COMM.hydrogen,
        'commodity',
        LOC.arcL1,
        UOM.scu,
        '300',
        null,
        'Fuel reserves',
      );
      await upsertItem(
        'org',
        org.id,
        COMM.agriSupply,
        'commodity',
        LOC.orison,
        UOM.scu,
        '80',
        null,
        null,
      );

      // --- Medical & consumables ---
      await upsertItem(
        'org',
        org.id,
        COMM.medical,
        'commodity',
        LOC.newBabbage,
        UOM.scu,
        '40',
        980,
        'Emergency medical stockpile',
      );
      await upsertItem(
        'org',
        org.id,
        COMM.stims,
        'commodity',
        LOC.area18,
        UOM.scu,
        '20',
        700,
        null,
      );
      await upsertItem(
        'org',
        org.id,
        COMM.distilled,
        'commodity',
        LOC.orison,
        UOM.scu,
        '60',
        null,
        'Distilled spirits — crew rations',
      );

      this.logger.info(`  ✓ Seeded org inventory: ${org.name}`);
    }

    // Personal inventory for demo users
    for (const user of users.slice(0, 4)) {
      const existingCount = await this.inventoryItemRepository.count({
        where: { ownerType: 'user', ownerId: user.id },
      });
      if (existingCount > 0) continue;

      // Each user gets a personal ship and a small stash of commodities
      await upsertItem(
        'user',
        user.id,
        SHIP.cutlassBlack,
        'vehicle',
        LOC.area18,
        UOM.unit,
        '1',
        720 + Math.floor(Math.random() * 200),
        'Personal fighter',
      );
      await upsertItem(
        'user',
        user.id,
        COMM.laranite,
        'commodity',
        LOC.area18,
        UOM.cscu,
        '500',
        880,
        'Personal stash',
      );
      await upsertItem(
        'user',
        user.id,
        COMM.stims,
        'commodity',
        LOC.lorville,
        UOM.cscu,
        '50',
        null,
        null,
      );
      this.logger.info(`  ✓ Seeded personal inventory: ${user.username}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Contracts seed
  // ---------------------------------------------------------------------------

  private async seedContracts(): Promise<void> {
    this.logger.info('Seeding contracts...');

    const LOC = {
      area18: '019ebf08-3d13-7ab4-86b2-e3aa5b3416ef',
      lorville: '019ebf08-3d1b-77ff-a99c-5f00295d7b2a',
      newBabbage: '019ebf08-3d22-768d-b13c-a4e10335fb71',
      orison: '019ebf08-3d29-7a3c-bf33-e81b1d8eb47e',
      baijini: '019ebf08-3d5a-7af5-8131-618973a815ec',
      everus: '019ebf08-3d7d-792e-9279-594ebab87d20',
      portTressler: '019ebf08-3de9-7703-8d70-5e0b264324ef',
      arcL1: '019ebf08-3d32-7715-936c-4e439ca9948c',
      checkmate: '019ebf08-3e31-71a8-814d-c715cd071f81',
      brioBreaker: '019ebf08-3f59-7db3-adb7-09ce290ee8ae',
    };

    const COMM = {
      laranite: '019ebf09-001a-7bf7-b62b-ae13a11c19c2',
      gold: '019ebf08-ffd0-7140-8076-73b6f1581c25',
      medical: '019ebf09-0033-7f8a-ab57-45ffa519f66e',
      aluminum: '019ebf08-ff12-7c1e-983e-07681f6fe185',
      scrap: '019ebf09-009b-72fd-bcdb-775c6cdcd325',
      hydrogen: '019ebf08-fffa-72f5-81d8-09e95ae823d9',
      titanium: '019ebf09-00c6-715d-8c12-d4fa3b00264a',
    };

    const SHIP = {
      caterpillar: '019ebf08-f82f-715e-be26-7a4ca799327c',
      cutlassBlack: '019ebf08-f873-780e-973b-3218ad0c4b08',
      prospector: '019ebf08-fb1b-7634-9972-853b626310d2',
      vulture: '019ebf08-feb0-70e6-83db-bc47a5d21c45',
    };

    const orgs = await this.organizationsRepository.find();
    const users = await this.usersRepository.find({
      where: { isSuperAdmin: false },
    });

    // Find inventory items seeded above so transfer contracts can reference them
    const orgInventory = await this.inventoryItemRepository.find({
      where: { ownerType: 'org' },
    });
    const byOrgAndCatalog = (orgId: string, catalogId: string) =>
      orgInventory.find(
        (i) => i.ownerId === orgId && i.catalogEntryId === catalogId,
      ) ?? null;

    // Helper — create a contract with optional items, milestones, and creator party
    const createContract = async (spec: {
      orgId: string;
      creatorId: string;
      type: ContractType;
      status: ContractStatus;
      risk: ContractRisk | null;
      title: string;
      description: string | null;
      rewardAuec: string | null;
      deadline: Date | null;
      deliveryLocationId: string | null;
      details: Record<string, unknown> | null;
      milestones: Array<{ label: string; state: MilestoneState }>;
      items: Array<{
        subtype: ContractItemSubtype;
        catalogEntryId: string | null;
        inventoryItemId: string | null;
        pickupLocationId: string | null;
        quantity: string;
        quality: string | null;
        vehicleSubtype: VehicleSubtype | null;
      }>;
    }): Promise<void> => {
      // Skip if a contract with same title already exists for this org
      const existing = await this.contractRepository.findOne({
        where: { orgId: spec.orgId, title: spec.title },
      });
      if (existing) return;

      const contract = this.contractRepository.create({
        orgId: spec.orgId,
        creatorId: spec.creatorId,
        type: spec.type,
        status: spec.status,
        risk: spec.risk ?? undefined,
        title: spec.title,
        description: spec.description,
        rewardAuec: spec.rewardAuec,
        deadline: spec.deadline,
        deliveryLocationId: spec.deliveryLocationId,
        details: spec.details,
      });
      await this.contractRepository.save(contract);

      // Creator party
      const party = this.contractPartyRepository.create({
        contractId: contract.id,
        userId: spec.creatorId,
        orgId: spec.orgId,
        role: ContractPartyRole.CREATOR,
      });
      await this.contractPartyRepository.save(party);

      // Milestones
      for (let i = 0; i < spec.milestones.length; i++) {
        const m = this.contractMilestoneRepository.create({
          contractId: contract.id,
          label: spec.milestones[i].label,
          state: spec.milestones[i].state,
          sortOrder: i,
        });
        await this.contractMilestoneRepository.save(m);
      }

      // Items
      for (let i = 0; i < spec.items.length; i++) {
        const ci = spec.items[i];
        const item = this.contractItemRepository.create({
          contractId: contract.id,
          itemSubtype: ci.subtype,
          catalogEntryId: ci.catalogEntryId,
          inventoryItemId: ci.inventoryItemId,
          pickupLocationId: ci.pickupLocationId,
          quantity: ci.quantity,
          quality: ci.quality,
          vehicleSubtype: ci.vehicleSubtype,
          sortOrder: i,
        });
        await this.contractItemRepository.save(item);
      }

      this.logger.info(`    + contract [${spec.type}]: ${spec.title}`);
    };

    const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const inOneMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    for (const org of orgs) {
      // Pick stable creator users for this org
      const orgMembers = await this.userOrgRolesRepository.find({
        where: { organizationId: org.id },
        relations: ['user'],
      });
      const creator = orgMembers[0]?.user ?? users[0];

      // ----------------------------------------------------------------
      // TRANSFER contracts — inventory-in-transit between members/locations
      // ----------------------------------------------------------------
      const laraniteItem = byOrgAndCatalog(org.id, COMM.laranite);
      const goldItem = byOrgAndCatalog(org.id, COMM.gold);
      const medItem = byOrgAndCatalog(org.id, COMM.medical);
      const titaniumItem = byOrgAndCatalog(org.id, COMM.titanium);

      await createContract({
        orgId: org.id,
        creatorId: creator.id,
        type: ContractType.TRANSFER,
        status: ContractStatus.ACTIVE,
        risk: ContractRisk.LOW,
        title: 'Laranite Stockpile Transfer — ARC-L1 to Area 18',
        description:
          'Move high-grade laranite from ARC-L1 holding to Area 18 warehouse for resale.',
        rewardAuec: '45000.00',
        deadline: inTwoWeeks,
        deliveryLocationId: LOC.area18,
        details: null,
        milestones: [
          { label: 'Load cargo at ARC-L1', state: MilestoneState.DONE },
          { label: 'Transit to Area 18', state: MilestoneState.ACTIVE },
          {
            label: 'Offload and confirm receipt',
            state: MilestoneState.PENDING,
          },
        ],
        items: laraniteItem
          ? [
              {
                subtype: ContractItemSubtype.COMMODITY,
                catalogEntryId: COMM.laranite,
                inventoryItemId: laraniteItem.id,
                pickupLocationId: LOC.arcL1,
                quantity: '24',
                quality: '920',
                vehicleSubtype: null,
              },
            ]
          : [],
      });

      await createContract({
        orgId: org.id,
        creatorId: creator.id,
        type: ContractType.TRANSFER,
        status: ContractStatus.OPEN,
        risk: ContractRisk.MEDIUM,
        title: 'Gold Bullion Run — Area 18 to Baijini Point',
        description:
          'Escorted transfer of gold reserves. High-value shipment — request combat escort.',
        rewardAuec: '120000.00',
        deadline: inTwoWeeks,
        deliveryLocationId: LOC.baijini,
        details: null,
        milestones: [
          { label: 'Secure cargo and escort', state: MilestoneState.PENDING },
          {
            label: 'Transit Stanton to Crusader',
            state: MilestoneState.PENDING,
          },
          { label: 'Delivery and sign-off', state: MilestoneState.PENDING },
        ],
        items: goldItem
          ? [
              {
                subtype: ContractItemSubtype.COMMODITY,
                catalogEntryId: COMM.gold,
                inventoryItemId: goldItem.id,
                pickupLocationId: LOC.area18,
                quantity: '60',
                quality: '875',
                vehicleSubtype: null,
              },
            ]
          : [],
      });

      await createContract({
        orgId: org.id,
        creatorId: creator.id,
        type: ContractType.TRANSFER,
        status: ContractStatus.DRAFT,
        risk: ContractRisk.LOW,
        title: 'Medical Supplies Redistribution — New Babbage to Orison',
        description:
          'Routine redistribution of medical stockpile between org-held warehouses.',
        rewardAuec: '18000.00',
        deadline: inOneMonth,
        deliveryLocationId: LOC.orison,
        details: null,
        milestones: [
          {
            label: 'Inventory check and manifest',
            state: MilestoneState.PENDING,
          },
          { label: 'Load and transit', state: MilestoneState.PENDING },
          { label: 'Delivery confirmation', state: MilestoneState.PENDING },
        ],
        items: medItem
          ? [
              {
                subtype: ContractItemSubtype.COMMODITY,
                catalogEntryId: COMM.medical,
                inventoryItemId: medItem.id,
                pickupLocationId: LOC.newBabbage,
                quantity: '20',
                quality: '980',
                vehicleSubtype: null,
              },
            ]
          : [],
      });

      await createContract({
        orgId: org.id,
        creatorId: creator.id,
        type: ContractType.TRANSFER,
        status: ContractStatus.COMPLETED,
        risk: ContractRisk.LOW,
        title: 'Titanium Structural Stock Delivery',
        description:
          'Completed delivery of bulk titanium to Lorville industrial depot.',
        rewardAuec: '30000.00',
        deadline: null,
        deliveryLocationId: LOC.lorville,
        details: null,
        milestones: [
          { label: 'Load at ARC-L1', state: MilestoneState.DONE },
          { label: 'Transit to Lorville', state: MilestoneState.DONE },
          { label: 'Weigh-in and sign-off', state: MilestoneState.DONE },
        ],
        items: titaniumItem
          ? [
              {
                subtype: ContractItemSubtype.COMMODITY,
                catalogEntryId: COMM.titanium,
                inventoryItemId: titaniumItem.id,
                pickupLocationId: LOC.arcL1,
                quantity: '100',
                quality: '800',
                vehicleSubtype: null,
              },
            ]
          : [],
      });

      // ----------------------------------------------------------------
      // TRANSPORT contract
      // ----------------------------------------------------------------
      await createContract({
        orgId: org.id,
        creatorId: creator.id,
        type: ContractType.TRANSPORT,
        status: ContractStatus.OPEN,
        risk: ContractRisk.MEDIUM,
        title: 'Caterpillar Freight Run — Lorville to Port Tressler',
        description:
          'Cargo haul using Caterpillar. 140 SCU mixed aluminum and agricultural supplies. No combat expected.',
        rewardAuec: '55000.00',
        deadline: inTwoWeeks,
        deliveryLocationId: LOC.portTressler,
        details: {
          pickup: {
            kind: 'location',
            locationId: LOC.lorville,
            locationName: 'Lorville',
          },
          delivery: {
            kind: 'location',
            locationId: LOC.portTressler,
            locationName: 'Port Tressler',
          },
          cargoDescription: '140 SCU mixed aluminum and agricultural supplies',
          scuRequired: '140',
        },
        milestones: [
          { label: 'Pick up cargo at Lorville', state: MilestoneState.PENDING },
          { label: 'Transit to Port Tressler', state: MilestoneState.PENDING },
          { label: 'Deliver and confirm', state: MilestoneState.PENDING },
        ],
        items: [
          {
            subtype: ContractItemSubtype.VEHICLE,
            catalogEntryId: SHIP.caterpillar,
            inventoryItemId: null,
            pickupLocationId: LOC.lorville,
            quantity: '1',
            quality: null,
            vehicleSubtype: VehicleSubtype.SHIP,
          },
        ],
      });

      // ----------------------------------------------------------------
      // MINING contract
      // ----------------------------------------------------------------
      await createContract({
        orgId: org.id,
        creatorId: creator.id,
        type: ContractType.MINING,
        status: ContractStatus.ACTIVE,
        risk: ContractRisk.MEDIUM,
        title: 'Laranite Mining Operation — Aaron Halo',
        description:
          'Prospector wing assigned to Aaron Halo belt. Target: 200 SCU laranite. Deliver refined yield to ARC-L1.',
        rewardAuec: '280000.00',
        deadline: inOneMonth,
        deliveryLocationId: LOC.arcL1,
        details: {
          targetMineral: 'Laranite',
          targetScuYield: 200,
          miningZone: 'Aaron Halo asteroid belt',
          allowedVehicles: ['Prospector', 'Mole'],
        },
        milestones: [
          {
            label: 'Deploy mining wing to Aaron Halo',
            state: MilestoneState.DONE,
          },
          { label: 'Reach 100 SCU yield', state: MilestoneState.ACTIVE },
          { label: 'Reach 200 SCU yield', state: MilestoneState.PENDING },
          {
            label: 'Refine and deliver to ARC-L1',
            state: MilestoneState.PENDING,
          },
        ],
        items: [
          {
            subtype: ContractItemSubtype.COMMODITY,
            catalogEntryId: COMM.laranite,
            inventoryItemId: null,
            pickupLocationId: null,
            quantity: '200',
            quality: null,
            vehicleSubtype: null,
          },
        ],
      });

      // ----------------------------------------------------------------
      // SECURITY contract
      // ----------------------------------------------------------------
      await createContract({
        orgId: org.id,
        creatorId: creator.id,
        type: ContractType.SECURITY,
        status: ContractStatus.CLAIMED,
        risk: ContractRisk.HIGH,
        title: 'Cargo Escort — Everus Harbor to Checkmate Station',
        description:
          'Escort Caterpillar carrying gold through high-risk corridor. Pirate activity reported along route. Three fighters minimum.',
        rewardAuec: '95000.00',
        deadline: inTwoWeeks,
        deliveryLocationId: LOC.checkmate,
        details: {
          escortTarget: 'Hull C — gold shipment',
          minimumFighters: 3,
          knownThreats:
            'Pirate interdiction reported on MIC-L1 approach vector',
        },
        milestones: [
          {
            label: 'Assemble fighter escort at Everus',
            state: MilestoneState.DONE,
          },
          {
            label: 'Escort through MIC-L1 corridor',
            state: MilestoneState.ACTIVE,
          },
          {
            label: 'Deliver escorted vessel to Checkmate',
            state: MilestoneState.PENDING,
          },
        ],
        items: [
          {
            subtype: ContractItemSubtype.VEHICLE,
            catalogEntryId: SHIP.cutlassBlack,
            inventoryItemId: null,
            pickupLocationId: LOC.everus,
            quantity: '3',
            quality: null,
            vehicleSubtype: VehicleSubtype.SHIP,
          },
        ],
      });

      // ----------------------------------------------------------------
      // SALVAGE contract
      // ----------------------------------------------------------------
      await createContract({
        orgId: org.id,
        creatorId: creator.id,
        type: ContractType.SALVAGE,
        status: ContractStatus.OPEN,
        risk: ContractRisk.MEDIUM,
        title: 'Derelict Reclamation — Contested Zone Wreck',
        description:
          'Known Hammerhead wreck in contested zone near Pyro jump point. Estimated 400+ SCU recoverable scrap. Bring Vulture + Reclaimer.',
        rewardAuec: '180000.00',
        deadline: inOneMonth,
        deliveryLocationId: LOC.brioBreaker,
        details: {
          targetWreck: 'Hammerhead (derelict)',
          estimatedScuYield: 400,
          hazards: 'Contested space, possible leftover turret activity',
          deliverTo: "Brio's Breaker Yard",
        },
        milestones: [
          { label: 'Locate and survey wreck', state: MilestoneState.PENDING },
          { label: 'Begin hull stripping', state: MilestoneState.PENDING },
          { label: "Transport scrap to Brio's", state: MilestoneState.PENDING },
          { label: 'Weigh-in and payout', state: MilestoneState.PENDING },
        ],
        items: [
          {
            subtype: ContractItemSubtype.VEHICLE,
            catalogEntryId: SHIP.vulture,
            inventoryItemId: null,
            pickupLocationId: LOC.brioBreaker,
            quantity: '1',
            quality: null,
            vehicleSubtype: VehicleSubtype.SHIP,
          },
          {
            subtype: ContractItemSubtype.COMMODITY,
            catalogEntryId: COMM.scrap,
            inventoryItemId: null,
            pickupLocationId: null,
            quantity: '400',
            quality: null,
            vehicleSubtype: null,
          },
        ],
      });

      // ----------------------------------------------------------------
      // MEDICAL contract
      // ----------------------------------------------------------------
      await createContract({
        orgId: org.id,
        creatorId: creator.id,
        type: ContractType.MEDICAL,
        status: ContractStatus.ACTIVE,
        risk: ContractRisk.HIGH,
        title: 'Combat Medic Support — Active Mining Op',
        description:
          'Provide Apollo Medivac coverage for mining wing in contested belt. On-call extraction for injuries or incapacitation.',
        rewardAuec: '40000.00',
        deadline: inTwoWeeks,
        deliveryLocationId: null,
        details: {
          supportZone: 'Aaron Halo asteroid belt',
          requiredShip: 'Apollo Medivac or Cutlass Red',
          priority: 'Combat extraction and field stabilization',
        },
        milestones: [
          {
            label: 'Station medical ship at ARC-L1 standby',
            state: MilestoneState.DONE,
          },
          {
            label: 'Provide coverage through mining op',
            state: MilestoneState.ACTIVE,
          },
          {
            label: 'Return crew — debrief and payout',
            state: MilestoneState.PENDING,
          },
        ],
        items: [
          {
            subtype: ContractItemSubtype.COMMODITY,
            catalogEntryId: COMM.medical,
            inventoryItemId: null,
            pickupLocationId: null,
            quantity: '10',
            quality: '999',
            vehicleSubtype: null,
          },
        ],
      });

      // ----------------------------------------------------------------
      // REFUELING contract
      // ----------------------------------------------------------------
      await createContract({
        orgId: org.id,
        creatorId: creator.id,
        type: ContractType.REFUELING,
        status: ContractStatus.OPEN,
        risk: ContractRisk.LOW,
        title: 'Fleet Refuel — Exploration Wing Resupply',
        description:
          'Starfarer to rendezvous with exploration wing near Pyro jump point and top off hydrogen reserves for the next leg.',
        rewardAuec: '22000.00',
        deadline: inOneMonth,
        deliveryLocationId: null,
        details: {
          fuelType: 'Hydrogen',
          targetScuFuel: 120,
          rendezvousPoint: 'Pyro Jump Point — Stanton side',
          recipientVessels: ['Carrack', 'Constellation Andromeda x2'],
        },
        milestones: [
          {
            label: 'Load 120 SCU hydrogen at ARC-L1',
            state: MilestoneState.PENDING,
          },
          {
            label: 'Transit to Pyro jump point',
            state: MilestoneState.PENDING,
          },
          {
            label: 'Transfer fuel to fleet vessels',
            state: MilestoneState.PENDING,
          },
        ],
        items: [
          {
            subtype: ContractItemSubtype.COMMODITY,
            catalogEntryId: COMM.hydrogen,
            inventoryItemId: null,
            pickupLocationId: LOC.arcL1,
            quantity: '120',
            quality: null,
            vehicleSubtype: null,
          },
        ],
      });

      this.logger.info(`  ✓ Seeded contracts for org: ${org.name}`);
    }
  }
}
