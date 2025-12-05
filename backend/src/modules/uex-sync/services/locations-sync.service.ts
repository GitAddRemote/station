import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UexStarSystem } from '../../uex/entities/uex-star-system.entity';
import { UexPlanet } from '../../uex/entities/uex-planet.entity';
import { UexMoon } from '../../uex/entities/uex-moon.entity';
import { UexCity } from '../../uex/entities/uex-city.entity';
import { UexSpaceStation } from '../../uex/entities/uex-space-station.entity';
import { UexOutpost } from '../../uex/entities/uex-outpost.entity';
import { UexPoi } from '../../uex/entities/uex-poi.entity';
import { UexSyncService } from '../uex-sync.service';
import { SystemUserService } from '../../users/system-user.service';
import {
  UEXLocationsClient,
  UEXStarSystemResponse,
  UEXPlanetResponse,
  UEXMoonResponse,
  UEXCityResponse,
  UEXSpaceStationResponse,
  UEXOutpostResponse,
  UEXPOIResponse,
} from '../clients/uex-locations.client';
import {
  RateLimitException,
  UEXServerException,
} from '../exceptions/uex-exceptions';

export interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  durationMs: number;
}

export interface LocationsSyncResult {
  totalCreated: number;
  totalUpdated: number;
  totalDeleted: number;
  totalDurationMs: number;
  endpointResults: Map<string, Omit<SyncResult, 'durationMs'>>;
}

@Injectable()
export class LocationsSyncService {
  private readonly logger = new Logger(LocationsSyncService.name);
  private readonly maxRetries: number;
  private readonly backoffBase: number;
  private readonly pauseBetweenEndpointsMs: number;

  // Hierarchical sync order: parents before children
  private readonly syncOrder = [
    'star_systems',
    'planets',
    'moons',
    'cities',
    'space_stations',
    'outposts',
    'poi',
  ];

  constructor(
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
    private readonly uexClient: UEXLocationsClient,
    private readonly syncService: UexSyncService,
    private readonly systemUserService: SystemUserService,
    private readonly configService: ConfigService,
  ) {
    this.maxRetries = this.configService.get<number>('UEX_RETRY_ATTEMPTS', 3);
    this.backoffBase = this.configService.get<number>(
      'UEX_BACKOFF_BASE_MS',
      1000,
    );
    this.pauseBetweenEndpointsMs = this.configService.get<number>(
      'UEX_ENDPOINTS_PAUSE_MS',
      1000,
    );
  }

  async syncAllLocations(): Promise<LocationsSyncResult> {
    const startTime = Date.now();
    const endpointResults = new Map<string, Omit<SyncResult, 'durationMs'>>();
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalDeleted = 0;

    this.logger.log('Starting full locations sync');

    for (let i = 0; i < this.syncOrder.length; i++) {
      const endpoint = this.syncOrder[i];

      try {
        this.logger.log(
          `Syncing ${endpoint} (${i + 1}/${this.syncOrder.length})`,
        );

        const result = await this.syncLocationEndpoint(endpoint);

        endpointResults.set(endpoint, {
          created: result.created,
          updated: result.updated,
          deleted: result.deleted,
        });

        totalCreated += result.created;
        totalUpdated += result.updated;
        totalDeleted += result.deleted;

        this.logger.log(
          `Completed ${endpoint}: created ${result.created}, updated ${result.updated}, deleted ${result.deleted}`,
        );

        // Pause between endpoints for rate limiting (except after last one)
        if (i < this.syncOrder.length - 1) {
          await this.sleep(this.pauseBetweenEndpointsMs);
        }
      } catch (error: any) {
        this.logger.error(`Failed to sync ${endpoint}: ${error.message}`);
        throw error;
      }
    }

    const totalDurationMs = Date.now() - startTime;

    this.logger.log(
      `Full locations sync completed: ` +
        `total created: ${totalCreated}, updated: ${totalUpdated}, ` +
        `deleted: ${totalDeleted}, duration: ${totalDurationMs}ms`,
    );

    return {
      totalCreated,
      totalUpdated,
      totalDeleted,
      totalDurationMs,
      endpointResults,
    };
  }

  private async syncLocationEndpoint(endpoint: string): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      await this.syncService.acquireSyncLock(endpoint);

      const syncDecision = await this.syncService.shouldUseDeltaSync(endpoint);
      const filters: any = {};

