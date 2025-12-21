import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../modules/roles/role.entity';
import { Organization } from '../../modules/organizations/organization.entity';
import { User } from '../../modules/users/user.entity';
import { UserOrganizationRole } from '../../modules/user-organization-roles/user-organization-role.entity';
import { Game } from '../../modules/games/game.entity';
import { OrgInventoryItem } from '../../modules/org-inventory/entities/org-inventory-item.entity';
import { Location } from '../../modules/locations/entities/location.entity';
import { UexItem } from '../../modules/uex/entities/uex-item.entity';
import { defaultRoles } from './roles.seed';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DatabaseSeederService {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(
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
    @InjectRepository(OrgInventoryItem)
    private orgInventoryRepository: Repository<OrgInventoryItem>,
    @InjectRepository(Location)
    private locationsRepository: Repository<Location>,
    @InjectRepository(UexItem)
    private uexItemsRepository: Repository<UexItem>,
  ) {}

  async seedAll(): Promise<void> {
    this.logger.log('🌱 Starting database seeding...');

    if (process.env.NODE_ENV === 'production') {
      this.logger.log('⏭️  Skipping database seeding in production.');
      return;
    }

    try {
      // Seed in order of dependencies
      await this.seedGames();
      await this.seedRoles();
      await this.seedOrganizations();
      await this.seedUsers();
      await this.seedUserOrganizationRoles();
      await this.seedOrgInventoryItems();

      this.logger.log('✅ Database seeding completed successfully!');
    } catch (error) {
      this.logger.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  private async seedGames(): Promise<void> {
    this.logger.log('Seeding games...');

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
        this.logger.log(`  ✓ Created game: ${game.name}`);
      } else {
        this.logger.log(`  ⊙ Game already exists: ${gameData.name}`);
      }
    }
  }

  private async seedRoles(): Promise<void> {
    this.logger.log('Seeding roles...');

    for (const roleData of defaultRoles) {
      const existingRole = await this.rolesRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        const role = this.rolesRepository.create(roleData);
        await this.rolesRepository.save(role);
        this.logger.log(`  ✓ Created role: ${role.name}`);
      } else {
        const existingPermissions = existingRole.permissions || {};
        const seedPermissions = roleData.permissions || {};
        let changed = false;

        for (const [key, value] of Object.entries(seedPermissions)) {
          if (!(key in existingPermissions)) {
            existingPermissions[key] = value as boolean;
            changed = true;
          }
        }

        if (changed) {
          existingRole.permissions = existingPermissions;
          await this.rolesRepository.save(existingRole);
          this.logger.log(`  ✓ Updated role permissions: ${roleData.name}`);
        } else {
          this.logger.log(`  ⊙ Role already exists: ${roleData.name}`);
        }
      }
    }
  }

  private async seedOrganizations(): Promise<void> {
    this.logger.log('Seeding test organizations...');

    const organizations = [
      {
        name: 'Demo Organization',
        description: 'A demo organization for testing and development',
        gameCode: 'sc',
      },
      {
        name: 'Dreadnought Industries',
        description:
          'Industrial org focused on large-scale logistics and mining',
        gameCode: 'sc',
      },
      {
        name: 'Frontier Syndicate',
        description: 'Exploration and security group for squadron operations',
        gameCode: 'sq42',
      },
    ];

    for (const orgData of organizations) {
      const existingOrg = await this.organizationsRepository.findOne({
        where: { name: orgData.name },
      });

      if (existingOrg) {
        this.logger.log(`  ⊙ Organization already exists: ${orgData.name}`);
        continue;
      }

      const game = await this.gamesRepository.findOne({
        where: { code: orgData.gameCode },
      });

      if (!game) {
        this.logger.warn(`  ⚠️  Missing game for org: ${orgData.name}`);
        continue;
      }

      const organization = this.organizationsRepository.create({
        name: orgData.name,
        description: orgData.description,
        isActive: true,
        gameId: game.id,
      });
      await this.organizationsRepository.save(organization);
      this.logger.log(`  ✓ Created organization: ${organization.name}`);
    }
  }

  private async seedUsers(): Promise<void> {
    this.logger.log('Seeding test users...');

    const users = [
      { username: 'demo', email: 'demo@example.com', password: 'password123' },
      {
        username: 'orgadmin',
        email: 'orgadmin@example.com',
        password: 'password123',
      },
      {
        username: 'member1',
        email: 'member1@example.com',
        password: 'password123',
      },
      {
        username: 'viewer1',
        email: 'viewer1@example.com',
        password: 'password123',
      },
      {
        username: 'multiuser',
        email: 'multiuser@example.com',
        password: 'password123',
      },
      { username: 'solo', email: 'solo@example.com', password: 'password123' },
    ];

    for (const userData of users) {
      const existingUser = await this.usersRepository.findOne({
        where: { username: userData.username },
      });

      if (existingUser) {
        this.logger.log(`  ⊙ Test user already exists: ${userData.username}`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = this.usersRepository.create({
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        isActive: true,
      });
      await this.usersRepository.save(user);
      this.logger.log(
        `  ✓ Created test user: ${userData.username} (password: ${userData.password})`,
      );
    }
  }

  private async seedUserOrganizationRoles(): Promise<void> {
    this.logger.log('Seeding user-organization-role assignments...');

    const roleNames = ['Owner', 'Admin', 'Member', 'Viewer'];
    const roles = new Map<string, Role | null>();
    for (const roleName of roleNames) {
      roles.set(
        roleName,
        await this.rolesRepository.findOne({ where: { name: roleName } }),
      );
    }

    const users = await this.usersRepository.find({
      where: [
        { username: 'demo' },
        { username: 'orgadmin' },
        { username: 'member1' },
        { username: 'viewer1' },
        { username: 'multiuser' },
      ],
    });
    const orgs = await this.organizationsRepository.find({
      where: [
        { name: 'Demo Organization' },
        { name: 'Dreadnought Industries' },
        { name: 'Frontier Syndicate' },
      ],
    });

    const userMap = new Map(users.map((user) => [user.username, user]));
    const orgMap = new Map(orgs.map((org) => [org.name, org]));

    const assignments = [
      { username: 'demo', orgName: 'Demo Organization', roleName: 'Owner' },
      {
        username: 'orgadmin',
        orgName: 'Dreadnought Industries',
        roleName: 'Admin',
      },
      {
        username: 'member1',
        orgName: 'Dreadnought Industries',
        roleName: 'Member',
      },
      {
        username: 'viewer1',
        orgName: 'Dreadnought Industries',
        roleName: 'Viewer',
      },
      {
        username: 'multiuser',
        orgName: 'Demo Organization',
        roleName: 'Admin',
      },
      {
        username: 'multiuser',
        orgName: 'Frontier Syndicate',
        roleName: 'Member',
      },
    ];

    for (const assignment of assignments) {
      const user = userMap.get(assignment.username);
      const organization = orgMap.get(assignment.orgName);
      const role = roles.get(assignment.roleName) ?? null;

      if (!user || !organization || !role) {
        this.logger.warn(
          `  ⚠️  Could not create assignment - missing user, org, or role for ${assignment.username}`,
        );
        continue;
      }

      const existingAssignment = await this.userOrgRolesRepository.findOne({
        where: {
          userId: user.id,
          organizationId: organization.id,
          roleId: role.id,
        },
      });

      if (!existingAssignment) {
        const newAssignment = this.userOrgRolesRepository.create({
          userId: user.id,
          organizationId: organization.id,
          roleId: role.id,
        });
        await this.userOrgRolesRepository.save(newAssignment);
        this.logger.log(
          `  ✓ Assigned "${role.name}" role to "${user.username}" in "${organization.name}"`,
        );
      } else {
        this.logger.log(
          `  ⊙ Assignment already exists for ${user.username} in ${organization.name}`,
        );
      }
    }
  }

  private async seedOrgInventoryItems(): Promise<void> {
    this.logger.log('Seeding Dreadnought org inventory items...');

    const organization = await this.organizationsRepository.findOne({
      where: { name: 'Dreadnought Industries' },
    });
    const game = await this.gamesRepository.findOne({ where: { code: 'sc' } });
    const addedByUser = await this.usersRepository.findOne({
      where: { username: 'orgadmin' },
    });

    if (!organization || !game || !addedByUser) {
      this.logger.warn('  ⚠️  Missing org, game, or orgadmin user. Skipping.');
      return;
    }

    const existingCount = await this.orgInventoryRepository.count({
      where: {
        orgId: organization.id,
        gameId: game.id,
        deleted: false,
      },
    });

    if (existingCount > 0) {
      this.logger.log(
        `  ⊙ Org inventory already seeded (${existingCount} items). Skipping.`,
      );
      return;
    }

    const locations = await this.locationsRepository.find({
      where: { gameId: game.id, deleted: false, active: true },
    });

    const items = await this.uexItemsRepository.find({
      where: { deleted: false, active: true },
    });

    if (locations.length === 0 || items.length === 0) {
      this.logger.warn(
        '  ⚠️  Missing locations or UEX items. Run location population and UEX sync before seeding.',
      );
      return;
    }

    const desiredCount = 550;
    const repeatPoolSize = Math.min(50, items.length);
    const repeatItemIds = new Set<number>();

    while (repeatItemIds.size < repeatPoolSize) {
      repeatItemIds.add(items[Math.floor(Math.random() * items.length)].uexId);
    }

    const lastLocationByItem = new Map<number, number>();
    const seededItems: Partial<OrgInventoryItem>[] = [];

    for (let i = 0; i < desiredCount; i++) {
      const useRepeatPool = Math.random() < 0.35 && repeatItemIds.size > 0;
      const itemId = useRepeatPool
        ? Array.from(repeatItemIds)[
            Math.floor(Math.random() * repeatItemIds.size)
          ]
        : items[Math.floor(Math.random() * items.length)].uexId;

      let locationId =
        locations[Math.floor(Math.random() * locations.length)].id;
      const lastLocationId = lastLocationByItem.get(itemId);

      if (lastLocationId && locations.length > 1) {
        // Encourage splitting items across multiple locations.
        let attempts = 0;
        while (locationId === lastLocationId && attempts < 5) {
          locationId =
            locations[Math.floor(Math.random() * locations.length)].id;
          attempts += 1;
        }
      }

      lastLocationByItem.set(itemId, locationId);

      seededItems.push({
        orgId: organization.id,
        gameId: game.id,
        uexItemId: itemId,
        locationId,
        quantity: this.randomQuantity(1, 250),
        active: true,
        deleted: false,
        addedBy: addedByUser.id,
        modifiedBy: addedByUser.id,
      });
    }

    await this.orgInventoryRepository.save(seededItems);
    this.logger.log(`  ✓ Seeded ${desiredCount} org inventory items.`);
  }

  private randomQuantity(min: number, max: number): number {
    const raw = Math.random() * (max - min) + min;
    return Number(raw.toFixed(2));
  }
}
