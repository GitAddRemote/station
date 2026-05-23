// UexApiClient is the shared HTTP wrapper for all ETL step implementations
// (#190–#199). The legacy per-endpoint clients (UEXCategoriesClient etc.)
// predate this and are not migrated here; new ETL steps inject UexApiClient
// directly and inherit rate-limiting, backoff, and retry automatically.

import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import {
  RateLimitException,
  UEXServerException,
  UEXClientException,
} from '../exceptions/uex-exceptions';

export interface UexApiConfig {
  baseUrl: string;
  requestDelayMs: number;
  timeoutMs: number;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class UexApiClient {
  private readonly axiosInstance: AxiosInstance;
  private delayMs: number;

  constructor(
    @InjectPinoLogger(UexApiClient.name) private readonly logger: PinoLogger,
    private readonly config: UexApiConfig,
  ) {
    this.delayMs = config.requestDelayMs;

    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs,
    });

    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        const remaining = response.headers['x-ratelimit-remaining'];
        if (remaining !== undefined && Number(remaining) <= 5) {
          this.delayMs *= 2;
          this.logger.warn(
            { remaining, newDelayMs: this.delayMs },
            'Rate limit headroom low — doubling request delay',
          );
        }
        return response;
      },
      async (error: {
        response?: { status: number; headers: Record<string, string> };
        config: InternalAxiosRequestConfig & { __retryCount?: number };
      }) => {
        const status = error.response?.status;

        if (status === 429) {
          const retryAfterHeader = error.response?.headers['retry-after'];
          const retryAfterSeconds = retryAfterHeader
            ? Number(retryAfterHeader)
            : 5;

          const retryCount = error.config.__retryCount ?? 0;

          if (retryCount < 3) {
            const backoffMs =
              retryAfterSeconds * 1000 * Math.pow(2, retryCount);
            this.logger.warn(
              { retryCount, backoffMs },
              'UEX 429 received — backing off before retry',
            );
            await sleep(backoffMs);
            error.config.__retryCount = retryCount + 1;
            return this.axiosInstance.request(error.config);
          }

          throw new RateLimitException(
            'UEX API rate limit exceeded after retries',
          );
        }

        if (status !== undefined && status >= 500) {
          throw new UEXServerException(`UEX server error: ${status}`);
        }

        throw new UEXClientException(
          `UEX client error: ${status ?? 'unknown'}`,
        );
      },
    );
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    await sleep(this.delayMs);
    const response = await this.axiosInstance.get<{
      status: string;
      data: T;
      message?: string;
    }>(path, { params });

    // UEX returns HTTP 200 with status='error' for soft rate-limit hits
    if (
      response.data.status === 'error' &&
      response.data.message?.includes('requests_limit_reached')
    ) {
      throw new RateLimitException('UEX API rate limit exceeded');
    }

    return response.data.data;
  }
}
