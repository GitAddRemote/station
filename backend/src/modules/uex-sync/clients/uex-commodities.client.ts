import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  RateLimitException,
  UEXServerException,
  UEXClientException,
} from '../exceptions/uex-exceptions';

export interface UEXCommodityResponse {
  id: number;
  id_category?: number;
  name: string;
  code?: string;
  kind?: string;
  section?: string;
  is_raw?: boolean;
  is_harvestable?: boolean;
  is_buyable?: boolean;
  is_sellable?: boolean;
  is_illegal?: boolean;
  is_fuel?: boolean;
  price_buy?: number;
  price_sell?: number;
  scu?: number;
  mass?: number;
  uuid?: string;
  date_added?: number;
  date_modified?: number;
}

export interface UEXCommodityFilters {
  date_modified?: Date;
}

@Injectable()
export class UEXCommoditiesClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(
    @InjectPinoLogger(UEXCommoditiesClient.name)
    private readonly logger: PinoLogger,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'UEX_API_BASE_URL',
      'https://uexcorp.space/api/2.0',
    );
    this.timeout = this.configService.get<number>('UEX_TIMEOUT_MS', 30000);
  }

  async fetchCommodities(
    filters?: UEXCommodityFilters,
  ): Promise<UEXCommodityResponse[]> {
    const params: Record<string, string> = {};

    if (filters?.date_modified) {
      params.date_modified = filters.date_modified.toISOString();
    }

    this.logger.info(
      `Fetching commodities from UEX API with filters: ${JSON.stringify(params)}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/commodities`, {
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

      const commodities = response.data.data || [];
      this.logger.info(
        `Fetched ${commodities.length} commodities from UEX API`,
      );

      return commodities;
    } catch (error: unknown) {
      if (error instanceof RateLimitException) {
        throw error;
      }

      const errorResponse = error as { response?: { status?: number } };
      if (error && (errorResponse.response?.status ?? 0) >= 500) {
        throw new UEXServerException(
          `UEX server error: ${(error instanceof Error ? error.message : 'Unknown error') || 'Unknown error'}`,
        );
      }

      throw new UEXClientException(
        `Failed to fetch commodities: ${(error instanceof Error ? error.message : 'Unknown error') || 'Unknown error'}`,
      );
    }
  }
}
