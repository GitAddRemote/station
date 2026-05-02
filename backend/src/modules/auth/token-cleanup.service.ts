import { Injectable, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PasswordReset } from './password-reset.entity';
import { DEFAULT_CLEANUP_CRON } from './token-cleanup.constants';

@Injectable()
export class TokenCleanupService implements OnApplicationBootstrap {
  constructor(
    private readonly logger: Logger,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    private readonly configService: ConfigService,
    @Optional() private readonly schedulerRegistry?: SchedulerRegistry,
  ) {}

  onApplicationBootstrap(): void {
    if (
      this.configService.get<string>('NODE_ENV') === 'test' ||
      process.env['JEST_WORKER_ID'] !== undefined
    ) {
      return;
    }

    if (!this.schedulerRegistry) {
      this.logger.warn(
        'SchedulerRegistry is not available — token cleanup cron will not run. ' +
          'Ensure ScheduleModule is imported in AppModule.',
      );
      return;
    }

    const DEFAULT_CRON = DEFAULT_CLEANUP_CRON;
    const rawExpression = this.configService
      .get<string>('REFRESH_TOKEN_CLEANUP_CRON')
      ?.trim();
    if (rawExpression === '') {
      this.logger.warn(
        'REFRESH_TOKEN_CLEANUP_CRON is set but blank — ' +
          `falling back to default "${DEFAULT_CRON}"`,
      );
    }
    const cronExpression = rawExpression || DEFAULT_CRON;

    let effectiveExpression = cronExpression;
    let job: CronJob;
    try {
      job = new CronJob(cronExpression, () => {
        void this.cleanupExpiredTokens();
      });
    } catch {
      this.logger.warn(
        `Invalid REFRESH_TOKEN_CLEANUP_CRON value "${cronExpression}", ` +
          `falling back to default "${DEFAULT_CRON}"`,
      );
      effectiveExpression = DEFAULT_CRON;
      job = new CronJob(DEFAULT_CRON, () => {
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
    const now = new Date();

    let resetDeleted = 0;
    try {
      const { affected } = await this.passwordResetRepository
        .createQueryBuilder()
        .delete()
        .where('used = TRUE OR "expiresAt" < :now', { now })
        .execute();
      resetDeleted = affected ?? 0;
    } catch (error) {
      this.logger.error(
        'Password reset cleanup failed',
        error instanceof Error ? error.stack : String(error),
      );
    }

    const duration = Date.now() - start;
    this.logger.log(
      `Token cleanup complete in ${duration}ms — deleted ${resetDeleted} password reset(s)`,
    );
  }
}
