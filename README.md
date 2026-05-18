# Station

Gaming guild and organization management portal. Full-stack TypeScript monorepo — NestJS backend, React frontend, PostgreSQL, Redis.

**Live**: [station.drdnt.org](https://station.drdnt.org) | API: [api.drdnt.org](https://api.drdnt.org)

---

## Production

### Architecture

```
Internet
    │
 Nginx (TLS)
    ├── api.drdnt.org      → NestJS backend (Docker, :3001)
    └── station.drdnt.org  → React frontend (Docker, :3000)
                                   │
                              PostgreSQL + Redis (Docker)

Station-Bot (separate VPS) → api.drdnt.org via OAuth 2.0 Client Credentials
```

Full architecture overview: [docs/architecture.md](docs/architecture.md)

### Deploy

Push a `release/vX.Y.Z` branch — the workflow derives the version from the branch name:

```bash
git checkout -b release/v0.2.0
git push origin release/v0.2.0
```

GitHub Actions validates, builds images, pushes to GHCR, takes a pre-deploy backup, deploys via SSH, and creates the git tag. Full pipeline details: [docs/cicd.md](docs/cicd.md)

### Check service health on the VPS

```bash
ssh deploy@<vps-host>
export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"
docker compose --env-file /opt/station/.env.production -f /opt/station/docker-compose.prod.yml ps
curl -f https://api.drdnt.org/health && echo OK
```

### Documentation

| Document                                                                             | Contents                                                                    |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| [docs/architecture.md](docs/architecture.md)                                         | System diagram, components, data model, scaling                             |
| [docs/deployment.md](docs/deployment.md)                                             | First-time setup, routine deploys, rollback, secrets, common issues         |
| [docs/cicd.md](docs/cicd.md)                                                         | Pipeline diagram, required secrets table, staging setup                     |
| [docs/oauth-m2m.md](docs/oauth-m2m.md)                                               | OAuth 2.0 Client Credentials — curl examples, client registration, security |
| [infra/docs/restore.md](infra/docs/restore.md)                                       | PostgreSQL backup restore runbook and quarterly drill log                   |
| [infra/docs/migration-rollback.md](infra/docs/migration-rollback.md)                 | Migration rollback runbook (fast path + safe path)                          |
| [infra/docs/vps-setup.md](infra/docs/vps-setup.md)                                   | Rootless Docker setup and security properties                               |
| [infra/docs/adr/001-horizontal-scaling.md](infra/docs/adr/001-horizontal-scaling.md) | Scale-out path: vertical → DB separation → multi-node → Kubernetes          |

---

## Local development

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker (for PostgreSQL and Redis)

### Quick start

```bash
git clone https://github.com/GitAddRemote/station.git
cd station
pnpm install

# Start PostgreSQL (port 5433) and Redis (port 6379)
docker-compose up -d

# Copy and configure backend env
cp backend/.env.example backend/.env

# Run migrations
cd backend && pnpm migration:run

# Start both services
cd ..
pnpm dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173
- Swagger: http://localhost:3001/api/docs

### Common commands

```bash
# From root
pnpm dev            # start frontend + backend
pnpm test           # run all tests
pnpm lint           # lint all packages
pnpm typecheck      # type-check all packages
pnpm build          # build all packages

# From backend/
pnpm migration:run      # run pending migrations
pnpm migration:revert   # rollback last migration
pnpm migration:create src/migrations/YourMigrationName
pnpm seed               # seed test data
pnpm test:e2e           # E2E tests (requires database running)
```

### Stack

| Layer    | Technology                                                          |
| -------- | ------------------------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite, Material-UI v6, React Router v6         |
| Backend  | NestJS 10, TypeScript, TypeORM, Passport.js                         |
| Database | PostgreSQL 16                                                       |
| Cache    | Redis 7 (required in production; in-memory fallback for tests only) |
| Auth     | JWT (HttpOnly cookies), refresh token rotation, bcrypt, OAuth 2.0   |
| Infra    | Docker Compose, Nginx, Certbot, Linode, Terraform                   |
| CI/CD    | GitHub Actions, GHCR                                                |
| Monorepo | pnpm workspaces, Turbo                                              |

---

## Authentication

### User login

```
POST /auth/login        → access_token + refresh_token (HttpOnly cookies, 15min / 7 days)
POST /auth/refresh      → rotate both tokens
POST /auth/logout       → revoke refresh token, clear cookies
```

### Machine-to-machine (OAuth 2.0)

```
POST /auth/token        → Bearer token (1 hour)
```

See [docs/oauth-m2m.md](docs/oauth-m2m.md) for details and curl examples.

---

## License

MIT — see [LICENSE](LICENSE).
