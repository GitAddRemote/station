import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  RateLimitException,
  UEXServerException,
  UEXClientException,
} from '../exceptions/uex-exceptions';

export interface UEXCompanyResponse {
  id: number;
  id_faction?: number;
  name: string;
  nickname?: string;
  wiki?: string | null;
  industry?: string | null;
  is_item_manufacturer?: number;
  is_vehicle_manufacturer?: number;
  date_added?: number; // timestamp (seconds)
  date_modified?: number; // timestamp (seconds)
}

export interface UEXCompanyFilters {
  is_item_manufacturer?: number;
  is_vehicle_manufacturer?: number;
}

@Injectable()
export class UEXCompaniesClient {
  private readonly logger = new Logger(UEXCompaniesClient.name);
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'UEX_API_BASE_URL',
      'https://uexcorp.space/api/2.0',
    );
    this.timeout = this.configService.get<number>('UEX_TIMEOUT_MS', 60000);
  }

  async fetchCompanies(
    filters?: UEXCompanyFilters,
  ): Promise<UEXCompanyResponse[]> {
    const params: Record<string, string> = {};

    if (filters?.is_item_manufacturer !== undefined) {
      params.is_item_manufacturer = String(filters.is_item_manufacturer);
    }
    if (filters?.is_vehicle_manufacturer !== undefined) {
      params.is_vehicle_manufacturer = String(filters.is_vehicle_manufacturer);
    }

    this.logger.log(
      `Fetching companies from UEX API with filters: ${JSON.stringify(params)}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/companies`, {
          params,
          timeout: this.timeout,
          headers: {
            'User-Agent': 'Station/1.0',
          },
        }),
      );

      if (
        response.data.status === 'error' &&
        response.data.message?.includes('requests_limit_reached')
      ) {
        throw new RateLimitException('UEX API rate limit exceeded');
      }

      const companies = response.data.data || [];
      this.logger.log(`Fetched ${companies.length} companies from UEX API`);

      return companies;
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
        `Failed to fetch companies: ${error.message || 'Unknown error'}`,
      );
    }
  }
}
