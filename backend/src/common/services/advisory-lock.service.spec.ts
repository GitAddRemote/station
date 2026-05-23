import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AdvisoryLockService } from './advisory-lock.service';

describe('AdvisoryLockService', () => {
  let service: AdvisoryLockService;
  let mockQr: { connect: jest.Mock; query: jest.Mock; release: jest.Mock };
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('withLock()', () => {
    it('pins to one connection: connect + both queries + release on same QueryRunner', async () => {
      mockQr.query
        .mockResolvedValueOnce([{ acquired: true }])
        .mockResolvedValueOnce([{}]);

      const fn = jest.fn().mockResolvedValue('result');

      const result = await service.withLock('test-key', fn);

      expect(result).toBe('result');
      expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(mockQr.connect).toHaveBeenCalledTimes(1);
      expect(mockQr.query).toHaveBeenNthCalledWith(
        1,
        `SELECT pg_try_advisory_lock(hashtext($1)) AS acquired`,
        ['test-key'],
      );
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mockQr.query).toHaveBeenNthCalledWith(
        2,
        `SELECT pg_advisory_unlock(hashtext($1))`,
        ['test-key'],
      );
      expect(mockQr.release).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException and does not call fn or unlock when lock not acquired', async () => {
      mockQr.query.mockResolvedValueOnce([{ acquired: false }]);

      const fn = jest.fn();

      await expect(service.withLock('busy-key', fn)).rejects.toThrow(
        new ConflictException(`Lock 'busy-key' already held`),
      );

      expect(fn).not.toHaveBeenCalled();
      // Only the acquire query ran; unlock must NOT have been called
      expect(mockQr.query).toHaveBeenCalledTimes(1);
      // QueryRunner is still released (outer finally)
      expect(mockQr.release).toHaveBeenCalledTimes(1);
    });

    it('releases lock and QueryRunner in finally even when fn throws', async () => {
      mockQr.query
        .mockResolvedValueOnce([{ acquired: true }])
        .mockResolvedValueOnce([{}]);

      const fn = jest.fn().mockRejectedValue(new Error('fn blew up'));

      await expect(service.withLock('exploding-key', fn)).rejects.toThrow(
        'fn blew up',
      );

      expect(fn).toHaveBeenCalledTimes(1);
      expect(mockQr.query).toHaveBeenNthCalledWith(
        2,
        `SELECT pg_advisory_unlock(hashtext($1))`,
        ['exploding-key'],
      );
      expect(mockQr.release).toHaveBeenCalledTimes(1);
    });
  });
});
