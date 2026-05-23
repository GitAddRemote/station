// UexApiClient is the shared HTTP wrapper for all ETL step implementations
// (#190–#199). The legacy per-endpoint clients (UEXCategoriesClient etc.)
// predate this and are not migrated here; new ETL steps inject UexApiClient
// directly and inherit rate-limiting, backoff, and retry automatically.
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import {
  RateLimitException,
  UEXServerException,
  UEXClientException,
} from '../exceptions/uex-exceptions';

// sleep helper (module-local)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface UexApiConfig {
  baseUrl: string;
  requestDelayMs: number;
  timeoutMs: number;
}

interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

@Injectable()
export class UexApiClient {
  private readonly axiosInstance: AxiosInstance;
  private delayMs: number;

  constructor(
    @InjectPinoLogger(UexApiClient.name)
    private readonly logger: PinoLogger,
    private readonly config: UexApiConfig,
  ) {
    this.delayMs = config.requestDelayMs;

    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs,
      headers: {
        'User-Agent': 'Station/1.0',
      },
    });

    this.registerResponseInterceptor();
  }

  private registerResponseInterceptor(): void {
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // After each response, check rate limit remaining header
        const remaining = response.headers['x-ratelimit-remaining'];
        if (remaining !== undefined && Number(remaining) <= 5) {
          this.logger.warn(
            { remaining: Number(remaining), newDelayMs: this.delayMs * 2 },
            'Rate limit remaining low — doubling request delay',
          );
          this.delayMs = this.delayMs * 2;
        }
        return response;
      },
      async (error: AxiosError) => {
        const status = error.response?.status;
        const retryableConfig = error.config as RetryableAxiosRequestConfig;

        // Handle 429 with retry logic
        if (status === 429) {
          const retryCount = retryableConfig?.__retryCount ?? 0;

          if (retryCount >= 3) {
            this.logger.error(
              { retryCount },
              'Max retries reached for 429 rate limit',
            );
            throw new RateLimitException(
              'UEX API rate limit exceeded after maximum retries',
            );
          }

          const retryAfterHeader = error.response?.headers?.['retry-after'];
          const retryAfterSeconds = retryAfterHeader
            ? Number(retryAfterHeader)
            : 5;
          const sleepMs = retryAfterSeconds * 1000 * Math.pow(2, retryCount);

          this.logger.warn(
            { retryCount: retryCount + 1, sleepMs, retryAfterSeconds },
            'Received 429 — sleeping before retry',
          );

          await sleep(sleepMs);

          if (retryableConfig) {
            retryableConfig.__retryCount = retryCount + 1;
            return this.axiosInstance.request(retryableConfig);
          }
        }

        // Handle 5xx errors
        if (status !== undefined && status >= 500) {
          const message = error.message || 'Unknown server error';
          this.logger.error({ status, message }, 'UEX server error');
          throw new UEXServerException(`UEX server error: ${message}`);
        }

        // All other errors
        const message = error.message || 'Unknown client error';
        this.logger.error({ status, message }, 'UEX client error');
        throw new UEXClientException(`UEX request failed: ${message}`);
      },
    );
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    // Apply request delay before every request
    await sleep(this.delayMs);

    this.logger.debug({ path, params }, 'UEX API GET request');

    const response = await this.axiosInstance.get<{ status: string; data: T }>(
      path,
      {
        params,
      },
    );

    return response.data.data;
  }
}