      if (syncDecision.useDelta && syncDecision.lastSyncAt) {
        filters.date_modified = syncDecision.lastSyncAt;
        this.logger.log(
          `Using delta sync for ${endpoint} with lastSyncAt: ${syncDecision.lastSyncAt.toISOString()}`,
        );
      } else {
        this.logger.log(
          `Using full sync for ${endpoint}. Reason: ${syncDecision.reason}`,
        );
      }

      // Fetch with retry logic
      const locations = await this.fetchWithRetry(endpoint, filters);

      // Process records
      const result = await this.processLocations(
        endpoint,
        locations,
        syncDecision.useDelta ? 'delta' : 'full',
      );

      const durationMs = Date.now() - startTime;

      // Update sync state
      await this.syncService.recordSyncSuccess(endpoint, {
        recordsCreated: result.created,
        recordsUpdated: result.updated,
        recordsDeleted: result.deleted,
        syncMode: syncDecision.useDelta ? 'delta' : 'full',
        durationMs,
      });

      return { ...result, durationMs };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      await this.syncService.recordSyncFailure(endpoint, error, durationMs);
      throw error;
    } finally {
      await this.syncService.releaseSyncLock(endpoint);
    }
  }

  private async fetchWithRetry(endpoint: string, filters: any): Promise<any[]> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        switch (endpoint) {
          case 'star_systems':
            return await this.uexClient.fetchStarSystems(filters);
          case 'planets':
            return await this.uexClient.fetchPlanets(filters);
          case 'moons':
            return await this.uexClient.fetchMoons(filters);
          case 'cities':
            return await this.uexClient.fetchCities(filters);
          case 'space_stations':
            return await this.uexClient.fetchSpaceStations(filters);
          case 'outposts':
            return await this.uexClient.fetchOutposts(filters);
          case 'poi':
            return await this.uexClient.fetchPOI(filters);
          default:
            throw new Error(`Unknown endpoint: ${endpoint}`);
        }
      } catch (error: any) {
        lastError = error;

        // Don't retry rate limits
        if (error instanceof RateLimitException) {
          this.logger.warn('Rate limit hit, aborting sync');
          throw error;
        }

        // Retry with exponential backoff for server errors
        if (error instanceof UEXServerException) {
          if (attempt < this.maxRetries - 1) {
            const backoffMs = this.backoffBase * Math.pow(2, attempt);
            this.logger.warn(
              `Sync attempt ${attempt + 1} failed for ${endpoint}, ` +
                `retrying in ${backoffMs}ms: ${error.message}`,
            );
            await this.sleep(backoffMs);
            continue;
          }
        }

        // For other errors, throw immediately
        throw error;
      }
    }

    throw lastError!;
  }

  private async processLocations(
    endpoint: string,
    locations: any[],
    syncMode: 'delta' | 'full',
  ): Promise<Omit<SyncResult, 'durationMs'>> {
    switch (endpoint) {
      case 'star_systems':
        return this.syncStarSystems(locations, syncMode);
      case 'planets':
        return this.syncPlanets(locations, syncMode);
      case 'moons':
        return this.syncMoons(locations, syncMode);
      case 'cities':
        return this.syncCities(locations, syncMode);
      case 'space_stations':
        return this.syncSpaceStations(locations, syncMode);
      case 'outposts':
        return this.syncOutposts(locations, syncMode);
      case 'poi':
        return this.syncPOI(locations, syncMode);
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  }

  private async syncStarSystems(
    systems: UEXStarSystemResponse[],
    _syncMode: 'delta' | 'full',
  ): Promise<Omit<SyncResult, 'durationMs'>> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;

    for (const system of systems) {
      const existing = await this.starSystemRepository.findOne({
        where: { uexId: system.id },
      });

      if (existing) {
        await this.starSystemRepository.update(
          { uexId: system.id },
          {
            name: system.name,
            code: system.code,
            isAvailable: system.is_available !== false,
            deleted: false,
            uexDateModified: system.date_modified
              ? new Date(system.date_modified)
              : undefined,
            modifiedById: systemUserId,
          },
        );
        updated++;
      } else {
        await this.starSystemRepository.save({
          uexId: system.id,
          name: system.name,
          code: system.code,
          isAvailable: system.is_available !== false,
          active: true,
          deleted: false,
          uexDateAdded: system.date_added
            ? new Date(system.date_added)
            : undefined,
          uexDateModified: system.date_modified
            ? new Date(system.date_modified)
            : undefined,
          addedById: systemUserId,
          modifiedById: systemUserId,
        });
        created++;
      }
    }

    return { created, updated, deleted: 0 };
  }

  private async syncPlanets(
    planets: UEXPlanetResponse[],
    _syncMode: 'delta' | 'full',
  ): Promise<Omit<SyncResult, 'durationMs'>> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;

    for (const planet of planets) {
      const existing = await this.planetRepository.findOne({
        where: { uexId: planet.id },
      });

      if (existing) {
        await this.planetRepository.update(
          { uexId: planet.id },
          {
            starSystemId: planet.id_star_system,
            name: planet.name,
            code: planet.code,
            isAvailable: planet.is_available !== false,
            isLandable: planet.is_landable || false,
            deleted: false,
            uexDateModified: planet.date_modified
              ? new Date(planet.date_modified)
              : undefined,
            modifiedById: systemUserId,
          },
        );
        updated++;
      } else {
        await this.planetRepository.save({
          uexId: planet.id,
          starSystemId: planet.id_star_system,
          name: planet.name,
          code: planet.code,
          isAvailable: planet.is_available !== false,
          isLandable: planet.is_landable || false,
          active: true,
          deleted: false,
          uexDateAdded: planet.date_added
            ? new Date(planet.date_added)
            : undefined,
          uexDateModified: planet.date_modified
            ? new Date(planet.date_modified)
            : undefined,
          addedById: systemUserId,
          modifiedById: systemUserId,
        });
        created++;
      }
    }

    return { created, updated, deleted: 0 };
  }

  private async syncMoons(
    moons: UEXMoonResponse[],
    _syncMode: 'delta' | 'full',
  ): Promise<Omit<SyncResult, 'durationMs'>> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;

    for (const moon of moons) {
      const existing = await this.moonRepository.findOne({
        where: { uexId: moon.id },
      });

      if (existing) {
        await this.moonRepository.update(
          { uexId: moon.id },
          {
            planetId: moon.id_planet,
            name: moon.name,
            code: moon.code,
            isAvailable: moon.is_available !== false,
            isLandable: moon.is_landable || false,
            deleted: false,
            uexDateModified: moon.date_modified
              ? new Date(moon.date_modified)
              : undefined,
            modifiedById: systemUserId,
          },
        );
        updated++;
      } else {
        await this.moonRepository.save({
          uexId: moon.id,
          planetId: moon.id_planet,
          name: moon.name,
          code: moon.code,
          isAvailable: moon.is_available !== false,
          isLandable: moon.is_landable || false,
          active: true,
          deleted: false,
          uexDateAdded: moon.date_added ? new Date(moon.date_added) : undefined,
          uexDateModified: moon.date_modified
            ? new Date(moon.date_modified)
            : undefined,
          addedById: systemUserId,
          modifiedById: systemUserId,
        });
        created++;
      }
    }

    return { created, updated, deleted: 0 };
  }

  private async syncCities(
    cities: UEXCityResponse[],
    _syncMode: 'delta' | 'full',
  ): Promise<Omit<SyncResult, 'durationMs'>> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;

    for (const city of cities) {
      const existing = await this.cityRepository.findOne({
        where: { uexId: city.id },
      });

      if (existing) {
        await this.cityRepository.update(
          { uexId: city.id },
          {
            planetId: city.id_planet,
            moonId: city.id_moon,
            name: city.name,
            code: city.code,
            isAvailable: city.is_available !== false,
            deleted: false,
            uexDateModified: city.date_modified
              ? new Date(city.date_modified)
              : undefined,
            modifiedById: systemUserId,
          },
        );
        updated++;
      } else {
        await this.cityRepository.save({
          uexId: city.id,
          planetId: city.id_planet,
          moonId: city.id_moon,
          name: city.name,
          code: city.code,
          isAvailable: city.is_available !== false,
          active: true,
          deleted: false,
          uexDateAdded: city.date_added ? new Date(city.date_added) : undefined,
          uexDateModified: city.date_modified
            ? new Date(city.date_modified)
            : undefined,
          addedById: systemUserId,
          modifiedById: systemUserId,
        });
        created++;
      }
    }

    return { created, updated, deleted: 0 };
  }

  private async syncSpaceStations(
    stations: UEXSpaceStationResponse[],
    _syncMode: 'delta' | 'full',
  ): Promise<Omit<SyncResult, 'durationMs'>> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;

    for (const station of stations) {
      const existing = await this.spaceStationRepository.findOne({
        where: { uexId: station.id },
      });

      if (existing) {
        await this.spaceStationRepository.update(
          { uexId: station.id },
          {
            starSystemId: station.id_orbit,
            planetId: station.id_planet,
            moonId: station.id_moon,
            name: station.name,
            code: station.code,
            isAvailable: station.is_available !== false,
            deleted: false,
            uexDateModified: station.date_modified
              ? new Date(station.date_modified)
              : undefined,
            modifiedById: systemUserId,
          },
        );
        updated++;
      } else {
        await this.spaceStationRepository.save({
          uexId: station.id,
          starSystemId: station.id_orbit,
          planetId: station.id_planet,
          moonId: station.id_moon,
          name: station.name,
          code: station.code,
          isAvailable: station.is_available !== false,
          active: true,
          deleted: false,
          uexDateAdded: station.date_added
            ? new Date(station.date_added)
            : undefined,
          uexDateModified: station.date_modified
            ? new Date(station.date_modified)
            : undefined,
          addedById: systemUserId,
          modifiedById: systemUserId,
        });
        created++;
      }
    }

    return { created, updated, deleted: 0 };
  }

  private async syncOutposts(
    outposts: UEXOutpostResponse[],
    _syncMode: 'delta' | 'full',
  ): Promise<Omit<SyncResult, 'durationMs'>> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;

    for (const outpost of outposts) {
      const existing = await this.outpostRepository.findOne({
        where: { uexId: outpost.id },
      });

      if (existing) {
        await this.outpostRepository.update(
          { uexId: outpost.id },
          {
            planetId: outpost.id_planet,
            moonId: outpost.id_moon,
            name: outpost.name,
            code: undefined,
            isAvailable: outpost.is_available !== false,
            deleted: false,
            uexDateModified: outpost.date_modified
              ? new Date(outpost.date_modified)
              : undefined,
            modifiedById: systemUserId,
          },
        );
        updated++;
      } else {
        await this.outpostRepository.save({
          uexId: outpost.id,
          planetId: outpost.id_planet,
          moonId: outpost.id_moon,
          name: outpost.name,
          code: undefined,
          isAvailable: outpost.is_available !== false,
          active: true,
          deleted: false,
          uexDateAdded: outpost.date_added
            ? new Date(outpost.date_added)
            : undefined,
          uexDateModified: outpost.date_modified
            ? new Date(outpost.date_modified)
            : undefined,
          addedById: systemUserId,
          modifiedById: systemUserId,
        });
        created++;
      }
    }

    return { created, updated, deleted: 0 };
  }

  private async syncPOI(
    pois: UEXPOIResponse[],
    _syncMode: 'delta' | 'full',
  ): Promise<Omit<SyncResult, 'durationMs'>> {
    const systemUserId = this.systemUserService.getSystemUserId();
    let created = 0;
    let updated = 0;

    for (const poi of pois) {
      const existing = await this.poiRepository.findOne({
        where: { uexId: poi.id },
      });

      if (existing) {
        await this.poiRepository.update(
          { uexId: poi.id },
          {
            starSystemId: poi.id_star_system,
            planetId: poi.id_planet,
            moonId: poi.id_moon,
            name: poi.name,
            code: undefined,
            type: poi.type,
            isAvailable: poi.is_available !== false,
            deleted: false,
            uexDateModified: poi.date_modified
              ? new Date(poi.date_modified)
              : undefined,
            modifiedById: systemUserId,
          },
        );
        updated++;
      } else {
        await this.poiRepository.save({
          uexId: poi.id,
          starSystemId: poi.id_star_system,
          planetId: poi.id_planet,
          moonId: poi.id_moon,
          name: poi.name,
          code: undefined,
          type: poi.type,
          isAvailable: poi.is_available !== false,
          active: true,
          deleted: false,
          uexDateAdded: poi.date_added ? new Date(poi.date_added) : undefined,
          uexDateModified: poi.date_modified
            ? new Date(poi.date_modified)
            : undefined,
          addedById: systemUserId,
          modifiedById: systemUserId,
        });
        created++;
      }
    }

    return { created, updated, deleted: 0 };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
