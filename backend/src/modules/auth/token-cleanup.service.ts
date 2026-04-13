import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RefreshToken } from './refresh-token.entity';
import { PasswordReset } from './password-reset.entity';

@Injectable()
export class TokenCleanupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onApplicationBootstrap(): void {
    // Skip cron registration in test environments. JEST_WORKER_ID is set by
    // Jest's worker processes even when NODE_ENV is not explicitly 'test'.
    if (
      this.configService.get<string>('NODE_ENV') === 'test' ||
      process.env['JEST_WORKER_ID'] !== undefined
    ) {
      return;
    }

    // Read the cron expression here via ConfigService so that .env values
    // loaded by ConfigModule.forRoot() are available — unlike @Cron() which
    // evaluates at module-load time before dotenv runs.
    const cronExpression =
      this.configService.get<string>('REFRESH_TOKEN_CLEANUP_CRON') ??
      '0 3 * * *';

    const job = new CronJob(cronExpression, () => {
      void this.cleanupExpiredTokens();
    });
    this.schedulerRegistry.addCronJob('tokenCleanup', job);
    job.start();
    this.logger.log(`Token cleanup cron registered: ${cronExpression}`);
  }

  async cleanupExpiredTokens(): Promise<void> {
    if (this.configService.get<string>('NODE_ENV') === 'test') {
      return;
    }

    const start = Date.now();
    this.logger.log('Starting expired/revoked token cleanup');

    try {
      const now = new Date();

      const { affected: refreshDeleted } = await this.refreshTokenRepository
        .createQueryBuilder()
        .delete()
        .where('revoked = :revoked OR "expiresAt" < :now', {
          revoked: true,
          now,
        })
        .execute();

      const { affected: resetDeleted } = await this.passwordResetRepository
        .createQueryBuilder()
        .delete()
        .where('used = :used OR "expiresAt" < :now', { used: true, now })
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
