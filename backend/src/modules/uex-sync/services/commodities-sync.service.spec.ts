import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { getLoggerToken } from 'nestjs-pino';
import { CommoditiesSyncService } from './commodities-sync.service';
import { UexCommodity } from '../../uex/entities/uex-commodity.entity';
import { UexSyncService } from '../uex-sync.service';
import { SystemUserService } from '../../users/system-user.service';
import { UEXCommoditiesClient } from '../clients/uex-commodities.client';
import {
  RateLimitException,
  UEXServerException,
} from '../exceptions/uex-exceptions';

describe('CommoditiesSyncService', () => {
  let service: CommoditiesSyncService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCommodityRepository: Record<string, any>;
  let mockUexClient: Record<string, jest.Mock>;
  let mockSyncService: Record<string, jest.Mock>;

  let mockQueryBuilder: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      onConflict: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({
        identifiers: [],
        raw: [],
        affected: 0,
      }),
    };

    const mockSelectQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockCommodityRepository = {
      createQueryBuilder: jest
        .fn()
        .mockImplementation((alias?: string) =>
          alias ? mockSelectQueryBuilder : mockQueryBuilder,
        ),
      _selectQueryBuilder: mockSelectQueryBuilder,
    };

    mockUexClient = {
      fetchCommodities: jest.fn(),
    };

    mockSyncService = {
      acquireSyncLock: jest.fn(),
      releaseSyncLock: jest.fn(),
      shouldUseDeltaSync: jest.fn(),
      recordSyncSuccess: jest.fn(),
      recordSyncFailure: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommoditiesSyncService,
        {
          provide: getLoggerToken(CommoditiesSyncService.name),
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UexCommodity),
          useValue: mockCommodityRepository,
        },
        {
          provide: UEXCommoditiesClient,
          useValue: mockUexClient,
        },
        {
          provide: UexSyncService,
          useValue: mockSyncService,
        },
        {
          provide: SystemUserService,
          useValue: { getSystemUserId: jest.fn().mockReturnValue(1) },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: unknown) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<CommoditiesSyncService>(CommoditiesSyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncCommodities', () => {
    it('should bulk upsert new commodities and report created count', async () => {
      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockUexClient.fetchCommodities.mockResolvedValue([
        {
          id: 1,
          name: 'Agricultural Supplies',
          code: 'AASR',
          is_buyable: true,
          is_sellable: true,
          price_buy: 1.5,
          price_sell: 1.8,
        },
      ]);

      const result = await service.syncCommodities();

      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.syncMode).toBe('full');
      expect(mockSyncService.acquireSyncLock).toHaveBeenCalledWith(
        'commodities',
      );
      expect(mockSyncService.releaseSyncLock).toHaveBeenCalledWith(
        'commodities',
      );
      expect(mockSyncService.recordSyncSuccess).toHaveBeenCalledWith(
        'commodities',
        expect.objectContaining({ syncMode: 'full', recordsCreated: 1 }),
      );
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(mockQueryBuilder.onConflict).toHaveBeenCalled();
    });

    it('should count existing commodities as updated using pre-load', async () => {
      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: true,
        reason: 'DELTA_ELIGIBLE',
        lastSyncAt: new Date('2025-01-01T00:00:00Z'),
      });

      mockUexClient.fetchCommodities.mockResolvedValue([
        { id: 42, name: 'Laranite', is_buyable: true },
      ]);

      mockCommodityRepository._selectQueryBuilder.getMany.mockResolvedValue([
        { uexId: 42 },
      ]);

      const result = await service.syncCommodities();

      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(result.syncMode).toBe('delta');
    });

    it('should pass date_modified filter when using delta sync', async () => {
      const lastSyncAt = new Date('2025-06-01T00:00:00Z');

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: true,
        reason: 'DELTA_ELIGIBLE',
        lastSyncAt,
      });

      mockUexClient.fetchCommodities.mockResolvedValue([]);

      await service.syncCommodities();

      expect(mockUexClient.fetchCommodities).toHaveBeenCalledWith({
        date_modified: lastSyncAt,
      });
    });

    it('should perform soft-delete on full sync using seen-set', async () => {
      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockUexClient.fetchCommodities.mockResolvedValue([
        { id: 10, name: 'Titanium' },
      ]);

      mockQueryBuilder.execute
        .mockResolvedValueOnce({
          identifiers: [{ id: 1 }],
          raw: [],
          affected: 1,
        })
        .mockResolvedValueOnce({ affected: 5 });

      const result = await service.syncCommodities();

      expect(result.deleted).toBe(5);
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({ deleted: true, active: false }),
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'uex_id NOT IN (:...ids)',
        expect.objectContaining({ ids: [10] }),
      );
    });

    it('should skip soft-delete on delta sync', async () => {
      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: true,
        reason: 'DELTA_ELIGIBLE',
        lastSyncAt: new Date(),
      });

      mockUexClient.fetchCommodities.mockResolvedValue([
        { id: 10, name: 'Titanium' },
      ]);

      const result = await service.syncCommodities();

      expect(result.deleted).toBe(0);
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it('should skip soft-delete when no commodities were seen (guards against wiping all data)', async () => {
      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockUexClient.fetchCommodities.mockResolvedValue([]);

      const result = await service.syncCommodities();

      expect(result.deleted).toBe(0);
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it('should abort on rate limit without retrying', async () => {
      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockUexClient.fetchCommodities.mockRejectedValue(
        new RateLimitException('Rate limited'),
      );

      await expect(service.syncCommodities()).rejects.toBeInstanceOf(
        RateLimitException,
      );

      expect(mockUexClient.fetchCommodities).toHaveBeenCalledTimes(1);
      expect(mockSyncService.recordSyncFailure).toHaveBeenCalled();
      expect(mockSyncService.recordSyncSuccess).not.toHaveBeenCalled();
    });

    it('should retry on server errors with exponential backoff', async () => {
      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockUexClient.fetchCommodities
        .mockRejectedValueOnce(new UEXServerException('Server error'))
        .mockRejectedValueOnce(new UEXServerException('Server error'))
        .mockResolvedValueOnce([{ id: 1, name: 'Titanium' }]);

      const result = await service.syncCommodities();

      expect(result.created).toBe(1);
      expect(mockUexClient.fetchCommodities).toHaveBeenCalledTimes(3);
    });

    it('should split large commodity lists into multiple batches', async () => {
      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      const commodities = Array.from({ length: 250 }, (_, i) => ({
        id: i + 1,
        name: `Commodity ${i + 1}`,
      }));

      mockUexClient.fetchCommodities.mockResolvedValue(commodities);

      await service.syncCommodities();

      // 250 items / 100 batch size = 3 upsert executes + 1 soft-delete = 4
      expect(mockQueryBuilder.execute).toHaveBeenCalledTimes(4);
      expect(
        mockCommodityRepository._selectQueryBuilder.getMany,
      ).toHaveBeenCalledTimes(3);
    });

    it('should record sync failure and rethrow on unexpected error', async () => {
      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      const boom = new Error('DB exploded');
      mockUexClient.fetchCommodities.mockRejectedValue(boom);

      await expect(service.syncCommodities()).rejects.toThrow('DB exploded');

      expect(mockSyncService.recordSyncFailure).toHaveBeenCalled();
      expect(mockSyncService.recordSyncSuccess).not.toHaveBeenCalled();
      expect(mockSyncService.releaseSyncLock).toHaveBeenCalled();
    });

    it('should use COALESCE for all optional fields in conflict SQL', async () => {
      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockUexClient.fetchCommodities.mockResolvedValue([
        { id: 1, name: 'Agricium' },
      ]);

      await service.syncCommodities();

      const conflictSql: string = mockQueryBuilder.onConflict.mock
        .calls[0][0] as string;

      expect(conflictSql).toMatch(/date_modified\s*=\s*NOW\(\)/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.id_category/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.code/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.is_buyable/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.is_sellable/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.is_illegal/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.price_buy/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.price_sell/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.uex_date_modified/);
    });

    it('should convert unix timestamps to Date objects', async () => {
      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      const unixModified = 1700100000;

      mockUexClient.fetchCommodities.mockResolvedValue([
        {
          id: 1,
          name: 'Titanium',
          date_modified: unixModified,
        },
      ]);

      const capturedValues: unknown[] = [];
      mockQueryBuilder.values.mockImplementation((rows: unknown[]) => {
        capturedValues.push(...rows);
        return mockQueryBuilder;
      });

      await service.syncCommodities();

      const row = (capturedValues as Array<Record<string, unknown>>)[0];
      expect(row.uexDateModified).toEqual(new Date(unixModified * 1000));
    });
  });
});
