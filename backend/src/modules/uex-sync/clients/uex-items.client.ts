import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  RateLimitException,
  UEXServerException,
  UEXClientException,
} from '../exceptions/uex-exceptions';

export interface UEXItemResponse {
  id: number;
  id_category?: number;
  id_company?: number;
  name: string;
  section?: string;
  category?: string;
  company_name?: string;
  size?: string;
  uuid?: string;
  weight_scu?: string | number;
  kind?: string;
  is_buyable?: boolean;
  is_sellable?: boolean;
  date_added?: string;
  date_modified?: string;
}

export interface UEXItemFilters {
  id_category?: number;
  date_modified?: Date;
}

@Injectable()
export class UEXItemsClient {
  private readonly logger = new Logger(UEXItemsClient.name);
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

  async fetchItemsByCategory(
    categoryId: number,
    filters?: Omit<UEXItemFilters, 'id_category'>,
  ): Promise<UEXItemResponse[]> {
    const params: Record<string, string> = {
      id_category: categoryId.toString(),
    };

    if (filters?.date_modified) {
      params.date_modified = filters.date_modified.toISOString();
    }

    this.logger.log(
      `Fetching items for category ${categoryId} from UEX API with filters: ${JSON.stringify(params)}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/items`, {
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

      const items = response.data.data || [];
      this.logger.log(
        `Fetched ${items.length} items for category ${categoryId} from UEX API`,
      );

      return items;
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
        `Failed to fetch items for category ${categoryId}: ${error.message || 'Unknown error'}`,
      );
    }
  }

  async fetchAllItems(filters?: UEXItemFilters): Promise<UEXItemResponse[]> {
    const params: Record<string, string> = {};

    if (filters?.id_category) {
      params.id_category = filters.id_category.toString();
    }

    if (filters?.date_modified) {
      params.date_modified = filters.date_modified.toISOString();
    }

    this.logger.log(
      `Fetching all items from UEX API with filters: ${JSON.stringify(params)}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/items`, {
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

      const items = response.data.data || [];
      this.logger.log(`Fetched ${items.length} items from UEX API`);

      return items;
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
        `Failed to fetch items: ${error.message || 'Unknown error'}`,
      );
    }
  }
}
