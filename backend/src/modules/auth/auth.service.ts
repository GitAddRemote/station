import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Inject,
  Optional,
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

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/** Minimal interface for the operations AuthService needs on the raw client. */
export interface RedisClientLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { PX: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
  getDel(key: string): Promise<string | null>;
  pTTL(key: string): Promise<number>;
}

const REFRESH_TTL_SECONDS = 7 * 24 * 3600; // 7 days
const REFRESH_TTL_MS = REFRESH_TTL_SECONDS * 1000;

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
    @Optional()
    @Inject(REDIS_CLIENT)
    private redisClient: RedisClientLike | null,
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

  /**
   * Generates a refresh token that encodes its own JTI so the guard can
   * recover the JTI from the cookie alone — no access token required.
   *
   * Token format (opaque to clients): base64url( jti + "." + 32 random bytes )
   * Storage: SHA-256 hash of the full raw value, keyed by refresh:{jti}
   */
  async generateRefreshToken(userId: number, jti: string): Promise<string> {
    const randomPart = crypto.randomBytes(32).toString('hex');
    // Encode JTI into the token so the guard can split it back out without
    // needing the access token cookie.
    const raw = `${jti}.${randomPart}`;
    const hash = this.hashToken(raw);

    await this.authSet(`refresh:${jti}`, `${userId}:${hash}`, REFRESH_TTL_MS);
    return raw;
  }

  /**
   * Parses the JTI out of the structured refresh token cookie value.
   * Returns undefined if the token is malformed.
   */
  parseRefreshTokenJti(raw: string): string | undefined {
    const dotIndex = raw.indexOf('.');
    if (dotIndex < 1) return undefined;
    return raw.substring(0, dotIndex);
  }

  /**
   * Atomically consumes a refresh token entry from Redis.
   * Uses GETDEL on the injected raw redis client when available; falls back to
   * get+del for the in-memory cache (test environments only).
   * Returns [storedValue, remainingTtlMs]. remainingTtlMs is 0 when the key
   * has no positive TTL — callers must not restore the entry in that case.
   */
  private async consumeRefreshEntry(
    jti: string,
  ): Promise<[string | null, number]> {
    const key = `refresh:${jti}`;

    if (this.redisClient) {
      // Read TTL before deleting so we can restore it accurately on mismatch.
      // pTTL returns -2 (key missing) or -1 (no expiry) for non-positive cases.
      const remainingMs = await this.redisClient.pTTL(key);
      const value = await this.redisClient.getDel(key);
      // Only return a positive TTL — callers treat 0 as "do not restore".
      return [value, remainingMs > 0 ? remainingMs : 0];
    }

    // In-memory fallback (test env, single-threaded): get then del.
    const value = await this.cacheManager.get<string>(key);
    if (value !== null && value !== undefined) {
      await this.cacheManager.del(key);
    }
    return [value ?? null, REFRESH_TTL_MS];
  }

  async refreshAccessToken(
    rawRefreshToken: string,
    jti: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Atomic consume: if two concurrent requests arrive, only one gets the value.
    const [stored, remainingTtlMs] = await this.consumeRefreshEntry(jti);

    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const [userIdStr, storedHash] = stored.split(':');
    if (this.hashToken(rawRefreshToken) !== storedHash) {
      // Hash mismatch — restore with the original remaining TTL so the
      // legitimate holder can still use their token. Only restore if the TTL
      // was positive; a zero TTL means the key was about to expire and must
      // not be written back without an expiry (which would make it immortal).
      if (remainingTtlMs > 0) {
        await this.authSet(`refresh:${jti}`, stored, remainingTtlMs);
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = parseInt(userIdStr, 10);
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Old entry already deleted by consumeRefreshEntry — issue new token pair.
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
    rawRefreshToken: string,
    jti: string,
    rawAccessToken?: string,
  ): Promise<void> {
    await this.revokeRefreshToken(rawRefreshToken, jti);

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

  async revokeRefreshToken(
    rawRefreshToken: string,
    jti: string,
  ): Promise<void> {
    const stored = await this.authGet(`refresh:${jti}`);
    if (!stored) {
      return;
    }

    const [, storedHash] = stored.split(':');
    if (this.hashToken(rawRefreshToken) !== storedHash) {
      return;
    }

    await this.authDel(`refresh:${jti}`);
  }

  async blacklistAccessToken(jti: string, exp: number): Promise<void> {
    const remainingMs = exp * 1000 - Date.now();
    if (remainingMs > 0) {
      await this.authSet(`blacklist:${jti}`, '1', remainingMs);
    }
  }

  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const hit = await this.authGet(`blacklist:${jti}`);
    return hit !== null && hit !== undefined;
  }

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /** Read an auth-state key. Uses raw Redis client when available. */
  private async authGet(key: string): Promise<string | null> {
    if (this.redisClient) {
      return this.redisClient.get(key);
    }
    return (await this.cacheManager.get<string>(key)) ?? null;
  }

  /**
   * Write an auth-state key with a mandatory positive TTL.
   * Throws if ttlMs ≤ 0 — auth state must always expire.
   */
  private async authSet(
    key: string,
    value: string,
    ttlMs: number,
  ): Promise<void> {
    if (ttlMs <= 0) {
      throw new Error(`authSet called with non-positive TTL for key ${key}`);
    }
    if (this.redisClient) {
      await this.redisClient.set(key, value, { PX: Math.ceil(ttlMs) });
      return;
    }
    await this.cacheManager.set(key, value, Math.ceil(ttlMs));
  }

  /** Delete an auth-state key. Uses raw Redis client when available. */
  private async authDel(key: string): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.del(key);
      return;
    }
    await this.cacheManager.del(key);
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
