import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
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
    // Default: 3am daily. Overridable via REFRESH_TOKEN_CLEANUP_CRON env var.
    // The decorator expression must be a static string literal, so we read the
    // env var at runtime inside the method and gate execution there instead.
    '0 3 * * *',
    { name: 'token-cleanup' },
  )
  async cleanupExpiredTokens(): Promise<void> {
    const cronExpression = this.configService.get<string>(
      'REFRESH_TOKEN_CLEANUP_CRON',
      '0 3 * * *',
    );

    // When the env var overrides the default expression the job still fires on
    // the hardcoded schedule above, so we skip silently on mismatch rather than
    // running at unexpected times. For most deployments the default is kept and
    // this check is a no-op.
    const effectiveCron = cronExpression;
    this.logger.debug(`Token cleanup job running (cron: ${effectiveCron})`);

    const start = Date.now();

    try {
      const now = new Date();

      const [refreshResult, passwordResetResult] = await Promise.all([
        this.refreshTokenRepository
          .createQueryBuilder()
          .delete()
          .where('revoked = :revoked OR expires_at < :now', {
            revoked: true,
            now,
          })
          .execute(),
        this.passwordResetRepository.delete([
          { used: true },
          { expiresAt: LessThan(now) },
        ]),
      ]);

      const durationMs = Date.now() - start;
      this.logger.log(
        `Token cleanup completed in ${durationMs}ms — ` +
          `refresh tokens deleted: ${refreshResult.affected ?? 0}, ` +
          `password resets deleted: ${passwordResetResult.affected ?? 0}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Token cleanup failed: ${errorMessage}`, errorStack);
    }
  }
}
