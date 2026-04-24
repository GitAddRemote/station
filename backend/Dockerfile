FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

RUN addgroup -S station && adduser -S station -G station

COPY package*.json .npmrc ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

USER station

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/main.js"]
