import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/user.entity';
import { DatabaseSeederAdminService } from '../src/database/seeds/database-seeder-admin.service';
import * as bcrypt from 'bcrypt';
import { seedSystemUser } from './helpers/seed-system-user';

// Helpers
async function buildApp(): Promise<{
  app: INestApplication;
  dataSource: DataSource;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

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

async function createLocalUser(
  dataSource: DataSource,
  overrides: Partial<Omit<User, 'id'>> = {},
): Promise<User> {
  const repo = dataSource.getRepository(User);
  const hashedPassword = await bcrypt.hash('Password12345!', 10);
  return repo.save({
    username: `user_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    email: `user_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
    password: hashedPassword,
    isActive: true,
    passwordChangeRequired: false,
    passwordExpiresAt: null,
    ...overrides,
  });
}

// ─── Seed script integration ──────────────────────────────────────────────────

describe('DatabaseSeederAdminService (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let seeder: DatabaseSeederAdminService;

  beforeAll(async () => {
    ({ app, dataSource } = await buildApp());
    seeder = app.get(DatabaseSeederAdminService);
  });

  afterAll(async () => {
    const repo = dataSource.getRepository(User);
    await repo.delete({ email: 'admin-seed-test@example.com' });
    await app?.close();
  });

  it('creates admin user with password_change_required=true and bcrypt hash on first seed', async () => {
    process.env.ADMIN_EMAIL = 'admin-seed-test@example.com';
    process.env.ADMIN_USERNAME = 'admin-seed-test';
    process.env.ADMIN_INITIAL_PASSWORD = 'ChangeMe!SecurePassword123';
    process.env.ADMIN_PASSWORD_EXPIRY_DAYS = '90';

    await seeder.seedAdmin();

    const repo = dataSource.getRepository(User);
    const user = await repo.findOne({
      where: { email: 'admin-seed-test@example.com' },
    });
    expect(user).toBeDefined();
    expect(user!.passwordChangeRequired).toBe(true);
    expect(user!.passwordExpiresAt).toBeDefined();
    expect(user!.passwordExpiresAt!.getTime()).toBeGreaterThan(Date.now());
    const isValidHash = await bcrypt.compare(
      'ChangeMe!SecurePassword123',
      user!.password,
    );
    expect(isValidHash).toBe(true);
  });

  it('re-running seed is a no-op — no fields are modified', async () => {
    process.env.ADMIN_EMAIL = 'admin-seed-test@example.com';
    process.env.ADMIN_USERNAME = 'admin-seed-test';
    process.env.ADMIN_INITIAL_PASSWORD = 'different-password!!!!';
    process.env.ADMIN_PASSWORD_EXPIRY_DAYS = '90';

    await seeder.seedAdmin();

    const repo = dataSource.getRepository(User);
    const user = await repo.findOne({
      where: { email: 'admin-seed-test@example.com' },
    });
    // Password should NOT have changed — seed was skipped
    const isOriginalHash = await bcrypt.compare(
      'ChangeMe!SecurePassword123',
      user!.password,
    );
    expect(isOriginalHash).toBe(true);
  });
});

// ─── POST /auth/login — forced-change and expiry gates ────────────────────────

describe('POST /auth/login — password expiry and forced-change gates (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await buildApp());
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 403 PASSWORD_CHANGE_REQUIRED with X-Pre-Auth-Token for forced-change user', async () => {
    const user = await createLocalUser(dataSource, {
      passwordChangeRequired: true,
    });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user.username, password: 'Password12345!' })
      .expect(403);

    expect(res.body.message?.code ?? res.body.code ?? res.body.message).toBe(
      'PASSWORD_CHANGE_REQUIRED',
    );
    expect(res.headers['x-pre-auth-token']).toBeDefined();

    await dataSource.getRepository(User).delete({ id: user.id });
  });

  it('returns 403 PASSWORD_EXPIRED with X-Pre-Auth-Token for expired password user', async () => {
    const user = await createLocalUser(dataSource, {
      passwordExpiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user.username, password: 'Password12345!' })
      .expect(403);

    const code =
      res.body.message?.code ?? res.body.code ?? res.body.message?.message;
    expect(code).toBe('PASSWORD_EXPIRED');
    expect(res.headers['x-pre-auth-token']).toBeDefined();

    await dataSource.getRepository(User).delete({ id: user.id });
  });

  it('issues tokens normally when Discord user has password_change_required=true', async () => {
    const user = await createLocalUser(dataSource, {
      discordId: `discord-test-${Date.now()}`,
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

  it('issues tokens normally for a local user with no expiry or forced-change flag', async () => {
    const user = await createLocalUser(dataSource);

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

describe('POST /auth/forced-password-change — happy path (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await buildApp());
  });

  afterAll(async () => {
    await app?.close();
  });

  it('valid pre-auth token + valid newPassword → 200; password_change_required cleared; cookies set', async () => {
    const user = await createLocalUser(dataSource, {
      passwordChangeRequired: true,
    });

    // Obtain pre-auth token via login
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

    expect(res.body.message).toBe('Password changed successfully');
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c: string) => c.startsWith('access_token='))).toBe(
      true,
    );
    expect(cookies.some((c: string) => c.startsWith('refresh_token='))).toBe(
      true,
    );

    // Verify DB fields
    const updated = await dataSource
      .getRepository(User)
      .findOne({ where: { id: user.id } });
    expect(updated!.passwordChangeRequired).toBe(false);
    expect(updated!.passwordExpiresAt).toBeDefined();
    expect(updated!.passwordExpiresAt!.getTime()).toBeGreaterThan(Date.now());

    await dataSource.getRepository(User).delete({ id: user.id });
  });

  it('prior sessions revoked after forced change — old refresh_token returns 401', async () => {
    const user = await createLocalUser(dataSource);

    // Login normally to establish a session
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user.username, password: 'Password12345!' })
      .expect(200);
    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const refreshCookie = cookies.find((c: string) =>
      c.startsWith('refresh_token='),
    );
    expect(refreshCookie).toBeDefined();

    // Force a password_change_required flag and generate a pre-auth token
    await dataSource
      .getRepository(User)
      .update(user.id, { passwordChangeRequired: true });
    const loginRes2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user.username, password: 'Password12345!' })
      .expect(403);
    const preAuthToken = loginRes2.headers['x-pre-auth-token'] as string;

    // Complete forced password change
    await request(app.getHttpServer())
      .post('/auth/forced-password-change')
      .set('x-pre-auth-token', preAuthToken)
      .send({ newPassword: 'NewValidPassword1!' })
      .expect(200);

    // Old refresh token should now be rejected
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie!)
      .expect(401);

    await dataSource.getRepository(User).delete({ id: user.id });
  });
});

