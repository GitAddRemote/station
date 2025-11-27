import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/user.entity';
import { UserDto } from '../users/dto/user.dto';
import { RefreshToken } from './refresh-token.entity';
import { PasswordReset } from './password-reset.entity';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly dummyHash =
    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8WZ0p/7eJYJg6eW9j5Cnz4Gf5Eme1e';

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordReset)
    private passwordResetRepository: Repository<PasswordReset>,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    const trimmedPass = pass.trim();

    const hashToCompare = user?.password ?? this.dummyHash;
    const isMatch = await bcrypt.compare(trimmedPass, hashToCompare);

    if (user && isMatch) {
      const { password: _password, ...result } = user;
      return result;
    }

    this.logger.warn(`Authentication failed for user: ${username}`);
    return null;
  }

  async login(
    user: any,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const payload = { username: user.username, sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async register(userDto: UserDto): Promise<Omit<User, 'password'>> {
    // Don't hash here any more—UsersService.create() will do it.
    const newUser = await this.usersService.create(userDto);
    const { password: _password, ...result } = newUser;
    return result;
  }

  async generateRefreshToken(userId: number): Promise<string> {
    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save to database
    await this.refreshTokenRepository.save({
      token,
      userId,
      expiresAt,
      revoked: false,
    });

    return token;
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    // Find the refresh token
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired or revoked
    if (storedToken.revoked || new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // Revoke the old token (rotation)
    await this.refreshTokenRepository.update(storedToken.id, {
      revoked: true,
    });

    // Generate new tokens
    const payload = {
      username: storedToken.user.username,
      sub: storedToken.user.id,
    };
    const newAccessToken = this.jwtService.sign(payload);
    const newRefreshToken = await this.generateRefreshToken(
      storedToken.user.id,
    );

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenRepository.update({ token }, { revoked: true });
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    // Find user by email
    const user = await this.usersService.findByEmail(email);

    // Always return success message to prevent email enumeration
    const successMessage = {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };

    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${email}`,
      );
      return successMessage;
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Save reset token
    await this.passwordResetRepository.save({
      userId: user.id,
      token,
      expiresAt,
      used: false,
    });

    // TODO: Send email with reset link
    // For now, just log the token (in production, send via email service)
    this.logger.log(
      `Password reset token for ${email}: ${token} (expires at ${expiresAt})`,
    );
    this.logger.log(
      `Reset link would be: ${this.configService.get('FRONTEND_URL') || 'http://localhost:5173'}/reset-password?token=${token}`,
    );

    return successMessage;
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Find the reset token
    const resetToken = await this.passwordResetRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token is expired or already used
    if (resetToken.used || new Date() > resetToken.expiresAt) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword.trim(), saltRounds);

    // Update user password
    await this.usersService.updatePassword(resetToken.userId, hashedPassword);

    // Mark token as used
    await this.passwordResetRepository.update(resetToken.id, { used: true });

    this.logger.log(
      `Password reset successful for user ID: ${resetToken.userId}`,
    );

    return { message: 'Password has been reset successfully' };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Get user with password
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword.trim(), user.password);

    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword.trim(), saltRounds);

    // Update password
    await this.usersService.updatePassword(userId, hashedPassword);

    this.logger.log(`Password changed successfully for user ID: ${userId}`);

    return { message: 'Password changed successfully' };
  }
}
