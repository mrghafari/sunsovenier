FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache libc6-compat netcat-openbsd

FROM base AS deps

COPY package.json package-lock.json* ./

RUN npm ci --legacy-peer-deps

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM base AS runner

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

USER appuser

EXPOSE 5000

ENV PORT=5000
ENV HOST=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
