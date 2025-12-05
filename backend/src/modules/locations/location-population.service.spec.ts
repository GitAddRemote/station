import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { LocationPopulationService } from './location-population.service';
import { SystemUserService } from '../users/system-user.service';
import { Location } from './entities/location.entity';
import { Game } from '../games/game.entity';
import { User } from '../users/user.entity';
import { UexStarSystem } from '../uex/entities/uex-star-system.entity';
import { UexPlanet } from '../uex/entities/uex-planet.entity';
import { UexMoon } from '../uex/entities/uex-moon.entity';
import { UexCity } from '../uex/entities/uex-city.entity';
import { UexSpaceStation } from '../uex/entities/uex-space-station.entity';
import { UexOutpost } from '../uex/entities/uex-outpost.entity';
import { UexPoi } from '../uex/entities/uex-poi.entity';

describe('LocationPopulationService', () => {
  let service: LocationPopulationService;
  let module: TestingModule;
  let gameRepository: Repository<Game>;

  const mockGame: Game = {
    id: 1,
    code: 'sc',
    name: 'Star Citizen',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Game;

  const SYSTEM_USER_ID = 1;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        LocationPopulationService,
        {
          provide: getRepositoryToken(Location),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Game),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UexStarSystem),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(UexPlanet),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(UexMoon),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(UexCity),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(UexSpaceStation),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(UexOutpost),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(UexPoi),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: SystemUserService,
          useValue: {
            getSystemUserId: jest.fn().mockReturnValue(SYSTEM_USER_ID),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LocationPopulationService>(LocationPopulationService);
    gameRepository = module.get<Repository<Game>>(getRepositoryToken(Game));

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('populateAllLocations', () => {
    it('should populate all location types in correct order', async () => {
      jest.spyOn(gameRepository, 'findOne').mockResolvedValue(mockGame);

      const results = await service.populateAllLocations();

      expect(results).toHaveLength(7);
      expect(results[0].type).toBe('star_systems');
      expect(results[1].type).toBe('planets');
      expect(results[2].type).toBe('moons');
      expect(results[3].type).toBe('cities');
      expect(results[4].type).toBe('space_stations');
      expect(results[5].type).toBe('outposts');
      expect(results[6].type).toBe('poi');
    });

    it('should throw error if Star Citizen game not found', async () => {
      jest.spyOn(gameRepository, 'findOne').mockResolvedValue(null);

      await expect(service.populateAllLocations()).rejects.toThrow(
        'Star Citizen game not found',
      );
    });
  });

  describe('service initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have populateAllLocations method', () => {
      expect(service.populateAllLocations).toBeDefined();
    });
  });
});
