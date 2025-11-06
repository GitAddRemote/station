import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserOrganizationRole } from './user-organization-role.entity';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/organization.entity';
import { Role } from '../roles/role.entity';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';

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
  ) {}

  async assignRole(assignRoleDto: AssignRoleDto): Promise<UserOrganizationRole> {
    const { userId, organizationId, roleId } = assignRoleDto;

    // Verify entities exist
    await this.verifyEntitiesExist(userId, organizationId, roleId);

    // Check if assignment already exists
    const existing = await this.userOrgRoleRepository.findOne({
      where: { userId, organizationId, roleId },
    });

    if (existing) {
      throw new ConflictException('User already has this role in the organization');
    }

    const userOrgRole = this.userOrgRoleRepository.create(assignRoleDto);
    return this.userOrgRoleRepository.save(userOrgRole);
  }

  async assignMultipleRoles(assignRolesDto: AssignRolesDto): Promise<UserOrganizationRole[]> {
    const { userId, organizationId, roleIds } = assignRolesDto;

    // Verify user and organization exist
    await this.verifyUserAndOrganization(userId, organizationId);

    // Verify all roles exist
    const roles = await this.roleRepository.findByIds(roleIds);
    if (roles.length !== roleIds.length) {
      throw new NotFoundException('One or more roles not found');
    }

    // Get existing assignments
    const existing = await this.userOrgRoleRepository.find({
      where: { userId, organizationId },
    });
    const existingRoleIds = new Set(existing.map(e => e.roleId));

    // Filter out already assigned roles
    const newRoleIds = roleIds.filter(roleId => !existingRoleIds.has(roleId));

    if (newRoleIds.length === 0) {
      throw new ConflictException('All specified roles are already assigned');
    }

    // Create new assignments
    const newAssignments = newRoleIds.map(roleId =>
      this.userOrgRoleRepository.create({ userId, organizationId, roleId }),
    );

    return this.userOrgRoleRepository.save(newAssignments);
  }

  async removeRole(userId: number, organizationId: number, roleId: number): Promise<void> {
    const userOrgRole = await this.userOrgRoleRepository.findOne({
      where: { userId, organizationId, roleId },
    });

    if (!userOrgRole) {
      throw new NotFoundException('Role assignment not found');
    }

    await this.userOrgRoleRepository.remove(userOrgRole);
  }

  async getUserRolesInOrganization(
    userId: number,
    organizationId: number,
  ): Promise<UserOrganizationRole[]> {
    return this.userOrgRoleRepository.find({
      where: { userId, organizationId },
      relations: ['role'],
    });
  }

  async getUserOrganizations(userId: number): Promise<UserOrganizationRole[]> {
    return this.userOrgRoleRepository.find({
      where: { userId },
      relations: ['organization', 'role'],
    });
  }

  async getOrganizationMembers(organizationId: number): Promise<UserOrganizationRole[]> {
    return this.userOrgRoleRepository.find({
      where: { organizationId },
      relations: ['user', 'role'],
    });
  }

  async getUsersWithRole(organizationId: number, roleId: number): Promise<UserOrganizationRole[]> {
    return this.userOrgRoleRepository.find({
      where: { organizationId, roleId },
      relations: ['user'],
    });
  }

  private async verifyEntitiesExist(
    userId: number,
    organizationId: number,
    roleId: number,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }
  }

  private async verifyUserAndOrganization(userId: number, organizationId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }
  }
}
