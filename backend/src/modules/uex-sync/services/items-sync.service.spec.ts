import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ItemsSyncService } from './items-sync.service';
import { UexItem } from '../../uex/entities/uex-item.entity';
import { UexCategory } from '../../uex/entities/uex-category.entity';
import { UexSyncService } from '../uex-sync.service';
import { SystemUserService } from '../../users/system-user.service';
import { UEXItemsClient } from '../clients/uex-items.client';
import {
  RateLimitException,
  UEXServerException,
} from '../exceptions/uex-exceptions';

describe('ItemsSyncService', () => {
  let service: ItemsSyncService;
  let mockItemRepository: any;
  let mockCategoryRepository: any;
  let mockUexClient: any;
  let mockSyncService: any;
  let mockSystemUserService: any;

  beforeEach(async () => {
    mockItemRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      manager: {
        transaction: jest.fn(),
      },
    };

    mockCategoryRepository = {
      find: jest.fn(),
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
          provide: getRepositoryToken(UexItem),
          useValue: mockItemRepository,
        },
        {
          provide: getRepositoryToken(UexCategory),
          useValue: mockCategoryRepository,
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
            get: jest.fn((key: string, defaultValue: any) => defaultValue),
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
    it('should successfully sync new items', async () => {
      const mockCategories = [
        { uexId: 1, name: 'Weapons' },
        { uexId: 2, name: 'Armor' },
      ];

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
          date_added: '2025-01-01T00:00:00Z',
          date_modified: '2025-01-01T00:00:00Z',
        },
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue(mockItems);

      mockItemRepository.manager.transaction.mockImplementation(
        async (callback: any) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue({ id: 1 }),
            update: jest.fn(),
          };
          return await callback(mockManager);
        },
      );

      const result = await service.syncItems();

      expect(result.created).toBe(2); // 1 item per category
      expect(result.updated).toBe(0);
      expect(mockSyncService.acquireSyncLock).toHaveBeenCalledWith('items');
      expect(mockSyncService.releaseSyncLock).toHaveBeenCalledWith('items');
      expect(mockSyncService.recordSyncSuccess).toHaveBeenCalled();
    });

    it('should update existing items', async () => {
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

      mockItemRepository.manager.transaction.mockImplementation(
        async (callback: any) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue({ id: 1, uexId: 100 }),
            save: jest.fn(),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
          };
          return await callback(mockManager);
        },
      );

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

    it('should handle rate limit exceptions gracefully for individual categories', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockRejectedValue(
        new RateLimitException('Rate limit exceeded'),
      );

      const result = await service.syncItems();

      // Rate limit on one category doesn't fail the entire sync
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(mockSyncService.recordSyncSuccess).toHaveBeenCalled();
      expect(mockSyncService.releaseSyncLock).toHaveBeenCalled();
    });

    it('should retry on server errors', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];
      const mockItems = [
        {
          id: 100,
          id_category: 1,
          name: 'Test Item',
        },
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);

      // Fail twice, then succeed
      mockUexClient.fetchItemsByCategory
        .mockRejectedValueOnce(new UEXServerException('Server error'))
        .mockRejectedValueOnce(new UEXServerException('Server error'))
        .mockResolvedValueOnce(mockItems);

      mockItemRepository.manager.transaction.mockImplementation(
        async (callback: any) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue({ id: 1 }),
            update: jest.fn(),
          };
          return await callback(mockManager);
        },
      );

      const result = await service.syncItems();

      expect(result.created).toBe(1);
      expect(mockUexClient.fetchItemsByCategory).toHaveBeenCalledTimes(3);
    });

    it('should process items in batches', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];

      // Create 250 items (more than batch size of 100)
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

      let transactionCallCount = 0;

      mockItemRepository.manager.transaction.mockImplementation(
        async (callback: any) => {
          transactionCallCount++;
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue({ id: 1 }),
            update: jest.fn(),
          };
          return await callback(mockManager);
        },
      );

      const result = await service.syncItems();

      expect(result.created).toBe(250);
      // Should be called 3 times (100, 100, 50)
      expect(transactionCallCount).toBe(3);
    });

    it('should handle concurrent category processing', async () => {
      const mockCategories = [
        { uexId: 1, name: 'Category 1' },
        { uexId: 2, name: 'Category 2' },
        { uexId: 3, name: 'Category 3' },
        { uexId: 4, name: 'Category 4' },
        { uexId: 5, name: 'Category 5' },
      ];

      const mockItems = [
        {
          id: 100,
          id_category: 1,
          name: 'Test Item',
        },
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue(mockItems);

      mockItemRepository.manager.transaction.mockImplementation(
        async (callback: any) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue({ id: 1 }),
            update: jest.fn(),
          };
          return await callback(mockManager);
        },
      );

      const result = await service.syncItems();

      // Should process all 5 categories
      expect(result.created).toBe(5);
      expect(mockUexClient.fetchItemsByCategory).toHaveBeenCalledTimes(5);
    });

    it('should handle partial category failures gracefully', async () => {
      const mockCategories = [
        { uexId: 1, name: 'Category 1' },
        { uexId: 2, name: 'Category 2' },
        { uexId: 3, name: 'Category 3' },
      ];

      const mockItems = [
        {
          id: 100,
          name: 'Test Item',
        },
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);

      // Category 2 fails, others succeed
      mockUexClient.fetchItemsByCategory
        .mockResolvedValueOnce(mockItems) // Category 1
        .mockRejectedValueOnce(new Error('Network error')) // Category 2
        .mockResolvedValueOnce(mockItems); // Category 3

      mockItemRepository.manager.transaction.mockImplementation(
        async (callback: any) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue({ id: 1 }),
            update: jest.fn(),
          };
          return await callback(mockManager);
        },
      );

      const result = await service.syncItems();

      // Should successfully process 2 categories despite 1 failure
      expect(result.created).toBe(2);
    });

    it('should parse weight_scu correctly', async () => {
      const mockCategories = [{ uexId: 1, name: 'Weapons' }];

      const mockItems = [
        {
          id: 100,
          id_category: 1,
          name: 'Heavy Item',
          weight_scu: '15.75',
        },
        {
          id: 101,
          id_category: 1,
          name: 'Light Item',
          weight_scu: 2.5,
        },
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue(mockItems);

      const savedItems: any[] = [];

      mockItemRepository.manager.transaction.mockImplementation(
        async (callback: any) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockImplementation((entity: any, data: any) => {
              savedItems.push(data);
              return { id: 1 };
            }),
            update: jest.fn(),
          };
          return await callback(mockManager);
        },
      );

      await service.syncItems();

      expect(savedItems[0].weightScu).toBe(15.75);
      expect(savedItems[1].weightScu).toBe(2.5);
    });

    it('should correctly identify commodities', async () => {
      const mockCategories = [{ uexId: 1, name: 'Commodities' }];

      const mockItems = [
        {
          id: 100,
          id_category: 1,
          name: 'Agricultural Supplies',
          kind: 'commodity',
        },
        {
          id: 101,
          id_category: 1,
          name: 'Regular Item',
          kind: 'item',
        },
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockUexClient.fetchItemsByCategory.mockResolvedValue(mockItems);

      const savedItems: any[] = [];

      mockItemRepository.manager.transaction.mockImplementation(
        async (callback: any) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockImplementation((entity: any, data: any) => {
              savedItems.push(data);
              return { id: 1 };
            }),
            update: jest.fn(),
          };
          return await callback(mockManager);
        },
      );

      await service.syncItems();

      expect(savedItems[0].isCommodity).toBe(true);
      expect(savedItems[1].isCommodity).toBe(false);
    });
  });
});
