FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
RUN pnpm install --filter backend... --frozen-lockfile

FROM base AS build
COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
WORKDIR /app/backend
RUN pnpm run build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
RUN pnpm install --filter backend... --prod --frozen-lockfile

FROM node:20-alpine AS runtime
WORKDIR /app/backend
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S node -G nodejs -u 1001
COPY --from=build /app/backend/dist ./dist
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/package.json ./package.json
USER node
EXPOSE 3001
CMD ["node", "dist/main"]
