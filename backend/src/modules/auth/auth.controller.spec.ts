import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BadRequestException } from '@nestjs/common';

describe('AuthController - Password Reset', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    refreshAccessToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('forgotPassword', () => {
    it('should call authService.requestPasswordReset with email', async () => {
      const email = 'test@example.com';
      const expectedResponse = {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };

      mockAuthService.requestPasswordReset.mockResolvedValue(expectedResponse);

      const result = await controller.forgotPassword({ email });

      expect(authService.requestPasswordReset).toHaveBeenCalledWith(email);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle errors from service', async () => {
      const email = 'test@example.com';
      mockAuthService.requestPasswordReset.mockRejectedValue(
        new Error('Service error'),
      );

      await expect(controller.forgotPassword({ email })).rejects.toThrow(
        'Service error',
      );
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword with token and newPassword', async () => {
      const token = 'valid-reset-token';
      const newPassword = 'newSecurePassword123';
      const expectedResponse = {
        message: 'Password has been reset successfully',
      };

      mockAuthService.resetPassword.mockResolvedValue(expectedResponse);

      const result = await controller.resetPassword({
        token,
        newPassword,
      });

      expect(authService.resetPassword).toHaveBeenCalledWith(
        token,
        newPassword,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle invalid token error', async () => {
      const token = 'invalid-token';
      const newPassword = 'newPassword123';

      mockAuthService.resetPassword.mockRejectedValue(
        new BadRequestException('Invalid or expired reset token'),
      );

      await expect(
        controller.resetPassword({ token, newPassword }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle expired token error', async () => {
      const token = 'expired-token';
      const newPassword = 'newPassword123';

      mockAuthService.resetPassword.mockRejectedValue(
        new BadRequestException('Invalid or expired reset token'),
      );

      await expect(
        controller.resetPassword({ token, newPassword }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword with userId and passwords', async () => {
      const mockRequest = {
        user: { userId: 1 },
      };
      const currentPassword = 'oldPassword123';
      const newPassword = 'newSecurePassword123';
      const expectedResponse = { message: 'Password changed successfully' };

      mockAuthService.changePassword.mockResolvedValue(expectedResponse);

      const result = await controller.changePassword(mockRequest, {
        currentPassword,
        newPassword,
      });

      expect(authService.changePassword).toHaveBeenCalledWith(
        1,
        currentPassword,
        newPassword,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle incorrect current password error', async () => {
      const mockRequest = {
        user: { userId: 1 },
      };
      const currentPassword = 'wrongPassword';
      const newPassword = 'newPassword123';

      mockAuthService.changePassword.mockRejectedValue(
        new BadRequestException('Current password is incorrect'),
      );

      await expect(
        controller.changePassword(mockRequest, {
          currentPassword,
          newPassword,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should extract userId from authenticated request', async () => {
      const mockRequest = {
        user: { userId: 42 },
      };
      const currentPassword = 'oldPassword123';
      const newPassword = 'newPassword123';

      mockAuthService.changePassword.mockResolvedValue({
        message: 'Password changed successfully',
      });

      await controller.changePassword(mockRequest, {
        currentPassword,
        newPassword,
      });

      expect(authService.changePassword).toHaveBeenCalledWith(
        42,
        currentPassword,
        newPassword,
      );
    });
  });
});
