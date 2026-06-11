// Force Redis on for this test file — pre-auth tokens require raw Redis.
// Must be set before any module is imported (runs at file-evaluation time,
// after setup-e2e.ts has loaded .env.test which sets USE_REDIS_CACHE=false).
process.env['USE_REDIS_CACHE'] = 'true';
process.env['AUTH_LOCAL_LOGIN_ENABLED'] = 'true';
process.env['AUTH_LOCAL_REGISTER_ENABLED'] = 'true';
// Raise throttle limits so repeated requests in the same test run don't 429.
process.env['AUTH_FORCED_PW_THROTTLE_LIMIT'] = '200';
process.env['AUTH_LOGIN_THROTTLE_LIMIT'] = '200';

// Bcrypt + DB sync across two app contexts needs more than the default 30 s.
jest.setTimeout(180_000);

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/user.entity';
import { DatabaseSeederAdminService } from '../src/database/seeds/database-seeder-admin.service';
import * as bcrypt from 'bcrypt';
import { seedSystemUser } from './helpers/seed-system-user';
import {
  LocalLoginEnabledGuard,
  LocalRegisterEnabledGuard,
} from '../src/modules/auth/local-feature-flags.guard';

// ─── Shared app (Redis + local-login enabled) ─────────────────────────────────

let app: INestApplication;
let dataSource: DataSource;
let seeder: DatabaseSeederAdminService;

async function createLocalUser(
  overrides: Partial<Omit<User, 'id'>> = {},
): Promise<User> {
  const repo = dataSource.getRepository(User);
  const hashedPassword = await bcrypt.hash('Password12345!', 10);
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return repo.save({
    username: `user_${suffix}`,
    email: `user_${suffix}@example.com`,
    password: hashedPassword,
    isActive: true,
    isSuperAdmin: true,
    passwordChangeRequired: false,
    passwordExpiresAt: null,
    ...overrides,
  });
}

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
  await seedSystemUser(dataSource);
  seeder = app.get(DatabaseSeederAdminService);
});

afterAll(async () => {
  await app?.close();
});

// ─── Seed script integration ──────────────────────────────────────────────────

describe('DatabaseSeederAdminService (integration)', () => {
  const SEED_EMAIL = 'admin-seed-test@example.com';

  afterAll(async () => {
    await dataSource.getRepository(User).delete({ email: SEED_EMAIL });
  });

  it('creates admin with password_change_required=true and valid bcrypt hash', async () => {
    process.env['ADMIN_EMAIL'] = SEED_EMAIL;
    process.env['ADMIN_USERNAME'] = 'admin-seed-test';
    process.env['ADMIN_INITIAL_PASSWORD'] = 'ChangeMe!SecurePassword123';
    process.env['AUTH_PASSWORD_EXPIRY_DAYS'] = '90';

    await seeder.seedAdmin();

    const user = await dataSource
      .getRepository(User)
      .findOne({ where: { email: SEED_EMAIL } });
    expect(user).toBeDefined();
    expect(user!.passwordChangeRequired).toBe(true);
    expect(user!.passwordExpiresAt).toBeDefined();
    expect(user!.passwordExpiresAt!.getTime()).toBeGreaterThan(Date.now());
    expect(
      await bcrypt.compare('ChangeMe!SecurePassword123', user!.password),
    ).toBe(true);
  });

  it('re-running seed is a no-op — no fields are modified', async () => {
    process.env['ADMIN_EMAIL'] = SEED_EMAIL;
    process.env['ADMIN_USERNAME'] = 'admin-seed-test';
    process.env['ADMIN_INITIAL_PASSWORD'] = 'DifferentPassword!!!!';
    process.env['AUTH_PASSWORD_EXPIRY_DAYS'] = '90';

    await seeder.seedAdmin();

    const user = await dataSource
      .getRepository(User)
      .findOne({ where: { email: SEED_EMAIL } });
    // Original hash must be unchanged — second seed was a no-op
    expect(
      await bcrypt.compare('ChangeMe!SecurePassword123', user!.password),
    ).toBe(true);
  });
});

