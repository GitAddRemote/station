import { Test, TestingModule } from '@nestjs/testing';
import { TokenCleanupService } from './token-cleanup.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PasswordReset } from './password-reset.entity';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

const INVALID_CRON_EXPRESSIONS = new Set(['not-a-valid-cron']);
jest.mock('cron', () => ({
  CronJob: jest.fn().mockImplementation((expression: string) => {
    if (INVALID_CRON_EXPRESSIONS.has(expression)) {
      throw new Error(`Invalid cron expression: ${expression}`);
    }
    return { start: jest.fn() };
  }),
}));

function restoreWorker(original: string | undefined): void {
  if (original === undefined) {
    delete process.env['JEST_WORKER_ID'];
  } else {
    process.env['JEST_WORKER_ID'] = original;
  }
}

describe('TokenCleanupService', () => {
  let service: TokenCleanupService;

  const mockQueryBuilder = {
    delete: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  const mockPasswordResetRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockSchedulerRegistry = {
    addCronJob: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenCleanupService,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PasswordReset),
          useValue: mockPasswordResetRepository,
        },
        {
          provide: SchedulerRegistry,
          useValue: mockSchedulerRegistry,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TokenCleanupService>(TokenCleanupService);
    jest.clearAllMocks();
  });

  describe('onApplicationBootstrap', () => {
    it('should not register cron when NODE_ENV is test', () => {
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'NODE_ENV' ? 'test' : undefined,
      );

      service.onApplicationBootstrap();

      expect(mockSchedulerRegistry.addCronJob).not.toHaveBeenCalled();
    });

    it('should not register cron when JEST_WORKER_ID is set', () => {
      const originalWorker = process.env['JEST_WORKER_ID'];
      process.env['JEST_WORKER_ID'] = '1';
      mockConfigService.get.mockReturnValue('development');

      service.onApplicationBootstrap();

      expect(mockSchedulerRegistry.addCronJob).not.toHaveBeenCalled();
      restoreWorker(originalWorker);
    });

    it('should register cron with default expression in non-test env', () => {
      const originalWorker = process.env['JEST_WORKER_ID'];
      delete process.env['JEST_WORKER_ID'];
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      service.onApplicationBootstrap();

      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledWith(
        'tokenCleanup',
        expect.any(Object),
      );
      restoreWorker(originalWorker);
    });

    it('should register cron with custom expression from config', () => {
      const originalWorker = process.env['JEST_WORKER_ID'];
      delete process.env['JEST_WORKER_ID'];
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'REFRESH_TOKEN_CLEANUP_CRON') return '0 2 * * *';
        return undefined;
      });

      service.onApplicationBootstrap();

      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledWith(
        'tokenCleanup',
        expect.any(Object),
      );
      restoreWorker(originalWorker);
    });

    it('should fall back to default cron expression when config value is invalid', () => {
      const originalWorker = process.env['JEST_WORKER_ID'];
      delete process.env['JEST_WORKER_ID'];
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'REFRESH_TOKEN_CLEANUP_CRON') return 'not-a-valid-cron';
        return undefined;
      });

      expect(() => service.onApplicationBootstrap()).not.toThrow();
      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledWith(
        'tokenCleanup',
        expect.any(Object),
      );
      restoreWorker(originalWorker);
    });

    it('should treat blank REFRESH_TOKEN_CLEANUP_CRON as unset and use default', () => {
      const originalWorker = process.env['JEST_WORKER_ID'];
      delete process.env['JEST_WORKER_ID'];
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'REFRESH_TOKEN_CLEANUP_CRON') return '   ';
        return undefined;
      });
      const warnSpy = jest
        .spyOn(
          (service as unknown as { logger: { warn: jest.Mock } }).logger,
          'warn',
        )
        .mockImplementation(() => undefined);

      service.onApplicationBootstrap();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('REFRESH_TOKEN_CLEANUP_CRON is set but blank'),
      );
      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledWith(
        'tokenCleanup',
        expect.any(Object),
      );
      warnSpy.mockRestore();
      restoreWorker(originalWorker);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should return early in test environment', async () => {
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'NODE_ENV' ? 'test' : undefined,
      );

      await service.cleanupExpiredTokens();

      expect(
        mockPasswordResetRepository.createQueryBuilder,
      ).not.toHaveBeenCalled();
    });

    it('should return early when JEST_WORKER_ID is set', async () => {
      const originalWorker = process.env['JEST_WORKER_ID'];
      process.env['JEST_WORKER_ID'] = '1';
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'NODE_ENV' ? 'development' : undefined,
      );

      await service.cleanupExpiredTokens();

      expect(
        mockPasswordResetRepository.createQueryBuilder,
      ).not.toHaveBeenCalled();
      restoreWorker(originalWorker);
    });

    describe('in a non-test environment', () => {
      let originalWorker: string | undefined;

      beforeEach(() => {
        originalWorker = process.env['JEST_WORKER_ID'];
        delete process.env['JEST_WORKER_ID'];
        mockConfigService.get.mockImplementation((key: string) =>
          key === 'NODE_ENV' ? 'development' : undefined,
        );
        mockQueryBuilder.execute.mockResolvedValueOnce({ affected: 1 });
      });

      afterEach(() => {
        restoreWorker(originalWorker);
      });

      it('should delete used and expired password resets', async () => {
        await service.cleanupExpiredTokens();

        expect(
          mockPasswordResetRepository.createQueryBuilder,
        ).toHaveBeenCalled();
        const [whereClause, params] = mockQueryBuilder.where.mock.calls[0];
        expect(whereClause).toContain('used = TRUE');
        expect(whereClause).toContain('"expiresAt"');
        expect(params).toMatchObject({ now: expect.any(Date) });
      });

      it('should not throw when a query fails', async () => {
        mockQueryBuilder.execute.mockReset();
        mockQueryBuilder.execute.mockRejectedValueOnce(new Error('DB failure'));

        await expect(service.cleanupExpiredTokens()).resolves.toBeUndefined();
      });
    });
  });
});
