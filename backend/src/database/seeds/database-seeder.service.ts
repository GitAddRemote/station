import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../modules/roles/role.entity';
import { Organization } from '../../modules/organizations/organization.entity';
import { User } from '../../modules/users/user.entity';
import { UserOrganizationRole } from '../../modules/user-organization-roles/user-organization-role.entity';
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
  ) {}

  async seedAll(): Promise<void> {
    this.logger.log('🌱 Starting database seeding...');

    try {
      // Seed in order of dependencies
      await this.seedRoles();
      await this.seedTestOrganization();
      await this.seedTestUser();
      await this.seedUserOrganizationRoles();

      this.logger.log('✅ Database seeding completed successfully!');
    } catch (error) {
      this.logger.error('❌ Database seeding failed:', error);
      throw error;
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
        this.logger.log(`  ⊙ Role already exists: ${roleData.name}`);
      }
    }
  }

  private async seedTestOrganization(): Promise<void> {
    this.logger.log('Seeding test organization...');

    const existingOrg = await this.organizationsRepository.findOne({
      where: { name: 'Demo Organization' },
    });

    if (!existingOrg) {
      const organization = this.organizationsRepository.create({
        name: 'Demo Organization',
        description: 'A demo organization for testing and development',
        isActive: true,
      });
      await this.organizationsRepository.save(organization);
      this.logger.log(`  ✓ Created organization: ${organization.name}`);
    } else {
      this.logger.log('  ⊙ Test organization already exists');
    }
  }

  private async seedTestUser(): Promise<void> {
    this.logger.log('Seeding test user...');

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
      this.logger.log('  ✓ Created test user: demo (password: password123)');
    } else {
      this.logger.log('  ⊙ Test user already exists');
    }
  }

  private async seedUserOrganizationRoles(): Promise<void> {
    this.logger.log('Seeding user-organization-role assignments...');

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
        this.logger.log(
          `  ✓ Assigned "${ownerRole.name}" role to "${user.username}" in "${organization.name}"`,
        );
      } else {
        this.logger.log('  ⊙ User-organization-role assignment already exists');
      }
    } else {
      this.logger.warn(
        '  ⚠️  Could not create assignment - missing user, org, or role',
      );
    }
  }
}
