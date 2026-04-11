import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RefreshToken } from './refresh-token.entity';
import { PasswordReset } from './password-reset.entity';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    private readonly configService: ConfigService,
  ) {}

  @Cron(
    // Default: 3am daily — override with REFRESH_TOKEN_CLEANUP_CRON env var
    process.env['REFRESH_TOKEN_CLEANUP_CRON'] ?? '0 3 * * *',
  )
  async cleanupExpiredTokens(): Promise<void> {
    if (process.env['NODE_ENV'] === 'test') {
      return;
    }

    const start = Date.now();
    this.logger.log('Starting expired/revoked token cleanup');

    try {
      const now = new Date();

      const { affected: refreshDeleted } = await this.refreshTokenRepository
        .createQueryBuilder()
        .delete()
        .where('revoked = :revoked OR expires_at < :now', {
          revoked: true,
          now,
        })
        .execute();

      const { affected: resetDeleted } = await this.passwordResetRepository
        .createQueryBuilder()
        .delete()
        .where('used = :used OR expires_at < :now', { used: true, now })
        .execute();

      const duration = Date.now() - start;
      this.logger.log(
        `Token cleanup complete in ${duration}ms — ` +
          `deleted ${refreshDeleted ?? 0} refresh token(s), ` +
          `${resetDeleted ?? 0} password reset(s)`,
      );
    } catch (error) {
      this.logger.error(
        'Token cleanup job failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
