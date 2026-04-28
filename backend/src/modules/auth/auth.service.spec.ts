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
import * as crypto from 'crypto';

function sha256(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

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
    // No .store.client — forces the in-memory fallback path in consumeRefreshEntry
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
    it('should sign a JWT with a jti claim and store the refresh token hash in Redis', async () => {
      mockJwtService.sign.mockReturnValue('signed-access-token');
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.login(mockUser);

      expect(result.accessToken).toBe('signed-access-token');

      // Refresh token format: "{jti}.{64-char-hex}"
      const signCall = mockJwtService.sign.mock.calls[0][0] as {
        sub: number;
        username: string;
        jti: string;
      };
      const jti = signCall.jti;
      expect(jti).toBeDefined();
      expect(result.refreshToken).toMatch(
        new RegExp(`^${jti}\\.[0-9a-f]{64}$`),
      );

      // Redis stores the SHA-256 hash, not the raw token
      const [, storedValue] = mockCacheManager.set.mock.calls[0] as [
        string,
        string,
        number,
      ];
      const [, storedHash] = storedValue.split(':');
      expect(storedHash).toBe(sha256(result.refreshToken));
      expect(storedHash).not.toBe(result.refreshToken);
    });
  });

  describe('generateRefreshToken', () => {
    it('should embed the JTI in the token and store a hash in Redis', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);
      const jti = 'test-jti-uuid';

      const raw = await service.generateRefreshToken(1, jti);

      // Token starts with the JTI
      expect(raw.startsWith(`${jti}.`)).toBe(true);

      // Stored value is "{userId}:{sha256(raw)}", not the raw token
      const [key, storedValue, ttlMs] = mockCacheManager.set.mock.calls[0] as [
        string,
        string,
        number,
      ];
      expect(key).toBe(`refresh:${jti}`);
      const [userId, storedHash] = storedValue.split(':');
      expect(userId).toBe('1');
      expect(storedHash).toBe(sha256(raw));
      expect(storedHash).not.toBe(raw);

      // 7-day TTL
      expect(ttlMs).toBe(7 * 24 * 3600 * 1000);
    });
  });

  describe('parseRefreshTokenJti', () => {
    it('should return the JTI prefix before the first dot', () => {
      expect(service.parseRefreshTokenJti('my-jti.randomhex')).toBe('my-jti');
    });

    it('should return undefined for a token with no dot', () => {
      expect(service.parseRefreshTokenJti('nodottoken')).toBeUndefined();
    });

    it('should return undefined for an empty string', () => {
      expect(service.parseRefreshTokenJti('')).toBeUndefined();
    });
  });

  describe('refreshAccessToken', () => {
    it('should return new tokens when jti and hash match the Redis entry', async () => {
      const jti = 'valid-jti';
      const rawToken = `${jti}.` + 'a'.repeat(64);
      const stored = `1:${sha256(rawToken)}`;

      // consumeRefreshEntry falls back to get+del when no redis client
      mockCacheManager.get.mockResolvedValue(stored);
      mockCacheManager.del.mockResolvedValue(undefined);
      mockCacheManager.set.mockResolvedValue(undefined);
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshAccessToken(rawToken, jti);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBeDefined();
      // Old entry deleted atomically
      expect(mockCacheManager.del).toHaveBeenCalledWith(`refresh:${jti}`);
    });

    it('should throw 401 when Redis has no entry for the jti', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      await expect(
        service.refreshAccessToken('jti.some-token', 'jti'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw 401 when the hash does not match the stored value', async () => {
      const jti = 'valid-jti';
      mockCacheManager.get.mockResolvedValue(`1:${sha256('correct-token')}`);
      mockCacheManager.set.mockResolvedValue(undefined); // restore call

      await expect(
        service.refreshAccessToken(`${jti}.wrong-token`, jti),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should restore the Redis entry when hash mismatch is detected', async () => {
      // Prevents an attacker from DoS-ing a valid session by sending a bad token
      const jti = 'valid-jti';
      const correctRaw = `${jti}.correct`;
      const stored = `1:${sha256(correctRaw)}`;
      mockCacheManager.get.mockResolvedValue(stored);
      mockCacheManager.set.mockResolvedValue(undefined);

      await expect(
        service.refreshAccessToken(`${jti}.wrong`, jti),
      ).rejects.toThrow(UnauthorizedException);

      // Entry restored so the legitimate holder can still use it
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `refresh:${jti}`,
        stored,
        expect.any(Number),
      );
    });
  });

  describe('revokeRefreshToken', () => {
    it('should delete the Redis entry when the hash matches', async () => {
      const jti = 'test-jti';
      const raw = `${jti}.somerandombytes`;
      mockCacheManager.get.mockResolvedValue(`1:${sha256(raw)}`);
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.revokeRefreshToken(raw, jti);

      expect(mockCacheManager.del).toHaveBeenCalledWith(`refresh:${jti}`);
    });

    it('should do nothing when no Redis entry exists', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      await service.revokeRefreshToken('jti.some-token', 'missing-jti');

      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    it('should do nothing when the hash does not match', async () => {
      const jti = 'valid-jti';
      mockCacheManager.get.mockResolvedValue(`1:${sha256('correct-token')}`);

      await service.revokeRefreshToken(`${jti}.wrong-token`, jti);

      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    it('should not store the raw token in Redis (only the hash)', async () => {
      const jti = 'test-jti';
      const raw = `${jti}.somerandombytes`;
      let capturedValue: string | undefined;
      mockCacheManager.get.mockResolvedValue(null); // entry already gone

      // Any set call (e.g. restore path) must use a hash, not the raw token
      mockCacheManager.set.mockImplementation((_key: string, value: string) => {
        capturedValue = value;
        return Promise.resolve(undefined);
      });

      await service.revokeRefreshToken(raw, jti);

      if (capturedValue !== undefined) {
        expect(capturedValue).not.toContain(raw);
      }
    });
  });

  describe('blacklistAccessToken', () => {
    it('should store jti in Redis with the remaining TTL', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);
      const futureExp = Math.floor(Date.now() / 1000) + 300;

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

      expect(await service.isAccessTokenBlacklisted('blacklisted-jti')).toBe(
        true,
      );
    });

    it('should return false when Redis has no blacklist entry', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      expect(await service.isAccessTokenBlacklisted('clean-jti')).toBe(false);
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token and blacklist the access token', async () => {
      const jti = 'logout-jti';
      const rawRefresh = `${jti}.` + 'a'.repeat(64);
      mockCacheManager.get.mockResolvedValue(`1:${sha256(rawRefresh)}`);
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
        service.logout('jti.some-refresh', 'some-jti', undefined),
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
