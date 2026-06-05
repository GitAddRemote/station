import {
  Injectable,
  NotFoundException,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

class DiscordProviderError extends Error {}

@Injectable()
export class DiscordAuthGuard extends AuthGuard('discord') {
  constructor(private configService: ConfigService) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const enabled =
      (process.env['AUTH_DISCORD_ENABLED'] ??
        this.configService.get<string>('AUTH_DISCORD_ENABLED', 'true')) ===
      'true';
    if (!enabled) {
      throw new NotFoundException('Discord auth is disabled');
    }
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (err) {
      if (err instanceof DiscordProviderError) {
        // Redirect already committed in handleRequest; stop the request here.
        return false;
      }
      throw err;
    }
  }

  // Passport calls handleRequest after the provider callback completes.
  // On provider failure (access_denied, invalid code, token exchange error)
  // we redirect to the frontend error page and throw DiscordProviderError so
  // canActivate returns false and the controller never runs.
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
      throw new DiscordProviderError();
    }
    return user;
  }
}
