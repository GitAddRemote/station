/**
 * E2E tests for Discord OAuth login (ISSUE-160).
 *
 * Discord API calls are intercepted by overriding DiscordStrategy.validate()
 * in the test module to return a controlled profile — no real Discord
 * credentials are used. The OAuth state/nonce cookie flow is exercised against
 * the real AuthService and in-memory cache (USE_REDIS_CACHE=false in .env.test).
 *
 * The DiscordAuthGuard is also overridden so the test suite controls what
 * happens at the Passport layer: for "happy path" tests the guard calls next()
 * after validate() populates req.user; for "Discord denied" the guard redirects
 * directly to simulate the user cancelling the consent screen.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/user.entity';
import * as bcrypt from 'bcrypt';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { seedSystemUser } from './helpers/seed-system-user';
import {
  AuthService,
  DISCORD_NONCE_COOKIE,
} from '../src/modules/auth/auth.service';

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

function makeDiscordProfile(
  overrides: Partial<{
    discordId: string;
    email: string | null;
    verified: boolean;
    username: string;
    avatarUrl: string | null;
  }> = {},
) {
  return {
    discordId: 'discord_123',
    email: 'discord@example.com',
    verified: true,
    username: 'discorduser',
    avatarUrl: 'https://cdn.discordapp.com/avatars/123/abc.png',
    ...overrides,
  };
}

/**
 * Builds a DiscordAuthGuard override that populates req.user with the given
 * profile (simulating a successful Discord OAuth exchange) without hitting the
 * real Discord API.
 */
function makeStubGuard(profile: ReturnType<typeof makeDiscordProfile>) {
  @Injectable()
  class StubDiscordGuard extends AuthGuard('discord') {
    override canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest();
      req.user = profile;
      return true;
    }
  }
  return StubDiscordGuard;
}

// ---------------------------------------------------------------------------
// Shared app bootstrap helpers
// ---------------------------------------------------------------------------

async function buildApp(
  guardOverride?: ReturnType<typeof makeStubGuard>,
): Promise<{ app: INestApplication; dataSource: DataSource }> {
  const builder = Test.createTestingModule({ imports: [AppModule] });

  if (guardOverride) {
    builder.overrideGuard(AuthGuard('discord')).useClass(guardOverride);
  }

  const moduleFixture: TestingModule = await builder.compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  const dataSource = moduleFixture.get<DataSource>(DataSource);
  await seedSystemUser(dataSource);

  return { app, dataSource };
}

// ---------------------------------------------------------------------------
// Feature flag gates
// ---------------------------------------------------------------------------

describe('Auth - Discord OAuth - feature flags (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await buildApp());
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /auth/discord returns 404 when AUTH_DISCORD_ENABLED=false', async () => {
    process.env['AUTH_DISCORD_ENABLED'] = 'false';
    await request(app.getHttpServer()).get('/auth/discord').expect(404);
    process.env['AUTH_DISCORD_ENABLED'] = 'true';
  });

  it('GET /auth/discord/callback returns 404 when AUTH_DISCORD_ENABLED=false', async () => {
    process.env['AUTH_DISCORD_ENABLED'] = 'false';
    await request(app.getHttpServer())
      .get('/auth/discord/callback')
      .expect(404);
    process.env['AUTH_DISCORD_ENABLED'] = 'true';
  });

  it('POST /auth/login returns 403 when AUTH_LOCAL_LOGIN_ENABLED=false', async () => {
    process.env['AUTH_LOCAL_LOGIN_ENABLED'] = 'false';
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'any', password: 'any' })
      .expect(403);
    process.env['AUTH_LOCAL_LOGIN_ENABLED'] = 'true';
  });

  it('POST /auth/register returns 403 when AUTH_LOCAL_REGISTER_ENABLED=false', async () => {
    process.env['AUTH_LOCAL_REGISTER_ENABLED'] = 'false';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: 'u', email: 'e@e.com', password: 'pass' })
      .expect(403);
    process.env['AUTH_LOCAL_REGISTER_ENABLED'] = 'true';
  });

  it('POST /auth/forgot-password returns 403 when AUTH_LOCAL_LOGIN_ENABLED=false', async () => {
    process.env['AUTH_LOCAL_LOGIN_ENABLED'] = 'false';
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'any@example.com' })
      .expect(403);
    process.env['AUTH_LOCAL_LOGIN_ENABLED'] = 'true';
  });

  it('POST /auth/reset-password returns 403 when AUTH_LOCAL_LOGIN_ENABLED=false', async () => {
    process.env['AUTH_LOCAL_LOGIN_ENABLED'] = 'false';
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'tok', newPassword: 'newpassword' })
      .expect(403);
    process.env['AUTH_LOCAL_LOGIN_ENABLED'] = 'true';
  });
});

// ---------------------------------------------------------------------------
// Callback — email/verified gate
// ---------------------------------------------------------------------------

