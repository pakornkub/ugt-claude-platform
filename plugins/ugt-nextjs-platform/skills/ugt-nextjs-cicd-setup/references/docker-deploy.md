# Docker Build & Deploy — deep detail

## A. Two-Image Pattern (build 2 images every run)

| Image | Target | Purpose |
| --- | --- | --- |
| `__PROJECT_NAME__:<BUILD_NUMBER>-builder` | `builder` | `docker run ... prisma migrate deploy` at deploy time (has `node_modules/` + `prisma/migrations/`) |
| `__PROJECT_NAME__:latest` + `:<BUILD_NUMBER>` | runner | the real image docker-compose deploys (standalone, small) |

- Always tag with `BUILD_NUMBER` (not bare `latest`) → rollback possible
- `--network host` on the build: **not** a blanket requirement. A build already
  has network access through the default bridge, so add it only when the build
  actually reaches out (typically `next/font/google`, which downloads the font
  files at build time) **and** the bridge path is blocked on that host — e.g. an
  outbound proxy that only the host's own network namespace can use, or a
  corporate DNS/firewall the bridge doesn't inherit. Symptom that justifies it:
  the build fails on a font/network fetch and succeeds with `--network host`.
  Self-hosting the fonts (`next/font/local`) removes the need entirely
- Project **without a database** → cut the builder image build + migrate step

## B. Iron rule: client-side vars = build args only

`NEXT_PUBLIC_*` is **inlined into the JS bundle at compile time** — setting it
as runtime `environment:` in compose does nothing (the bundle already has
`undefined` baked in).

```yaml
# ❌ WRONG — ignored by Next.js
services:
  app:
    environment:
      NEXT_PUBLIC_BASE_PATH: /my-app
```

```groovy
// ✅ CORRECT — --build-arg in the Docker Build stage
sh """docker build --build-arg NEXT_PUBLIC_BASE_PATH=${basePath} ..."""
```

Branch-dependent values (basePath, appUrl) resolve inside the stage's
`script {}` — **not** the global `environment {}` (global = one value for every
branch → dev gets prod values).

Client-side secrets (e.g. the Sentry DSN) → Jenkins Secret Text credential +
`withCredentials` — never hardcoded in the Jenkinsfile (it lands in SCM history).

## C. Deploy sequence: migrate → compose up → health poll

```
cp $ENV_FILE .env                        # Secret File credential → workspace
  ↓
[DB] docker run --rm ...-builder prisma migrate deploy   # migrate BEFORE deploy
  ↓                                      # migrate fail = no deploy (no partial deploy)
docker compose -f <file> up -d --no-build
  ↓
poll: docker inspect .State.Health.Status  # until healthy (max 24×10s = 4 min)
```

### DATABASE_URL extraction — why `tr -d '"\r'`

A `.env` edited on Windows carries CRLF and values may be quoted —
`docker --env-file` strips **neither**, so DATABASE_URL arrives with `"` and
`\r` attached → Prisma connection error:

```sh
DB_URL=$(grep "^DATABASE_URL=" .env | cut -d= -f2- | tr -d '"\r')
```

### `--no-build` — never forget it

Omit it and compose rebuilds the image from its `build:` section **without**
the `NEXT_PUBLIC_*` build args → a broken bundle deployed over a good one.

### Health poll — `docker inspect`, not wget from Jenkins

Poll the container's own `.State.Health.Status` → matches the container's real
HEALTHCHECK (wget from Jenkins can false-positive on network/proxy issues).
`unhealthy` = exit 1 immediately, don't wait out the 4 minutes.

## D. Compose conventions

| Convention | Why |
| --- | --- |
| `pull_policy: never` | image is built locally — otherwise compose tries to pull `latest` from Docker Hub |
| `ports: '${APP_PORT:-<port>}:3000'` | host port overridable from `.env` — avoids port clashes on a shared host |
| separate prod/dev compose files | image/container names, ports, healthcheck paths differ |
| `restart: unless-stopped` | container recovers after a host reboot |
| resource limits (cpu/memory) | one container can't starve the host |
| `proxy-network` external | every app shares one network with the reverse proxy (created once on the host) |
| logging json-file 10m×3 | logs can't grow unbounded |

## E. Healthcheck gotchas

- **`127.0.0.1`, not `localhost`** — Alpine resolves `localhost` to `::1`
  (IPv6) while Node listens on IPv4 → "Connection refused" though the app is fine
- **Always port 3000** (container-internal) — never the host port
- **Path is hardcoded** in the Dockerfile `HEALTHCHECK`. Not because shell-form
  `CMD` can't expand variables — it runs via `/bin/sh`, so `$VAR` *would* expand
  at check time — but because the basePath is only known at **build** time and
  nothing puts it in the runner stage's environment, so a variable would expand
  to empty and probe the wrong URL. Each env's compose healthcheck overrides the
  Dockerfile anyway (dev compose uses the dev basePath)
- `start_period: 60s` — give the app time to boot before failures count

## F. Dockerfile gotchas (never delete)

| Directive | Stage | Why |
| --- | --- | --- |
| `ENV HUSKY=0` | deps | `npm ci` runs `prepare` → husky; no `.git` in Docker → fail |
| `ENV CI=true` | builder | next.config gates standalone output on `CI` — without it `.next/standalone/` never exists → runner `COPY` fails |
| `ENV SKIP_ENV_VALIDATION=1` | builder | env schema validates at import; runtime secrets don't exist at build time |
| `RUN npx prisma generate` | builder | [DB] the Prisma client must be regenerated inside the image (.dockerignore excludes the generated client) |
| non-root user (`nextjs`) | runner | security baseline |

> `SKIP_ENV_VALIDATION` belongs to **CI + build stages only** — never in the
> production container (it would skip startup validation and mask missing secrets).

## G. Reverse proxy + basePath (subpath per app)

```
https://<domain>__BASE_PATH_PROD__  ← nginx (TLS termination)
   ↓ proxy_pass
http://127.0.0.1:__PORT_PROD____BASE_PATH_PROD__
   ↓
container (port 3000, basePath = __BASE_PATH_PROD__)
```

Env-var caveats:

- Auth-library URLs (cookie domain / OAuth callback) usually need the
  **bare origin without the basePath** (`https://<domain>`) — adding the
  basePath breaks the cookie/callback domain
- `NEXT_PUBLIC_APP_URL` = the full URL including basePath (used in links/sitemap)
- If internal services use an internal-CA cert Node doesn't trust →
  `NODE_TLS_REJECT_UNAUTHORIZED: '0'` in compose is acceptable **only on a
  fully closed intranet** — never if the app can reach the internet (it
  disables TLS verification globally)
