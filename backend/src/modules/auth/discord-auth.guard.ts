import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
}