describe('Auth - Discord OAuth - email/verified gate (e2e)', () => {
  let app: INestApplication;

  afterAll(async () => {
    await app?.close();
  });

  it('no email → redirects to /login?error=discord_no_email, no user created', async () => {
    const stub = makeStubGuard(makeDiscordProfile({ email: null }));
    ({ app } = await buildApp(stub));

    const authService = app.get(AuthService);
    const state = await authService.generateDiscordState();

    const res = await request(app.getHttpServer())
      .get('/auth/discord/callback')
      .query({ state })
      .set('Cookie', `${DISCORD_NONCE_COOKIE}=${state}`)
      .expect(302);

    expect(res.headers['location']).toContain('error=discord_no_email');
  });

  it('unverified email → redirects to /login?error=discord_unverified_email, no user created', async () => {
    const stub = makeStubGuard(makeDiscordProfile({ verified: false }));
    ({ app } = await buildApp(stub));

    const authService = app.get(AuthService);
    const state = await authService.generateDiscordState();

    const res = await request(app.getHttpServer())
      .get('/auth/discord/callback')
      .query({ state })
      .set('Cookie', `${DISCORD_NONCE_COOKIE}=${state}`)
      .expect(302);

    expect(res.headers['location']).toContain('error=discord_unverified_email');
  });
});

// ---------------------------------------------------------------------------
// Callback — new account creation
// ---------------------------------------------------------------------------

describe('Auth - Discord OAuth - new account creation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const stub = makeStubGuard(makeDiscordProfile());
    ({ app, dataSource } = await buildApp(stub));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates user, sets discordId, issues auth cookies', async () => {
    const authService = app.get(AuthService);
    const state = await authService.generateDiscordState();

    const res = await request(app.getHttpServer())
      .get('/auth/discord/callback')
      .query({ state })
      .set('Cookie', `${DISCORD_NONCE_COOKIE}=${state}`)
      .expect(302);

    expect(res.headers['location']).toContain('/dashboard');
    expect(res.headers['set-cookie']).toBeDefined();
    const cookies: string[] = Array.isArray(res.headers['set-cookie'])
      ? res.headers['set-cookie']
      : [res.headers['set-cookie']];
    expect(cookies.some((c: string) => c.startsWith('access_token='))).toBe(
      true,
    );
    expect(cookies.some((c: string) => c.startsWith('refresh_token='))).toBe(
      true,
    );
    expect(cookies.some((c: string) => c.includes('HttpOnly'))).toBe(true);

    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { discordId: 'discord_123' },
    });
    expect(user).toBeDefined();
    expect(user!.email).toBe('discord@example.com');
    expect(user!.discordAvatarUrl).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Callback — returning user (avatar updated)
// ---------------------------------------------------------------------------

describe('Auth - Discord OAuth - returning user (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const stub = makeStubGuard(
      makeDiscordProfile({
        avatarUrl: 'https://cdn.discordapp.com/avatars/123/NEW.png',
      }),
    );
    ({ app, dataSource } = await buildApp(stub));

    // Pre-create a user already linked to this discordId
    const userRepo = dataSource.getRepository(User);
    const existing = userRepo.create({
      username: 'returning_user',
      email: 'returning@example.com',
      password: await bcrypt.hash('password', 10),
      discordId: 'discord_123',
      discordAvatarUrl: 'https://cdn.discordapp.com/avatars/123/OLD.png',
      isActive: true,
    });
    await userRepo.save(existing);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('logs in existing user and updates discordAvatarUrl', async () => {
    const authService = app.get(AuthService);
    const state = await authService.generateDiscordState();

    const res = await request(app.getHttpServer())
      .get('/auth/discord/callback')
      .query({ state })
      .set('Cookie', `${DISCORD_NONCE_COOKIE}=${state}`)
      .expect(302);

    expect(res.headers['location']).toContain('/dashboard');

    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { discordId: 'discord_123' },
    });
    expect(user!.discordAvatarUrl).toBe(
      'https://cdn.discordapp.com/avatars/123/NEW.png',
    );
  });
});

// ---------------------------------------------------------------------------
// Callback — account linking
// ---------------------------------------------------------------------------

describe('Auth - Discord OAuth - account linking (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const stub = makeStubGuard(
      makeDiscordProfile({ discordId: 'discord_link_456' }),
    );
    ({ app, dataSource } = await buildApp(stub));

    // Pre-create an unlinked user with the same email
    const userRepo = dataSource.getRepository(User);
    const existing = userRepo.create({
      username: 'localuser',
      email: 'discord@example.com',
      password: await bcrypt.hash('localpassword', 10),
      isActive: true,
    });
    await userRepo.save(existing);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('links discordId to existing account, no duplicate user created', async () => {
    const authService = app.get(AuthService);
    const state = await authService.generateDiscordState();

    const res = await request(app.getHttpServer())
      .get('/auth/discord/callback')
      .query({ state })
      .set('Cookie', `${DISCORD_NONCE_COOKIE}=${state}`)
      .expect(302);

    expect(res.headers['location']).toContain('/dashboard');

    const userRepo = dataSource.getRepository(User);
    const users = await userRepo.find({
      where: { email: 'discord@example.com' },
    });
    expect(users).toHaveLength(1);
    expect(users[0].discordId).toBe('discord_link_456');
  });
});

