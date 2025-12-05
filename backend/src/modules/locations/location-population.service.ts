import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Location, LocationType } from './entities/location.entity';
import { Game } from '../games/game.entity';
import { UexStarSystem } from '../uex/entities/uex-star-system.entity';
import { UexPlanet } from '../uex/entities/uex-planet.entity';
import { UexMoon } from '../uex/entities/uex-moon.entity';
import { UexCity } from '../uex/entities/uex-city.entity';
import { UexSpaceStation } from '../uex/entities/uex-space-station.entity';
import { UexOutpost } from '../uex/entities/uex-outpost.entity';
import { UexPoi } from '../uex/entities/uex-poi.entity';
import { SystemUserService } from '../users/system-user.service';

export interface PopulationResult {
  type: string;
  created: number;
  updated: number;
  skipped: number;
}

@Injectable()
export class LocationPopulationService {
  private readonly logger = new Logger(LocationPopulationService.name);

  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    @InjectRepository(UexStarSystem)
    private readonly starSystemRepository: Repository<UexStarSystem>,
    @InjectRepository(UexPlanet)
    private readonly planetRepository: Repository<UexPlanet>,
    @InjectRepository(UexMoon)
    private readonly moonRepository: Repository<UexMoon>,
    @InjectRepository(UexCity)
    private readonly cityRepository: Repository<UexCity>,
    @InjectRepository(UexSpaceStation)
    private readonly spaceStationRepository: Repository<UexSpaceStation>,
    @InjectRepository(UexOutpost)
    private readonly outpostRepository: Repository<UexOutpost>,
    @InjectRepository(UexPoi)
    private readonly poiRepository: Repository<UexPoi>,
    private readonly systemUserService: SystemUserService,
    private readonly dataSource: DataSource,
  ) {}

  async populateAllLocations(): Promise<PopulationResult[]> {
    this.logger.log('Starting location population from UEX data');

    const results: PopulationResult[] = [];

    // Get Star Citizen game
    const game = await this.gameRepository.findOne({ where: { code: 'sc' } });
    if (!game) {
      throw new Error('Star Citizen game not found. Please seed games first.');
    }

    results.push(await this.populateStarSystems(game.id));
    results.push(await this.populatePlanets(game.id));
    results.push(await this.populateMoons(game.id));
    results.push(await this.populateCities(game.id));
    results.push(await this.populateSpaceStations(game.id));
    results.push(await this.populateOutposts(game.id));
    results.push(await this.populatePOI(game.id));

    this.logger.log('Location population completed', { results });

    return results;
  }

  private async populateStarSystems(gameId: number): Promise<PopulationResult> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;
    const skipped = 0;

    const systems = await this.starSystemRepository.find({
      where: { deleted: false, active: true },
    });

    for (const system of systems) {
      const existing = await this.locationRepository.findOne({
        where: {
          starSystemId: system.uexId,
          deleted: false,
        },
      });

      const hierarchyPath = JSON.stringify({ system: system.name });

      if (existing) {
        existing.displayName = system.name;
        existing.shortName = system.name;
        existing.hierarchyPath = hierarchyPath;
        existing.isAvailable = system.isAvailable;
        existing.modifiedById = systemUserId;
        existing.dateModified = new Date();

        await this.locationRepository.save(existing);
        updated++;
      } else {
        await this.locationRepository.save({
          gameId,
          locationType: LocationType.STAR_SYSTEM,
          starSystemId: system.uexId,
          displayName: system.name,
          shortName: system.name,
          hierarchyPath,
          isAvailable: system.isAvailable,
          active: true,
          deleted: false,
          addedById: systemUserId,
          modifiedById: systemUserId,
        });
        created++;
      }
    }

    return { type: 'star_systems', created, updated, skipped };
  }

  private async populatePlanets(gameId: number): Promise<PopulationResult> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const planets = await this.planetRepository.find({
      where: { deleted: false, active: true },
      relations: ['starSystem'],
    });

    for (const planet of planets) {
      if (!planet.starSystem) {
        this.logger.warn(`Planet ${planet.name} has no star system, skipping`);
        skipped++;
        continue;
      }

      const existing = await this.locationRepository.findOne({
        where: {
          planetId: planet.uexId,
          deleted: false,
        },
      });

      const displayName = `${planet.starSystem.code} / ${planet.name}`;
      const hierarchyPath = JSON.stringify({
        system: planet.starSystem.name,
        planet: planet.name,
      });

      if (existing) {
        existing.displayName = displayName;
        existing.shortName = planet.name;
        existing.hierarchyPath = hierarchyPath;
        existing.isAvailable = planet.isAvailable;
        existing.isLandable = planet.isLandable;
        existing.modifiedById = systemUserId;
        existing.dateModified = new Date();

        await this.locationRepository.save(existing);
        updated++;
      } else {
        await this.locationRepository.save({
          gameId,
          locationType: LocationType.PLANET,
          planetId: planet.uexId,
          displayName,
          shortName: planet.name,
          hierarchyPath,
          isAvailable: planet.isAvailable,
          isLandable: planet.isLandable,
          active: true,
          deleted: false,
          addedById: systemUserId,
          modifiedById: systemUserId,
        });
        created++;
      }
    }

    return { type: 'planets', created, updated, skipped };
  }

  private async populateMoons(gameId: number): Promise<PopulationResult> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const moons = await this.moonRepository.find({
      where: { deleted: false, active: true },
      relations: ['planet', 'planet.starSystem'],
    });

    for (const moon of moons) {
      if (!moon.planet || !moon.planet.starSystem) {
        this.logger.warn(`Moon ${moon.name} has no planet/system, skipping`);
        skipped++;
        continue;
      }

      const existing = await this.locationRepository.findOne({
        where: {
          moonId: moon.uexId,
          deleted: false,
        },
      });

      const displayName = `${moon.planet.starSystem.code} / ${moon.planet.name} / ${moon.name}`;
      const hierarchyPath = JSON.stringify({
        system: moon.planet.starSystem.name,
        planet: moon.planet.name,
        moon: moon.name,
      });

      if (existing) {
        existing.displayName = displayName;
        existing.shortName = moon.name;
        existing.hierarchyPath = hierarchyPath;
        existing.isAvailable = moon.isAvailable;
        existing.isLandable = moon.isLandable;
        existing.modifiedById = systemUserId;
        existing.dateModified = new Date();

        await this.locationRepository.save(existing);
        updated++;
      } else {
        await this.locationRepository.save({
          gameId,
          locationType: LocationType.MOON,
          moonId: moon.uexId,
          displayName,
          shortName: moon.name,
          hierarchyPath,
          isAvailable: moon.isAvailable,
          isLandable: moon.isLandable,
          active: true,
          deleted: false,
          addedById: systemUserId,
          modifiedById: systemUserId,
        });
        created++;
      }
    }

    return { type: 'moons', created, updated, skipped };
  }

  private async populateCities(gameId: number): Promise<PopulationResult> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const cities = await this.cityRepository.find({
      where: { deleted: false, active: true },
      relations: [
        'planet',
        'planet.starSystem',
        'moon',
        'moon.planet',
        'moon.planet.starSystem',
      ],
    });

    for (const city of cities) {
      let displayName: string;
      let hierarchyPath: string;

      if (city.planet && city.planet.starSystem) {
        displayName = `${city.planet.starSystem.code} / ${city.planet.name} / ${city.name}`;
        hierarchyPath = JSON.stringify({
          system: city.planet.starSystem.name,
          planet: city.planet.name,
          city: city.name,
        });
      } else if (city.moon && city.moon.planet && city.moon.planet.starSystem) {
        displayName = `${city.moon.planet.starSystem.code} / ${city.moon.planet.name} / ${city.moon.name} / ${city.name}`;
        hierarchyPath = JSON.stringify({
          system: city.moon.planet.starSystem.name,
          planet: city.moon.planet.name,
          moon: city.moon.name,
          city: city.name,
        });
      } else {
        this.logger.warn(
          `City ${city.name} has incomplete hierarchy, skipping`,
        );
        skipped++;
        continue;
      }

      const existing = await this.locationRepository.findOne({
        where: {
          cityId: city.uexId,
          deleted: false,
        },
      });

      if (existing) {
        existing.displayName = displayName;
        existing.shortName = city.name;
        existing.hierarchyPath = hierarchyPath;
        existing.isAvailable = city.isAvailable;
        existing.modifiedById = systemUserId;
        existing.dateModified = new Date();

        await this.locationRepository.save(existing);
        updated++;
      } else {
        await this.locationRepository.save({
          gameId,
          locationType: LocationType.CITY,
          cityId: city.uexId,
          displayName,
          shortName: city.name,
          hierarchyPath,
          isAvailable: city.isAvailable,
          hasArmistice: true, // Cities typically have armistice zones
          active: true,
          deleted: false,
          addedById: systemUserId,
          modifiedById: systemUserId,
        });
        created++;
      }
    }

    return { type: 'cities', created, updated, skipped };
  }

  private async populateSpaceStations(
    gameId: number,
  ): Promise<PopulationResult> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const stations = await this.spaceStationRepository.find({
      where: { deleted: false, active: true },
      relations: [
        'starSystem',
        'planet',
        'planet.starSystem',
        'moon',
        'moon.planet',
        'moon.planet.starSystem',
      ],
    });

    for (const station of stations) {
      let displayName: string;
      let hierarchyPath: string;

      if (station.planet && station.planet.starSystem) {
        displayName = `${station.planet.starSystem.code} / ${station.planet.name} / ${station.name}`;
        hierarchyPath = JSON.stringify({
          system: station.planet.starSystem.name,
          planet: station.planet.name,
          space_station: station.name,
        });
      } else if (
        station.moon &&
        station.moon.planet &&
        station.moon.planet.starSystem
      ) {
        displayName = `${station.moon.planet.starSystem.code} / ${station.moon.planet.name} / ${station.moon.name} / ${station.name}`;
        hierarchyPath = JSON.stringify({
          system: station.moon.planet.starSystem.name,
          planet: station.moon.planet.name,
          moon: station.moon.name,
          space_station: station.name,
        });
      } else if (station.starSystem) {
        displayName = `${station.starSystem.code} / ${station.name}`;
        hierarchyPath = JSON.stringify({
          system: station.starSystem.name,
          space_station: station.name,
        });
      } else {
        this.logger.warn(
          `Space station ${station.name} has no location, skipping`,
        );
        skipped++;
        continue;
      }

      const existing = await this.locationRepository.findOne({
        where: {
          spaceStationId: station.uexId,
          deleted: false,
        },
      });

      if (existing) {
        existing.displayName = displayName;
        existing.shortName = station.name;
        existing.hierarchyPath = hierarchyPath;
        existing.isAvailable = station.isAvailable;
        existing.modifiedById = systemUserId;
        existing.dateModified = new Date();

        await this.locationRepository.save(existing);
        updated++;
      } else {
        await this.locationRepository.save({
          gameId,
          locationType: LocationType.SPACE_STATION,
          spaceStationId: station.uexId,
          displayName,
          shortName: station.name,
          hierarchyPath,
          isAvailable: station.isAvailable,
          hasArmistice: true, // Space stations typically have armistice zones
          active: true,
          deleted: false,
          addedById: systemUserId,
          modifiedById: systemUserId,
        });
        created++;
      }
    }

    return { type: 'space_stations', created, updated, skipped };
  }

  private async populateOutposts(gameId: number): Promise<PopulationResult> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const outposts = await this.outpostRepository.find({
      where: { deleted: false, active: true },
      relations: [
        'planet',
        'planet.starSystem',
        'moon',
        'moon.planet',
        'moon.planet.starSystem',
      ],
    });

    for (const outpost of outposts) {
      let displayName: string;
      let hierarchyPath: string;

      if (outpost.planet && outpost.planet.starSystem) {
        displayName = `${outpost.planet.starSystem.code} / ${outpost.planet.name} / ${outpost.name}`;
        hierarchyPath = JSON.stringify({
          system: outpost.planet.starSystem.name,
          planet: outpost.planet.name,
          outpost: outpost.name,
        });
      } else if (
        outpost.moon &&
        outpost.moon.planet &&
        outpost.moon.planet.starSystem
      ) {
        displayName = `${outpost.moon.planet.starSystem.code} / ${outpost.moon.planet.name} / ${outpost.moon.name} / ${outpost.name}`;
        hierarchyPath = JSON.stringify({
          system: outpost.moon.planet.starSystem.name,
          planet: outpost.moon.planet.name,
          moon: outpost.moon.name,
          outpost: outpost.name,
        });
      } else {
        this.logger.warn(
          `Outpost ${outpost.name} has incomplete hierarchy, skipping`,
        );
        skipped++;
        continue;
      }

      const existing = await this.locationRepository.findOne({
        where: {
          outpostId: outpost.uexId,
          deleted: false,
        },
      });

      if (existing) {
        existing.displayName = displayName;
        existing.shortName = outpost.name;
        existing.hierarchyPath = hierarchyPath;
        existing.isAvailable = outpost.isAvailable;
        existing.modifiedById = systemUserId;
        existing.dateModified = new Date();

        await this.locationRepository.save(existing);
        updated++;
      } else {
        await this.locationRepository.save({
          gameId,
          locationType: LocationType.OUTPOST,
          outpostId: outpost.uexId,
          displayName,
          shortName: outpost.name,
          hierarchyPath,
          isAvailable: outpost.isAvailable,
          active: true,
          deleted: false,
          addedById: systemUserId,
          modifiedById: systemUserId,
        });
        created++;
      }
    }

    return { type: 'outposts', created, updated, skipped };
  }

  private async populatePOI(gameId: number): Promise<PopulationResult> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const pois = await this.poiRepository.find({
      where: { deleted: false, active: true },
      relations: [
        'starSystem',
        'planet',
        'planet.starSystem',
        'moon',
        'moon.planet',
        'moon.planet.starSystem',
      ],
    });

    for (const poi of pois) {
      let displayName: string;
      let hierarchyPath: string;

      if (poi.planet && poi.planet.starSystem) {
        displayName = `${poi.planet.starSystem.code} / ${poi.planet.name} / ${poi.name}`;
        hierarchyPath = JSON.stringify({
          system: poi.planet.starSystem.name,
          planet: poi.planet.name,
          poi: poi.name,
        });
      } else if (poi.moon && poi.moon.planet && poi.moon.planet.starSystem) {
        displayName = `${poi.moon.planet.starSystem.code} / ${poi.moon.planet.name} / ${poi.moon.name} / ${poi.name}`;
        hierarchyPath = JSON.stringify({
          system: poi.moon.planet.starSystem.name,
          planet: poi.moon.planet.name,
          moon: poi.moon.name,
          poi: poi.name,
        });
      } else if (poi.starSystem) {
        displayName = `${poi.starSystem.code} / ${poi.name}`;
        hierarchyPath = JSON.stringify({
          system: poi.starSystem.name,
          poi: poi.name,
        });
      } else {
        this.logger.warn(`POI ${poi.name} has no location, skipping`);
        skipped++;
        continue;
      }

      const existing = await this.locationRepository.findOne({
        where: {
          poiId: poi.uexId,
          deleted: false,
        },
      });

      if (existing) {
        existing.displayName = displayName;
        existing.shortName = poi.name;
        existing.hierarchyPath = hierarchyPath;
        existing.isAvailable = poi.isAvailable;
        existing.modifiedById = systemUserId;
        existing.dateModified = new Date();

        await this.locationRepository.save(existing);
        updated++;
      } else {
        await this.locationRepository.save({
          gameId,
          locationType: LocationType.POI,
          poiId: poi.uexId,
          displayName,
          shortName: poi.name,
          hierarchyPath,
          isAvailable: poi.isAvailable,
          active: true,
          deleted: false,
          addedById: systemUserId,
          modifiedById: systemUserId,
        });
        created++;
      }
    }

    return { type: 'poi', created, updated, skipped };
  }
}
