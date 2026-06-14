import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserOrganizationRole } from './user-organization-role.entity';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/organization.entity';
import { Role } from '../roles/role.entity';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class UserOrganizationRolesService {
  constructor(
    @InjectRepository(UserOrganizationRole)
    private userOrgRoleRepository: Repository<UserOrganizationRole>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  async assignRole(
    assignRoleDto: AssignRoleDto,
  ): Promise<UserOrganizationRole> {
    const { userId, organizationId, roleId } = assignRoleDto;

    await this.verifyEntitiesExist(userId, organizationId, roleId);

    const existing = await this.userOrgRoleRepository.findOne({
      where: { userId, organizationId, roleId },
    });

    if (existing) {
      throw new ConflictException(
        'User already has this role in the organization',
      );
    }

    const userOrgRole = this.userOrgRoleRepository.create(assignRoleDto);
    return this.userOrgRoleRepository.save(userOrgRole);
  }

  async assignMultipleRoles(
    assignRolesDto: AssignRolesDto,
  ): Promise<UserOrganizationRole[]> {
    const { userId, organizationId, roleIds } = assignRolesDto;

    await this.verifyUserAndOrganization(userId, organizationId);

    const roles = await this.roleRepository.findByIds(roleIds);
    if (roles.length !== roleIds.length) {
      throw new NotFoundException('One or more roles not found');
    }

    const existing = await this.userOrgRoleRepository.find({
      where: { userId, organizationId },
    });
    const existingRoleIds = new Set(existing.map((e) => e.roleId));

    const newRoleIds = roleIds.filter((roleId) => !existingRoleIds.has(roleId));

    if (newRoleIds.length === 0) {
      throw new ConflictException('All specified roles are already assigned');
    }

    const newAssignments = newRoleIds.map((roleId) =>
      this.userOrgRoleRepository.create({ userId, organizationId, roleId }),
    );

    return this.userOrgRoleRepository.save(newAssignments);
  }

  async removeRole(
    userId: string,
    organizationId: string,
    roleId: string,
  ): Promise<void> {
    const userOrgRole = await this.userOrgRoleRepository.findOne({
      where: { userId, organizationId, roleId },
    });

    if (!userOrgRole) {
      throw new NotFoundException('Role assignment not found');
    }

    await this.userOrgRoleRepository.remove(userOrgRole);
  }

  async getUserRolesInOrganization(
    userId: string,
    organizationId: string,
  ): Promise<UserOrganizationRole[]> {
    return this.userOrgRoleRepository.find({
      where: { userId, organizationId },
      relations: ['role'],
    });
  }

  async getUserOrganizations(userId: string): Promise<UserOrganizationRole[]> {
    return this.userOrgRoleRepository.find({
      where: { userId },
      relations: ['organization', 'role'],
      order: { orgPriority: 'ASC', assignedAt: 'ASC' },
    });
  }

  async updateOrgPriorities(
    userId: string,
    orderedOrgIds: string[],
  ): Promise<void> {
    await Promise.all(
      orderedOrgIds.map((orgId, index) =>
        this.userOrgRoleRepository.manager.query(
          `UPDATE "user_organization_role"
             SET "org_priority" = $1
           WHERE "userId" = $2 AND "organizationId" = $3 AND "deleted_at" IS NULL`,
          [index, userId, orgId],
        ),
      ),
    );
  }

  async getOrganizationMembers(
    organizationId: string,
  ): Promise<UserOrganizationRole[]> {
    return this.userOrgRoleRepository.find({
      where: { organizationId },
      relations: ['user', 'role', 'businessUnit'],
    });
  }

  async updateMemberBusinessUnit(
    organizationId: string,
    userId: string,
    businessUnitId: string | null,
  ): Promise<void> {
    const memberships = await this.userOrgRoleRepository.find({
      where: { organizationId, userId },
    });
    if (memberships.length === 0) {
      throw new NotFoundException('Member not found in this organization');
    }
    await this.userOrgRoleRepository.manager.query(
      `UPDATE "user_organization_role"
         SET "business_unit_id" = $1
       WHERE "organizationId" = $2 AND "userId" = $3 AND "deleted_at" IS NULL`,
      [businessUnitId, organizationId, userId],
    );
  }

  async removeMemberFromOrg(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const memberships = await this.userOrgRoleRepository.find({
      where: { organizationId, userId },
    });
    if (memberships.length === 0) {
      throw new NotFoundException('Member not found in this organization');
    }
    await this.userOrgRoleRepository.softRemove(memberships);
  }

  async getUsersWithRole(
    organizationId: string,
    roleId: string,
  ): Promise<UserOrganizationRole[]> {
    return this.userOrgRoleRepository.find({
      where: { organizationId, roleId },
      relations: ['user'],
    });
  }

  async revokeMemberSessions(
    organizationId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.assertMembership(organizationId, targetUserId);
    await this.authService.revokeAllUserSessions(targetUserId);
  }

  async lockMember(
    organizationId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.assertMembership(organizationId, targetUserId);
    await this.usersService.setActive(targetUserId, false);
    await this.authService.revokeAllUserSessions(targetUserId);
  }

  async unlockMember(
    organizationId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.assertMembership(organizationId, targetUserId);
    await this.usersService.setActive(targetUserId, true);
  }

  private async assertMembership(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.userOrgRoleRepository.findOne({
      where: { organizationId, userId },
    });
    if (!membership) {
      throw new NotFoundException('Member not found in this organization');
    }
  }

  private async verifyEntitiesExist(
    userId: string,
    organizationId: string,
    roleId: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found`,
      );
    }

    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }
  }

  private async verifyUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found`,
      );
    }
  }
}
