import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  APP_NAME: Joi.string().default('STATION BACKEND'),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),

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

  // CORS / Frontend
  ALLOWED_ORIGIN: Joi.string().uri().default('http://localhost:5173'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),

  // UEX Sync (all optional — service degrades gracefully when disabled)
  UEX_SYNC_ENABLED: Joi.string().valid('true', 'false').default('false'),
  UEX_CATEGORIES_SYNC_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  UEX_ITEMS_SYNC_ENABLED: Joi.string().valid('true', 'false').default('false'),
  UEX_LOCATIONS_SYNC_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('false'),
  UEX_API_BASE_URL: Joi.string().uri().default('https://uexcorp.space/api/2.0'),
  UEX_TIMEOUT_MS: Joi.number().default(60000),
  UEX_BATCH_SIZE: Joi.number().default(100),
  UEX_CONCURRENT_CATEGORIES: Joi.number().default(3),
  UEX_RETRY_ATTEMPTS: Joi.number().default(3),
  UEX_BACKOFF_BASE_MS: Joi.number().default(1000),
  UEX_RATE_LIMIT_PAUSE_MS: Joi.number().default(2000),
  UEX_ENDPOINTS_PAUSE_MS: Joi.number().default(2000),
  UEX_API_KEY: Joi.string().allow('').default(''),
});
