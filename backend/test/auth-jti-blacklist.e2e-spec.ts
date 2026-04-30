import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/user.entity';
import * as bcrypt from 'bcrypt';
import { seedSystemUser } from './helpers/seed-system-user';

describe('Auth - JTI blacklist (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testUser: User;

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

    const userRepository = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    testUser = await userRepository.save({
      username: 'jtitest',
      email: 'jtitest@example.com',
      password: hashedPassword,
      isActive: true,
    });
  });

  afterAll(async () => {
    const userRepository = dataSource.getRepository(User);
    await userRepository.delete({ id: testUser.id });
    await app?.close();
  });

  it('should reject a valid access token after logout (JTI blacklist)', async () => {
    // 1. Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'jtitest', password: 'testpassword123' })
      .expect(200);

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    expect(Array.isArray(cookies)).toBe(true);

    const accessCookieHeader = cookies.find((c) =>
      c.startsWith('access_token='),
    );
    const refreshCookieHeader = cookies.find((c) =>
      c.startsWith('refresh_token='),
    );
    expect(accessCookieHeader).toBeDefined();
    expect(refreshCookieHeader).toBeDefined();

    const accessCookie = accessCookieHeader!.split(';')[0];
    const refreshCookie = refreshCookieHeader!.split(';')[0];
    const cookieHeader = `${accessCookie}; ${refreshCookie}`;

    // 2. Verify the token works before logout
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookieHeader)
      .expect(200);

    // 3. Logout
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookieHeader)
      .expect(200);

    // 4. The old access token must now be rejected (blacklisted JTI)
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookieHeader)
      .expect(401);
  });

  it('should reject the old refresh token after rotation', async () => {
    // 1. Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'jtitest', password: 'testpassword123' })
      .expect(200);

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const accessCookieHeader = cookies.find((c) =>
      c.startsWith('access_token='),
    );
    const refreshCookieHeader = cookies.find((c) =>
      c.startsWith('refresh_token='),
    );
    const cookieHeader = `${accessCookieHeader!.split(';')[0]}; ${refreshCookieHeader!.split(';')[0]}`;

    // 2. Refresh — rotates the token pair
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieHeader)
      .expect(200);

    // 3. Old refresh token should now be rejected (deleted from Redis)
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieHeader)
      .expect(401);
  });

  it('should not expose refresh_token in the login response body', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'jtitest', password: 'testpassword123' })
      .expect(200);

    expect(loginRes.body).not.toHaveProperty('refresh_token');
    expect(loginRes.body).not.toHaveProperty('refreshToken');
    expect(loginRes.body).not.toHaveProperty('access_token');
    expect(loginRes.body).not.toHaveProperty('accessToken');
  });
});
