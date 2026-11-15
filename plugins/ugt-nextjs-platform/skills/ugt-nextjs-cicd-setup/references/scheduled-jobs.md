# Scheduled jobs — a `cron` service in the prod compose → `/api/cron/<job>` (org decision 2026-10-09, container-only 2026-11-16)

How a recurring job runs in an org Next.js app: a `POST` route inside the app, called by a
`cron` service in the project's own `docker-compose.yml` — so the jobs deploy together with
the app. **Never the host crontab** (`ugt-core/contracts/cicd.md` § Scheduled jobs): a host
line is invisible to the repo, does not move with a redeploy to another host, and needs the
admin to edit a server for every job change.

The standalone image holds no scripts or `tsx`, so the job body lives in the app as a Route
Handler and the cron service calls it over `proxy-network` with `node` (which the image always
has) — `CRON_SECRET` never leaves the containers and nginx is not in the path.

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

- `proxy.ts` lets `/api/cron/` through without a session cookie — the route's
  own `CRON_SECRET` check is the guard. Never skip it; export **`POST` only**
  (the cron call is a POST — a `GET` handler answers 405 and the job never runs)
- The reverse proxy blocks `<basePath>/api/cron/` from outside (admin handoff section H —
  in words, the admin writes the entry) — the bearer check is the second wall, not the only one
- `CRON_SECRET` (≥ 32 chars, `openssl rand -base64 32`) lives in `.env.example`
  section 1, `lib/env.ts` (`z.string().min(32).optional()`) and the compose
  `[CRON]` lines — different value in prod and dev
- **Prod only**: the `cron` service exists in `docker-compose.yml` only; on dev call the
  route by hand when testing (`docker exec __PROJECT_NAME__-dev node -e "fetch(…)"` with the
  same body as the crontab line below, against `127.0.0.1:3000__BASE_PATH_DEV__`)
- Forbidden: host crontab lines, `node-cron` / `node-schedule` / `setInterval` loops in the app
  (every container restart or second replica double-runs them, nobody sees
  them in the handoff), SQL Agent jobs, Jenkins timed builds for app work

## The three pieces (all tagged `[CRON]` in the cicd assets)

The Dockerfile and `docker-compose.yml` assets already carry the blocks below, tagged
`[CRON]` — keep them when the project has jobs, delete them when it has none.

**Dockerfile** — runner stage, right after the `addgroup`/`adduser` line (still root, and before
the `COPY --from=builder` lines so the download stays cached).
Pin + SHA1 from the release notes of `supercronic-linux-amd64`; Alpine has no
`tzdata`, without it `TZ` is ignored and the schedule runs in UTC. No comment at
the end of an `ARG` line (a Dockerfile has no inline comments):

```dockerfile
ARG SUPERCRONIC_VERSION=v0.2.49
ARG SUPERCRONIC_SHA1SUM=e63c11a9726b775a6a11801e81af4f3fb926aa68
RUN apk add --no-cache tzdata \
 && wget -qO /usr/local/bin/supercronic "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64" \
 && echo "${SUPERCRONIC_SHA1SUM}  /usr/local/bin/supercronic" | sha1sum -c - \
 && chmod +x /usr/local/bin/supercronic
COPY --chown=nextjs:nodejs jobs.crontab ./
# a broken crontab fails the build — Jenkins polls only the app container, so it would deploy green
RUN supercronic -test /app/jobs.crontab
```

(The docker host needs `github.com` and `release-assets.githubusercontent.com` — where the
release download redirects — at build time.)

**`jobs.crontab`** at the repo root — one line per job; calls the app by its container name;
output goes to `docker logs __PROJECT_NAME__-cron`:

```
# 02:00 Asia/Bangkok (the service TZ)
0 2 * * * node -e "fetch('http://__PROJECT_NAME__:3000__BASE_PATH_PROD__/api/cron/audit-retention',{method:'POST',headers:{authorization:'Bearer '+process.env.CRON_SECRET},signal:AbortSignal.timeout(600000)}).then(async r=>{console.log(r.status,await r.text());process.exit(r.ok?0:1)},e=>{console.error(e);process.exit(1)})"
```

- `node -e` + `fetch` reads `CRON_SECRET` from the cron container's own environment — the
  secret is never on a command line
- Non-2xx → exit 1, and status + body land in the cron container's log

**`docker-compose.yml` only** — never `docker-compose.dev.yml` (the job would run in
both environments; `verify.mjs` fails it):

```yaml
  cron:
    image: __PROJECT_NAME__:latest
    pull_policy: never
    container_name: __PROJECT_NAME__-cron
    restart: unless-stopped
    command: ['supercronic', '/app/jobs.crontab']
    networks:
      - proxy-network # reaches the app as http://__PROJECT_NAME__:3000
    environment:
      TZ: Asia/Bangkok
      CRON_SECRET: ${CRON_SECRET}
    healthcheck:
      disable: true # the image HEALTHCHECK probes a web server this service does not run
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '3'
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 128M
```

- The app keeps `CRON_SECRET` too (the route checks it) · Jenkinsfile unchanged
  (`up -d` starts both, the health poll watches the app only)
- The work runs in the app container, so a deploy during a job kills it, and supercronic
  does not re-run a missed slot — keep jobs idempotent and don't push `main` at job time
- Logs: `docker logs __PROJECT_NAME__-cron` (status + body per run) · the job's own
  `console.log` stays in the app's `docker logs`
