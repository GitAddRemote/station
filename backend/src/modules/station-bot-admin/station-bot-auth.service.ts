import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  StationBotAuthState,
  StationBotIntegrationStatusDto,
} from './dto/station-bot-integration-status.dto';

const REQUIRED_SCOPES = [
  'station-bot:admin:read',
  'station-bot:admin:write',
  'station-bot:admin:action',
] as const;

interface CachedToken {
  accessToken: string;
  scopes: string[];
  expiresAt: Date;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

@Injectable()
export class StationBotAuthService {
  private readonly logger = new Logger(StationBotAuthService.name);
  private cached: CachedToken | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  async getIntegrationStatus(): Promise<StationBotIntegrationStatusDto> {
    const clientId = this.config.get<string>('STATION_BOT_CLIENT_ID');
    const clientSecret = this.config.get<string>('STATION_BOT_CLIENT_SECRET');
    const tokenUrl = this.config.get<string>('STATION_BOT_TOKEN_URL');

    if (!clientId || !clientSecret || !tokenUrl) {
      return {
        authState: 'not_configured',
        configuredClientId: clientId ?? null,
        grantedScopes: null,
        missingScopes: null,
        tokenExpiresAt: null,
      };
    }

    const token = await this.acquireToken(clientId, clientSecret, tokenUrl);
    if (!token) {
      return {
        authState: 'token_request_failed',
        configuredClientId: clientId,
        grantedScopes: null,
        missingScopes: null,
        tokenExpiresAt: null,
      };
    }

    const missingScopes = REQUIRED_SCOPES.filter(
      (s) => !token.scopes.includes(s),
    );
    if (missingScopes.length > 0) {
      return {
        authState: 'scope_mismatch',
        configuredClientId: clientId,
        grantedScopes: token.scopes,
        missingScopes,
        tokenExpiresAt: token.expiresAt,
      };
    }

    return {
      authState: 'healthy',
      configuredClientId: clientId,
      grantedScopes: token.scopes,
      missingScopes: [],
      tokenExpiresAt: token.expiresAt,
    };
  }

  /** Returns a valid cached token, refreshing if within 60s of expiry. */
  async getAccessToken(): Promise<string | null> {
    const clientId = this.config.get<string>('STATION_BOT_CLIENT_ID');
    const clientSecret = this.config.get<string>('STATION_BOT_CLIENT_SECRET');
    const tokenUrl = this.config.get<string>('STATION_BOT_TOKEN_URL');

    if (!clientId || !clientSecret || !tokenUrl) return null;

    const token = await this.acquireToken(clientId, clientSecret, tokenUrl);
    return token?.accessToken ?? null;
  }

  private async acquireToken(
    clientId: string,
    clientSecret: string,
    tokenUrl: string,
  ): Promise<CachedToken | null> {
    const bufferMs = 60_000;
    if (
      this.cached &&
      this.cached.expiresAt.getTime() - Date.now() > bufferMs
    ) {
      return this.cached;
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: REQUIRED_SCOPES.join(' '),
      });

      const response = await firstValueFrom(
        this.http.post<TokenResponse>(tokenUrl, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const { access_token, expires_in, scope } = response.data;
      const scopes = scope ? scope.split(' ') : [...REQUIRED_SCOPES];
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      this.cached = { accessToken: access_token, scopes, expiresAt };
      return this.cached;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Station-Bot token request failed: ${msg}`);
      this.cached = null;
      return null;
    }
  }

  /** Returns the set of required scopes for downstream Station-Bot admin calls. */
  getRequiredScopes(): readonly string[] {
    return REQUIRED_SCOPES;
  }

  authStateLabel(state: StationBotAuthState): string {
    const labels: Record<StationBotAuthState, string> = {
      not_configured: 'Integration not configured',
      token_request_failed: 'Token request failed',
      scope_mismatch: 'Token granted but missing required scopes',
      healthy: 'Integration healthy',
    };
    return labels[state];
  }
}
