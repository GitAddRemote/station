# Repository Guidelines

## Project Structure & Module Organization

- Monorepo managed with pnpm + Turbo. Backend: `backend/` (NestJS app in `src/`, migrations in `src/migrations`, tests in `test/`). Frontend: `frontend/` (React/Vite code in `src/`).
- Shared tooling at root (`turbo.json`, `pnpm-workspace.yaml`, `tsconfig.json`, husky hooks); infra assets live in `docker-compose.yml`, `k8s/`, and package `Dockerfile`s.
- Copy env templates before running services: `backend/.env.example`, `frontend/.env.example`.

## Build, Test, and Development Commands

- Install once at root: `pnpm install`.
- Develop both apps with `pnpm dev`; scope to a package via `pnpm --filter backend dev` or `pnpm --filter frontend dev`.
- Build with `pnpm build` or scoped `pnpm --filter <pkg> build`.
- Tests: `pnpm test` (all), `pnpm --filter backend test`, `pnpm --filter backend test:e2e`, `pnpm --filter backend test:cov`.
- Lint/format/typecheck: `pnpm lint`, `pnpm format`, `pnpm typecheck`. Husky + lint-staged auto-format backend TS on commit.
- Local data stack: `docker-compose up -d` (Postgres 5433, Redis 6379); run `pnpm --filter backend migration:run` after services are healthy.

## Coding Style & Naming Conventions

- TypeScript everywhere; follow ESLint configs (`backend/eslint.config.js`, `frontend/.eslintrc.cjs`) and Prettier defaults (2-space indent).
- Naming: `camelCase` for vars/functions, `PascalCase` for classes/components, `SCREAMING_SNAKE_CASE` for constants/envs. Backend follows Nest patterns (`*.module.ts`, `*.service.ts`, `*.controller.ts`); React components live one per file.
- Prefer typed DTOs/interfaces; use async/await with explicit HTTP exceptions and validation.

## Testing Guidelines

- Backend: Jest specs under `backend/test` or alongside code as `*.spec.ts`; E2E uses `backend/test/jest-e2e.json`. Cover new endpoints/services and add E2E for auth or database flows.
- Frontend: use React Testing Library; place specs next to components as `*.test.tsx`.
- Aim for passing coverage check via `pnpm --filter backend test:cov`; mock external calls in unit tests and reserve real integrations for E2E.

## Commit & Pull Request Guidelines

- Use concise, imperative commits; conventional prefixes (`feat:`, `fix:`, `ci:`) match existing history. One change-set per commit.
- Before a PR: ensure `pnpm lint`, `pnpm test`, and relevant builds succeed; call out migrations or breaking changes.
- PRs should include a short summary, linked issue, and testing notes. Add screenshots/GIFs for UI updates and flag security-sensitive changes (auth, tokens, RBAC).

## Security & Configuration Tips

- Keep secrets out of Git; rely on the env examples and local overrides. Rotate `JWT_SECRET` and database creds outside local dev.
- Confirm CORS + HTTPS settings before deploying. For data debugging, prefer `docker-compose logs -f` and `pnpm --filter backend migration:revert` instead of manual DB edits.
