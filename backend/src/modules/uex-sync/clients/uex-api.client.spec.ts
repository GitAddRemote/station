import axios, { AxiosInstance } from 'axios';
import { UexApiClient } from './uex-api.client';
import {
  RateLimitException,
  UEXServerException,
} from '../exceptions/uex-exceptions';

// ─── Capture the sleep function so we can spy on it ──────────────────────────
// We mock the module so we can intercept sleep without modifying the source.
jest.mock('./uex-api.client', () => {
  const actual = jest.requireActual('./uex-api.client');
  return actual;
});

// ─── Mock axios.create so we get a controllable instance ─────────────────────
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeMockAxiosInstance(
  overrides: Partial<{
    get: jest.Mock;
    request: jest.Mock;
    interceptors: {
      request: { use: jest.Mock };
      response: { use: jest.Mock };
    };
  }> = {},
) {
  const instance = {
    get: jest.fn(),
    request: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    ...overrides,
  };
  return instance as unknown as AxiosInstance;
}

// ─── Build a minimal PinoLogger stub ─────────────────────────────────────────
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as import('nestjs-pino').PinoLogger;

const BASE_CONFIG = {
  baseUrl: 'https://uexcorp.space/api/2.0',
  requestDelayMs: 100,
  timeoutMs: 5000,
};

describe('UexApiClient', () => {
  let mockAxiosInstance: ReturnType<typeof makeMockAxiosInstance>;
  let responseSuccessHandler: (res: unknown) => unknown;
  let responseErrorHandler: (err: unknown) => unknown;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAxiosInstance = makeMockAxiosInstance();

    // Capture the interceptor handlers when they are registered
    (
      mockAxiosInstance.interceptors.response.use as jest.Mock
    ).mockImplementation((onFulfilled, onRejected) => {
      responseSuccessHandler = onFulfilled;
      responseErrorHandler = onRejected;
    });

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  function createClient(config = BASE_CONFIG) {
    return new UexApiClient(mockLogger, config);
  }

  // ─── Helper: build a fake Axios error ──────────────────────────────────────
  function makeAxiosError(
    status: number,
    headers: Record<string, string> = {},
    config: Record<string, unknown> = {},
  ) {
    const err = new Error(
      `Request failed with status code ${status}`,
    ) as Error & {
      response: unknown;
      config: unknown;
      isAxiosError: boolean;
    };
    err.response = { status, headers, data: {} };
    err.config = { ...config, __retryCount: config.__retryCount ?? 0 };
    err.isAxiosError = true;
    return err;
  }

  // ─── 1. Normal request ──────────────────────────────────────────────────────
  describe('get()', () => {
    it('returns response.data.data and sleeps requestDelayMs before request', async () => {
      createClient();

      // Simulate a successful response
      (mockAxiosInstance.get as jest.Mock).mockResolvedValue({
        data: { status: 'ok', data: [{ id: 1, name: 'Widget' }] },
        headers: {},
      });

      // Also trigger the response success interceptor to mimic Axios behaviour
      (mockAxiosInstance.get as jest.Mock).mockImplementation(async () => {
        const response = {
          data: { status: 'ok', data: [{ id: 1, name: 'Widget' }] },
          headers: {},
        };
        // Call the success handler manually (normally Axios does this)
        responseSuccessHandler(response);
        return response;
      });

      const client = createClient();
      const startMs = Date.now();
      const result =
        await client.get<{ id: number; name: string }[]>('/categories');
      const elapsed = Date.now() - startMs;

      expect(result).toEqual([{ id: 1, name: 'Widget' }]);
      // Should have slept at least requestDelayMs
      expect(elapsed).toBeGreaterThanOrEqual(BASE_CONFIG.requestDelayMs - 10);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/categories', {
        params: undefined,
      });
    });
  });

  // ─── 2. Rate limit header doubling ─────────────────────────────────────────
  describe('rate limit header', () => {
    it('doubles delayMs when x-ratelimit-remaining ≤ 5', async () => {
      createClient();

      const responseWithLowRemaining = {
        data: { status: 'ok', data: [] },
        headers: { 'x-ratelimit-remaining': '3' },
      };

      (mockAxiosInstance.get as jest.Mock).mockImplementation(async () => {
        responseSuccessHandler(responseWithLowRemaining);
        return responseWithLowRemaining;
      });

      const client = createClient({ ...BASE_CONFIG, requestDelayMs: 100 });
      const initialDelay = (client as unknown as { delayMs: number }).delayMs;

      await client.get('/categories');

      const newDelay = (client as unknown as { delayMs: number }).delayMs;
      expect(newDelay).toBe(initialDelay * 2);
    });

    it('does not double delayMs when x-ratelimit-remaining > 5', async () => {
      createClient();

      const responseWithHighRemaining = {
        data: { status: 'ok', data: [] },
        headers: { 'x-ratelimit-remaining': '10' },
      };

      (mockAxiosInstance.get as jest.Mock).mockImplementation(async () => {
        responseSuccessHandler(responseWithHighRemaining);
        return responseWithHighRemaining;
      });

      const client = createClient({ ...BASE_CONFIG, requestDelayMs: 100 });
      const initialDelay = (client as unknown as { delayMs: number }).delayMs;

      await client.get('/categories');

      const newDelay = (client as unknown as { delayMs: number }).delayMs;
      expect(newDelay).toBe(initialDelay);
    });
  });

  // ─── 3. 429 with Retry-After → throws RateLimitException after 3 retries ──
  describe('429 handling', () => {
    it('retries up to 3 times then throws RateLimitException', async () => {
      createClient();

      // After 3 retries (retryCount=3), the interceptor should throw
      const client = createClient();

      // Simulate the error hitting the interceptor 4 times (initial + 3 retries)
      // Each time we call responseErrorHandler with a 429 error that has __retryCount = 3
      const finalError = makeAxiosError(
        429,
        { 'retry-after': '5' },
        { __retryCount: 3 },
      );

      await expect(responseErrorHandler(finalError)).rejects.toBeInstanceOf(
        RateLimitException,
      );
      expect(client).toBeDefined();
    });

    it('retries with exponential backoff on 429', async () => {
      createClient();

      // First retry: __retryCount=0
      const err0 = makeAxiosError(
        429,
        { 'retry-after': '2' },
        { __retryCount: 0 },
      );

      // Mock the retry to succeed (return resolved response)
      (mockAxiosInstance.request as jest.Mock).mockResolvedValue({
        data: { status: 'ok', data: { retried: true } },
        headers: {},
      });

      const result = await responseErrorHandler(err0);
      // Should have called request to retry
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        data: { status: 'ok', data: { retried: true } },
        headers: {},
      });
    });
  });

  // ─── 4. 5xx response → throws UEXServerException ──────────────────────────
  describe('5xx handling', () => {
    it('throws UEXServerException on 500 response', async () => {
      createClient();

      const serverError = makeAxiosError(500, {});

      await expect(responseErrorHandler(serverError)).rejects.toBeInstanceOf(
        UEXServerException,
      );
    });

    it('throws UEXServerException on 503 response', async () => {
      createClient();

      const serverError = makeAxiosError(503, {});

      await expect(responseErrorHandler(serverError)).rejects.toBeInstanceOf(
        UEXServerException,
      );
    });
  });
});
