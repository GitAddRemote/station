import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-discord';
import { ConfigService } from '@nestjs/config';

export interface DiscordProfile {
  discordId: string;
  email: string | null;
  verified: boolean;
  username: string;
  avatarUrl: string | null;
}

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('DISCORD_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('DISCORD_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('DISCORD_CALLBACK_URL'),
      scope: ['identify', 'email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<DiscordProfile> {
    const email = profile.email ?? profile.emails?.[0]?.value ?? null;
    const verified: boolean =
      typeof (profile as unknown as Record<string, unknown>)['verified'] ===
      'boolean'
        ? ((profile as unknown as Record<string, unknown>)[
            'verified'
          ] as boolean)
        : false;
    const avatarUrl = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
      : null;

    return {
      discordId: profile.id,
      email,
      verified,
      username: profile.username,
      avatarUrl,
    };
  }
}
