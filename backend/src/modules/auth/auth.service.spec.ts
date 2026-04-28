import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { SystemUserService } from '../users/system-user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PasswordReset } from './password-reset.entity';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    isSystemUser: false,
    isActive: true,
    userOrganizationRoles: [],
  };

  const mockUsersService = {
    findOne: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    updatePassword: jest.fn(),
    create: jest.fn(),
  };

  const mockSystemUserService = {
    getSystemUserId: jest.fn(),
    isSystemUser: jest.fn(),
  };

  const mockPasswordResetRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:5173';
      if (key === 'JWT_SECRET') return 'test-secret';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: SystemUserService, useValue: mockSystemUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getRepositoryToken(PasswordReset),
          useValue: mockPasswordResetRepository,
        },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should sign a JWT with a jti claim and store the refresh token in Redis', async () => {
      mockJwtService.sign.mockReturnValue('signed-access-token');
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.login(mockUser);

      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken).toMatch(/^[0-9a-f]{64}$/);

      // JWT payload must include jti
      const signCall = mockJwtService.sign.mock.calls[0][0] as {
        sub: number;
        username: string;
        jti: string;
      };
      expect(signCall.jti).toBeDefined();
      expect(typeof signCall.jti).toBe('string');
      expect(signCall.sub).toBe(mockUser.id);

      // Redis entry: refresh:{jti} → "{userId}:{rawToken}"
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `refresh:${signCall.jti}`,
        expect.stringMatching(/^1:[0-9a-f]{64}$/),
        expect.any(Number),
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('should return a 64-char hex token and persist it in Redis', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);
      const jti = 'test-jti-uuid';

      const raw = await service.generateRefreshToken(1, jti);

      expect(raw).toMatch(/^[0-9a-f]{64}$/);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `refresh:${jti}`,
        `1:${raw}`,
        expect.any(Number),
      );
    });

    it('should set a 7-day TTL on the Redis entry', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);
      const jti = 'test-jti-uuid';

      await service.generateRefreshToken(1, jti);

      const ttlMs = mockCacheManager.set.mock.calls[0][2] as number;
      const sevenDaysMs = 7 * 24 * 3600 * 1000;
      expect(ttlMs).toBe(sevenDaysMs);
    });
  });

  describe('refreshAccessToken', () => {
    it('should return new tokens when jti and raw token match Redis entry', async () => {
      const jti = 'valid-jti';
      const rawToken = 'a'.repeat(64);
      mockCacheManager.get.mockResolvedValue(`1:${rawToken}`);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockCacheManager.set.mockResolvedValue(undefined);
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshAccessToken(rawToken, jti);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toMatch(/^[0-9a-f]{64}$/);
      expect(mockCacheManager.del).toHaveBeenCalledWith(`refresh:${jti}`);
    });

    it('should throw 401 when Redis has no entry for the jti', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      await expect(
        service.refreshAccessToken('some-token', 'missing-jti'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw 401 when the raw token does not match the stored value', async () => {
      mockCacheManager.get.mockResolvedValue('1:correct-token');

      await expect(
        service.refreshAccessToken('wrong-token', 'valid-jti'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('revokeRefreshToken', () => {
    it('should delete the Redis entry when token matches', async () => {
      const jti = 'test-jti';
      const raw = 'token-value';
      mockCacheManager.get.mockResolvedValue(`1:${raw}`);
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.revokeRefreshToken(raw, jti);

      expect(mockCacheManager.del).toHaveBeenCalledWith(`refresh:${jti}`);
    });

    it('should do nothing when no Redis entry exists', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      await service.revokeRefreshToken('some-token', 'missing-jti');

      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    it('should do nothing when the raw token does not match the stored value', async () => {
      mockCacheManager.get.mockResolvedValue('1:correct-token');

      await service.revokeRefreshToken('wrong-token', 'valid-jti');

      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });
  });

  describe('blacklistAccessToken', () => {
    it('should store jti in Redis with the remaining TTL', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);
      const futureExp = Math.floor(Date.now() / 1000) + 300; // 5 min from now

      await service.blacklistAccessToken('test-jti', futureExp);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'blacklist:test-jti',
        '1',
        expect.any(Number),
      );
      const ttlMs = mockCacheManager.set.mock.calls[0][2] as number;
      expect(ttlMs).toBeGreaterThan(0);
      expect(ttlMs).toBeLessThanOrEqual(300 * 1000 + 100);
    });

    it('should not write to Redis when the token is already expired', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;

      await service.blacklistAccessToken('expired-jti', pastExp);

      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('isAccessTokenBlacklisted', () => {
    it('should return true when Redis has a blacklist entry', async () => {
      mockCacheManager.get.mockResolvedValue('1');

      const result = await service.isAccessTokenBlacklisted('blacklisted-jti');

      expect(result).toBe(true);
    });

    it('should return false when Redis has no blacklist entry', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.isAccessTokenBlacklisted('clean-jti');

      expect(result).toBe(false);
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token and blacklist the access token', async () => {
      const jti = 'logout-jti';
      const rawRefresh = 'a'.repeat(64);
      mockCacheManager.get.mockResolvedValue(`1:${rawRefresh}`);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockCacheManager.set.mockResolvedValue(undefined);

      const futureExp = Math.floor(Date.now() / 1000) + 900;
      mockJwtService.decode.mockReturnValue({ jti, exp: futureExp });

      await service.logout(rawRefresh, jti, 'raw-access-token');

      expect(mockCacheManager.del).toHaveBeenCalledWith(`refresh:${jti}`);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `blacklist:${jti}`,
        '1',
        expect.any(Number),
      );
    });

    it('should not throw when access token is missing', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      await expect(
        service.logout('some-refresh', 'some-jti', undefined),
      ).resolves.toBeUndefined();
    });
  });

  describe('requestPasswordReset', () => {
    it('should create a reset token for existing user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordResetRepository.save.mockResolvedValue({});

      const result = await service.requestPasswordReset(mockUser.email);

      expect(result.message).toContain('If an account');
      expect(mockPasswordResetRepository.save).toHaveBeenCalled();
    });

    it('should return success message even for non-existent email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.requestPasswordReset('nobody@example.com');

      expect(result.message).toContain('If an account');
      expect(mockPasswordResetRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const validToken = {
        id: 1,
        userId: mockUser.id,
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        used: false,
        user: mockUser,
      };

      mockPasswordResetRepository.findOne.mockResolvedValue(validToken);
      mockPasswordResetRepository.update.mockResolvedValue({ affected: 1 });
      mockUsersService.updatePassword.mockResolvedValue(undefined);

      const result = await service.resetPassword(
        'valid-token',
        'newPassword123',
      );

      expect(result).toEqual({
        message: 'Password has been reset successfully',
      });
      expect(mockPasswordResetRepository.update).toHaveBeenCalledWith(
        validToken.id,
        { used: true },
      );
    });

    it('should throw for invalid token', async () => {
      mockPasswordResetRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'newPassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for expired token', async () => {
      mockPasswordResetRepository.findOne.mockResolvedValue({
        id: 1,
        used: false,
        expiresAt: new Date(Date.now() - 1000),
        user: mockUser,
      });

      await expect(
        service.resetPassword('expired-token', 'newPassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should hash the new password before saving', async () => {
      const validToken = {
        id: 1,
        userId: mockUser.id,
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        used: false,
        user: mockUser,
      };

      mockPasswordResetRepository.findOne.mockResolvedValue(validToken);
      mockPasswordResetRepository.update.mockResolvedValue({ affected: 1 });

      await service.resetPassword('valid-token', 'newPassword123');

      const hashedPassword = mockUsersService.updatePassword.mock.calls[0][1];
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d{1,2}\$.{53}$/);
      expect(await bcrypt.compare('newPassword123', hashedPassword)).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('should change password with correct current password', async () => {
      const currentPassword = 'oldPassword123';
      const hashedCurrentPassword = await bcrypt.hash(currentPassword, 10);
      mockUsersService.findById.mockResolvedValue({
        ...mockUser,
        password: hashedCurrentPassword,
      });
      mockUsersService.updatePassword.mockResolvedValue(undefined);

      const result = await service.changePassword(
        mockUser.id,
        currentPassword,
        'newPassword123',
      );

      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should throw if user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.changePassword(999, 'old', 'new')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw with incorrect current password', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      mockUsersService.findById.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      await expect(
        service.changePassword(mockUser.id, 'wrongPassword', 'new'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
