FROM node:22-alpine AS base
WORKDIR /app

# ??? dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# ??? ???? ? build
COPY . .
RUN npm run build

# ????? runtime
FROM node:22-alpine AS runner
WORKDIR /app

# ????? ???? ? ?????
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# ??? ??????? ?? ????? build
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/shared ./shared
COPY --from=base /app/attached_assets ./attached_assets
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# ????? ??????
RUN chmod +x ./docker-entrypoint.sh && sed -i 's/\r$//' ./docker-entrypoint.sh \
    && chown -R appuser:nodejs /app

USER appuser
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
