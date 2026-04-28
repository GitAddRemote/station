# Redis Persistence

Station runs Redis with Append-Only File (AOF) persistence enabled in both staging and production.

## Why AOF

Redis is used for token/session-adjacent state and cached permission data. With AOF enabled and `appendfsync everysec`, Redis flushes writes to disk every second. That reduces worst-case data loss on a crash from minutes to roughly one second.

## Compose Configuration

The Redis services use:

- `--appendonly yes`
- `--appendfsync everysec`
- dedicated AOF-backed named volumes:
  - `redis_aof` in production
  - `redis_staging_aof` in staging

## Verify AOF Is Active

Production:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec redis \
  redis-cli -a "${REDIS_PASSWORD}" INFO persistence | grep aof_enabled
```

Staging:

```bash
docker compose --project-name station-staging --env-file .env.staging -f docker-compose.staging.yml exec redis \
  redis-cli -a "${REDIS_PASSWORD}" INFO persistence | grep aof_enabled
```

Expected output:

```text
aof_enabled:1
```

## Inspect AOF File Size

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec redis \
  redis-cli -a "${REDIS_PASSWORD}" INFO persistence | grep aof_current_size
```

## If Redis Data Is Lost

Redis is not the system of record. If the Redis AOF volume is lost:

1. the application should still boot
2. cached permission and organization-member lookups rebuild on demand
3. users may need to sign in again if session-related entries were lost

This is degraded behavior, not a database disaster. No B2 restore flow is required for Redis in the current architecture.
