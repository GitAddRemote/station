import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AdvisoryLockService } from './advisory-lock.service';

describe('AdvisoryLockService', () => {
  let service: AdvisoryLockService;
  let mockQr: {
    connect: jest.Mock;
    query: jest.Mock;
    release: jest.Mock;
  };
  let mockDataSource: { createQueryRunner: jest.Mock };

  beforeEach(async () => {
    mockQr = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(),
      release: jest.fn().mockResolvedValue(undefined),
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQr),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvisoryLockService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AdvisoryLockService>(AdvisoryLockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('withLock', () => {
    it('acquires lock, runs fn, releases lock and QueryRunner', async () => {
      mockQr.query
        .mockResolvedValueOnce([{ acquired: true }]) // pg_try_advisory_lock
        .mockResolvedValueOnce([{}]); // pg_advisory_unlock

      const fn = jest.fn().mockResolvedValue('result');

      const result = await service.withLock('test-lock', fn);

      expect(result).toBe('result');
      expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(1);

      // Both queries go through the same QueryRunner
      expect(mockQr.connect).toHaveBeenCalledTimes(1);
      expect(mockQr.query).toHaveBeenNthCalledWith(
        1,
        `SELECT pg_try_advisory_lock(hashtext($1)) AS acquired`,
        ['test-lock'],
      );
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mockQr.query).toHaveBeenNthCalledWith(
        2,
        `SELECT pg_advisory_unlock(hashtext($1))`,
        ['test-lock'],
      );
      expect(mockQr.release).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when lock is not acquired; fn not called; runner still released', async () => {
      mockQr.query.mockResolvedValueOnce([{ acquired: false }]);

      const fn = jest.fn();

      await expect(service.withLock('test-lock', fn)).rejects.toThrow(
        ConflictException,
      );

      expect(fn).not.toHaveBeenCalled();
      // unlock query should NOT have been called
      expect(mockQr.query).not.toHaveBeenCalledWith(
        `SELECT pg_advisory_unlock(hashtext($1))`,
        expect.anything(),
      );
      // runner must still be released
      expect(mockQr.release).toHaveBeenCalled();
    });

    it('releases lock and runner even when fn throws', async () => {
      mockQr.query
        .mockResolvedValueOnce([{ acquired: true }]) // pg_try_advisory_lock
        .mockResolvedValueOnce([{}]); // pg_advisory_unlock

      const error = new Error('fn blew up');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(service.withLock('test-lock', fn)).rejects.toThrow(
        'fn blew up',
      );

      // unlock still called
      expect(mockQr.query).toHaveBeenCalledWith(
        `SELECT pg_advisory_unlock(hashtext($1))`,
        ['test-lock'],
      );
      // runner still released
      expect(mockQr.release).toHaveBeenCalledTimes(1);
    });
  });
});
