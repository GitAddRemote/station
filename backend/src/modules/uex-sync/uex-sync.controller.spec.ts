import { Test, TestingModule } from '@nestjs/testing';
import { UexSyncController } from './uex-sync.controller';
import { UexSyncService } from './uex-sync.service';
import { CategoriesSyncService } from './services/categories-sync.service';
import { CommoditiesSyncService } from './services/commodities-sync.service';
import { ItemsSyncService } from './services/items-sync.service';
import { CompaniesSyncService } from './services/companies-sync.service';
import { LocationsSyncService } from './services/locations-sync.service';
import { SyncStatus } from './uex-sync-state.entity';

describe('UexSyncController', () => {
  let controller: UexSyncController;

  const syncResult = {
    created: 5,
    updated: 2,
    deleted: 1,
    durationMs: 100,
    syncMode: 'full' as const,
  };

  const mockCategoriesSync = {
    syncCategories: jest.fn().mockResolvedValue(syncResult),
  };
  const mockCommoditiesSync = {
    syncCommodities: jest.fn().mockResolvedValue(syncResult),
  };
  const mockItemsSync = { syncItems: jest.fn().mockResolvedValue(syncResult) };
  const mockCompaniesSync = {
    syncCompanies: jest.fn().mockResolvedValue(syncResult),
  };
  const mockLocationsSync = {
    syncAllLocations: jest.fn().mockResolvedValue({
      totalCreated: 5,
      totalUpdated: 2,
      totalDeleted: 1,
      totalDurationMs: 100,
      syncMode: 'full' as const,
    }),
  };
  const mockSyncService = {
    getAllSyncStates: jest.fn().mockResolvedValue([]),
    getSyncConfig: jest.fn().mockResolvedValue(null),
    getSyncStateWithConfig: jest
      .fn()
      .mockResolvedValue({ state: null, config: null }),
    getActiveSyncStates: jest.fn().mockResolvedValue([]),
    getStaleEndpoints: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UexSyncController],
      providers: [
        { provide: UexSyncService, useValue: mockSyncService },
        { provide: CategoriesSyncService, useValue: mockCategoriesSync },
        { provide: CommoditiesSyncService, useValue: mockCommoditiesSync },
        { provide: ItemsSyncService, useValue: mockItemsSync },
        { provide: CompaniesSyncService, useValue: mockCompaniesSync },
        { provide: LocationsSyncService, useValue: mockLocationsSync },
      ],
    }).compile();

    controller = module.get<UexSyncController>(UexSyncController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('runSyncNow', () => {
    it('should run commodities sync when requested', async () => {
      const { results } = await controller.runSyncNow({
        endpoints: ['commodities'],
        forceFull: true,
      });

      expect(mockCommoditiesSync.syncCommodities).toHaveBeenCalledWith(true);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        endpoint: 'commodities',
        status: SyncStatus.SUCCESS,
        mode: 'full',
        created: 5,
        updated: 2,
        deleted: 1,
      });
    });

    it('should include commodities in run-all (no endpoints specified)', async () => {
      await controller.runSyncNow({ forceFull: true });

      expect(mockCategoriesSync.syncCategories).toHaveBeenCalled();
      expect(mockCommoditiesSync.syncCommodities).toHaveBeenCalled();
      expect(mockItemsSync.syncItems).toHaveBeenCalled();
      expect(mockCompaniesSync.syncCompanies).toHaveBeenCalled();
      expect(mockLocationsSync.syncAllLocations).toHaveBeenCalled();
    });

    it('should include commodities when "all" is specified', async () => {
      await controller.runSyncNow({ endpoints: ['all'], forceFull: false });

      expect(mockCommoditiesSync.syncCommodities).toHaveBeenCalled();
    });

    it('should not run commodities when other endpoints are specified', async () => {
      await controller.runSyncNow({ endpoints: ['categories', 'items'] });

      expect(mockCommoditiesSync.syncCommodities).not.toHaveBeenCalled();
    });

    it('should record failure when commodities sync throws', async () => {
      mockCommoditiesSync.syncCommodities.mockRejectedValueOnce(
        new Error('UEX API down'),
      );

      const { results } = await controller.runSyncNow({
        endpoints: ['commodities'],
      });

      expect(results[0]).toMatchObject({
        endpoint: 'commodities',
        status: SyncStatus.FAILED,
        errorMessage: 'UEX API down',
        created: 0,
        updated: 0,
        deleted: 0,
      });
    });
  });
});
