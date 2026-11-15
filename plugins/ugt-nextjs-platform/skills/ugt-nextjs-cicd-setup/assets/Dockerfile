# Org-standard 3-stage Next.js Dockerfile (Node 22 / Alpine)
# Stage names matter: the Jenkinsfile builds `--target builder` as a separate
# image used for `prisma migrate deploy` at deploy time.
#
# Placeholders: __PROJECT_DISPLAY_NAME__, __BASE_PATH_PROD__
# [DB] lines are optional — delete if the project has no Prisma/database.
# [CRON] lines are optional — delete if the project has no scheduled jobs
# (COPY jobs.crontab fails the build without the file).

# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# libc compatibility for native modules (e.g. mssql) — keep unless proven unneeded
RUN apk add --no-cache libc6-compat

# .npmrc* = optional match: auth-setup commits one with legacy-peer-deps=true
# (better-auth peer vs vitest 5) — without it npm ci below dies with ERESOLVE
COPY package.json package-lock.json .npmrc* ./
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
# Version-skew protection: the Jenkinsfile passes BUILD_NUMBER (not a secret) and
# next.config reads it as `deploymentId` (references/version-skew.md).
# Never delete: without it a tab left open across a redeploy fails every Server Action.
ARG NEXT_DEPLOYMENT_ID

ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID \
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

# [CRON] scheduled jobs run in the compose `cron` service (same image) — supercronic + jobs.crontab
# (references/scheduled-jobs.md). Pinned + SHA1 from the supercronic-linux-amd64 release notes;
# tzdata so TZ=Asia/Bangkok applies (Alpine ignores TZ without it → jobs run on UTC).
ARG SUPERCRONIC_VERSION=v0.2.49
ARG SUPERCRONIC_SHA1SUM=e63c11a9726b775a6a11801e81af4f3fb926aa68
RUN apk add --no-cache tzdata \
 && wget -qO /usr/local/bin/supercronic "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64" \
 && echo "${SUPERCRONIC_SHA1SUM}  /usr/local/bin/supercronic" | sha1sum -c - \
 && chmod +x /usr/local/bin/supercronic
COPY --chown=nextjs:nodejs jobs.crontab ./
# [CRON] a broken crontab fails the build — Jenkins polls only the app container, so it would deploy green
RUN supercronic -test /app/jobs.crontab

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
# - Path is hardcoded on purpose. Shell-form CMD does run through /bin/sh, so a
#   runtime `$VAR` would expand — but the basePath is a BUILD-time value here and
#   nothing sets it in the runner's environment, so a variable would just resolve
#   to empty and silently probe the wrong URL.
# - docker-compose healthcheck (per environment) overrides this one; keep both
#   in sync. Dev image's compose file uses the dev basePath.
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000__BASE_PATH_PROD__/api/health || exit 1

CMD ["node", "server.js"]
