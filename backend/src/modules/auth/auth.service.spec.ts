import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RefreshToken } from './refresh-token.entity';
import { PasswordReset } from './password-reset.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService - Password Reset', () => {
  let service: AuthService;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    updatePassword: jest.fn(),
  };

  const mockPasswordResetRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
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
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: getRepositoryToken(PasswordReset),
          useValue: mockPasswordResetRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('requestPasswordReset', () => {
    it('should create a reset token for existing user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordResetRepository.save.mockResolvedValue({
        id: 1,
        userId: mockUser.id,
        token: 'test-token',
        expiresAt: new Date(),
        used: false,
      });

      const result = await service.requestPasswordReset(mockUser.email);

      expect(result).toEqual({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(mockUser.email);
      expect(mockPasswordResetRepository.save).toHaveBeenCalled();
    });

    it('should return success message even for non-existent email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.requestPasswordReset(
        'nonexistent@example.com',
      );

      expect(result).toEqual({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
      expect(mockPasswordResetRepository.save).not.toHaveBeenCalled();
    });

    it('should generate token that expires in 1 hour', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      const now = new Date();
      let savedToken: any;

      mockPasswordResetRepository.save.mockImplementation((token) => {
        savedToken = token;
        return Promise.resolve(token);
      });

      await service.requestPasswordReset(mockUser.email);

      expect(savedToken).toBeDefined();
      const expiryTime = new Date(savedToken.expiresAt).getTime();
      const expectedExpiry = now.getTime() + 60 * 60 * 1000; // 1 hour
      expect(Math.abs(expiryTime - expectedExpiry)).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const validToken = {
        id: 1,
        userId: mockUser.id,
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
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
      expect(mockUsersService.updatePassword).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
      );
      expect(mockPasswordResetRepository.update).toHaveBeenCalledWith(
        validToken.id,
        { used: true },
      );
    });

    it('should throw error for invalid token', async () => {
      mockPasswordResetRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'newPassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for expired token', async () => {
      const expiredToken = {
        id: 1,
        userId: mockUser.id,
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        used: false,
        user: mockUser,
      };

      mockPasswordResetRepository.findOne.mockResolvedValue(expiredToken);

      await expect(
        service.resetPassword('expired-token', 'newPassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for already used token', async () => {
      const usedToken = {
        id: 1,
        userId: mockUser.id,
        token: 'used-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        used: true,
        user: mockUser,
      };

      mockPasswordResetRepository.findOne.mockResolvedValue(usedToken);

      await expect(
        service.resetPassword('used-token', 'newPassword123'),
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

      const updatePasswordCall = mockUsersService.updatePassword.mock.calls[0];
      const hashedPassword = updatePasswordCall[1];

      // Verify it's a bcrypt hash
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d{1,2}\$.{53}$/);
      // Verify the hash matches the password
      const matches = await bcrypt.compare('newPassword123', hashedPassword);
      expect(matches).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('should change password with correct current password', async () => {
      const currentPassword = 'oldPassword123';
      const hashedCurrentPassword = await bcrypt.hash(currentPassword, 10);
      const userWithPassword = {
        ...mockUser,
        password: hashedCurrentPassword,
      };

      mockUsersService.findById.mockResolvedValue(userWithPassword);
      mockUsersService.updatePassword.mockResolvedValue(undefined);

      const result = await service.changePassword(
        mockUser.id,
        currentPassword,
        'newPassword123',
      );

      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(mockUsersService.updatePassword).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
      );
    });

    it('should throw error if user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        service.changePassword(999, 'oldPassword', 'newPassword123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error with incorrect current password', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      const userWithPassword = {
        ...mockUser,
        password: hashedPassword,
      };

      mockUsersService.findById.mockResolvedValue(userWithPassword);

      await expect(
        service.changePassword(mockUser.id, 'wrongPassword', 'newPassword123'),
      ).rejects.toThrow(BadRequestException);

      expect(mockUsersService.updatePassword).not.toHaveBeenCalled();
    });

    it('should trim passwords before processing', async () => {
      const currentPassword = 'oldPassword123';
      const hashedCurrentPassword = await bcrypt.hash(currentPassword, 10);
      const userWithPassword = {
        ...mockUser,
        password: hashedCurrentPassword,
      };

      mockUsersService.findById.mockResolvedValue(userWithPassword);
      mockUsersService.updatePassword.mockResolvedValue(undefined);

      await service.changePassword(
        mockUser.id,
        '  oldPassword123  ',
        '  newPassword123  ',
      );

      expect(mockUsersService.updatePassword).toHaveBeenCalled();
    });

    it('should hash the new password before saving', async () => {
      const currentPassword = 'oldPassword123';
      const hashedCurrentPassword = await bcrypt.hash(currentPassword, 10);
      const userWithPassword = {
        ...mockUser,
        password: hashedCurrentPassword,
      };

      mockUsersService.findById.mockResolvedValue(userWithPassword);

      await service.changePassword(
        mockUser.id,
        currentPassword,
        'newPassword123',
      );

      const updatePasswordCall = mockUsersService.updatePassword.mock.calls[0];
      const hashedPassword = updatePasswordCall[1];

      // Verify it's a bcrypt hash
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d{1,2}\$.{53}$/);
      // Verify the hash matches the password
      const matches = await bcrypt.compare('newPassword123', hashedPassword);
      expect(matches).toBe(true);
    });
  });
});
