import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { StationBotAuthService } from './station-bot-auth.service';

const BASE_CONFIG: Record<string, string> = {
  STATION_BOT_CLIENT_ID: 'test-client-id',
  STATION_BOT_CLIENT_SECRET: 'test-client-secret',
  STATION_BOT_TOKEN_URL: 'http://station-bot/oauth/token',
};

function makeTokenResponse(
  scopes: string,
  expiresIn = 3600,
): AxiosResponse<unknown> {
  return {
    data: {
      access_token: 'tok',
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope: scopes,
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} as never },
  };
}

describe('StationBotAuthService', () => {
  let service: StationBotAuthService;
  let httpService: jest.Mocked<HttpService>;
  let configValues: Record<string, string | undefined>;

  beforeEach(async () => {
    configValues = { ...BASE_CONFIG };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StationBotAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configValues[key]),
          },
        },
        {
          provide: HttpService,
          useValue: { post: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(StationBotAuthService);
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;
  });

  it('returns not_configured when env vars are missing', async () => {
    configValues = {};
    const status = await service.getIntegrationStatus();
    expect(status.authState).toBe('not_configured');
    expect(status.configuredClientId).toBeNull();
  });

  it('returns token_request_failed when the token endpoint throws', async () => {
    httpService.post.mockReturnValue(
      throwError(() => new Error('connect ECONNREFUSED')),
    );
    const status = await service.getIntegrationStatus();
    expect(status.authState).toBe('token_request_failed');
  });

  it('returns scope_mismatch when granted scopes are missing required ones', async () => {
    httpService.post.mockReturnValue(
      of(makeTokenResponse('station-bot:admin:read')),
    );
    const status = await service.getIntegrationStatus();
    expect(status.authState).toBe('scope_mismatch');
    expect(status.missingScopes).toContain('station-bot:admin:write');
    expect(status.missingScopes).toContain('station-bot:admin:action');
  });

  it('returns healthy when all required scopes are granted', async () => {
    httpService.post.mockReturnValue(
      of(
        makeTokenResponse(
          'station-bot:admin:read station-bot:admin:write station-bot:admin:action',
        ),
      ),
    );
    const status = await service.getIntegrationStatus();
    expect(status.authState).toBe('healthy');
    expect(status.missingScopes).toHaveLength(0);
  });

  it('caches the token and does not re-fetch within the expiry window', async () => {
    httpService.post.mockReturnValue(
      of(
        makeTokenResponse(
          'station-bot:admin:read station-bot:admin:write station-bot:admin:action',
          3600,
        ),
      ),
    );

    await service.getIntegrationStatus();
    await service.getIntegrationStatus();

    expect(httpService.post).toHaveBeenCalledTimes(1);
  });
});
