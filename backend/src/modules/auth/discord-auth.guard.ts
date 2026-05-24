import {
  Injectable,
  NotFoundException,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Injectable()
export class DiscordAuthGuard extends AuthGuard('discord') {
  constructor(private configService: ConfigService) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const enabled =
      this.configService.get<string>('AUTH_DISCORD_ENABLED', 'true') === 'true';
    if (!enabled) {
      throw new NotFoundException('Discord auth is disabled');
    }
    return super.canActivate(context);
  }

  // Passport calls handleRequest after the provider callback completes.
  // Without this override, provider errors (access_denied, invalid code,
  // token exchange failure) propagate as 401/500 instead of a redirect.
  override handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const res: Response = context.switchToHttp().getResponse();
      const frontendBase =
        this.configService.get<string>('FRONTEND_URL') ??
        'http://localhost:5173';
      res.redirect(`${frontendBase}/login?error=discord_auth_failed`);
      // Return a sentinel so Passport does not throw; the response is already
      // committed via the redirect above and NestJS will not write further.
      return null as unknown as TUser;
    }
    return user;
  }
}
