import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthInvitesService } from '../../auth-invites/auth-invites.service';

@Injectable()
export class InviteOnlyGuard implements CanActivate {
  constructor(private readonly authInvitesService: AuthInvitesService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (!this.authInvitesService.isInviteOnly()) {
      return true;
    }

    const req = ctx.switchToHttp().getRequest<Request>();
    const token =
      (req.query['invite'] as string | undefined) ??
      (req.cookies as Record<string, string> | undefined)?.['oauth_invite'];

    if (!token) {
      throw new ForbiddenException(
        'An invite is required to access this platform',
      );
    }

    try {
      await this.authInvitesService.validateToken(token);
      return true;
    } catch {
      throw new ForbiddenException(
        'An invite is required to access this platform',
      );
    }
  }
}
