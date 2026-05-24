import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  Inject,
  Optional,
  OnModuleDestroy,
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
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { ValidatedUser } from './interfaces/validated-user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ClientJwtPayload } from './interfaces/client-jwt-payload.interface';
import { OauthClient } from '../oauth-clients/oauth-client.entity';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const DISCORD_NONCE_COOKIE = '__Host-oauth_state';
export const DISCORD_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Minimal interface for the operations AuthService needs on the raw client. */
export interface RedisClientLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { PX: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
  getDel(key: string): Promise<string | null>;
  pTTL(key: string): Promise<number>;
  sAdd(key: string, member: string): Promise<unknown>;
  sMembers(key: string): Promise<string[]>;
  sRem(key: string, member: string): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
  quit(): Promise<void>;
}

const REFRESH_TTL_SECONDS = 7 * 24 * 3600; // 7 days
const REFRESH_TTL_MS = REFRESH_TTL_SECONDS * 1000;
const PRE_AUTH_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class AuthService implements OnModuleDestroy {
  private readonly dummyHash =
    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8WZ0p/7eJYJg6eW9j5Cnz4Gf5Eme1e';

  constructor(
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
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
  ) {
    // Auth state (refresh tokens, blacklist, sessions) must be shared across all
    // instances. If USE_REDIS_CACHE=true but the Redis client failed to connect,
    // reject startup rather than silently running with per-process state.
    if (
      redisClient === null &&
      configService.get<string>('USE_REDIS_CACHE', 'true') === 'true'
    ) {
      throw new Error(
        'Redis is required for auth state (refresh tokens, blacklist, sessions) ' +
          'but the connection failed. Set USE_REDIS_CACHE=false to run without ' +
          'Redis (single-instance / test only).',
      );
    }
  }

  async onModuleDestroy() {
    await this.redisClient?.quit();
  }

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

  /**
   * Core login — issues tokens after credential validation.
   *
   * For local accounts (discord_id IS NULL), checks password expiry and
   * forced-change flags before issuing tokens. If either flag is set, returns
   * a 403 with a pre-auth token in X-Pre-Auth-Token instead of full tokens.
   *
   * Returns { accessToken, refreshToken } on success, or throws on expiry/change.
   * Callers (controller) must catch ForbiddenException and forward the header.
   */
  async login(
    user: ValidatedUser,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Expiry / forced-change checks apply only to local accounts
    if (!user.discordId) {
      const fullUser = await this.usersService.findById(user.id);
      if (!fullUser) {
        throw new UnauthorizedException('User not found');
      }

      if (fullUser.passwordChangeRequired) {
        const token = await this.generatePreAuthToken(user.id);
        throw Object.assign(
          new ForbiddenException({ code: 'PASSWORD_CHANGE_REQUIRED' }),
          { preAuthToken: token },
        );
      }

      if (
        fullUser.passwordExpiresAt &&
        fullUser.passwordExpiresAt < new Date()
      ) {
        const token = await this.generatePreAuthToken(user.id);
        throw Object.assign(
          new ForbiddenException({ code: 'PASSWORD_EXPIRED' }),
          { preAuthToken: token },
        );
      }
    }

    return this.issueTokenPair(user.id, user.username);
  }

  /** Issues a new access+refresh token pair and maintains the user-sessions index. */
  private async issueTokenPair(
    userId: number,
    username: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jti = crypto.randomUUID();
    // A session ID (SID) is stable across token rotations for this login.
    // Deleting session:{sid} invalidates the entire token family regardless of
    // which JTI the client currently holds.
    const sid = crypto.randomUUID();
    await this.authSet(`session:${sid}`, String(userId), REFRESH_TTL_MS);

    // Maintain the reverse index so all sessions for a user can be revoked at once.
    if (this.redisClient) {
      await this.redisClient.sAdd(`user-sessions:${userId}`, sid);
      await this.redisClient.expire(
        `user-sessions:${userId}`,
        REFRESH_TTL_SECONDS,
      );
    }

    const payload: JwtPayload = {
      username,
      sub: userId,
      jti,
      sid,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(userId, jti, sid);
    return { accessToken, refreshToken };
  }

  /**
   * Generates a single-use pre-auth token stored in raw Redis only.
   * Returns 503 if redisClient is null — in-memory storage is forbidden for this flow.
   */
  async generatePreAuthToken(userId: number): Promise<string> {
    if (!this.redisClient) {
      throw new ServiceUnavailableException(
        'Pre-auth tokens require Redis. Set USE_REDIS_CACHE=true.',
      );
    }
    const token = crypto.randomBytes(32).toString('hex');
    await this.redisClient.set(`pre_auth:${token}`, String(userId), {
      PX: PRE_AUTH_TTL_MS,
    });
    return token;
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
  async generateRefreshToken(
    userId: number,
    jti: string,
    sid: string,
  ): Promise<string> {
    const randomPart = crypto.randomBytes(32).toString('hex');
    // Encode JTI into the token so the guard can split it back out without
    // needing the access token cookie.
    const raw = `${jti}.${randomPart}`;
    const hash = this.hashToken(raw);

    // Stored value: "{userId}:{hash}:{sid}" — SID threads through rotations.
    await this.authSet(
      `refresh:${jti}`,
      `${userId}:${hash}:${sid}`,
      REFRESH_TTL_MS,
    );
    // jti:{jti} → sid is a non-consumed reverse-index so logout can recover the
    // SID from the JTI even if the refresh entry has already been GETDEL'd by a
    // concurrent rotation before the logout request arrives.
    await this.authSet(`jti:${jti}`, sid, REFRESH_TTL_MS);
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

    const [userIdStr, storedHash, sid] = stored.split(':');
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

    // Verify the session family is still alive. If logout already deleted
    // session:{sid}, all rotated tokens in this family are also invalidated.
    const sessionAlive = await this.authGet(`session:${sid}`);
    if (!sessionAlive) {
      throw new UnauthorizedException('Session has been revoked');
    }

    const userId = parseInt(userIdStr, 10);
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Renew the session TTL so it slides with the refresh token. Without this
    // the original 7-day session window would expire before the client's
    // most-recently issued refresh token, causing spurious 401s.
    await this.authSet(`session:${sid}`, String(userId), REFRESH_TTL_MS);

    // Slide the user-sessions set TTL in lockstep — the SID is stable so no
    // SADD/SREM is needed here, only the EXPIRE must be refreshed.
    if (this.redisClient) {
      await this.redisClient.expire(
        `user-sessions:${userId}`,
        REFRESH_TTL_SECONDS,
      );
    }

    // Old entry already deleted by consumeRefreshEntry — issue new token pair
    // carrying the same SID so the session family remains revocable.
    const newJti = crypto.randomUUID();
    const payload: JwtPayload = {
      username: user.username,
      sub: user.id,
      jti: newJti,
      sid,
    };
    const newAccessToken = this.jwtService.sign(payload);
    const newRefreshToken = await this.generateRefreshToken(
      user.id,
      newJti,
      sid,
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(
    rawRefreshToken: string,
    jti: string,
    rawAccessToken?: string,
  ): Promise<void> {
    // Read SID early so we can prune the user-sessions set before deletion.
    const sid = await this.authGet(`jti:${jti}`);

    // Best-effort: revoke the refresh entry and delete session:{sid} from the
    // stored value. This succeeds when refresh:{jti} has not been consumed yet.
    await this.revokeRefreshToken(rawRefreshToken, jti);

    // Fallback for the race where a concurrent refresh already GETDEL'd the
    // entry: look up the SID via the non-consumed reverse-index jti:{jti} and
    // delete the session family directly. This is idempotent if revokeRefreshToken
    // already deleted it.
    if (sid) {
      // When Redis is available, read userId before deleting the session key
      // so we can prune the user-sessions reverse index.
      if (this.redisClient) {
        const userIdStr = await this.redisClient.get(`session:${sid}`);
        await this.authDel(`session:${sid}`);
        if (userIdStr) {
          await this.redisClient.sRem(`user-sessions:${userIdStr}`, sid);
        }
      } else {
        await this.authDel(`session:${sid}`);
      }
    }

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

    const [, storedHash, sid] = stored.split(':');
    if (this.hashToken(rawRefreshToken) !== storedHash) {
      return;
    }

    // Delete the session family first so any concurrently rotated token also
    // becomes invalid before we remove this specific refresh entry.
    if (sid) {
      await this.authDel(`session:${sid}`);
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

  async isSessionAlive(sid: string): Promise<boolean> {
    const hit = await this.authGet(`session:${sid}`);
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

    this.logger.info(`Password reset requested for user ID: ${user.id}`);

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

    this.logger.info(
      `Password reset successful for user ID: ${resetToken.userId}`,
    );

    return { message: 'Password has been reset successfully' };
  }

  async issueClientToken(
    client: OauthClient,
    grantedScopes: string[] = client.scopes,
  ): Promise<{
    access_token: string;
    token_type: 'Bearer';
    expires_in: number;
  }> {
    const CLIENT_TTL_SECONDS = 3600;
    const jti = crypto.randomUUID();
    const payload: ClientJwtPayload = {
      sub: client.clientId,
      type: 'client',
      scopes: grantedScopes,
      jti,
    };
    const access_token = this.jwtService.sign(payload, {
      expiresIn: CLIENT_TTL_SECONDS,
    });
    // Track live client tokens so a future admin revoke endpoint can enumerate
    // and invalidate them per client. Key: client-token:{clientId}:{jti}.
    // Revocation itself uses the existing blacklist:{jti} mechanism checked by
    // isAccessTokenBlacklisted.
    await this.authSet(
      `client-token:${client.clientId}:${jti}`,
      '1',
      CLIENT_TTL_SECONDS * 1000,
    );
    return {
      access_token,
      token_type: 'Bearer',
      expires_in: CLIENT_TTL_SECONDS,
    };
  }

  /**
   * Handles POST /auth/forced-password-change.
   * Atomically consumes a pre-auth token, changes the password, revokes all
   * existing sessions for the user, and issues a fresh token pair.
   *
   * Requires raw Redis (redisClient !== null) — returns 503 otherwise.
   */
  async forcedPasswordChange(
    preAuthToken: string,
    newPassword: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!this.redisClient) {
      throw new ServiceUnavailableException(
        'Forced password change requires Redis. Set USE_REDIS_CACHE=true.',
      );
    }

    const userIdStr = await this.redisClient.getDel(`pre_auth:${preAuthToken}`);
    if (!userIdStr) {
      throw new UnauthorizedException('Invalid or expired pre-auth token');
    }

    const userId = parseInt(userIdStr, 10);
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const expiryDays = parseInt(
      this.configService.get<string>('ADMIN_PASSWORD_EXPIRY_DAYS', '90'),
      10,
    );
    const passwordExpiresAt = new Date(
      Date.now() + expiryDays * 24 * 3600 * 1000,
    );

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    await this.usersService.updatePasswordWithExpiry(
      userId,
      hashedPassword,
      passwordExpiresAt,
    );

    await this.revokeAllUserSessions(userId);

    return this.issueTokenPair(userId, user.username);
  }

  /** Revokes all active sessions for a user via the user-sessions reverse index. */
  private async revokeAllUserSessions(userId: number): Promise<void> {
    if (!this.redisClient) return;
    const sids = await this.redisClient.sMembers(`user-sessions:${userId}`);
    for (const sid of sids) {
      await this.redisClient.del(`session:${sid}`);
    }
    await this.redisClient.del(`user-sessions:${userId}`);
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

    this.logger.info(`Password changed successfully for user ID: ${userId}`);

    return { message: 'Password changed successfully' };
  }

  // ---------------------------------------------------------------------------
  // Discord OAuth helpers
  // ---------------------------------------------------------------------------

  /**
   * Generate a cryptographically random OAuth state value, store it in Redis
   * under oauth_state:<state> with a 10-minute TTL, and return it so the
   * controller can both redirect to Discord and set the nonce cookie.
   */
  async generateDiscordState(): Promise<string> {
    const state = crypto.randomBytes(32).toString('hex');
    await this.authSet(`oauth_state:${state}`, '1', DISCORD_STATE_TTL_MS);
    return state;
  }

  /**
   * Validate the OAuth state returned by Discord's callback against:
   * 1. Redis (GETDEL — one-time use, server-side)
   * 2. The browser-bound nonce cookie value
   *
   * Returns true only when both checks pass. Either missing or mismatched
   * value is treated as an invalid/replayed state.
   */
  async validateAndConsumeDiscordState(
    stateFromQuery: string | undefined,
    stateFromCookie: string | undefined,
  ): Promise<boolean> {
    if (!stateFromQuery || !stateFromCookie) return false;
    if (stateFromQuery !== stateFromCookie) return false;

    const key = `oauth_state:${stateFromQuery}`;
    let stored: string | null;
    if (this.redisClient) {
      stored = await this.redisClient.getDel(key);
    } else {
      stored = (await this.cacheManager.get<string>(key)) ?? null;
      if (stored) await this.cacheManager.del(key);
    }
    return stored !== null;
  }

  /**
   * Handle the Discord callback after state validation.
   *
   * Lookup order (email is guaranteed present and verified by the controller
   * before this method is called):
   *   1. Match by discordId — returning user; update avatar
   *   2. Match by email, discordId IS NULL — link account
   *   3. Match by email, discordId already set to a different value — conflict
   *   4. No match — create new user (up to 5 username-collision retries)
   *
   * Returns the user on success, or a string error code on failure.
   */
  async handleDiscordCallback(profile: {
    discordId: string;
    email: string;
    username: string;
    avatarUrl: string | null;
  }): Promise<{ user: Omit<User, 'password'> } | { error: string }> {
    // Step 1: returning user by discordId
    const byDiscordId = await this.usersService.findByDiscordId(
      profile.discordId,
    );
    if (byDiscordId) {
      await this.usersService.updateDiscordAvatar(
        byDiscordId.id,
        profile.avatarUrl,
      );
      const { password: _p, ...result } = byDiscordId;
      return { user: result };
    }

    // Step 2 & 3: email match
    const byEmail = await this.usersService.findByEmail(profile.email);
    if (byEmail) {
      if (byEmail.discordId != null) {
        // Already linked to a different Discord account
        return { error: 'email_conflict' };
      }
      await this.usersService.linkDiscord(
        byEmail.id,
        profile.discordId,
        profile.avatarUrl,
      );
      const { password: _p, ...result } = byEmail;
      return { user: result };
    }

    // Step 4: new user — retry on username collision
    const baseUsername = profile.username.replace(/[^a-zA-Z0-9]/g, '');
    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = Math.floor(1000 + Math.random() * 9000).toString();
      const username =
        attempt === 0 && baseUsername
          ? baseUsername.slice(0, 20)
          : `${baseUsername.slice(0, 16)}_${suffix}`;
      try {
        const created = await this.usersService.createFromDiscord({
          username,
          email: profile.email,
          discordId: profile.discordId,
          discordAvatarUrl: profile.avatarUrl,
        });
        const { password: _p, ...result } = created;
        return { user: result };
      } catch (err: unknown) {
        const isUnique =
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === '23505';
        // Only retry on username collision; re-throw anything else
        const detail =
          err && typeof err === 'object' && 'detail' in err
            ? String((err as { detail: unknown }).detail)
            : '';
        if (isUnique && detail.includes('username')) continue;
        throw err;
      }
    }
    return { error: 'discord_error' };
  }

  isLocalLoginEnabled(): boolean {
    return (
      this.configService.get<string>('AUTH_LOCAL_LOGIN_ENABLED', 'true') ===
      'true'
    );
  }

  isLocalRegisterEnabled(): boolean {
    return (
      this.configService.get<string>('AUTH_LOCAL_REGISTER_ENABLED', 'true') ===
      'true'
    );
  }

  isDiscordEnabled(): boolean {
    return (
      this.configService.get<string>('AUTH_DISCORD_ENABLED', 'true') === 'true'
    );
  }

  /** Issue tokens for a Discord-authenticated user (no expiry/forced-change checks). */
  async loginDiscordUser(
    user: Omit<User, 'password'>,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.issueTokenPair(user.id, user.username);
  }
}