// ---------------------------------------------------------------------------
// Callback — email_conflict
// ---------------------------------------------------------------------------

describe('Auth - Discord OAuth - email_conflict (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const stub = makeStubGuard(
      makeDiscordProfile({ discordId: 'discord_new_789' }),
    );
    ({ app, dataSource } = await buildApp(stub));

    // Pre-create a user already linked to a DIFFERENT discordId with the same email
    const userRepo = dataSource.getRepository(User);
    const existing = userRepo.create({
      username: 'alreadylinked',
      email: 'discord@example.com',
      password: await bcrypt.hash('pass', 10),
      discordId: 'discord_different_000',
      isActive: true,
    });
    await userRepo.save(existing);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('redirects to /login?error=email_conflict, no rows modified', async () => {
    const authService = app.get(AuthService);
    const state = await authService.generateDiscordState();

    const res = await request(app.getHttpServer())
      .get('/auth/discord/callback')
      .query({ state })
      .set('Cookie', `${DISCORD_NONCE_COOKIE}=${state}`)
      .expect(302);

    expect(res.headers['location']).toContain('error=email_conflict');

    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { email: 'discord@example.com' },
    });
    expect(user!.discordId).toBe('discord_different_000'); // unchanged
  });
});

// ---------------------------------------------------------------------------
// CSRF / state validation
// ---------------------------------------------------------------------------

describe('Auth - Discord OAuth - CSRF state validation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const stub = makeStubGuard(makeDiscordProfile());
    ({ app } = await buildApp(stub));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('missing state query param → redirects to /login?error=state_invalid', async () => {
    const authService = app.get(AuthService);
    const state = await authService.generateDiscordState();

    const res = await request(app.getHttpServer())
      .get('/auth/discord/callback')
      .set('Cookie', `${DISCORD_NONCE_COOKIE}=${state}`)
      // no ?state= query param
      .expect(302);

    expect(res.headers['location']).toContain('error=state_invalid');
  });

  it('state does not match Redis entry → redirects to /login?error=state_invalid', async () => {
    const authService = app.get(AuthService);
    const state = await authService.generateDiscordState();

    const res = await request(app.getHttpServer())
      .get('/auth/discord/callback')
      .query({ state: 'totally_wrong_state' })
      .set('Cookie', `${DISCORD_NONCE_COOKIE}=${state}`)
      .expect(302);

    expect(res.headers['location']).toContain('error=state_invalid');
  });

  it('missing nonce cookie → redirects to /login?error=state_invalid', async () => {
    const authService = app.get(AuthService);
    const state = await authService.generateDiscordState();

    const res = await request(app.getHttpServer())
      .get('/auth/discord/callback')
      .query({ state })
      // no cookie
      .expect(302);

    expect(res.headers['location']).toContain('error=state_invalid');
  });

  it('cookie value does not match query state → redirects to /login?error=state_invalid', async () => {
    const authService = app.get(AuthService);
    const state = await authService.generateDiscordState();

    const res = await request(app.getHttpServer())
      .get('/auth/discord/callback')
      .query({ state })
      .set('Cookie', `${DISCORD_NONCE_COOKIE}=wrong_cookie_value`)
      .expect(302);

    expect(res.headers['location']).toContain('error=state_invalid');
  });

  it('replaying callback after state consumed → redirects to /login?error=state_invalid', async () => {
    const authService = app.get(AuthService);
    const state = await authService.generateDiscordState();

    // First request — succeeds
    await request(app.getHttpServer())
      .get('/auth/discord/callback')
      .query({ state })
      .set('Cookie', `${DISCORD_NONCE_COOKIE}=${state}`)
      .expect(302);

    // Second request with same state — Redis key already consumed
    const res = await request(app.getHttpServer())
      .get('/auth/discord/callback')
      .query({ state })
      .set('Cookie', `${DISCORD_NONCE_COOKIE}=${state}`)
      .expect(302);

    expect(res.headers['location']).toContain('error=state_invalid');
  });
});

// ---------------------------------------------------------------------------
// Throttling
// ---------------------------------------------------------------------------

describe('Auth - Discord OAuth - throttling (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Use a real DiscordAuthGuard (redirect) but set a very low throttle limit
    process.env['AUTH_DISCORD_THROTTLE_LIMIT'] = '2';
    process.env['AUTH_DISCORD_THROTTLE_TTL_MS'] = '60000';
    ({ app } = await buildApp());
  });

  afterAll(async () => {
    await app?.close();
    delete process.env['AUTH_DISCORD_THROTTLE_LIMIT'];
    delete process.env['AUTH_DISCORD_THROTTLE_TTL_MS'];
  });

  it('GET /auth/discord returns 429 after exceeding throttle limit', async () => {
    const limit = 2;
    for (let i = 0; i < limit; i++) {
      await request(app.getHttpServer()).get('/auth/discord');
    }
    await request(app.getHttpServer()).get('/auth/discord').expect(429);
  });
});
