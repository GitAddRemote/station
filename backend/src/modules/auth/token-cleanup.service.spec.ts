import { Test, TestingModule } from '@nestjs/testing';
import { TokenCleanupService } from './token-cleanup.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from './refresh-token.entity';
import { PasswordReset } from './password-reset.entity';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

// Helper that mirrors the safe JEST_WORKER_ID restore pattern used throughout
// this file: deletes the variable when the original value was undefined rather
// than assigning the string 'undefined' (Node coerces undefined to 'undefined'
// in process.env, which would leave the guard permanently set).
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

  const mockRefreshTokenRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
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
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
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

    it('should not register cron when schedulerRegistry is absent', () => {
      // Simulate the @Optional() case: schedulerRegistry is undefined
      const serviceWithoutRegistry = new TokenCleanupService(
        mockRefreshTokenRepository as unknown as Repository<RefreshToken>,
        mockPasswordResetRepository as unknown as Repository<PasswordReset>,
        mockConfigService as unknown as ConfigService,
        undefined,
      );

      const originalWorker = process.env['JEST_WORKER_ID'];
      delete process.env['JEST_WORKER_ID'];
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'NODE_ENV' ? 'production' : undefined,
      );

      serviceWithoutRegistry.onApplicationBootstrap();

      expect(mockSchedulerRegistry.addCronJob).not.toHaveBeenCalled();
      restoreWorker(originalWorker);
    });

    it('should register cron with default expression in non-test env', () => {
      const originalWorker = process.env['JEST_WORKER_ID'];
      delete process.env['JEST_WORKER_ID'];
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined; // REFRESH_TOKEN_CLEANUP_CRON not set → fallback
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

      // Should not throw, and should still register the job with the fallback
      expect(() => service.onApplicationBootstrap()).not.toThrow();
      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledWith(
        'tokenCleanup',
        expect.any(Object),
      );
      restoreWorker(originalWorker);
    });

    it('should treat blank REFRESH_TOKEN_CLEANUP_CRON as unset, log a warning, and use default', () => {
      const originalWorker = process.env['JEST_WORKER_ID'];
      delete process.env['JEST_WORKER_ID'];
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'REFRESH_TOKEN_CLEANUP_CRON') return '   '; // blank/whitespace
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
    it('should return early in test environment without touching the database', async () => {
      // Explicitly set NODE_ENV to 'test' for a deterministic guard check
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'NODE_ENV' ? 'test' : undefined,
      );

      await service.cleanupExpiredTokens();

      expect(
        mockRefreshTokenRepository.createQueryBuilder,
      ).not.toHaveBeenCalled();
      expect(
        mockPasswordResetRepository.createQueryBuilder,
      ).not.toHaveBeenCalled();
    });

    it('should return early when JEST_WORKER_ID is set without touching the database', async () => {
      const originalWorker = process.env['JEST_WORKER_ID'];
      process.env['JEST_WORKER_ID'] = '1';
      mockConfigService.get.mockImplementation((key: string) =>
        key === 'NODE_ENV' ? 'development' : undefined,
      );

      await service.cleanupExpiredTokens();

      expect(
        mockRefreshTokenRepository.createQueryBuilder,
      ).not.toHaveBeenCalled();
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
        mockQueryBuilder.execute
          .mockResolvedValueOnce({ affected: 3 })
          .mockResolvedValueOnce({ affected: 1 });
      });

      afterEach(() => {
        restoreWorker(originalWorker);
      });

      it('should delete revoked and expired refresh tokens', async () => {
        await service.cleanupExpiredTokens();

        expect(
          mockRefreshTokenRepository.createQueryBuilder,
        ).toHaveBeenCalled();
        const [whereClause, params] = mockQueryBuilder.where.mock.calls[0];
        expect(whereClause).toContain('revoked');
        expect(whereClause).toContain('"expiresAt"');
        expect(params).toMatchObject({ revoked: true, now: expect.any(Date) });
      });

      it('should delete used and expired password resets', async () => {
        await service.cleanupExpiredTokens();

        expect(
          mockPasswordResetRepository.createQueryBuilder,
        ).toHaveBeenCalled();
        const [whereClause, params] = mockQueryBuilder.where.mock.calls[1];
        expect(whereClause).toContain('used');
        expect(whereClause).toContain('"expiresAt"');
        expect(params).toMatchObject({ used: true, now: expect.any(Date) });
      });

      it('should not throw when a query fails', async () => {
        mockQueryBuilder.execute.mockReset();
        mockQueryBuilder.execute.mockRejectedValueOnce(new Error('DB failure'));

        await expect(service.cleanupExpiredTokens()).resolves.toBeUndefined();
      });

      it('should still clean up password resets when refresh token cleanup fails', async () => {
        mockQueryBuilder.execute.mockReset();
        mockQueryBuilder.execute
          .mockRejectedValueOnce(new Error('refresh token DB failure'))
          .mockResolvedValueOnce({ affected: 2 });

        await expect(service.cleanupExpiredTokens()).resolves.toBeUndefined();
        // Both query builders should have been invoked despite the first failure
        expect(
          mockRefreshTokenRepository.createQueryBuilder,
        ).toHaveBeenCalled();
        expect(
          mockPasswordResetRepository.createQueryBuilder,
        ).toHaveBeenCalled();
      });
    });
  });
});
