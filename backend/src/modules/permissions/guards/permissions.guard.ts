import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../permissions.service';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { OrgPermission } from '../permissions.constants';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<
      OrgPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract orgId from params or query
    const orgId =
      request.params.orgId ||
      request.query.orgId ||
      request.body?.orgId ||
      request.body?.organizationId;

    if (!orgId) {
      throw new BadRequestException(
        'Organization ID required for permission check',
      );
    }

    const organizationId = Number(orgId);

    if (isNaN(organizationId)) {
      throw new BadRequestException('Invalid organization ID');
    }

    // Check if user has all required permissions
    const hasPermissions = await this.permissionsService.hasAllPermissions(
      user.userId,
      organizationId,
      requiredPermissions,
    );

    if (!hasPermissions) {
      throw new ForbiddenException(
        `Missing required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
