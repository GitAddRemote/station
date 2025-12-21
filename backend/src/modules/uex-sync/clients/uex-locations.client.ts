import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  RateLimitException,
  UEXServerException,
  UEXClientException,
} from '../exceptions/uex-exceptions';

export interface UEXStarSystemResponse {
  id: number;
  name: string;
  code: string;
  is_available?: boolean;
  is_visible?: boolean;
  date_added?: string;
  date_modified?: string;
}

export interface UEXOrbitResponse {
  id: number;
  id_star_system: number;
  name: string;
  code?: string;
  is_available?: boolean;
  is_visible?: boolean;
  is_default?: boolean;
  is_lagrange?: boolean;
  is_man_made?: boolean;
  is_asteroid?: boolean;
  is_planet?: boolean;
  is_star?: boolean;
  is_jump_point?: boolean;
  date_added?: string;
  date_modified?: string;
}

export interface UEXPlanetResponse {
  id: number;
  id_star_system: number;
  name: string;
  code?: string;
  is_available?: boolean;
  is_landable?: boolean;
  date_added?: string;
  date_modified?: string;
}

export interface UEXMoonResponse {
  id: number;
  id_planet: number;
  id_star_system: number;
  name: string;
  code?: string;
  is_available?: boolean;
  is_landable?: boolean;
  date_added?: string;
  date_modified?: string;
}

export interface UEXCityResponse {
  id: number;
  id_planet?: number;
  id_moon?: number;
  name: string;
  code?: string;
  is_available?: boolean;
  date_added?: string;
  date_modified?: string;
}

export interface UEXSpaceStationResponse {
  id: number;
  id_orbit?: number;
  id_planet?: number;
  id_moon?: number;
  name: string;
  code?: string;
  is_available?: boolean;
  date_added?: string;
  date_modified?: string;
}

export interface UEXOutpostResponse {
  id: number;
  id_planet?: number;
  id_moon?: number;
  name: string;
  is_available?: boolean;
  date_added?: string;
  date_modified?: string;
}

export interface UEXPOIResponse {
  id: number;
  id_star_system?: number;
  id_planet?: number;
  id_moon?: number;
  id_orbit?: number;
  id_space_station?: number;
  id_city?: number;
  id_outpost?: number;
  name: string;
  type?: string;
  is_available?: boolean;
  date_added?: string;
  date_modified?: string;
}

export interface UEXLocationFilters {
  date_modified?: Date;
}

@Injectable()
export class UEXLocationsClient {
  private readonly logger = new Logger(UEXLocationsClient.name);
  private readonly baseUrl: string;
  private readonly timeout: number;

  private readonly endpoints = {
    star_systems: '/star_systems',
    orbits: '/orbits',
    planets: '/planets',
    moons: '/moons',
    cities: '/cities',
    space_stations: '/space_stations',
    outposts: '/outposts',
    poi: '/poi',
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'UEX_API_BASE_URL',
      'https://uexcorp.space/api/2.0',
    );
    this.timeout = this.configService.get<number>('UEX_TIMEOUT_MS', 30000);
  }

  async fetchStarSystems(
    filters?: UEXLocationFilters,
  ): Promise<UEXStarSystemResponse[]> {
    return this.fetchLocations<UEXStarSystemResponse>('star_systems', filters);
  }

  async fetchOrbits(filters?: UEXLocationFilters): Promise<UEXOrbitResponse[]> {
    return this.fetchLocations<UEXOrbitResponse>('orbits', filters);
  }

  async fetchPlanets(
    filters?: UEXLocationFilters,
  ): Promise<UEXPlanetResponse[]> {
    return this.fetchLocations<UEXPlanetResponse>('planets', filters);
  }

  async fetchMoons(filters?: UEXLocationFilters): Promise<UEXMoonResponse[]> {
    return this.fetchLocations<UEXMoonResponse>('moons', filters);
  }

  async fetchCities(filters?: UEXLocationFilters): Promise<UEXCityResponse[]> {
    return this.fetchLocations<UEXCityResponse>('cities', filters);
  }

  async fetchSpaceStations(
    filters?: UEXLocationFilters,
  ): Promise<UEXSpaceStationResponse[]> {
    return this.fetchLocations<UEXSpaceStationResponse>(
      'space_stations',
      filters,
    );
  }

  async fetchOutposts(
    filters?: UEXLocationFilters,
  ): Promise<UEXOutpostResponse[]> {
    return this.fetchLocations<UEXOutpostResponse>('outposts', filters);
  }

  async fetchPOI(filters?: UEXLocationFilters): Promise<UEXPOIResponse[]> {
    return this.fetchLocations<UEXPOIResponse>('poi', filters);
  }

  private async fetchLocations<T>(
    endpoint: keyof typeof this.endpoints,
    filters?: UEXLocationFilters,
  ): Promise<T[]> {
    const params: Record<string, string> = {};

    if (filters?.date_modified) {
      params.date_modified = filters.date_modified.toISOString();
    }

    this.logger.log(
      `Fetching ${endpoint} from UEX API with filters: ${JSON.stringify(params)}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}${this.endpoints[endpoint]}`, {
          params,
          timeout: this.timeout,
          headers: {
            'User-Agent': 'Station/1.0',
          },
        }),
      );

      // Check for rate limit in response
      if (
        response.data.status === 'error' &&
        response.data.message?.includes('requests_limit_reached')
      ) {
        throw new RateLimitException('UEX API rate limit exceeded');
      }

      const locations = response.data.data || [];
      this.logger.log(`Fetched ${locations.length} ${endpoint} from UEX API`);

      return locations;
    } catch (error: any) {
      if (error instanceof RateLimitException) {
        throw error;
      }

      if (error.response?.status >= 500) {
        throw new UEXServerException(
          `UEX server error: ${error.message || 'Unknown error'}`,
        );
      }

      throw new UEXClientException(
        `Failed to fetch ${endpoint}: ${error.message || 'Unknown error'}`,
      );
    }
  }
}
