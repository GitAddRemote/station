import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity';
import { SYSTEM_PERMISSIONS_KEY } from '../decorators/require-system-permission.decorator';
import { SystemPermission } from '../system-permissions.constants';

/**
 * Guards routes that require platform-level (super-admin) system permissions.
 *
 * Unlike org-scoped PermissionsGuard, this guard checks isSuperAdmin on the
 * user entity. Super admins implicitly hold all SystemPermission values.
 * Non-super-admin users always receive 403, regardless of which permissions
 * are declared on the route.
 */
@Injectable()
export class SystemPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      SystemPermission[]
    >(SYSTEM_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { userId?: string };
    }>();
    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'isSuperAdmin'],
    });

    if (!user?.isSuperAdmin) {
      throw new ForbiddenException(
        `System permission required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
