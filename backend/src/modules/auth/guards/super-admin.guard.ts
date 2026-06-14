import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{ user?: { userId?: string } }>();
    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Forbidden');
    }
    const user = await this.usersService.findById(userId);
    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Forbidden');
    }
    return true;
  }
}
