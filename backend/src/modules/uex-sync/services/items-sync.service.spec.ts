import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { getLoggerToken } from 'nestjs-pino';
import { ItemsSyncService } from './items-sync.service';
import { UexItem } from '../../uex/entities/uex-item.entity';
import { UexCategory } from '../../uex/entities/uex-category.entity';
import { UexCompany } from '../../uex/entities/uex-company.entity';
import { UexSyncService } from '../uex-sync.service';
import { SystemUserService } from '../../users/system-user.service';
import { UEXItemsClient } from '../clients/uex-items.client';
import {
  RateLimitException,
  UEXServerException,
} from '../exceptions/uex-exceptions';

describe('ItemsSyncService', () => {
  let service: ItemsSyncService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockItemRepository: Record<string, any>;
  let mockCategoryRepository: Record<string, jest.Mock>;
  let mockCompanyRepository: Record<string, jest.Mock>;
  let mockUexClient: Record<string, jest.Mock>;
  let mockSyncService: Record<string, jest.Mock>;
  let mockSystemUserService: Record<string, jest.Mock>;

  // Shared query builder mock — reused and re-configured per test
  let mockQueryBuilder: Record<string, jest.Mock>;

  beforeEach(async () => {
    // Query builder used for INSERT ... ON CONFLICT (upsert) and UPDATE (soft-delete)
    mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      onConflict: jest.fn().mockReturnThis(),
      orUpdate: jest.fn().mockReturnThis(),
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

    // Query builder used for the pre-load SELECT (called with alias 'item')
    const mockSelectQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]), // default: no existing rows
    };

    mockItemRepository = {
      find: jest.fn(),
      // Return select QB when called with an alias, write QB otherwise
      createQueryBuilder: jest
        .fn()
        .mockImplementation((alias?: string) =>
          alias ? mockSelectQueryBuilder : mockQueryBuilder,
        ),
      _selectQueryBuilder: mockSelectQueryBuilder, // expose for per-test override
    };

    mockCategoryRepository = {
      find: jest.fn(),
    };

    mockCompanyRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockUexClient = {
      fetchItemsByCategory: jest.fn(),
    };

    mockSyncService = {
      acquireSyncLock: jest.fn(),
      releaseSyncLock: jest.fn(),
      shouldUseDeltaSync: jest.fn(),
      recordSyncSuccess: jest.fn(),
      recordSyncFailure: jest.fn(),
    };

    mockSystemUserService = {
      getSystemUserId: jest.fn().mockReturnValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsSyncService,
        {
          provide: getLoggerToken(ItemsSyncService.name),
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UexItem),
          useValue: mockItemRepository,
        },
        {
          provide: getRepositoryToken(UexCategory),
          useValue: mockCategoryRepository,
        },
        {
          provide: getRepositoryToken(UexCompany),
          useValue: mockCompanyRepository,
        },
        {
          provide: UEXItemsClient,
          useValue: mockUexClient,
        },
        {
          provide: UexSyncService,
          useValue: mockSyncService,
        },
        {
          provide: SystemUserService,
          useValue: mockSystemUserService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: unknown) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<ItemsSyncService>(ItemsSyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncItems', () => {
    it('should bulk upsert new items and report created count', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];

      const mockItems = [
        {
          id: 100,
          id_category: 1,
          id_company: 5,
          name: 'Test Weapon',
          section: 'Equipment',
          category: 'Weapons',
          company_name: 'Aegis Dynamics',
          size: 'S1',
          uuid: 'test-uuid-1',
          weight_scu: 1.5,
          kind: 'item',
          is_buyable: true,
          is_sellable: false,
          date_modified: '2025-01-01T00:00:00Z',
        },
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue(mockItems);

      // Simulate 1 inserted row
      mockQueryBuilder.execute.mockResolvedValue({
        identifiers: [{ id: 1 }],
        raw: [{ id: 1 }],
        affected: 1,
      });

      const result = await service.syncItems();

      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(mockSyncService.acquireSyncLock).toHaveBeenCalledWith('items');
      expect(mockSyncService.releaseSyncLock).toHaveBeenCalledWith('items');
      expect(mockSyncService.recordSyncSuccess).toHaveBeenCalled();
      // Bulk upsert should have been called (insert path)
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(mockQueryBuilder.onConflict).toHaveBeenCalled();
    });

    it('should bulk upsert existing items and report updated count', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];

      const mockItems = [
        {
          id: 100,
          id_category: 1,
          name: 'Updated Weapon',
          date_modified: '2025-01-02T00:00:00Z',
        },
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: true,
        reason: 'DELTA_ELIGIBLE',
        lastSyncAt: new Date('2025-01-01T00:00:00Z'),
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue(mockItems);

      // Pre-load returns the item as already existing → counted as updated
      mockItemRepository._selectQueryBuilder.getMany.mockResolvedValue([
        { uexId: 100 },
      ]);

      const result = await service.syncItems();

      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(mockSyncService.recordSyncSuccess).toHaveBeenCalledWith(
        'items',
        expect.objectContaining({
          syncMode: 'delta',
          recordsUpdated: 1,
        }),
      );
    });

    it('should skip sync if no categories found', async () => {
      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue([]);

      const result = await service.syncItems();

      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(mockUexClient.fetchItemsByCategory).not.toHaveBeenCalled();
    });

    it('should handle rate limit by pausing and retrying, not aborting the category', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];
      const mockItems = [{ id: 100, id_category: 1, name: 'Weapon' }];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);

      // Rate limit on first attempt, succeed on second
      mockUexClient.fetchItemsByCategory
        .mockRejectedValueOnce(new RateLimitException('Rate limit exceeded'))
        .mockResolvedValueOnce(mockItems);

      mockQueryBuilder.execute.mockResolvedValue({
        identifiers: [{ id: 1 }],
        raw: [{ id: 1 }],
        affected: 1,
      });

      const result = await service.syncItems();

      expect(result.created).toBe(1);
      expect(mockUexClient.fetchItemsByCategory).toHaveBeenCalledTimes(2);
      expect(mockSyncService.recordSyncSuccess).toHaveBeenCalled();
    });

    it('should throw and record failure when a full sync has a permanently failing category', async () => {
      const mockCategories = [
        { uexId: 1, name: 'Weapons' },
        { uexId: 2, name: 'Armor' },
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);

      // Weapons exhausts all retries; Armor would succeed but we never reach it
      mockUexClient.fetchItemsByCategory
        .mockRejectedValueOnce(new RateLimitException('RL'))
        .mockRejectedValueOnce(new RateLimitException('RL'))
        .mockRejectedValueOnce(new RateLimitException('RL'))
        .mockResolvedValueOnce([{ id: 200, id_category: 2, name: 'Armor' }]);

      mockQueryBuilder.execute.mockResolvedValue({
        identifiers: [],
        raw: [],
        affected: 0,
      });

      await expect(service.syncItems()).rejects.toThrow(/Full sync incomplete/);

      expect(mockSyncService.recordSyncFailure).toHaveBeenCalled();
      expect(mockSyncService.recordSyncSuccess).not.toHaveBeenCalled();
      expect(mockSyncService.releaseSyncLock).toHaveBeenCalled();
    }, 15000);

    it('should retry on server errors with exponential backoff', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];
      const mockItems = [{ id: 100, id_category: 1, name: 'Test Item' }];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);

      mockUexClient.fetchItemsByCategory
        .mockRejectedValueOnce(new UEXServerException('Server error'))
        .mockRejectedValueOnce(new UEXServerException('Server error'))
        .mockResolvedValueOnce(mockItems);

      mockQueryBuilder.execute.mockResolvedValue({
        identifiers: [{ id: 1 }],
        raw: [{ id: 1 }],
        affected: 1,
      });

      const result = await service.syncItems();

      expect(result.created).toBe(1);
      expect(mockUexClient.fetchItemsByCategory).toHaveBeenCalledTimes(3);
    });

    it('should split large item lists into multiple bulk upsert batches', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];

      const mockItems = Array.from({ length: 250 }, (_, i) => ({
        id: i + 1,
        id_category: 1,
        name: `Item ${i + 1}`,
      }));

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue(mockItems);

      mockQueryBuilder.execute.mockResolvedValue({
        identifiers: [],
        raw: [],
        affected: 0,
      });

      await service.syncItems();

      // 250 items at batch size 100 → 3 upsert execute() calls
      // + 1 soft-delete update execute() call = 4 total
      expect(mockQueryBuilder.execute).toHaveBeenCalledTimes(4);
      // Pre-load SELECT called once per batch (3 times)
      expect(
        mockItemRepository._selectQueryBuilder.getMany,
      ).toHaveBeenCalledTimes(3);
    });

    it('should process all categories concurrently within chunk size', async () => {
      const mockCategories = Array.from({ length: 5 }, (_, i) => ({
        uexId: i + 1,
        name: `Category ${i + 1}`,
      }));

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue([]);

      await service.syncItems();

      expect(mockUexClient.fetchItemsByCategory).toHaveBeenCalledTimes(5);
    });

    it('should throw and record failure when a full sync has category errors', async () => {
      const mockCategories = [
        { uexId: 1, name: 'Category 1' },
        { uexId: 2, name: 'Category 2' },
        { uexId: 3, name: 'Category 3' },
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);

      mockUexClient.fetchItemsByCategory
        .mockResolvedValueOnce([{ id: 10, id_category: 1, name: 'Item A' }])
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([{ id: 30, id_category: 3, name: 'Item C' }]);

      mockQueryBuilder.execute.mockResolvedValue({
        identifiers: [{ id: 1 }],
        raw: [{ id: 1 }],
        affected: 1,
      });

      await expect(service.syncItems()).rejects.toThrow(/Full sync incomplete/);

      // Soft-delete must not have been called
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
      // Failure recorded — neither lastSuccessfulSyncAt nor lastFullSyncAt advance
      expect(mockSyncService.recordSyncFailure).toHaveBeenCalled();
      expect(mockSyncService.recordSyncSuccess).not.toHaveBeenCalled();
    });

    it('should parse weight_scu correctly from both string and number', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];

      const mockItems = [
        { id: 100, id_category: 1, name: 'Heavy Item', weight_scu: '15.75' },
        { id: 101, id_category: 1, name: 'Light Item', weight_scu: 2.5 },
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue(mockItems);

      const capturedValues: unknown[] = [];
      mockQueryBuilder.values.mockImplementation((rows: unknown[]) => {
        capturedValues.push(...rows);
        return mockQueryBuilder;
      });

      mockQueryBuilder.execute.mockResolvedValue({
        identifiers: [],
        raw: [],
        affected: 0,
      });

      await service.syncItems();

      const rows = capturedValues as Array<Record<string, unknown>>;
      expect(rows[0].weightScu).toBe(15.75);
      expect(rows[1].weightScu).toBe(2.5);
    });

    it('should use item.id_category from API response, not the loop category ID', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];

      const mockItems = [
        { id: 100, id_category: 7, name: 'Cross-listed Item' },
        { id: 101, id_category: 1, name: 'Normal Item' },
        { id: 102, name: 'No Category Field Item' }, // id_category absent
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue(mockItems);

      const capturedValues: unknown[] = [];
      mockQueryBuilder.values.mockImplementation((rows: unknown[]) => {
        capturedValues.push(...rows);
        return mockQueryBuilder;
      });

      mockQueryBuilder.execute.mockResolvedValue({
        identifiers: [],
        raw: [],
        affected: 0,
      });

      const loggerWarn = jest.spyOn(
        (service as unknown as { logger: { warn: jest.Mock } }).logger,
        'warn',
      );

      await service.syncItems();

      const rows = capturedValues as Array<Record<string, unknown>>;
      expect(rows[0].idCategory).toBe(7); // uses API field
      expect(rows[1].idCategory).toBe(1); // matches loop, no change
      expect(rows[2].idCategory).toBe(1); // fallback to loop categoryId
      expect(loggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('id_category=7'),
      );
    });

    it('should correctly set isCommodity from kind field', async () => {
      const mockCategories = [{ uexId: 1, name: 'Commodities' }];

      const mockItems = [
        {
          id: 100,
          id_category: 1,
          name: 'Agricultural Supplies',
          kind: 'commodity',
        },
        { id: 101, id_category: 1, name: 'Regular Item', kind: 'item' },
        { id: 102, id_category: 1, name: 'Delta Item' }, // kind absent — must not default to false
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue(mockItems);

      const capturedValues: unknown[] = [];
      mockQueryBuilder.values.mockImplementation((rows: unknown[]) => {
        capturedValues.push(...rows);
        return mockQueryBuilder;
      });

      mockQueryBuilder.execute.mockResolvedValue({
        identifiers: [],
        raw: [],
        affected: 0,
      });

      await service.syncItems();

      const rows = capturedValues as Array<Record<string, unknown>>;
      expect(rows[0].isCommodity).toBe(true);
      expect(rows[1].isCommodity).toBe(false);
      // kind absent → null (not undefined/DEFAULT) so COALESCE preserves the stored DB value
      expect(rows[2].isCommodity).toBeNull();
      expect(rows[2].isBuyable).toBeNull();
      expect(rows[2].isSellable).toBeNull();
    });

    it('should not pause between category chunks when no rate limit is hit', async () => {
      const mockCategories = Array.from({ length: 12 }, (_, i) => ({
        uexId: i + 1,
        name: `Category ${i + 1}`,
      }));

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue([]);

      const start = Date.now();
      await service.syncItems();
      const elapsed = Date.now() - start;

      // With no rate limit, 12 categories across 2 chunks should complete
      // well under 1 second (old code would have slept 2000ms between chunks)
      expect(elapsed).toBeLessThan(1000);
      expect(mockUexClient.fetchItemsByCategory).toHaveBeenCalledTimes(12);
    });
  });

  describe('COALESCE conflict update', () => {
    it('should use COALESCE for nullable optional fields so partial API responses do not wipe existing values', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: true,
        reason: 'DELTA_ELIGIBLE',
        lastSyncAt: new Date('2025-01-01T00:00:00Z'),
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue([
        // Partial delta response — only id, id_category, name, date_modified present
        {
          id: 100,
          id_category: 1,
          name: 'Updated Item',
          date_modified: '2025-06-01T00:00:00Z',
        },
      ]);

      await service.syncItems();

      const conflictSql: string = mockQueryBuilder.onConflict.mock
        .calls[0][0] as string;

      // date_modified must be refreshed on every conflict update
      expect(conflictSql).toMatch(/date_modified\s*=\s*NOW\(\)/);
      // All optional fields must use COALESCE so omitted fields don't overwrite stored values
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.is_commodity/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.is_buyable/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.is_sellable/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.section/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.category/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.company_name/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.size/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.weight_scu/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.star_citizen_uuid/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.id_company/);
      expect(conflictSql).toMatch(/COALESCE\(EXCLUDED\.uex_date_modified/);
    });
  });

  describe('upsert reactivation', () => {
    it('should include active in conflict update columns so reappearing items are reactivated', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue([
        { id: 10, id_category: 1, name: 'Reappeared Item' },
      ]);

      await service.syncItems();

      // onConflict SQL must include 'active' so a previously soft-deleted row
      // (active=false, deleted=true) is fully reactivated on re-sync
      const conflictSql: string = mockQueryBuilder.onConflict.mock
        .calls[0][0] as string;
      expect(conflictSql).toMatch(/\bactive\b/);
      expect(conflictSql).toMatch(/\bdeleted\b/);
    });
  });

  describe('full sync soft-delete', () => {
    it('should mark items not seen in full sync as deleted', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue([
        { id: 10, id_category: 1, name: 'Current Item' },
      ]);

      // First execute() is the bulk upsert; second is the soft-delete update
      mockQueryBuilder.execute
        .mockResolvedValueOnce({
          identifiers: [{ id: 1 }],
          raw: [{}],
          affected: 1,
        })
        .mockResolvedValueOnce({ affected: 3 });

      const result = await service.syncItems();

      expect(result.deleted).toBe(3);
      // update() path called for soft-delete
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({ deleted: true, active: false }),
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'uex_id NOT IN (:...ids)',
        expect.objectContaining({ ids: [10] }),
      );
    });

    it('should skip soft-delete when no items were seen (guards against wiping all data)', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue([]);

      mockQueryBuilder.execute.mockResolvedValue({
        identifiers: [],
        raw: [],
        affected: 0,
      });

      const result = await service.syncItems();

      expect(result.deleted).toBe(0);
      // update() for soft-delete should NOT have been called
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it('should not run soft-delete on delta sync', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: true,
        reason: 'DELTA_ELIGIBLE',
        lastSyncAt: new Date('2025-01-01T00:00:00Z'),
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue([
        { id: 10, id_category: 1, name: 'Item' },
      ]);

      mockQueryBuilder.execute.mockResolvedValue({
        identifiers: [],
        raw: [],
        affected: 0,
      });

      const result = await service.syncItems();

      expect(result.deleted).toBe(0);
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });
  });
});