// ─── POST /auth/forced-password-change — failure paths ───────────────────────

describe('POST /auth/forced-password-change — failure paths (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await buildApp());
  });

  afterAll(async () => {
    await app?.close();
  });

  it('missing X-Pre-Auth-Token header → 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/forced-password-change')
      .send({ newPassword: 'NewValidPassword1!' })
      .expect(401);
  });

  it('non-existent pre-auth token (never issued) → 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/forced-password-change')
      .set('x-pre-auth-token', 'deadbeef'.repeat(8))
      .send({ newPassword: 'NewValidPassword1!' })
      .expect(401);
  });

  it('replaying the same pre-auth token on a second request → 401 (token consumed)', async () => {
    const user = await createLocalUser(dataSource, {
      passwordChangeRequired: true,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: user.username, password: 'Password12345!' })
      .expect(403);
    const preAuthToken = loginRes.headers['x-pre-auth-token'] as string;

    // First use — should succeed
    await request(app.getHttpServer())
      .post('/auth/forced-password-change')
      .set('x-pre-auth-token', preAuthToken)
      .send({ newPassword: 'NewValidPassword1!' })
      .expect(200);

    // Replay — should be rejected
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
      .set('x-pre-auth-token', 'some-token')
      .send({ newPassword: 'short' })
      .expect(400);
  });

  it('returns 403 when AUTH_LOCAL_LOGIN_ENABLED=false', async () => {
    // Override env — the guard reads it at runtime via ConfigService
    const saved = process.env.AUTH_LOCAL_LOGIN_ENABLED;
    process.env.AUTH_LOCAL_LOGIN_ENABLED = 'false';

    await request(app.getHttpServer())
      .post('/auth/forced-password-change')
      .set('x-pre-auth-token', 'any-token')
      .send({ newPassword: 'NewValidPassword1!' })
      .expect(403);

    process.env.AUTH_LOCAL_LOGIN_ENABLED = saved ?? 'true';
  });
});

// ─── Feature flag gates for existing endpoints ────────────────────────────────

describe('Feature flag gates — forgot-password and reset-password (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await buildApp());
  });

  afterAll(async () => {
    await app?.close();
  });

  it('POST /auth/forgot-password returns 403 when AUTH_LOCAL_LOGIN_ENABLED=false', async () => {
    const saved = process.env.AUTH_LOCAL_LOGIN_ENABLED;
    process.env.AUTH_LOCAL_LOGIN_ENABLED = 'false';

    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'anyone@example.com' })
      .expect(403);

    process.env.AUTH_LOCAL_LOGIN_ENABLED = saved ?? 'true';
  });

  it('POST /auth/reset-password returns 403 when AUTH_LOCAL_LOGIN_ENABLED=false', async () => {
    const saved = process.env.AUTH_LOCAL_LOGIN_ENABLED;
    process.env.AUTH_LOCAL_LOGIN_ENABLED = 'false';

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'any', newPassword: 'Password12345!' })
      .expect(403);

    process.env.AUTH_LOCAL_LOGIN_ENABLED = saved ?? 'true';
  });

  // Void dataSource to satisfy linter — it's used by buildApp
  afterAll(() => {
    void dataSource;
  });
});
