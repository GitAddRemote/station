# Architecture

Station is a full-stack monorepo for gaming guild and organization management. This document describes how the production system is structured and why.

---

## System diagram

```
Internet
    │
    ▼
 Nginx (VPS host, port 80/443, TLS via Certbot)
    │
    ├── api.drdnt.org         ──► Station Backend  (Docker, localhost:3001)
    │                                  │
    │                             ┌────┴──────────────────┐
    │                             │  PostgreSQL 16 (Docker) │
    │                             │  Redis 7 (Docker, AOF)  │
    │                             └───────────────────────┘
    │
    ├── station.drdnt.org     ──► Station Frontend (Docker, localhost:3000)
    │
    └── bot.drdnt.org         ──► (reserved — Terraform A record + Nginx config managed)


Station-Bot (separate Linode VPS, own Docker Compose stack)
    │
    └── POST /auth/token  ──► Station Backend (OAuth 2.0 Client Credentials)
```

The core Station web stack (backend, frontend, PostgreSQL, Redis) runs on a single Linode VPS (4 GB RAM, 2 vCPU) using rootless Docker Compose under the `deploy` user. Station-Bot runs on a separate VPS and connects via the API only — it does not share the database. See [infra/docs/vps-setup.md](../infra/docs/vps-setup.md) for the rootless Docker setup and security properties.

---

## Components

### Nginx

Handles TLS termination and reverse-proxies to the two Docker services. Both services bind to `127.0.0.1` only — they are not reachable from the internet except through Nginx.

TLS certificates are issued by Let's Encrypt via Certbot and auto-renewed by a systemd timer.

### Station Backend (NestJS)

The REST API. Stateless — all session state is stored in Redis or PostgreSQL, never in process memory. This means the backend can be replaced, restarted, or eventually scaled horizontally without session loss.

Key modules:

| Module                    | Responsibility                                                                  |
| ------------------------- | ------------------------------------------------------------------------------- |
| `auth`                    | JWT login, refresh token rotation, password reset, OAuth 2.0 Client Credentials |
| `users`                   | User accounts with extended profiles                                            |
| `organizations`           | Guild/organization CRUD                                                         |
| `roles`                   | Role definitions with JSONB permissions                                         |
| `user-organization-roles` | Many-to-many: users ↔ organizations ↔ roles                                   |
| `permissions`             | Permission aggregation with Redis caching                                       |
| `oauth-clients`           | M2M client registry (bcrypt secrets, scope enforcement)                         |
| `audit-logs`              | Append-only activity log                                                        |

### Station Frontend (React + Vite)

A single-page application served by Nginx inside a Docker container. The build artifact is static HTML/JS/CSS — the frontend container serves files and does not run Node.js in production. API host is derived from the current hostname at runtime (e.g. `station.drdnt.org` → `api.drdnt.org`).

### PostgreSQL 16

Primary data store. Managed by TypeORM with manual migrations (no `synchronize: true` in production). Data is persisted to a named Docker volume (`postgres_data`). Backed up nightly to Backblaze B2 and before every deploy. See [infra/docs/backups.md](../infra/docs/backups.md) and [infra/docs/restore.md](../infra/docs/restore.md).

### Redis 7

Used for refresh token storage, JTI blacklisting, and permission caching (5–15 minute TTL). Configured with AOF persistence (`appendfsync everysec`) so cached data survives container restarts. Requires auth (`REDIS_PASSWORD`). **Redis is required in production** — if `USE_REDIS_CACHE=true` (the default) and the Redis connection fails, the backend will throw during startup rather than fall back silently. The in-memory fallback is only for the test environment (`USE_REDIS_CACHE=false`). See [infra/docs/redis.md](../infra/docs/redis.md).

### Station-Bot

A separate Discord bot codebase (GitAddRemote/station-bot repo, Presstronic/station-bot container). It runs on its own VPS and communicates with Station via the OAuth 2.0 Client Credentials flow — it does not share the database directly.

---

## Authentication flows

### User authentication (human login)

1. `POST /auth/login` with `username` + `password` (form body or JSON)
2. Backend validates credentials, returns `access_token` (15 min, HttpOnly cookie) + `refresh_token` (7 days, HttpOnly cookie)
3. Protected routes read the cookie automatically — no manual header management needed in the browser
4. `POST /auth/refresh` rotates both tokens; old refresh token is invalidated
5. `POST /auth/logout` revokes the refresh token and clears both cookies

### Machine-to-machine (Station-Bot → Station Backend)

Station-Bot uses OAuth 2.0 Client Credentials (RFC 6749 §4.4). See [docs/oauth-m2m.md](oauth-m2m.md) for the full flow with curl examples.

---

## Data model

```
PostgreSQL
  users ──────────────────────────────────────────────┐
    │                                                  │
    ├── password_resets (time-limited reset tokens)    │
    └── user_organization_role ──── organizations ─────┘
             │                           │
             └── roles (JSONB perms)     └── audit_log

  oauth_clients (M2M registry, bcrypt secrets)

Redis
  refresh:{jti}   → refresh token store / revocation (7-day TTL)
  session:{sid}   → session state
  permissions:*   → aggregated permission cache (5–15 min TTL)
```

Refresh tokens were moved from PostgreSQL to Redis (`DropRefreshTokensTable` migration). The `permissions` field on `role` is JSONB, allowing flexible per-role permission sets without schema changes. The `permissions` module aggregates all of a user's roles within an organization and caches the result in Redis.

---

## Infrastructure

Provisioned with Terraform (Linode provider). See `infra/terraform/` for the module.

- **VPS**: `g6-standard-2` (4 GB RAM, 2 vCPU, 80 GB SSD) — resizable via Linode Cloud Manager
- **SSH key**: `deploy` user, rootless Docker, no root access from CI/CD
- **Backups**: Backblaze B2 via rclone, nightly + pre-deploy
- **DNS**: Managed in Terraform (`infra/terraform/dns.tf`) — the `drdnt.org` zone and `api`, `station`, and `bot` A records are all Terraform resources

See [infra/docs/vps-setup.md](../infra/docs/vps-setup.md) for security properties and [infra/docs/adr/001-horizontal-scaling.md](../infra/docs/adr/001-horizontal-scaling.md) for the documented scale-out path.

---

## Scaling

The current single-VPS setup is appropriate for roughly 200–500 concurrent users. For the full scale-out plan — vertical → database separation → Redis separation → second app node → Kubernetes threshold — see [infra/docs/adr/001-horizontal-scaling.md](../infra/docs/adr/001-horizontal-scaling.md).
