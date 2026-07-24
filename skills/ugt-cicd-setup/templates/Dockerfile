# Org-standard 3-stage Next.js Dockerfile (Node 22 / Alpine)
# Stage names matter: the Jenkinsfile builds `--target builder` as a separate
# image used for `prisma migrate deploy` at deploy time.
#
# Placeholders: __PROJECT_DISPLAY_NAME__, __BASE_PATH_PROD__
# [DB] lines are optional — delete if the project has no Prisma/database.

# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# libc compatibility for native modules (e.g. mssql) — keep unless proven unneeded
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
# Prevent husky from failing (`npm ci` runs the prepare script; no .git dir in Docker)
ENV HUSKY=0
RUN npm ci --include=optional


# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (PUBLIC/client-side only — baked into the JS bundle).
# These MUST arrive as --build-arg from the Jenkinsfile; runtime environment
# injection has NO effect on client-side vars.
ARG NEXT_PUBLIC_BASE_PATH=__BASE_PATH_PROD__
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME=__PROJECT_DISPLAY_NAME__
# [SENTRY] delete this ARG if the project has no Sentry
ARG NEXT_PUBLIC_SENTRY_DSN

ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    # [SENTRY] delete the next line if the project has no Sentry
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_TELEMETRY_DISABLED=1 \
    # CI=true: activates standalone output when next.config gates it on CI
    CI=true \
    # Skip runtime-secret validation during build (DATABASE_URL etc. not available)
    SKIP_ENV_VALIDATION=1

# [DB] `npx prisma generate` regenerates the Prisma client inside the image
#      (.dockerignore typically excludes the generated client).
#      If no database: change to just `RUN npm run build`
RUN npx prisma generate && npm run build


# ─── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser  -u 1001 -S nextjs -G nodejs

# Copy only what Next.js needs at runtime (standalone output)
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000 \
    HOSTNAME=0.0.0.0

# Health check on the app's health endpoint.
# - Use 127.0.0.1, NOT localhost (Alpine resolves localhost to ::1/IPv6 only)
# - Path must be hardcoded — env var substitution does not work in HEALTHCHECK
# - docker-compose healthcheck (per environment) overrides this one; keep both
#   in sync. Dev image's compose file uses the dev basePath.
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000__BASE_PATH_PROD__/api/health || exit 1

CMD ["node", "server.js"]
