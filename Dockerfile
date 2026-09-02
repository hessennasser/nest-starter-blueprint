# Multi-stage build for an optimized production image.
FROM node:20-alpine AS builder
ARG PNPM_VERSION=10.33.2

WORKDIR /app

COPY package*.json pnpm-lock.yaml* ./
COPY tsconfig*.json nest-cli.json ./

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate && \
    pnpm install --frozen-lockfile

COPY src ./src
RUN pnpm build

# ---------------------------------------------------------------------------
FROM node:20-alpine AS production
ARG PNPM_VERSION=10.33.2

RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

COPY package*.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate && \
    pnpm install --prod --frozen-lockfile --ignore-scripts && \
    pnpm store prune

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --chown=nestjs:nodejs public ./public

RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app/uploads

USER nestjs
EXPOSE ${APP_PORT}

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.APP_PORT||3000)+'/'+(process.env.API_PREFIX||'api')+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]

# Run migrations, then the (idempotent) RBAC seed, then boot. A seed failure is
# logged but does not block startup.
CMD ["sh", "-c", "node ./node_modules/typeorm/cli.js migration:run --transaction each -d dist/database/data-source.js && (node dist/database/seeds/seed-rbac.js || echo 'Seed step failed, continuing startup') && node dist/main.js"]
