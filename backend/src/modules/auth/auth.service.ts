import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UsersService } from '../users/users.service';
import { SystemUserService } from '../users/system-user.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/user.entity';
import { UserDto } from '../users/dto/user.dto';
import { PasswordReset } from './password-reset.entity';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidatedUser } from './interfaces/validated-user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const REFRESH_TTL_SECONDS = 7 * 24 * 3600; // 7 days

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly dummyHash =
    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8WZ0p/7eJYJg6eW9j5Cnz4Gf5Eme1e';

  constructor(
    private usersService: UsersService,
    private systemUserService: SystemUserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(PasswordReset)
    private passwordResetRepository: Repository<PasswordReset>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async validateUser(
    username: string,
    pass: string,
  ): Promise<ValidatedUser | null> {
    const user = await this.usersService.findOne(username);
    const trimmedPass = pass.trim();

    if (user && user.isSystemUser) {
      this.logger.warn(
        `System user attempted to authenticate: ${username}. This is not allowed.`,
      );
      return null;
    }

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
    user: ValidatedUser,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jti = crypto.randomUUID();
    const payload: JwtPayload = { username: user.username, sub: user.id, jti };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id, jti);
    return { accessToken, refreshToken };
  }

  async register(userDto: UserDto): Promise<Omit<User, 'password'>> {
    const newUser = await this.usersService.create(userDto);
    const { password: _password, ...result } = newUser;
    return result;
  }

  async generateRefreshToken(userId: number, jti: string): Promise<string> {
    const raw = crypto.randomBytes(32).toString('hex');
    // Store: refresh:{jti} → "userId:rawToken" so we can validate the token on refresh
    await this.cacheManager.set(
      `refresh:${jti}`,
      `${userId}:${raw}`,
      REFRESH_TTL_SECONDS * 1000,
    );
    return raw;
  }

  async refreshAccessToken(
    refreshToken: string,
    jti: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const stored = await this.cacheManager.get<string>(`refresh:${jti}`);

    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const [userIdStr, storedRaw] = stored.split(':');
    if (storedRaw !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = parseInt(userIdStr, 10);
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Rotate: delete old entry, issue new token pair
    await this.cacheManager.del(`refresh:${jti}`);

    const newJti = crypto.randomUUID();
    const payload: JwtPayload = {
      username: user.username,
      sub: user.id,
      jti: newJti,
    };
    const newAccessToken = this.jwtService.sign(payload);
    const newRefreshToken = await this.generateRefreshToken(user.id, newJti);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(
    refreshToken: string,
    jti: string,
    rawAccessToken?: string,
  ): Promise<void> {
    await this.revokeRefreshToken(refreshToken, jti);

    if (rawAccessToken) {
      try {
        const decoded = this.jwtService.decode(
          rawAccessToken,
        ) as JwtPayload | null;
        if (decoded?.exp) {
          await this.blacklistAccessToken(jti, decoded.exp);
        }
      } catch {
        // Malformed token — already unusable, no action needed
      }
    }
  }

  async revokeRefreshToken(refreshToken: string, jti: string): Promise<void> {
    const stored = await this.cacheManager.get<string>(`refresh:${jti}`);
    if (!stored) {
      return;
    }

    const [, storedRaw] = stored.split(':');
    if (storedRaw !== refreshToken) {
      return;
    }

    await this.cacheManager.del(`refresh:${jti}`);
  }

  async blacklistAccessToken(jti: string, exp: number): Promise<void> {
    const remainingMs = Math.max(0, exp * 1000 - Date.now());
    if (remainingMs > 0) {
      await this.cacheManager.set(`blacklist:${jti}`, '1', remainingMs);
    }
  }

  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const hit = await this.cacheManager.get<string>(`blacklist:${jti}`);
    return hit !== null && hit !== undefined;
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

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

    const token = crypto.randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.passwordResetRepository.save({
      userId: user.id,
      token,
      expiresAt,
      used: false,
    });

    this.logger.log(`Password reset requested for user ID: ${user.id}`);

    return successMessage;
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const resetToken = await this.passwordResetRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetToken.used || new Date() > resetToken.expiresAt) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword.trim(), saltRounds);

    await this.usersService.updatePassword(resetToken.userId, hashedPassword);

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
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword.trim(), user.password);

    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword.trim(), saltRounds);

    await this.usersService.updatePassword(userId, hashedPassword);

    this.logger.log(`Password changed successfully for user ID: ${userId}`);

    return { message: 'Password changed successfully' };
  }
}
