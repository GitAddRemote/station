import { UexApiClient, UexApiConfig } from './uex-api.client';
import {
  RateLimitException,
  UEXServerException,
  UEXClientException,
} from '../exceptions/uex-exceptions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<UexApiConfig> = {}): UexApiConfig {
  return {
    baseUrl: 'https://uexcorp.space/api/2.0',
    requestDelayMs: 100,
    timeoutMs: 5000,
    ...overrides,
  };
}

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UexApiClient', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('get()', () => {
    it('sleeps for requestDelayMs then returns response.data.data', async () => {
      const client = new UexApiClient(
        makeLogger() as never,
        makeConfig({ requestDelayMs: 200 }),
      );

      // Patch the internal axios instance
      const fakeData = [{ id: 1, name: 'test' }];
      const axiosGet = jest
        .spyOn(
          (client as unknown as { axiosInstance: { get: jest.Mock } })
            .axiosInstance,
          'get',
        )
        .mockResolvedValueOnce({
          data: { data: fakeData },
          headers: {},
          status: 200,
        });

      // Start the call but don't await yet — it will be blocked on sleep(200)
      const promise = client.get('/categories');

      // Advance timers past the sleep
      jest.advanceTimersByTime(200);

      const result = await promise;

      expect(result).toEqual(fakeData);
      expect(axiosGet).toHaveBeenCalledWith('/categories', {
        params: undefined,
      });
    });

    it('doubles delayMs when x-ratelimit-remaining ≤ 5', async () => {
      const config = makeConfig({ requestDelayMs: 100 });
      const client = new UexApiClient(makeLogger() as never, config);

      const axiosInstance = (
        client as unknown as {
          axiosInstance: {
            get: jest.Mock;
            interceptors: {
              response: {
                handlers: Array<{ fulfilled: (r: unknown) => unknown }>;
              };
            };
          };
        }
      ).axiosInstance;

      // Trigger the response interceptor manually to simulate a low-remaining header
      const responseInterceptor =
        axiosInstance.interceptors.response.handlers[0].fulfilled;

      const fakeResponse = {
        data: { data: [] },
        headers: { 'x-ratelimit-remaining': '3' },
        status: 200,
      };

      const returned = responseInterceptor(fakeResponse);
      expect(returned).toBe(fakeResponse);

      // delayMs should be doubled
      expect((client as unknown as { delayMs: number }).delayMs).toBe(200);
    });

    it('does NOT double delayMs when x-ratelimit-remaining > 5', async () => {
      const config = makeConfig({ requestDelayMs: 100 });
      const client = new UexApiClient(makeLogger() as never, config);

      const axiosInstance = (
        client as unknown as {
          axiosInstance: {
            interceptors: {
              response: {
                handlers: Array<{ fulfilled: (r: unknown) => unknown }>;
              };
            };
          };
        }
      ).axiosInstance;
      const responseInterceptor =
        axiosInstance.interceptors.response.handlers[0].fulfilled;

      responseInterceptor({
        data: { data: [] },
        headers: { 'x-ratelimit-remaining': '10' },
        status: 200,
      });

      expect((client as unknown as { delayMs: number }).delayMs).toBe(100);
    });
  });

  describe('response interceptor error handling', () => {
    it('throws RateLimitException immediately when retryCount >= 3 (max retries exhausted)', async () => {
      const client = new UexApiClient(makeLogger() as never, makeConfig());

      const axiosInstance = (
        client as unknown as {
          axiosInstance: {
            interceptors: {
              response: {
                handlers: Array<{ rejected: (e: unknown) => unknown }>;
              };
            };
          };
        }
      ).axiosInstance;

      const errorInterceptor =
        axiosInstance.interceptors.response.handlers[0].rejected;

      // When __retryCount is already 3 (>= 3), no further retries — throws immediately
      const error = {
        response: { status: 429, headers: { 'retry-after': '1' } },
        config: { __retryCount: 3 },
      };

      await expect(errorInterceptor(error)).rejects.toBeInstanceOf(
        RateLimitException,
      );
    });

    it('schedules a retry when 429 and retryCount < 3', async () => {
      const client = new UexApiClient(makeLogger() as never, makeConfig());

      const axiosInstance = (
        client as unknown as {
          axiosInstance: {
            request: jest.Mock;
            interceptors: {
              response: {
                handlers: Array<{ rejected: (e: unknown) => unknown }>;
              };
            };
          };
        }
      ).axiosInstance;

      const errorInterceptor =
        axiosInstance.interceptors.response.handlers[0].rejected;

      // Mock request to return a resolved value (simulating a successful retry)
      const fakeResult = { data: { data: [] }, headers: {}, status: 200 };
      axiosInstance.request = jest.fn().mockResolvedValue(fakeResult);

      const error = {
        response: { status: 429, headers: { 'retry-after': '0' } },
        config: { __retryCount: 0 },
      };

      const promise = errorInterceptor(error);
      // Advance fake timers to let sleep(0) resolve
      jest.runAllTimers();

      const result = await promise;
      expect(result).toBe(fakeResult);
      expect(axiosInstance.request).toHaveBeenCalledTimes(1);
      // __retryCount should have been incremented to 1
      expect(
        (axiosInstance.request as jest.Mock).mock.calls[0][0].__retryCount,
      ).toBe(1);
    });

    it('throws UEXServerException on 5xx response', async () => {
      const client = new UexApiClient(makeLogger() as never, makeConfig());

      const axiosInstance = (
        client as unknown as {
          axiosInstance: {
            interceptors: {
              response: {
                handlers: Array<{ rejected: (e: unknown) => unknown }>;
              };
            };
          };
        }
      ).axiosInstance;

      const errorInterceptor =
        axiosInstance.interceptors.response.handlers[0].rejected;

      await expect(
        errorInterceptor({
          response: { status: 503, headers: {} },
          config: {},
        }),
      ).rejects.toBeInstanceOf(UEXServerException);
    });

    it('throws UEXClientException on other errors', async () => {
      const client = new UexApiClient(makeLogger() as never, makeConfig());

      const axiosInstance = (
        client as unknown as {
          axiosInstance: {
            interceptors: {
              response: {
                handlers: Array<{ rejected: (e: unknown) => unknown }>;
              };
            };
          };
        }
      ).axiosInstance;

      const errorInterceptor =
        axiosInstance.interceptors.response.handlers[0].rejected;

      await expect(
        errorInterceptor({
          response: { status: 400, headers: {} },
          config: {},
        }),
      ).rejects.toBeInstanceOf(UEXClientException);
    });
  });
});
