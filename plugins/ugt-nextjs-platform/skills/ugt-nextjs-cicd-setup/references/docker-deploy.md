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

### One deploy at a time — `disableConcurrentBuilds()`

Everything above mutates shared state: `prisma migrate deploy` on one database
and `docker compose up -d` on one named container. Jenkins runs builds of the
same job **in parallel by default**, so two pushes in quick succession make two
Deploy stages overlap — the second migration races the first, and compose
recreates the container while the first build is still polling its health.
`options { disableConcurrentBuilds() }` (top of `assets/Jenkinsfile`, next to
`timestamps()`) makes the second build wait in the queue instead. Do not remove
it to "go faster"; if queue time hurts, `disableConcurrentBuilds(abortPrevious: true)`
cancels the older run instead — still never two at once.

### DATABASE_URL extraction — why `tr -d '"\r'`

A `.env` edited on Windows carries CRLF and values may be quoted —
`docker --env-file` strips **neither**, so DATABASE_URL arrives with `"` and
`\r` attached → Prisma connection error:

```sh
set +x   # Jenkins runs sh with -x — the trace would print the password
export DATABASE_URL="$(grep "^DATABASE_URL=" .env | cut -d= -f2- | tr -d '"\r')"
docker run --rm -e DATABASE_URL ...   # pass the NAME only, never -e DATABASE_URL="$VAR"
```

Never expand a secret read out of the credential file on a command line
without `set +x` first: `sh` steps run with `-x`, and `withCredentials` masks
only the credential's file path, not the values inside the file — the whole
connection string, password included, lands in the console of every build
that reaches Deploy.

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
- `NODE_TLS_REJECT_UNAUTHORIZED: '0'` is in both compose files, always on —
  org standard (closed intranet, internal-CA Keycloak/LDAP/SQL Server). It
  disables TLS verification for the whole process; that is the accepted trade-off

## H. Scheduled jobs — host cron → `/api/cron/<job>` (org decision 2026-10-09)

Every recurring job runs from the **host crontab** (`ugt-core/contracts/cicd.md`
§ Scheduled jobs). The standalone image holds no scripts or `tsx`, so the job
body lives in the app as a Route Handler and cron calls it **from inside the
container** — `CRON_SECRET` never leaves the container, the port is always
3000, and nginx is not in the path.

```ts
// app/api/cron/audit-retention/route.ts — one route per job, POST only
import { timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

function authorized(request: Request) {
  if (!env.CRON_SECRET) return false; // unset = every call refused
  const want = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const got = Buffer.from(request.headers.get('authorization') ?? '');
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(request: Request) {
  if (!authorized(request)) return new Response('Unauthorized', { status: 401 });
  const result = await runAuditRetention(); // lib/jobs/*.ts — idempotent, safe to re-run
  console.log(`[cron] audit-retention ${JSON.stringify(result)}`);
  return Response.json({ ok: true, ...result });
}
```

```
# crontab of the PROD Docker host — one line per job (admin handoff cron table)
0 2 * * * docker exec __PROJECT_NAME__ sh -c 'wget -qO- -T 600 --post-data="" --header="Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000__BASE_PATH_PROD__/api/cron/audit-retention' >> /home/docker02/appdata/__PROJECT_NAME__/logs/cron.log 2>&1
```

- Single quotes around the `sh -c` body: `$CRON_SECRET` expands **inside** the
  container (from compose `environment:`), never on the host or in the crontab
- `wget` exits non-zero on 401/5xx → the failure lands in `cron.log`
- `proxy.ts` lets `/api/cron/` through without a session cookie — the route's
  own `CRON_SECRET` check is the guard. Never skip it
- `CRON_SECRET` (≥ 32 chars, `openssl rand -base64 32`) lives in `.env.example`
  section 1, `lib/env.ts` (`z.string().min(32).optional()`) and the compose
  `[CRON]` line — different value in prod and dev
- Prod only; on dev call the route by hand when testing (same `docker exec`
  line against `__PROJECT_NAME__-dev`)
- Forbidden: `node-cron` / `node-schedule` / `setInterval` loops in the app
  (every container restart or second replica double-runs them, nobody sees
  them in the handoff), SQL Agent jobs, Jenkins timed builds for app work

## I. Version skew after a deploy — `deploymentId` = `BUILD_NUMBER`

**Symptom:** right after a deploy, a page that was already open fails **every**
Server Action — browser console `UnrecognizedActionError: Server Action
"404a8f…" was not found on the server` + `POST …/<route> 409 (Conflict)`, the
app shows its generic save error ("ส่งข้อมูลไม่ได้หลัง deploy"). A refresh
fixes it. Every project hits it — Jenkins redeploys on each push and users keep
tabs open; it hurts most on long forms (the typed text is lost on the refresh).

**Cause:** Server Action ids change with every build and the old client bundle
still calls the previous ids. Without a `deploymentId` Next.js cannot tell the
page and the server come from different builds, so it cannot reload.

**Fix — three places, all in the cicd assets (new projects get them; existing
ones add them by hand — Dockerfile/Jenkinsfile/next.config are not in kit-sync):**

```ts
// next.config.ts — unset locally and in the CI `npm run build` stage
deploymentId: process.env.NEXT_DEPLOYMENT_ID || undefined,
```

```dockerfile
# Dockerfile, builder stage — next to the NEXT_PUBLIC_* build args
ARG NEXT_DEPLOYMENT_ID
ENV NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID \
```

```groovy
// Jenkinsfile, Docker Build stage — BOTH docker build commands (builder + runner)
--build-arg NEXT_DEPLOYMENT_ID=${buildNum} \
```

- `BUILD_NUMBER` is not a secret; it is the same number already tagged on the
  images. Passing it to **both** builds keeps the builder image and the runner
  image on one id.
- It is a build-time value, like `NEXT_PUBLIC_*`: setting it as compose
  `environment:` does nothing, and `docker compose` must still deploy with
  `--no-build` (§C).
- Dev and prod are separate Jenkins jobs/builds, so each environment's ids only
  ever compare within itself.
- The code half: a Server Action that still reaches an
  older build raises `UnrecognizedActionError`, and on a long form the app
  should keep the typed draft and offer a reload instead of a generic error →
  `ugt-nextjs-pitfalls` `references/data-fetching.md` §6.
