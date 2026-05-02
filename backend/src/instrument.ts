import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  environment: process.env['NODE_ENV'],
  release: process.env['SENTRY_RELEASE'],
  // Explicit opt-in: no DSN → SDK is a no-op, no errors thrown at startup.
  enabled: !!process.env['SENTRY_DSN'],
  tracesSampleRate: 0.1,
});
