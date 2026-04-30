/**
 * Concurrency e2e tests for session-family revocation.
 *
 * These tests require a live Redis instance. They are gated by USE_REDIS_CACHE:
 *
 *   USE_REDIS_CACHE=true  → Redis is required. The suite fails hard if Redis is
 *                           not reachable — a passing run proves live-Redis
 *                           behaviour (GETDEL atomicity, session revocation, TTL
 *                           renewal). This is the mode used by pnpm test:e2e:redis.
 *
 *   USE_REDIS_CACHE=false → The suite is skipped entirely (describe.skip). This
 *                           keeps the standard CI pipeline (which has no Redis)
 *                           green without masking a real Redis failure.
 *
 * To run locally:
 *   USE_REDIS_CACHE=true pnpm --dir backend test:e2e:redis
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/user.entity';
import * as bcrypt from 'bcrypt';
import { createClient } from 'redis';
import { seedSystemUser } from './helpers/seed-system-user';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCookiePair(cookies: string[]): string {
  const access = cookies.find((c) => c.startsWith('access_token='));
  const refresh = cookies.find((c) => c.startsWith('refresh_token='));
  if (!access || !refresh) throw new Error('Missing auth cookies in response');
  return `${access.split(';')[0]}; ${refresh.split(';')[0]}`;
}

function parseRefreshCookie(cookies: string[]): string {
  const refresh = cookies.find((c) => c.startsWith('refresh_token='));
  if (!refresh) throw new Error('Missing refresh cookie');
  return refresh.split(';')[0];
}

function parseAccessCookie(cookies: string[]): string {
  const access = cookies.find((c) => c.startsWith('access_token='));
  if (!access) throw new Error('Missing access cookie');
  return access.split(';')[0];
}

async function login(
  server: ReturnType<INestApplication['getHttpServer']>,
): Promise<{ cookieHeader: string; cookies: string[] }> {
  const res = await request(server)
    .post('/auth/login')
    .send({ username: 'concurrencytest', password: 'testpassword123' })
    .expect(200);

  const cookies = res.headers['set-cookie'] as unknown as string[];
  return { cookieHeader: parseCookiePair(cookies), cookies };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

const REDIS_REQUIRED = process.env.USE_REDIS_CACHE === 'true';

// jest-circus (Jest 27+) does not define pending(). Use describe.skip so the
// suite is reported as skipped — not errored — when Redis is unavailable.
const describeSuite = REDIS_REQUIRED ? describe : describe.skip;

describeSuite('Auth - session-family concurrency (e2e, requires Redis)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testUser: User;

  beforeAll(async () => {
    // Probe Redis. When USE_REDIS_CACHE=true a connection failure is a hard
    // error — the suite must not pass without exercising real Redis.
    const probe = createClient({
      socket: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
      },
    });
    await probe.connect(); // throws → beforeAll fails → all tests fail
    await probe.ping();
    await probe.quit();

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

    const userRepository = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    testUser = await userRepository.save({
      username: 'concurrencytest',
      email: 'concurrencytest@example.com',
      password: hashedPassword,
      isActive: true,
    });
  });

  afterAll(async () => {
    const userRepository = dataSource.getRepository(User);
    await userRepository.delete({ id: testUser.id });
    await app?.close();
  });

  // -------------------------------------------------------------------------
  // 1. Parallel refresh race
  // -------------------------------------------------------------------------
  it('should allow exactly one winner when two requests race to consume the same refresh token', async () => {
    const { cookieHeader } = await login(app.getHttpServer());

    // Fire both refresh requests concurrently with the same refresh token.
    const [r1, r2] = await Promise.all([
      request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookieHeader),
      request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookieHeader),
    ]);

    const statuses = [r1.status, r2.status].sort();
    // Exactly one succeeds and one is rejected — order is non-deterministic.
    expect(statuses).toEqual([200, 401]);
  });

  // -------------------------------------------------------------------------
  // 2. Logout-vs-refresh race: session must be dead after logout wins or loses
  // -------------------------------------------------------------------------
  it('should invalidate the session even when refresh races logout', async () => {
    const server = app.getHttpServer();
    const { cookieHeader } = await login(server);

    // Fire logout and refresh simultaneously.
    const [logoutRes, refreshRes] = await Promise.all([
      request(server).post('/auth/logout').set('Cookie', cookieHeader),
      request(server).post('/auth/refresh').set('Cookie', cookieHeader),
    ]);

    // Logout must always succeed (200).
    expect(logoutRes.status).toBe(200);

    if (refreshRes.status === 200) {
      // Refresh won the race and issued new tokens. The new access token must
      // be rejected immediately because logout deleted session:{sid}.
      const newCookies = refreshRes.headers[
        'set-cookie'
      ] as unknown as string[];
      const newAccessCookie = parseAccessCookie(newCookies);
      const newRefreshCookie = parseRefreshCookie(newCookies);
      const newCookieHeader = `${newAccessCookie}; ${newRefreshCookie}`;

      // The newly issued access token must be rejected via session revocation.
      await request(server)
        .get('/auth/me')
        .set('Cookie', newCookieHeader)
        .expect(401);

      // The newly issued refresh token must also be dead.
      await request(server)
        .post('/auth/refresh')
        .set('Cookie', newCookieHeader)
        .expect(401);
    } else {
      // Logout consumed the refresh entry first — refresh got 401, which is fine.
      expect(refreshRes.status).toBe(401);
    }

    // Either way, the original access token must now be rejected.
    await request(server)
      .get('/auth/me')
      .set('Cookie', cookieHeader)
      .expect(401);
  });

  // -------------------------------------------------------------------------
  // 3. Session lifetime slides with token rotation
  // -------------------------------------------------------------------------
  it('should keep the session alive after a successful refresh', async () => {
    const server = app.getHttpServer();
    const { cookieHeader } = await login(server);

    // Refresh to rotate the token pair.
    const refreshRes = await request(server)
      .post('/auth/refresh')
      .set('Cookie', cookieHeader)
      .expect(200);

    const newCookies = refreshRes.headers['set-cookie'] as unknown as string[];
    const newCookieHeader = parseCookiePair(newCookies);

    // The new access token must work on protected routes — session is alive.
    await request(server)
      .get('/auth/me')
      .set('Cookie', newCookieHeader)
      .expect(200);

    // Verify session:{sid} TTL was renewed: do a second rotation and confirm
    // the token from the second rotation is also valid.
    const refreshRes2 = await request(server)
      .post('/auth/refresh')
      .set('Cookie', newCookieHeader)
      .expect(200);

    const newerCookies = refreshRes2.headers[
      'set-cookie'
    ] as unknown as string[];
    const newerCookieHeader = parseCookiePair(newerCookies);

    await request(server)
      .get('/auth/me')
      .set('Cookie', newerCookieHeader)
      .expect(200);
  });

  // -------------------------------------------------------------------------
  // 4. Old access token from before refresh is invalid after logout
  // -------------------------------------------------------------------------
  it('should reject access tokens from before a logout even after rotation occurred', async () => {
    const server = app.getHttpServer();
    const {
      cookieHeader: originalCookieHeader,
      cookies: originalLoginCookies,
    } = await login(server);

    // Capture the original access cookie before rotating.
    const originalAccessCookie = parseAccessCookie(originalLoginCookies);

    // Rotate the token pair — this creates a new JTI.
    const refreshRes = await request(server)
      .post('/auth/refresh')
      .set('Cookie', originalCookieHeader)
      .expect(200);

    const newCookies = refreshRes.headers['set-cookie'] as unknown as string[];
    const newCookieHeader = parseCookiePair(newCookies);

    // Logout using the new tokens.
    await request(server)
      .post('/auth/logout')
      .set('Cookie', newCookieHeader)
      .expect(200);

    // The original pre-rotation access token must also be rejected (same session:sid).
    const originalRefreshCookie = parseRefreshCookie(originalLoginCookies);
    await request(server)
      .get('/auth/me')
      .set('Cookie', `${originalAccessCookie}; ${originalRefreshCookie}`)
      .expect(401);
  });
});
