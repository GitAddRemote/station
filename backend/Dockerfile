FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

# Copy workspace manifests so pnpm can resolve the full lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY infra/package.json ./infra/

RUN pnpm install --frozen-lockfile --filter backend... --ignore-scripts

COPY backend/ ./backend/
RUN pnpm --filter backend run build

FROM node:22-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

RUN addgroup -S station && adduser -S station -G station

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY infra/package.json ./infra/

RUN pnpm install --frozen-lockfile --filter backend... --prod --ignore-scripts

COPY --from=builder /app/backend/dist ./backend/dist

USER station

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "backend/dist/main.js"]
