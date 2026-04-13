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
describe('Auth - Rate Limiting (e2e)', () => {
  let app: INestApplication;

  // LOGIN_LIMIT must match the AUTH_LOGIN_THROTTLE_LIMIT default (10) or the
  // env var set in the test environment.  We read it here so the assertion
  // stays in sync with the controller's actual config.
  const loginLimit = Number(process.env['AUTH_LOGIN_THROTTLE_LIMIT']) || 10;

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
  });
});
