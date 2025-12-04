import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { CategoriesSyncService } from './categories-sync.service';
import { UexCategory } from '../../uex/entities/uex-category.entity';
import { UexSyncService } from '../uex-sync.service';
import { SystemUserService } from '../../users/system-user.service';
import { UEXCategoriesClient } from '../clients/uex-categories.client';
import {
  RateLimitException,
  UEXServerException,
} from '../exceptions/uex-exceptions';

describe('CategoriesSyncService', () => {
  let service: CategoriesSyncService;
  let mockCategoryRepository: any;
  let mockUexClient: any;
  let mockSyncService: any;
  let mockSystemUserService: any;

  beforeEach(async () => {
    mockCategoryRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      manager: {
        transaction: jest.fn(),
      },
    };

    mockUexClient = {
      fetchCategories: jest.fn(),
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
        CategoriesSyncService,
        {
          provide: getRepositoryToken(UexCategory),
          useValue: mockCategoryRepository,
        },
        {
          provide: UEXCategoriesClient,
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

    service = module.get<CategoriesSyncService>(CategoriesSyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncCategories', () => {
    it('should successfully sync new categories', async () => {
      const mockCategories = [
        {
          id: 1,
          type: 'item',
          section: 'Equipment',
          name: 'Weapons',
          is_game_related: true,
          date_added: '2025-01-01T00:00:00Z',
          date_modified: '2025-01-01T00:00:00Z',
        },
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockUexClient.fetchCategories.mockResolvedValue(mockCategories);

      mockCategoryRepository.manager.transaction.mockImplementation(
        async (callback: any) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue({ id: 1 }),
            update: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              update: jest.fn().mockReturnThis(),
              set: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              execute: jest.fn().mockResolvedValue({ affected: 0 }),
            }),
          };
          return await callback(mockManager);
        },
      );

      const result = await service.syncCategories();

      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.deleted).toBe(0);
      expect(mockSyncService.acquireSyncLock).toHaveBeenCalledWith(
        'categories',
      );
      expect(mockSyncService.releaseSyncLock).toHaveBeenCalledWith(
        'categories',
      );
      expect(mockSyncService.recordSyncSuccess).toHaveBeenCalled();
    });

    it('should update existing categories', async () => {
      const mockCategories = [
        {
          id: 1,
          type: 'item',
          section: 'Equipment',
          name: 'Weapons Updated',
          is_game_related: true,
          date_modified: '2025-01-02T00:00:00Z',
        },
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: true,
        reason: 'DELTA_ELIGIBLE',
        lastSyncAt: new Date('2025-01-01T00:00:00Z'),
      });

      mockUexClient.fetchCategories.mockResolvedValue(mockCategories);

      mockCategoryRepository.manager.transaction.mockImplementation(
        async (callback: any) => {
          const mockManager = {
            findOne: jest
              .fn()
              .mockResolvedValue({ id: 1, uexId: 1, name: 'Weapons' }),
            save: jest.fn(),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            createQueryBuilder: jest.fn().mockReturnValue({
              update: jest.fn().mockReturnThis(),
              set: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              execute: jest.fn().mockResolvedValue({ affected: 0 }),
            }),
          };
          return await callback(mockManager);
        },
      );

      const result = await service.syncCategories();

      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
    });

    it('should handle rate limit errors gracefully', async () => {
      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockUexClient.fetchCategories.mockRejectedValue(
        new RateLimitException('Rate limit exceeded'),
      );

      await expect(service.syncCategories()).rejects.toThrow(
        RateLimitException,
      );

      expect(mockSyncService.recordSyncFailure).toHaveBeenCalled();
      expect(mockSyncService.releaseSyncLock).toHaveBeenCalled();
    });

    it('should retry on transient server errors', async () => {
      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      mockUexClient.fetchCategories
        .mockRejectedValueOnce(new UEXServerException('500 error'))
        .mockResolvedValueOnce([
          {
            id: 1,
            type: 'item',
            name: 'Test',
            section: 'Test',
          },
        ]);

      mockCategoryRepository.manager.transaction.mockImplementation(
        async (callback: any) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue({ id: 1 }),
            createQueryBuilder: jest.fn().mockReturnValue({
              update: jest.fn().mockReturnThis(),
              set: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              execute: jest.fn().mockResolvedValue({ affected: 0 }),
            }),
          };
          return await callback(mockManager);
        },
      );

      const result = await service.syncCategories();

      expect(result.created).toBe(1);
      expect(mockUexClient.fetchCategories).toHaveBeenCalledTimes(2);
    });

    it('should mark missing categories as deleted in full sync', async () => {
      const mockCategories = [
        {
          id: 1,
          type: 'item',
          section: 'Equipment',
          name: 'Weapons',
        },
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FULL_SYNC_INTERVAL_EXCEEDED',
      });

      mockUexClient.fetchCategories.mockResolvedValue(mockCategories);

      mockCategoryRepository.manager.transaction.mockImplementation(
        async (callback: any) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue({ id: 1 }),
            createQueryBuilder: jest.fn().mockReturnValue({
              update: jest.fn().mockReturnThis(),
              set: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              execute: jest.fn().mockResolvedValue({ affected: 5 }),
            }),
          };
          return await callback(mockManager);
        },
      );

      const result = await service.syncCategories();

      expect(result.created).toBe(1);
      expect(result.deleted).toBe(5);
    });

    it('should not mark missing categories as deleted in delta sync', async () => {
      const mockCategories = [
        {
          id: 1,
          type: 'item',
          section: 'Equipment',
          name: 'Weapons',
        },
      ];

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: true,
        reason: 'DELTA_ELIGIBLE',
        lastSyncAt: new Date(),
      });

      mockUexClient.fetchCategories.mockResolvedValue(mockCategories);

      mockCategoryRepository.manager.transaction.mockImplementation(
        async (callback: any) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue({ id: 1 }),
            createQueryBuilder: jest.fn(),
          };
          return await callback(mockManager);
        },
      );

      const result = await service.syncCategories();

      expect(result.created).toBe(1);
      expect(result.deleted).toBe(0);
    });
  });
});
