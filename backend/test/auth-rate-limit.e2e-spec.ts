import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { seedSystemUser } from './helpers/seed-system-user';

/**
 * Exercises the rate-limiting behaviour on auth endpoints.
 *
 * The default login limit is 10 requests per TTL window.  This suite makes
 * (limit + 1) requests with invalid credentials so it can assert a 429
 * response without needing real user credentials.  Because each test file
 * spins up its own application instance the throttle state is isolated and
 * will not bleed into other e2e suites.
 */

// Mirror the same parsing logic used by auth.controller.ts so the test stays
// in sync with production behaviour (floats are floored, non-finite values
// fall back to the default, matching toThrottleInt in the controller).
const toThrottleInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

describe('Auth - Rate Limiting (e2e)', () => {
  let app: INestApplication;

  // LOGIN_LIMIT and LOGIN_TTL_MS must match the AUTH_LOGIN_THROTTLE_* defaults
  // (10 requests / 60 s) or the env vars set in the test environment.  Using
  // toThrottleInt() ensures we mirror the exact same rounding/validation as the
  // production controller, so a misconfigured env value (e.g. 'Infinity') will
  // produce the same safe fallback in both places rather than hanging the loop.
  const loginLimit = toThrottleInt(
    process.env['AUTH_LOGIN_THROTTLE_LIMIT'],
    10,
  );
  const loginTtlMs = toThrottleInt(
    process.env['AUTH_LOGIN_THROTTLE_TTL_MS'],
    60_000,
  );

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

    const dataSource = moduleFixture.get<DataSource>(DataSource);
    await seedSystemUser(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 429 after exceeding the login rate limit', async () => {
    const payload = { username: '__rate_limit_test__', password: 'x' };

    // Exhaust the limit — each request returns 401 (wrong creds) but still
    // counts against the throttle bucket.
    for (let i = 0; i < loginLimit; i++) {
      await request(app.getHttpServer()).post('/auth/login').send(payload);
    }

    // The next request must be rejected by the throttler before reaching auth.
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(payload);

    expect(response.status).toBe(429);

    // Throttler must include a Retry-After header so clients know when to retry.
    expect(response.headers['retry-after']).toBeDefined();
    const retryAfter = Number(response.headers['retry-after']);
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);

    // Retry-After must not exceed the configured TTL window.  A value larger
    // than the window indicates a misconfiguration or unit mismatch (e.g. ms
    // instead of seconds) in the throttler setup.
    const loginTtlSeconds = Math.ceil(loginTtlMs / 1000);
    expect(retryAfter).toBeLessThanOrEqual(loginTtlSeconds);
  });
});
