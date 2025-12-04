import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  RateLimitException,
  UEXServerException,
  UEXClientException,
} from '../exceptions/uex-exceptions';

export interface UEXCategoryResponse {
  id: number;
  type: string;
  section: string;
  name: string;
  is_game_related?: boolean;
  date_added?: string;
  date_modified?: string;
}

export interface UEXCategoryFilters {
  type?: string;
  date_modified?: Date;
}

@Injectable()
export class UEXCategoriesClient {
  private readonly logger = new Logger(UEXCategoriesClient.name);
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
    this.timeout = this.configService.get<number>('UEX_TIMEOUT_MS', 30000);
  }

  async fetchCategories(
    filters?: UEXCategoryFilters,
  ): Promise<UEXCategoryResponse[]> {
    const params: Record<string, string> = {};

    if (filters?.type) {
      params.type = filters.type;
    }

    if (filters?.date_modified) {
      params.date_modified = filters.date_modified.toISOString();
    }

    this.logger.log(
      `Fetching categories from UEX API with filters: ${JSON.stringify(params)}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/categories`, {
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

      const categories = response.data.data || [];
      this.logger.log(`Fetched ${categories.length} categories from UEX API`);

      return categories;
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
        `Failed to fetch categories: ${error.message || 'Unknown error'}`,
      );
    }
  }
}
