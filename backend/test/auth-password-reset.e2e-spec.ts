import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/user.entity';
import { PasswordReset } from '../src/modules/auth/password-reset.entity';
import * as bcrypt from 'bcrypt';

describe('Auth - Password Reset (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testUser: User;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Create test user
    const userRepository = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await userRepository.save({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      isActive: true,
    });

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'testuser',
        password: 'password123',
      })
      .expect(201);

    accessToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    // Clean up test data
    const passwordResetRepository = dataSource.getRepository(PasswordReset);
    const userRepository = dataSource.getRepository(User);

    await passwordResetRepository.delete({ userId: testUser.id });
    await userRepository.delete({ id: testUser.id });

    await app.close();
  });

  describe('POST /auth/forgot-password', () => {
    it('should request password reset for existing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain(
        'If an account with that email exists',
      );

      // Verify token was created in database
      const passwordResetRepository = dataSource.getRepository(PasswordReset);
      const resetToken = await passwordResetRepository.findOne({
        where: { userId: testUser.id, used: false },
        order: { createdAt: 'DESC' },
      });

      expect(resetToken).toBeDefined();
      expect(resetToken?.userId).toBe(testUser.id);
      expect(resetToken?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return success message for non-existent email (security)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(201);

      expect(response.body.message).toContain(
        'If an account with that email exists',
      );
    });

    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should reject missing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/reset-password', () => {
    let validToken: string;

    beforeEach(async () => {
      const passwordResetRepository = dataSource.getRepository(PasswordReset);
      const resetRecord = await passwordResetRepository.findOne({
        where: { userId: testUser.id, used: false },
        order: { createdAt: 'DESC' },
      });

      validToken = resetRecord!.token;
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'newPassword456';

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword,
        })
        .expect(201);

      expect(response.body.message).toContain('reset successfully');

      // Verify token is marked as used
      const passwordResetRepository = dataSource.getRepository(PasswordReset);
      const resetRecord = await passwordResetRepository.findOne({
        where: { token: validToken },
      });

      expect(resetRecord?.used).toBe(true);

      // Verify can login with new password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: newPassword,
        })
        .expect(201);

      // Reset password back for other tests
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userRepository = dataSource.getRepository(User);
      await userRepository.update(testUser.id, { password: hashedPassword });
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token-12345',
          newPassword: 'newPassword456',
        })
        .expect(400);
    });

    it('should reject expired token', async () => {
      // Create an expired token
      const passwordResetRepository = dataSource.getRepository(PasswordReset);
      const expiredToken = await passwordResetRepository.save({
        userId: testUser.id,
        token: 'expired-token-12345',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        used: false,
      });

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: expiredToken.token,
          newPassword: 'newPassword456',
        })
        .expect(400);

      await passwordResetRepository.delete({ id: expiredToken.id });
    });

    it('should reject already used token', async () => {
      // Mark token as used
      const passwordResetRepository = dataSource.getRepository(PasswordReset);
      await passwordResetRepository.update(
        { token: validToken },
        { used: true },
      );

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword: 'newPassword456',
        })
        .expect(400);
    });

    it('should reject password shorter than 6 characters', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: validToken,
          newPassword: '12345',
        })
        .expect(400);
    });

    it('should reject missing token', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          newPassword: 'newPassword456',
        })
        .expect(400);
    });

    it('should reject missing newPassword', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: validToken,
        })
        .expect(400);
    });
  });

  describe('POST /auth/change-password', () => {
    it('should change password for authenticated user', async () => {
      const currentPassword = 'password123';
      const newPassword = 'newPassword789';

      const response = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword,
          newPassword,
        })
        .expect(201);

      expect(response.body.message).toContain('changed successfully');

      // Verify can login with new password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: newPassword,
        })
        .expect(201);

      // Reset password back for other tests
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userRepository = dataSource.getRepository(User);
      await userRepository.update(testUser.id, { password: hashedPassword });
    });

    it('should reject incorrect current password', async () => {
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword789',
        })
        .expect(400);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .send({
          currentPassword: 'password123',
          newPassword: 'newPassword789',
        })
        .expect(401);
    });

    it('should reject invalid access token', async () => {
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          currentPassword: 'password123',
          newPassword: 'newPassword789',
        })
        .expect(401);
    });

    it('should reject missing currentPassword', async () => {
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          newPassword: 'newPassword789',
        })
        .expect(400);
    });

    it('should reject missing newPassword', async () => {
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'password123',
        })
        .expect(400);
    });

    it('should reject newPassword shorter than 6 characters', async () => {
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: '12345',
        })
        .expect(400);
    });
  });
});
