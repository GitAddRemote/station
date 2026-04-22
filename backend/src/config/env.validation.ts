import * as Joi from 'joi';
import { DEFAULT_CLEANUP_CRON } from '../modules/auth/token-cleanup.constants';

export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  APP_NAME: Joi.string().default('STATION BACKEND'),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),

  // Database
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5433),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  USE_REDIS_CACHE: Joi.string().valid('true', 'false').default('true'),

  // CORS / Frontend — required in production; default to localhost in dev/test
  ALLOWED_ORIGIN: Joi.string()
    .uri()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string().uri().default('http://localhost:5173'),
    }),
  FRONTEND_URL: Joi.string()
    .uri()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.string().uri().default('http://localhost:5173'),
    }),

  // UEX Sync (all optional — service degrades gracefully when disabled)
  // Use Joi.boolean() so env strings like 'false' are coerced to actual
  // booleans; configService.get<boolean>(...) in the scheduler relies on this.
  UEX_SYNC_ENABLED: Joi.boolean().default(false),
  UEX_CATEGORIES_SYNC_ENABLED: Joi.boolean().default(false),
  UEX_ITEMS_SYNC_ENABLED: Joi.boolean().default(false),
  UEX_LOCATIONS_SYNC_ENABLED: Joi.boolean().default(false),
  UEX_API_BASE_URL: Joi.string().uri().default('https://uexcorp.space/api/2.0'),
  UEX_TIMEOUT_MS: Joi.number().default(60000),
  UEX_BATCH_SIZE: Joi.number().default(100),
  UEX_CONCURRENT_CATEGORIES: Joi.number().default(3),
  UEX_RETRY_ATTEMPTS: Joi.number().default(3),
  UEX_BACKOFF_BASE_MS: Joi.number().default(1000),
  UEX_RATE_LIMIT_PAUSE_MS: Joi.number().default(2000),
  UEX_ENDPOINTS_PAUSE_MS: Joi.number().default(2000),
  UEX_API_KEY: Joi.string().allow('').default(''),

  // Token cleanup scheduler (optional — defaults to 3 AM daily)
  REFRESH_TOKEN_CLEANUP_CRON: Joi.string().default(DEFAULT_CLEANUP_CRON),
});
