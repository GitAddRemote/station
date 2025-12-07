import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { UexSyncService } from './uex-sync.service';
import { UexSyncState, SyncStatus } from './uex-sync-state.entity';
import { UexSyncConfig } from './uex-sync-config.entity';

describe('UexSyncService', () => {
  let service: UexSyncService;
  let mockSyncStateRepository: any;
  let mockSyncConfigRepository: any;

  beforeEach(async () => {
    mockSyncStateRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      insert: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn(),
    };

    mockSyncConfigRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UexSyncService,
        {
          provide: getRepositoryToken(UexSyncState),
          useValue: mockSyncStateRepository,
        },
        {
          provide: getRepositoryToken(UexSyncConfig),
          useValue: mockSyncConfigRepository,
        },
      ],
    }).compile();

    service = module.get<UexSyncService>(UexSyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('acquireSyncLock', () => {
    it('should successfully acquire sync lock when no lock exists', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      mockSyncStateRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await expect(
        service.acquireSyncLock('categories'),
      ).resolves.not.toThrow();

      expect(mockSyncStateRepository.insert).toHaveBeenCalled();
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });

    it('should throw ConflictException when sync is already in progress', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };

      mockSyncStateRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await expect(service.acquireSyncLock('categories')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should acquire lock if previous sync timed out', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      mockSyncStateRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await expect(
        service.acquireSyncLock('categories'),
      ).resolves.not.toThrow();
    });
  });

  describe('releaseSyncLock', () => {
    it('should release sync lock', async () => {
      mockSyncStateRepository.update.mockResolvedValue({ affected: 1 });

      await expect(
        service.releaseSyncLock('categories'),
      ).resolves.not.toThrow();

      expect(mockSyncStateRepository.update).toHaveBeenCalledWith(
        { endpointName: 'categories' },
        { syncStatus: SyncStatus.IDLE },
      );
    });
  });

  describe('shouldUseDeltaSync', () => {
    it('should return false for FIRST_SYNC when no previous sync exists', async () => {
      const state: Partial<UexSyncState> = {
        endpointName: 'categories',
        lastSuccessfulSyncAt: undefined,
        syncStatus: SyncStatus.IDLE,
      };

      const config: Partial<UexSyncConfig> = {
        endpointName: 'categories',
        deltaSyncEnabled: true,
        enabled: true,
        fullSyncIntervalDays: 7,
      };

      mockSyncStateRepository.findOne.mockResolvedValue(state);
      mockSyncConfigRepository.findOne.mockResolvedValue(config);

      const result = await service.shouldUseDeltaSync('categories');

      expect(result).toEqual({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });
    });

    it('should return false when delta sync is disabled', async () => {
      const state: Partial<UexSyncState> = {
        endpointName: 'categories',
        lastSuccessfulSyncAt: new Date('2025-01-01'),
        lastFullSyncAt: new Date('2025-01-01'),
        syncStatus: SyncStatus.IDLE,
      };

      const config: Partial<UexSyncConfig> = {
        endpointName: 'categories',
        deltaSyncEnabled: false,
        enabled: true,
        fullSyncIntervalDays: 7,
      };

      mockSyncStateRepository.findOne.mockResolvedValue(state);
      mockSyncConfigRepository.findOne.mockResolvedValue(config);

      const result = await service.shouldUseDeltaSync('categories');

      expect(result).toEqual({
        useDelta: false,
        reason: 'DELTA_DISABLED',
      });
    });

    it('should return false when endpoint is disabled', async () => {
      const state: Partial<UexSyncState> = {
        endpointName: 'categories',
        lastSuccessfulSyncAt: new Date('2025-01-01'),
        lastFullSyncAt: new Date('2025-01-01'),
        syncStatus: SyncStatus.IDLE,
      };

      const config: Partial<UexSyncConfig> = {
        endpointName: 'categories',
        deltaSyncEnabled: true,
        enabled: false,
        fullSyncIntervalDays: 7,
      };

      mockSyncStateRepository.findOne.mockResolvedValue(state);
      mockSyncConfigRepository.findOne.mockResolvedValue(config);

      const result = await service.shouldUseDeltaSync('categories');

      expect(result).toEqual({
        useDelta: false,
        reason: 'ENDPOINT_DISABLED',
      });
    });

    it('should return false when full sync interval exceeded', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 8);

      const state: Partial<UexSyncState> = {
        endpointName: 'categories',
        lastSuccessfulSyncAt: new Date(),
        lastFullSyncAt: oldDate,
        syncStatus: SyncStatus.IDLE,
      };

      const config: Partial<UexSyncConfig> = {
        endpointName: 'categories',
        deltaSyncEnabled: true,
        enabled: true,
        fullSyncIntervalDays: 7,
      };

      mockSyncStateRepository.findOne.mockResolvedValue(state);
      mockSyncConfigRepository.findOne.mockResolvedValue(config);

      const result = await service.shouldUseDeltaSync('categories');

      expect(result).toEqual({
        useDelta: false,
        reason: 'FULL_SYNC_INTERVAL_EXCEEDED',
        lastSyncAt: oldDate,
      });
    });

    it('should return true when delta sync is eligible', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      const state: Partial<UexSyncState> = {
        endpointName: 'categories',
        lastSuccessfulSyncAt: recentDate,
        lastFullSyncAt: recentDate,
        syncStatus: SyncStatus.IDLE,
      };

      const config: Partial<UexSyncConfig> = {
        endpointName: 'categories',
        deltaSyncEnabled: true,
        enabled: true,
        fullSyncIntervalDays: 7,
      };

      mockSyncStateRepository.findOne.mockResolvedValue(state);
      mockSyncConfigRepository.findOne.mockResolvedValue(config);

      const result = await service.shouldUseDeltaSync('categories');

      expect(result).toEqual({
        useDelta: true,
        reason: 'DELTA_ELIGIBLE',
        lastSyncAt: recentDate,
      });
    });

    it('should return false when no full sync has been recorded', async () => {
      const state: Partial<UexSyncState> = {
        endpointName: 'categories',
        lastSuccessfulSyncAt: new Date(),
        lastFullSyncAt: undefined,
        syncStatus: SyncStatus.IDLE,
      };

      const config: Partial<UexSyncConfig> = {
        endpointName: 'categories',
        deltaSyncEnabled: true,
        enabled: true,
        fullSyncIntervalDays: 7,
      };

      mockSyncStateRepository.findOne.mockResolvedValue(state);
      mockSyncConfigRepository.findOne.mockResolvedValue(config);

      const result = await service.shouldUseDeltaSync('categories');

      expect(result).toEqual({
        useDelta: false,
        reason: 'NO_FULL_SYNC_RECORDED',
      });
    });
  });

  describe('recordSyncSuccess', () => {
    it('should record successful delta sync', async () => {
      const result = {
        syncMode: 'delta' as const,
        recordsCreated: 5,
        recordsUpdated: 10,
        recordsDeleted: 2,
        durationMs: 5000,
      };

      mockSyncStateRepository.update.mockResolvedValue({ affected: 1 });

      await service.recordSyncSuccess('categories', result);

      expect(mockSyncStateRepository.update).toHaveBeenCalledWith(
        { endpointName: 'categories' },
        expect.objectContaining({
          syncStatus: SyncStatus.SUCCESS,
          recordsCreatedCount: 5,
          recordsUpdatedCount: 10,
          recordsDeletedCount: 2,
          syncDurationMs: 5000,
          errorMessage: undefined,
          errorStack: undefined,
        }),
      );
    });

    it('should record successful full sync with lastFullSyncAt update', async () => {
      const result = {
        syncMode: 'full' as const,
        recordsCreated: 100,
        recordsUpdated: 0,
        recordsDeleted: 0,
        durationMs: 30000,
      };

      mockSyncStateRepository.update.mockResolvedValue({ affected: 1 });

      await service.recordSyncSuccess('categories', result);

      expect(mockSyncStateRepository.update).toHaveBeenCalledWith(
        { endpointName: 'categories' },
        expect.objectContaining({
          syncStatus: SyncStatus.SUCCESS,
          recordsCreatedCount: 100,
          lastFullSyncAt: expect.any(Date),
        }),
      );
    });
  });

  describe('recordSyncFailure', () => {
    it('should record sync failure with error details', async () => {
      const error = new Error('API connection failed');
      error.stack = 'Error stack trace';

      mockSyncStateRepository.update.mockResolvedValue({ affected: 1 });

      await service.recordSyncFailure('categories', error, 3000);

      expect(mockSyncStateRepository.update).toHaveBeenCalledWith(
        { endpointName: 'categories' },
        {
          syncStatus: SyncStatus.FAILED,
          errorMessage: 'API connection failed',
          errorStack: 'Error stack trace',
          syncDurationMs: 3000,
        },
      );
    });

    it('should record sync failure without duration', async () => {
      const error = new Error('Unexpected error');

      mockSyncStateRepository.update.mockResolvedValue({ affected: 1 });

      await service.recordSyncFailure('categories', error);

      expect(mockSyncStateRepository.update).toHaveBeenCalledWith(
        { endpointName: 'categories' },
        expect.not.objectContaining({
          syncDurationMs: expect.anything(),
        }),
      );
    });
  });

  describe('getStaleEndpoints', () => {
    it('should return endpoints that have not synced recently', async () => {
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 50);

      const staleEndpoints: Partial<UexSyncState>[] = [
        {
          endpointName: 'categories',
          lastSuccessfulSyncAt: oldDate,
          syncStatus: SyncStatus.IDLE,
        },
      ];

      mockSyncStateRepository.find.mockResolvedValue(staleEndpoints);

      const result = await service.getStaleEndpoints(48);

      expect(result).toEqual(staleEndpoints);
      expect(mockSyncStateRepository.find).toHaveBeenCalled();
    });
  });

  describe('initializeEndpoint', () => {
    it('should initialize a new endpoint with default config', async () => {
      mockSyncStateRepository.findOne.mockResolvedValue(null);
      mockSyncConfigRepository.findOne.mockResolvedValue(null);
      mockSyncStateRepository.save.mockResolvedValue({});
      mockSyncConfigRepository.save.mockResolvedValue({});

      await service.initializeEndpoint('new_endpoint', {
        syncScheduleCron: '0 2 * * *',
      });

      expect(mockSyncStateRepository.save).toHaveBeenCalledWith({
        endpointName: 'new_endpoint',
        syncStatus: SyncStatus.IDLE,
      });

      expect(mockSyncConfigRepository.save).toHaveBeenCalledWith({
        endpointName: 'new_endpoint',
        syncScheduleCron: '0 2 * * *',
      });
    });

    it('should not override existing endpoint', async () => {
      const existingState = {
        endpointName: 'categories',
        syncStatus: SyncStatus.IDLE,
      };
      const existingConfig = {
        endpointName: 'categories',
        enabled: true,
      };

      mockSyncStateRepository.findOne.mockResolvedValue(existingState);
      mockSyncConfigRepository.findOne.mockResolvedValue(existingConfig);

      await service.initializeEndpoint('categories');

      expect(mockSyncStateRepository.save).not.toHaveBeenCalled();
      expect(mockSyncConfigRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getSyncStateWithConfig', () => {
    it('should return both state and config', async () => {
      const state: Partial<UexSyncState> = {
        endpointName: 'categories',
        syncStatus: SyncStatus.IDLE,
      };
      const config: Partial<UexSyncConfig> = {
        endpointName: 'categories',
        enabled: true,
      };

      mockSyncStateRepository.findOne.mockResolvedValue(state);
      mockSyncConfigRepository.findOne.mockResolvedValue(config);

      const result = await service.getSyncStateWithConfig('categories');

      expect(result).toEqual({ state, config });
    });

    it('should handle missing state or config', async () => {
      mockSyncStateRepository.findOne.mockResolvedValue(null);
      mockSyncConfigRepository.findOne.mockResolvedValue(null);

      const result = await service.getSyncStateWithConfig('nonexistent');

      expect(result).toEqual({ state: null, config: null });
    });
  });
});
