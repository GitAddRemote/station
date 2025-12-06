# Repository Guidelines

## Project Overview

- Station is a pnpm workspace monorepo for gaming guild/organization management with a NestJS backend and React frontend.
- RBAC uses JSONB permissions, JWT auth with refresh rotation, and Redis caching with in-memory fallback.
- Public repository: https://github.com/GitAddRemote/station

## Project Structure & Setup

- Monorepo managed with pnpm + Turbo. Backend: `backend/` (NestJS in `src/`, migrations in `src/migrations`, tests in `test/`). Frontend: `frontend/` (React/Vite in `src/`).
- Shared tooling at root (`turbo.json`, `pnpm-workspace.yaml`, `tsconfig.json`, husky hooks); infra in `docker-compose.yml`, `k8s/`, and package `Dockerfile`s.
- Copy env templates before running services: `backend/.env.example`, `frontend/.env.example`.

## Development & Build Commands

- Install once at root: `pnpm install`.
- Run both apps: `pnpm dev`. Scoped dev: `pnpm dev:backend` (http://localhost:3001) and `pnpm dev:frontend` (http://localhost:5173).
- Build: `pnpm build` or `pnpm --filter <pkg> build`.
- Local data stack: `docker-compose up -d` (Postgres 5433, Redis 6379); run `pnpm --filter backend migration:run` after services are healthy.

## Testing & Quality

- Backend tests from `backend/`: `pnpm test`, `pnpm test:e2e`, `pnpm test:watch`, `pnpm test:cov`. Root: `pnpm test`.
- Lint/format/typecheck: `pnpm lint`, `pnpm format`, `pnpm typecheck`.
- E2E requires PostgreSQL running (`docker-compose up -d database`); tests drop/recreate schema (`synchronize: true`, `dropSchema: true`) and run serially.

## Coding Style & Code Quality

- TypeScript everywhere; ESLint configs (`backend/eslint.config.js`, `frontend/.eslintrc.cjs`) and Prettier defaults (2-space indent).
- Naming: `camelCase` vars/functions, `PascalCase` classes/components, `SCREAMING_SNAKE_CASE` constants/envs. Backend follows Nest patterns (`*.module.ts`, `*.service.ts`, `*.controller.ts`); React components live one per file.
- Code quality standards: prioritize scalability, industry best practices, performance (queries/caching/complexity), and modern TS/JS features and patterns.
- Prefer typed DTOs/interfaces; use async/await with explicit HTTP exceptions and validation.

## Architecture Notes

- Backend modules: `auth`, `users`, `organizations`, `roles`, `user-organization-roles`, `permissions`, `audit-logs`; each with module/controller/service/entity/dto/guards.
- Database: PostgreSQL + TypeORM manual migrations (no prod sync). Schema includes users, roles, organizations, user_organization_role (composite indexes), audit_log, refresh_tokens, password_resets. Permissions stored in JSONB.
- Caching: Redis default (`REDIS_HOST:6379`), automatic in-memory fallback; tests force in-memory via `USE_REDIS_CACHE=false`; default TTL 5 minutes. Cached: organization members, aggregated permissions.
- Auth flow: register → login → protected routes with bearer access token (15m) + refresh token (7d) rotation; refresh endpoint issues new pair; logout revokes refresh tokens. Guards: `JwtAuthGuard`, `LocalAuthGuard`, `RefreshTokenAuthGuard`. Passwords hashed with bcrypt (10 rounds), JWT signed with `JWT_SECRET`.
- Audit logging: use `AuditLogsService` to record actions with resource metadata.

## Environment Configuration

- Backend `.env` essentials: `DATABASE_HOST=localhost`, `DATABASE_PORT=5433`, `DATABASE_USER=stationDbUser`, `DATABASE_PASSWORD=stationDbPassword1`, `DATABASE_NAME=stationDb`, `JWT_SECRET`, `REDIS_HOST=localhost`, `REDIS_PORT=6379`, `PORT=3001`, `APP_NAME=STATION BACKEND`, `USE_REDIS_CACHE=true` (false for tests). `.env.test` mirrors `.env` with `USE_REDIS_CACHE=false`.

## Database & Migration Safety

- Commands from `backend/`: `pnpm migration:create src/migrations/YourMigrationName`, `pnpm migration:run`, `pnpm migration:revert`, `pnpm db:backup`, `pnpm db:health-check`, `pnpm seed`. Always create a backup before production migrations.
- Every production migration needs working `up`/`down`, tested rollback (`migration:revert`), pre-migration backup, post-migration health check, and alignment with `backend/src/migrations/templates/PRE_MIGRATION_CHECKLIST.md` plus rollback decision tree in `backend/docs/database/migrations.md`. Use template `backend/src/migrations/templates/migration-template.ts`.

## Husky & Tooling

- lint-staged runs on commit: backend ESLint + Prettier; root Prettier on JSON/MD. Prefer fixing hooks rather than bypassing; `git commit --no-verify` only if necessary.
- Turbo coordinates builds/tests; use `pnpm --filter <package>` for scoped tasks.

## Commit Workflow

- Never commit code directly. Provide git commands only, formatted for terminal execution with `-m` per line, blank lines via `-m ""`, and conventional first-line type (feat/fix/docs/test/refactor/perf/chore). Group related changes with bullet points; no attribution or AI notices. User executes commands manually.

## Common Gotchas

- Ensure database running (`docker-compose up -d database`) before app/tests; port defaults: backend 3001, frontend 5173, Postgres 5433.
- Migration errors: test rollback early; prod uses `migrationsRun: false`.
- Redis connection warnings expected in tests due to in-memory fallback.
- Requires pnpm 8+ and Node 18+ (see package engines).

## Attribution

- Never include AI attribution in code, comments, or commit messages. Code should read as human-written.
