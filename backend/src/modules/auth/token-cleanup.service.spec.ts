import { Test, TestingModule } from '@nestjs/testing';
import { TokenCleanupService } from './token-cleanup.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RefreshToken } from './refresh-token.entity';
import { PasswordReset } from './password-reset.entity';

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
      ],
    }).compile();

    service = module.get<TokenCleanupService>(TokenCleanupService);
    jest.clearAllMocks();
  });

  describe('cleanupExpiredTokens', () => {
    it('should return early in test environment without touching the database', async () => {
      // Jest always sets NODE_ENV=test, so no override needed
      await service.cleanupExpiredTokens();

      expect(
        mockRefreshTokenRepository.createQueryBuilder,
      ).not.toHaveBeenCalled();
      expect(
        mockPasswordResetRepository.createQueryBuilder,
      ).not.toHaveBeenCalled();
    });

    describe('in a non-test environment', () => {
      const originalEnv = process.env['NODE_ENV'];

      beforeEach(() => {
        process.env['NODE_ENV'] = 'development';
        // Re-wire execute to return distinct values per call
        mockQueryBuilder.execute
          .mockResolvedValueOnce({ affected: 3 }) // refresh tokens
          .mockResolvedValueOnce({ affected: 1 }); // password resets
      });

      afterEach(() => {
        process.env['NODE_ENV'] = originalEnv;
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
    });
  });
});
