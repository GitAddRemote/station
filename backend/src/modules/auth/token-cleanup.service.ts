import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Optional,
} from '@nestjs/common';
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
    // Optional: ScheduleModule is intentionally excluded in test environments.
    // @Optional() allows the service to be instantiated without it and
    // onApplicationBootstrap() guards against a missing registry.
    @Optional() private readonly schedulerRegistry?: SchedulerRegistry,
  ) {}

  onApplicationBootstrap(): void {
    if (
      this.configService.get<string>('NODE_ENV') === 'test' ||
      process.env['JEST_WORKER_ID'] !== undefined ||
      !this.schedulerRegistry
    ) {
      return;
    }

    // Read via ConfigService so .env values loaded by ConfigModule.forRoot()
    // are honoured — unlike @Cron() which evaluates before dotenv runs.
    // Use || so a blank/whitespace-only value is treated the same as unset.
    const rawExpression = this.configService
      .get<string>('REFRESH_TOKEN_CLEANUP_CRON')
      ?.trim();
    const cronExpression = rawExpression || '0 3 * * *';

    const defaultExpression = '0 3 * * *';
    let effectiveExpression = cronExpression;
    let job: CronJob;
    try {
      job = new CronJob(cronExpression, () => {
        void this.cleanupExpiredTokens();
      });
    } catch {
      this.logger.warn(
        `Invalid REFRESH_TOKEN_CLEANUP_CRON value "${cronExpression}", ` +
          `falling back to default "${defaultExpression}"`,
      );
      effectiveExpression = defaultExpression;
      job = new CronJob(defaultExpression, () => {
        void this.cleanupExpiredTokens();
      });
    }

    this.schedulerRegistry.addCronJob('tokenCleanup', job);
    job.start();
    this.logger.log(`Token cleanup cron registered: ${effectiveExpression}`);
  }

  async cleanupExpiredTokens(): Promise<void> {
    if (
      this.configService.get<string>('NODE_ENV') === 'test' ||
      process.env['JEST_WORKER_ID'] !== undefined
    ) {
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
