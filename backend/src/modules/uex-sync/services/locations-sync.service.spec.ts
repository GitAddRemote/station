import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { LocationsSyncService } from './locations-sync.service';
import { UexStarSystem } from '../../uex/entities/uex-star-system.entity';
import { UexPlanet } from '../../uex/entities/uex-planet.entity';
import { UexMoon } from '../../uex/entities/uex-moon.entity';
import { UexCity } from '../../uex/entities/uex-city.entity';
import { UexSpaceStation } from '../../uex/entities/uex-space-station.entity';
import { UexOutpost } from '../../uex/entities/uex-outpost.entity';
import { UexPoi } from '../../uex/entities/uex-poi.entity';
import { UexSyncService } from '../uex-sync.service';
import { SystemUserService } from '../../users/system-user.service';
import { UEXLocationsClient } from '../clients/uex-locations.client';

describe('LocationsSyncService', () => {
  let service: LocationsSyncService;
  let mockStarSystemRepository: any;
  let mockPlanetRepository: any;
  let mockMoonRepository: any;
  let mockCityRepository: any;
  let mockSpaceStationRepository: any;
  let mockOutpostRepository: any;
  let mockPoiRepository: any;
  let mockUexClient: any;
  let mockSyncService: any;
  let mockSystemUserService: any;

  beforeEach(async () => {
    const createMockRepository = () => ({
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    });

    mockStarSystemRepository = createMockRepository();
    mockPlanetRepository = createMockRepository();
    mockMoonRepository = createMockRepository();
    mockCityRepository = createMockRepository();
    mockSpaceStationRepository = createMockRepository();
    mockOutpostRepository = createMockRepository();
    mockPoiRepository = createMockRepository();

    mockUexClient = {
      fetchStarSystems: jest.fn(),
      fetchPlanets: jest.fn(),
      fetchMoons: jest.fn(),
      fetchCities: jest.fn(),
      fetchSpaceStations: jest.fn(),
      fetchOutposts: jest.fn(),
      fetchPOI: jest.fn(),
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
        LocationsSyncService,
        {
          provide: getRepositoryToken(UexStarSystem),
          useValue: mockStarSystemRepository,
        },
        {
          provide: getRepositoryToken(UexPlanet),
          useValue: mockPlanetRepository,
        },
        {
          provide: getRepositoryToken(UexMoon),
          useValue: mockMoonRepository,
        },
        {
          provide: getRepositoryToken(UexCity),
          useValue: mockCityRepository,
        },
        {
          provide: getRepositoryToken(UexSpaceStation),
          useValue: mockSpaceStationRepository,
        },
        {
          provide: getRepositoryToken(UexOutpost),
          useValue: mockOutpostRepository,
        },
        {
          provide: getRepositoryToken(UexPoi),
          useValue: mockPoiRepository,
        },
        {
          provide: UEXLocationsClient,
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

    service = module.get<LocationsSyncService>(LocationsSyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncAllLocations', () => {
    it('should sync all location types in hierarchical order', async () => {
      // Mock all fetch methods to return empty arrays
      mockUexClient.fetchStarSystems.mockResolvedValue([]);
      mockUexClient.fetchPlanets.mockResolvedValue([]);
      mockUexClient.fetchMoons.mockResolvedValue([]);
      mockUexClient.fetchCities.mockResolvedValue([]);
      mockUexClient.fetchSpaceStations.mockResolvedValue([]);
      mockUexClient.fetchOutposts.mockResolvedValue([]);
      mockUexClient.fetchPOI.mockResolvedValue([]);

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      const result = await service.syncAllLocations();

      expect(result.totalCreated).toBe(0);
      expect(result.totalUpdated).toBe(0);
      expect(result.totalDeleted).toBe(0);

      // Verify all endpoints were synced
      expect(mockSyncService.acquireSyncLock).toHaveBeenCalledTimes(7);
      expect(mockSyncService.releaseSyncLock).toHaveBeenCalledTimes(7);
    }, 20000);

    it('should create new star systems', async () => {
      const mockSystems = [
        {
          id: 1,
          name: 'Stanton',
          code: 'STANTON',
          is_available: true,
        },
      ];

      mockUexClient.fetchStarSystems.mockResolvedValue(mockSystems);
      mockStarSystemRepository.findOne.mockResolvedValue(null);
      mockStarSystemRepository.save.mockResolvedValue({ id: 1 });

      // Mock other endpoints to return empty arrays
      mockUexClient.fetchPlanets.mockResolvedValue([]);
      mockUexClient.fetchMoons.mockResolvedValue([]);
      mockUexClient.fetchCities.mockResolvedValue([]);
      mockUexClient.fetchSpaceStations.mockResolvedValue([]);
      mockUexClient.fetchOutposts.mockResolvedValue([]);
      mockUexClient.fetchPOI.mockResolvedValue([]);

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      const result = await service.syncAllLocations();

      expect(result.totalCreated).toBe(1);
      expect(mockStarSystemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          uexId: 1,
          name: 'Stanton',
          code: 'STANTON',
        }),
      );
    }, 20000);

    it('should map numeric visibility/availability flags to booleans', async () => {
      const mockSystems = [
        {
          id: 2,
          name: 'Pyro',
          code: 'PY',
          is_available: 0,
          is_visible: 0,
        },
      ];

      mockUexClient.fetchStarSystems.mockResolvedValue(mockSystems);
      mockStarSystemRepository.findOne.mockResolvedValue(null);
      mockStarSystemRepository.save.mockResolvedValue({ id: 2 });

      mockUexClient.fetchPlanets.mockResolvedValue([]);
      mockUexClient.fetchMoons.mockResolvedValue([]);
      mockUexClient.fetchCities.mockResolvedValue([]);
      mockUexClient.fetchSpaceStations.mockResolvedValue([]);
      mockUexClient.fetchOutposts.mockResolvedValue([]);
      mockUexClient.fetchPOI.mockResolvedValue([]);

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      await service.syncAllLocations();

      expect(mockStarSystemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          uexId: 2,
          active: false,
          isAvailable: false,
        }),
      );
    }, 20000);

    it('should update existing planets', async () => {
      const mockPlanets = [
        {
          id: 10,
          id_star_system: 1,
          name: 'Crusader Updated',
          code: 'CRUSADER',
          is_available: true,
          is_landable: false,
        },
      ];

      mockUexClient.fetchStarSystems.mockResolvedValue([]);
      mockUexClient.fetchPlanets.mockResolvedValue(mockPlanets);
      mockPlanetRepository.findOne.mockResolvedValue({ id: 5, uexId: 10 });
      mockPlanetRepository.update.mockResolvedValue({ affected: 1 });

      // Mock other endpoints
      mockUexClient.fetchMoons.mockResolvedValue([]);
      mockUexClient.fetchCities.mockResolvedValue([]);
      mockUexClient.fetchSpaceStations.mockResolvedValue([]);
      mockUexClient.fetchOutposts.mockResolvedValue([]);
      mockUexClient.fetchPOI.mockResolvedValue([]);

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: true,
        reason: 'DELTA_ELIGIBLE',
        lastSyncAt: new Date('2025-01-01'),
      });

      const result = await service.syncAllLocations();

      expect(result.totalUpdated).toBe(1);
      expect(mockPlanetRepository.update).toHaveBeenCalledWith(
        { uexId: 10 },
        expect.objectContaining({
          name: 'Crusader Updated',
          starSystemId: 1,
        }),
      );
    }, 20000);

    it('should sync in correct hierarchical order', async () => {
      const callOrder: string[] = [];

      mockUexClient.fetchStarSystems.mockImplementation(async () => {
        callOrder.push('star_systems');
        return [];
      });
      mockUexClient.fetchPlanets.mockImplementation(async () => {
        callOrder.push('planets');
        return [];
      });
      mockUexClient.fetchMoons.mockImplementation(async () => {
        callOrder.push('moons');
        return [];
      });
      mockUexClient.fetchCities.mockImplementation(async () => {
        callOrder.push('cities');
        return [];
      });
      mockUexClient.fetchSpaceStations.mockImplementation(async () => {
        callOrder.push('space_stations');
        return [];
      });
      mockUexClient.fetchOutposts.mockImplementation(async () => {
        callOrder.push('outposts');
        return [];
      });
      mockUexClient.fetchPOI.mockImplementation(async () => {
        callOrder.push('poi');
        return [];
      });

      mockSyncService.shouldUseDeltaSync.mockResolvedValue({
        useDelta: false,
        reason: 'FIRST_SYNC',
      });

      await service.syncAllLocations();

      expect(callOrder).toEqual([
        'star_systems',
        'planets',
        'moons',
        'cities',
        'space_stations',
        'outposts',
        'poi',
      ]);
    }, 20000);
  });
});
