FROM node:22-alpine AS builder

ENV HUSKY=0

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

# Copy workspace manifests so pnpm can resolve the full lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY infra/package.json ./infra/

RUN pnpm install --frozen-lockfile --filter frontend...

COPY frontend/ ./frontend/
RUN pnpm --filter frontend run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

COPY --from=builder /app/frontend/build /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8080 || exit 1
