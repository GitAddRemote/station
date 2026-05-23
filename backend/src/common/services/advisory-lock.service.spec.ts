import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AdvisoryLockService } from './advisory-lock.service';

describe('AdvisoryLockService', () => {
  let service: AdvisoryLockService;
  let mockDataSource: { query: jest.Mock };

  beforeEach(async () => {
    mockDataSource = { query: jest.fn() };

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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('withLock()', () => {
    it('calls fn, releases lock in finally, and returns fn result when lock is acquired', async () => {
      // Lock acquired
      mockDataSource.query
        .mockResolvedValueOnce([{ acquired: true }]) // pg_try_advisory_lock
        .mockResolvedValueOnce([{}]); // pg_advisory_unlock

      const fn = jest.fn().mockResolvedValue('result');

      const result = await service.withLock('test-key', fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);

      // Lock acquired call
      expect(mockDataSource.query).toHaveBeenNthCalledWith(
        1,
        `SELECT pg_try_advisory_lock(hashtext($1)) AS acquired`,
        ['test-key'],
      );

      // Lock release call
      expect(mockDataSource.query).toHaveBeenNthCalledWith(
        2,
        `SELECT pg_advisory_unlock(hashtext($1))`,
        ['test-key'],
      );
    });

    it('throws ConflictException with correct message when lock is not acquired', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ acquired: false }]);

      const fn = jest.fn();

      await expect(service.withLock('busy-key', fn)).rejects.toThrow(
        new ConflictException(`Lock 'busy-key' already held`),
      );

      // fn must NOT be called
      expect(fn).not.toHaveBeenCalled();

      // Unlock must NOT be called
      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
    });

    it('still releases lock in finally even when fn throws', async () => {
      // Lock acquired
      mockDataSource.query
        .mockResolvedValueOnce([{ acquired: true }]) // pg_try_advisory_lock
        .mockResolvedValueOnce([{}]); // pg_advisory_unlock

      const error = new Error('fn blew up');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(service.withLock('exploding-key', fn)).rejects.toThrow(
        'fn blew up',
      );

      // fn was called
      expect(fn).toHaveBeenCalledTimes(1);

      // Lock was still released
      expect(mockDataSource.query).toHaveBeenCalledTimes(2);
      expect(mockDataSource.query).toHaveBeenNthCalledWith(
        2,
        `SELECT pg_advisory_unlock(hashtext($1))`,
        ['exploding-key'],
      );
    });
  });
});