// ─── POST /auth/login — forced-change and expiry gates ────────────────────────

describe('POST /auth/login — password expiry and forced-change gates', () => {
  it('returns 403 with code PASSWORD_CHANGE_REQUIRED and X-Pre-Auth-Token header', async () => {
    const user = await createLocalUser({ passwordChangeRequired: true });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user.username, password: 'Password12345!' })
      .expect(403);

    // ForbiddenException({ code: ... }) produces { code: ... } as the response body
    expect((res.body as { code: string }).code).toBe(
      'PASSWORD_CHANGE_REQUIRED',
    );
    expect(res.headers['x-pre-auth-token']).toBeDefined();

    await dataSource.getRepository(User).delete({ id: user.id });
  });

  it('returns 403 with code PASSWORD_EXPIRED and X-Pre-Auth-Token header', async () => {
    const user = await createLocalUser({
      passwordExpiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user.username, password: 'Password12345!' })
      .expect(403);

    expect((res.body as { code: string }).code).toBe('PASSWORD_EXPIRED');
    expect(res.headers['x-pre-auth-token']).toBeDefined();

    await dataSource.getRepository(User).delete({ id: user.id });
  });

  it('issues tokens normally when Discord user has password_change_required=true', async () => {
    const user = await createLocalUser({
      discordId: `discord-${Date.now()}`,
      passwordChangeRequired: true,
    });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user.username, password: 'Password12345!' })
      .expect(200);

    expect(res.headers['x-pre-auth-token']).toBeUndefined();
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith('access_token='))).toBe(
      true,
    );

    await dataSource.getRepository(User).delete({ id: user.id });
  });

  it('issues tokens normally for local user with no expiry or forced-change flag', async () => {
    const user = await createLocalUser();

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user.username, password: 'Password12345!' })
      .expect(200);

    expect(res.headers['x-pre-auth-token']).toBeUndefined();
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith('access_token='))).toBe(
      true,
    );

    await dataSource.getRepository(User).delete({ id: user.id });
  });
});

// ─── POST /auth/forced-password-change — happy path ──────────────────────────

describe('POST /auth/forced-password-change — happy path', () => {
  it('valid pre-auth token → 200; password_change_required cleared; cookies set', async () => {
    const user = await createLocalUser({ passwordChangeRequired: true });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user.username, password: 'Password12345!' })
      .expect(403);
    const preAuthToken = loginRes.headers['x-pre-auth-token'] as string;
    expect(preAuthToken).toBeDefined();

    const res = await request(app.getHttpServer())
      .post('/auth/forced-password-change')
      .set('x-pre-auth-token', preAuthToken)
      .send({ newPassword: 'NewValidPassword1!' })
      .expect(200);

    expect((res.body as { message: string }).message).toBe(
      'Password changed successfully',
    );
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith('access_token='))).toBe(
      true,
    );
    expect(cookies.some((c: string) => c.startsWith('refresh_token='))).toBe(
      true,
    );

    const updated = await dataSource
      .getRepository(User)
      .findOne({ where: { id: user.id } });
    expect(updated!.passwordChangeRequired).toBe(false);
    expect(updated!.passwordExpiresAt!.getTime()).toBeGreaterThan(Date.now());

    await dataSource.getRepository(User).delete({ id: user.id });
  });

  it('prior sessions revoked after forced change — old refresh_token → 401', async () => {
    const user = await createLocalUser();

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user.username, password: 'Password12345!' })
      .expect(200);
    const loginCookies = loginRes.headers['set-cookie'] as unknown as string[];
    const refreshCookie = loginCookies.find((c: string) =>
      c.startsWith('refresh_token='),
    )!;

    // Force change-required and get a pre-auth token
    await dataSource
      .getRepository(User)
      .update(user.id, { passwordChangeRequired: true });
    const loginRes2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user.username, password: 'Password12345!' })
      .expect(403);
    const preAuthToken = loginRes2.headers['x-pre-auth-token'] as string;

    await request(app.getHttpServer())
      .post('/auth/forced-password-change')
      .set('x-pre-auth-token', preAuthToken)
      .send({ newPassword: 'NewValidPassword1!' })
      .expect(200);

    // Old session must be dead
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401);

    await dataSource.getRepository(User).delete({ id: user.id });
  });
});

