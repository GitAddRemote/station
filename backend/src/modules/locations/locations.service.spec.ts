import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Location, LocationType } from './entities/location.entity';
import {
  LocationSearchDto,
  CreateLocationDto,
  UpdateLocationDto,
} from './dto/location.dto';
import { LocationPopulationService } from './location-population.service';
import { Game } from '../games/game.entity';
import { UexCity } from '../uex/entities/uex-city.entity';

describe('LocationsService', () => {
  let service: LocationsService;
  let repository: Repository<Location>;
  let locationPopulationService: LocationPopulationService;

  const mockLocation: Location = {
    id: 1,
    gameId: 1,
    locationType: LocationType.CITY,
    cityId: 100,
    displayName: 'STANTON / CRUSADER / Orison',
    shortName: 'Orison',
    hierarchyPath: JSON.stringify({
      system: 'Stanton',
      planet: 'Crusader',
      city: 'Orison',
    }),
    isAvailable: true,
    isLandable: false,
    hasArmistice: true,
    active: true,
    deleted: false,
    dateAdded: new Date(),
    dateModified: new Date(),
    addedById: 1,
    modifiedById: 1,
    game: undefined as unknown as Game,
    city: undefined as unknown as UexCity,
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getRawOne: jest.fn(),
  } as {
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    take: jest.Mock;
    select: jest.Mock;
    addSelect: jest.Mock;
    getMany: jest.Mock;
    getRawOne: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        {
          provide: getRepositoryToken(Location),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: LocationPopulationService,
          useValue: {
            populateAllLocations: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    repository = module.get<Repository<Location>>(getRepositoryToken(Location));
    locationPopulationService = module.get<LocationPopulationService>(
      LocationPopulationService,
    );

    jest.spyOn(repository, 'count').mockResolvedValue(1);
    jest
      .spyOn(locationPopulationService, 'populateAllLocations')
      .mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all locations for a game', async () => {
      const searchDto: LocationSearchDto = { gameId: 1 };
      mockQueryBuilder.getMany.mockResolvedValue([mockLocation]);

      const result = await service.findAll(searchDto);

      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe('STANTON / CRUSADER / Orison');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        gameId: 1,
        deleted: false,
        active: true,
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'location.display_name',
        'ASC',
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
    });

    it('should filter by location type', async () => {
      const searchDto: LocationSearchDto = {
        gameId: 1,
        type: LocationType.CITY,
      };
      mockQueryBuilder.getMany.mockResolvedValue([mockLocation]);

      await service.findAll(searchDto);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        gameId: 1,
        deleted: false,
        active: true,
        locationType: LocationType.CITY,
      });
    });

    it('should filter by search text', async () => {
      const searchDto: LocationSearchDto = { gameId: 1, search: 'Orison' };
      mockQueryBuilder.getMany.mockResolvedValue([mockLocation]);

      await service.findAll(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(location.display_name ILIKE :search OR location.short_name ILIKE :search)',
        { search: '%Orison%' },
      );
    });

    it('should respect custom limit', async () => {
      const searchDto: LocationSearchDto = { gameId: 1, limit: 50 };
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(searchDto);

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });

    it('should parse hierarchyPath from JSON string', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockLocation]);

      const result = await service.findAll({ gameId: 1 });

      expect(result[0].hierarchyPath).toEqual({
        system: 'Stanton',
        planet: 'Crusader',
        city: 'Orison',
      });
    });

    it('should populate locations when none exist', async () => {
      jest.spyOn(repository, 'count').mockResolvedValueOnce(0);
      mockQueryBuilder.getMany.mockResolvedValue([mockLocation]);

      await service.findAll({ gameId: 1 });

      expect(locationPopulationService.populateAllLocations).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a location by id', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockLocation);

      const result = await service.findById(1);

      expect(result.id).toBe('1');
      expect(result.displayName).toBe('STANTON / CRUSADER / Orison');
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1, deleted: false },
        relations: expect.any(Array),
      });
    });

    it('should throw NotFoundException if location not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow(
        'Location with ID 999 not found',
      );
    });
  });

  describe('findByType', () => {
    it('should return locations filtered by type', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([mockLocation]);

      const result = await service.findByType(1, LocationType.CITY);

      expect(result).toHaveLength(1);
      expect(repository.find).toHaveBeenCalledWith({
        where: {
          gameId: 1,
          locationType: LocationType.CITY,
          deleted: false,
          active: true,
        },
        order: { displayName: 'ASC' },
      });
    });
  });

  describe('findStorableLocations', () => {
    it('should return storable locations with etag and parsed hierarchy', async () => {
      const storableLocation: Location = {
        ...mockLocation,
        id: 2,
        hierarchyPath: JSON.stringify({
          system: 'Stanton',
          planet: 'Crusader',
          city: 'Orison',
        }),
      };

      jest.spyOn(repository, 'find').mockResolvedValue([storableLocation]);
      mockQueryBuilder.getRawOne.mockResolvedValue({
        count: '1',
        maxDateModified: new Date('2024-01-01T00:00:00Z').toISOString(),
      });

      const result = await service.findStorableLocations(1);

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gameId: 1,
            deleted: false,
            active: true,
            isAvailable: true,
          }),
          take: 5000,
        }),
      );
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'COUNT(location.id)',
        'count',
      );
      expect(result.locations).toHaveLength(1);
      expect(result.locations[0].hierarchyPath).toEqual({
        system: 'Stanton',
        planet: 'Crusader',
        city: 'Orison',
      });
      expect(result.etag).toBeDefined();
      expect(result.etag).not.toHaveLength(0);
    });

    it('should fall back gracefully when stats are missing', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([]);
      mockQueryBuilder.getRawOne.mockResolvedValue(null);

      const result = await service.findStorableLocations(1);

      expect(result.etag).toBeDefined();
      expect(result.locations).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('should create a new location', async () => {
      const createDto: CreateLocationDto = {
        gameId: 1,
        locationType: LocationType.CITY,
        cityId: 100,
        displayName: 'STANTON / CRUSADER / Orison',
        shortName: 'Orison',
        hierarchyPath: JSON.stringify({
          system: 'Stanton',
          planet: 'Crusader',
          city: 'Orison',
        }),
        isAvailable: true,
        hasArmistice: true,
      };

      jest.spyOn(repository, 'create').mockReturnValue(mockLocation);
      jest.spyOn(repository, 'save').mockResolvedValue(mockLocation);

      const result = await service.create(createDto, 1);

      expect(result.displayName).toBe('STANTON / CRUSADER / Orison');
      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        addedById: 1,
        modifiedById: 1,
      });
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing location', async () => {
      const updateDto: UpdateLocationDto = {
        displayName: 'Updated Name',
        isAvailable: false,
      };

      const updatedLocation = { ...mockLocation, ...updateDto };
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockLocation);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedLocation);

      const result = await service.update(1, updateDto, 1);

      expect(result.displayName).toBe('Updated Name');
      expect(result.isAvailable).toBe(false);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          modifiedById: 1,
          dateModified: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException if location not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.update(999, {}, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should soft delete a location', async () => {
      const deletedLocation = { ...mockLocation, deleted: true, active: false };
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockLocation);
      jest.spyOn(repository, 'save').mockResolvedValue(deletedLocation);

      await service.delete(1, 1);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted: true,
          active: false,
          modifiedById: 1,
          dateModified: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException if location not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
