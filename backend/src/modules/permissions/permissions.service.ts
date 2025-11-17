import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UserOrganizationRole } from '../user-organization-roles/user-organization-role.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(UserOrganizationRole)
    private userOrgRoleRepository: Repository<UserOrganizationRole>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  /**
   * Get aggregated permissions for a user in an organization
   * Combines permissions from all roles the user has in that organization
   */
  async getUserPermissions(
    userId: number,
    organizationId: number,
  ): Promise<Set<string>> {
    const cacheKey = `permissions:user:${userId}:org:${organizationId}`;

    // Try to get from cache
    const cached = await this.cacheManager.get<string[]>(cacheKey);
    if (cached) {
      return new Set(cached);
    }

    // If not in cache, fetch from database
    const userRoles = await this.userOrgRoleRepository.find({
      where: { userId, organizationId },
      relations: ['role'],
    });

    const permissions = new Set<string>();

    // Aggregate permissions from all roles
    userRoles.forEach((userOrgRole) => {
      const rolePermissions = userOrgRole.role.permissions || {};
      Object.entries(rolePermissions).forEach(([permission, enabled]) => {
        if (enabled) {
          permissions.add(permission);
        }
      });
    });

    // Store in cache with 15 minute TTL
    await this.cacheManager.set(cacheKey, Array.from(permissions), 900000);

    return permissions;
  }

  /**
   * Invalidate cached permissions for a user in an organization
   * Call this whenever user roles change
   */
  async invalidateUserPermissions(
    userId: number,
    organizationId: number,
  ): Promise<void> {
    const cacheKey = `permissions:user:${userId}:org:${organizationId}`;
    await this.cacheManager.del(cacheKey);
  }

  /**
   * Check if user has a specific permission in an organization
   */
  async hasPermission(
    userId: number,
    organizationId: number,
    permission: string,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, organizationId);
    return permissions.has(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: number,
    organizationId: number,
    permissionsToCheck: string[],
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(
      userId,
      organizationId,
    );
    return permissionsToCheck.some((permission) =>
      userPermissions.has(permission),
    );
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(
    userId: number,
    organizationId: number,
    permissionsToCheck: string[],
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(
      userId,
      organizationId,
    );
    return permissionsToCheck.every((permission) =>
      userPermissions.has(permission),
    );
  }

  /**
   * Get all permissions as an array (useful for API responses)
   */
  async getUserPermissionsArray(
    userId: number,
    organizationId: number,
  ): Promise<string[]> {
    const permissions = await this.getUserPermissions(userId, organizationId);
    return Array.from(permissions);
  }
}