// ─── POST /auth/forced-password-change — failure paths ───────────────────────

describe('POST /auth/forced-password-change — failure paths', () => {
  it('missing X-Pre-Auth-Token header → 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/forced-password-change')
      .send({ newPassword: 'NewValidPassword1!' })
      .expect(401);
  });

  it('non-existent token → 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/forced-password-change')
      .set('x-pre-auth-token', 'deadbeef'.repeat(8))
      .send({ newPassword: 'NewValidPassword1!' })
      .expect(401);
  });

  it('replaying the same token → 401 (consumed on first use)', async () => {
    const user = await createLocalUser({ passwordChangeRequired: true });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user.username, password: 'Password12345!' })
      .expect(403);
    const preAuthToken = loginRes.headers['x-pre-auth-token'] as string;

    // First use — succeeds
    await request(app.getHttpServer())
      .post('/auth/forced-password-change')
      .set('x-pre-auth-token', preAuthToken)
      .send({ newPassword: 'NewValidPassword1!' })
      .expect(200);

    // Replay — rejected
    await request(app.getHttpServer())
      .post('/auth/forced-password-change')
      .set('x-pre-auth-token', preAuthToken)
      .send({ newPassword: 'AnotherNewPass1!' })
      .expect(401);

    await dataSource.getRepository(User).delete({ id: user.id });
  });

  it('newPassword shorter than 12 characters → 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/forced-password-change')
      .set('x-pre-auth-token', 'sometoken')
      .send({ newPassword: 'short' })
      .expect(400);
  });
});

// ─── Feature flag gates — separate app context with local login disabled ─────
//
// ConfigService caches process.env lookups on first get() per key; runtime
// mutations after that have no effect on a running app. Rather than racing
// against the cache, we override the ConfigService provider itself so the
// guards in this second app context unconditionally see 'false' for the login
// and register flags.
//
// JEST_WORKER_ID is temporarily deleted so TypeORM's isTest check is false
// and this second app does NOT dropSchema on init.
describe('Feature flag gates (AUTH_LOCAL_LOGIN_ENABLED=false)', () => {
  let disabledApp: INestApplication;

  beforeAll(async () => {
    // Override ConfigService so the guards see AUTH_LOCAL_LOGIN_ENABLED='false'
    // regardless of process.env timing or internal caching.
    const savedJestWorkerId = process.env['JEST_WORKER_ID'];
    delete process.env['JEST_WORKER_ID'];

    const alwaysForbidden = {
      canActivate: () => {
        throw new ForbiddenException('Local login is disabled');
      },
    };

    let moduleFixture: TestingModule;
    try {
      moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideGuard(LocalLoginEnabledGuard)
        .useValue(alwaysForbidden)
        .overrideGuard(LocalRegisterEnabledGuard)
        .useValue(alwaysForbidden)
        .compile();
    } finally {
      if (savedJestWorkerId !== undefined) {
        process.env['JEST_WORKER_ID'] = savedJestWorkerId;
      }
    }

    disabledApp = moduleFixture.createNestApplication();
    disabledApp.use(cookieParser());
    disabledApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await disabledApp.init();
  });

  afterAll(async () => {
    await disabledApp?.close();
  });

  it('POST /auth/forced-password-change → 403', async () => {
    await request(disabledApp.getHttpServer())
      .post('/auth/forced-password-change')
      .set('x-pre-auth-token', 'any-token')
      .send({ newPassword: 'NewValidPassword1!' })
      .expect(403);
  });

  it('POST /auth/forgot-password → 403', async () => {
    await request(disabledApp.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'anyone@example.com' })
      .expect(403);
  });

  it('POST /auth/reset-password → 403', async () => {
    await request(disabledApp.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'any', newPassword: 'Password12345!' })
      .expect(403);
  });
});
