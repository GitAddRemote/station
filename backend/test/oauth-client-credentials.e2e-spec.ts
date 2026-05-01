import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { OauthClient } from '../src/modules/oauth-clients/oauth-client.entity';
import { OauthClientsService } from '../src/modules/oauth-clients/oauth-clients.service';
import { seedSystemUser } from './helpers/seed-system-user';

describe('OAuth Client Credentials (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let oauthClientsService: OauthClientsService;
  const CLIENT_ID = 'e2e-test-bot';
  const CLIENT_SECRET = 'e2e-test-secret-value-min-32-chars!!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    oauthClientsService =
      moduleFixture.get<OauthClientsService>(OauthClientsService);

    await seedSystemUser(dataSource);
    await oauthClientsService.register(CLIENT_ID, CLIENT_SECRET, ['bot:api']);
  });

  afterAll(async () => {
    const repo = dataSource.getRepository(OauthClient);
    await repo.delete({ clientId: CLIENT_ID });
    await app?.close();
  });

  // ---------------------------------------------------------------------------
  // 1. Happy path — valid credentials → token response
  // ---------------------------------------------------------------------------
  it('should return an access token for valid client credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'bot:api',
      })
      .expect(200);

    expect(res.body).toMatchObject({
      token_type: 'Bearer',
      expires_in: expect.any(Number),
    });
    expect(typeof res.body.access_token).toBe('string');
    expect(res.body.access_token.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 2. Wrong secret → 401
  // ---------------------------------------------------------------------------
  it('should reject invalid client_secret with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: 'definitely-wrong-secret-value!!!!!',
        scope: 'bot:api',
      })
      .expect(401);
  });

  // ---------------------------------------------------------------------------
  // 3. Unknown client → 401
  // ---------------------------------------------------------------------------
  it('should reject an unknown client_id with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: 'no-such-client',
        client_secret: 'irrelevant-secret-value-long-enough!!',
        scope: 'bot:api',
      })
      .expect(401);
  });

  // ---------------------------------------------------------------------------
  // 4. Inactive client → 401
  // ---------------------------------------------------------------------------
  it('should reject an inactive client with 401', async () => {
    const repo = dataSource.getRepository(OauthClient);
    await repo.update({ clientId: CLIENT_ID }, { isActive: false });

    await request(app.getHttpServer())
      .post('/auth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      })
      .expect(401);

    await repo.update({ clientId: CLIENT_ID }, { isActive: true });
  });

  // ---------------------------------------------------------------------------
  // 5. Wrong grant_type → 400
  // ---------------------------------------------------------------------------
  it('should reject unsupported grant_type with 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/token')
      .send({
        grant_type: 'password',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      })
      .expect(400);
  });

  // ---------------------------------------------------------------------------
  // 6. Issued token is usable on a protected endpoint (GET /auth/me rejects it
  //    as expected — it's a client token, not a user token — but the guard
  //    accepts it on an endpoint protected by ClientAuthGuard)
  // ---------------------------------------------------------------------------
  it('should issue a token whose JWT is valid and carries the correct payload', async () => {
    const tokenRes = await request(app.getHttpServer())
      .post('/auth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      })
      .expect(200);

    const token: string = tokenRes.body.access_token;

    // Decode payload (without verifying — just structural check)
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    expect(payload.sub).toBe(CLIENT_ID);
    expect(payload.type).toBe('client');
    expect(Array.isArray(payload.scopes)).toBe(true);
    expect(payload.scopes).toContain('bot:api');
    expect(typeof payload.jti).toBe('string');
    expect(payload.exp - payload.iat).toBe(3600);
  });

  // ---------------------------------------------------------------------------
  // 7. Admin /oauth-clients endpoint requires INTERNAL_API_KEY
  // ---------------------------------------------------------------------------
  it('should reject POST /oauth-clients without the internal API key', async () => {
    await request(app.getHttpServer())
      .post('/oauth-clients')
      .send({
        clientId: 'sneaky-bot',
        clientSecret: 'sneaky-secret-value-long-enough-here',
        scopes: ['bot:api'],
      })
      .expect(401);
  });

  // ---------------------------------------------------------------------------
  // 8. Authorization: Basic header is accepted as an alternative to body params
  // ---------------------------------------------------------------------------
  it('should accept client credentials via Authorization: Basic header', async () => {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
      'base64',
    );

    const res = await request(app.getHttpServer())
      .post('/auth/token')
      .set('Authorization', `Basic ${credentials}`)
      .send({ grant_type: 'client_credentials' })
      .expect(200);

    expect(res.body.token_type).toBe('Bearer');
    expect(typeof res.body.access_token).toBe('string');
  });

  // ---------------------------------------------------------------------------
  // 9. Requested scope is intersected with the registered scopes
  // ---------------------------------------------------------------------------
  it('should mint a token containing only the requested subset of scopes', async () => {
    // Register a client with two scopes so we can request just one.
    await oauthClientsService.register(
      'e2e-multiscope-bot',
      'e2e-multiscope-secret-value-min-32!!',
      ['bot:api', 'bot:read'],
    );

    const res = await request(app.getHttpServer())
      .post('/auth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: 'e2e-multiscope-bot',
        client_secret: 'e2e-multiscope-secret-value-min-32!!',
        scope: 'bot:read',
      })
      .expect(200);

    const [, payloadB64] = (res.body.access_token as string).split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    expect(payload.scopes).toEqual(['bot:read']);
    expect(payload.scopes).not.toContain('bot:api');

    const repo = dataSource.getRepository(OauthClient);
    await repo.delete({ clientId: 'e2e-multiscope-bot' });
  });

  // ---------------------------------------------------------------------------
  // 10. Requesting a scope not in the registered set → 401
  // ---------------------------------------------------------------------------
  it('should reject a scope not registered for the client', async () => {
    await request(app.getHttpServer())
      .post('/auth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'admin:all',
      })
      .expect(401);
  });
});
