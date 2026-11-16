# Scheduled jobs — a `cron` service in the prod compose → `/api/cron/<job>` (org decision 2026-10-09, container-only 2026-11-16)

How a recurring job runs in an org Next.js app: a `POST` route inside the app, called by a
`cron` service in the project's own `docker-compose.yml` — so the jobs deploy together with
the app. **Never the host crontab** (`ugt-core/contracts/cicd.md` § Scheduled jobs): a host
line is invisible to the repo, does not move with a redeploy to another host, and needs the
admin to edit a server for every job change.

The standalone image holds no scripts or `tsx`, so the job body lives in the app as a Route
Handler; the cron service only calls it over `proxy-network`, and nginx is not in the path.

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
  section 1, `lib/env.ts` (`z.string().min(32).optional()`) and the app's compose
  `[CRON]` line — different value in prod and dev
- **Prod only**: the `cron` service exists in `docker-compose.yml` only; on dev call the
  route by hand when testing:
  `docker exec __PROJECT_NAME__-dev node -e "fetch('http://127.0.0.1:3000__BASE_PATH_DEV__/api/cron/<job>',{method:'POST',headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(async r=>console.log(r.status,await r.text()))"`
- Forbidden: host crontab lines, `node-cron` / `node-schedule` / `setInterval` loops in the app
  (every container restart or second replica double-runs them, nobody sees
  them in the handoff), SQL Agent jobs, Jenkins timed builds for app work

## The cron service (`[CRON]` in the `docker-compose.yml` asset)

Same shape as `ugt-hrms` runs in production: plain `alpine` with busybox `crond`, the
crontab written at start-up from the service's own `command:`. No Dockerfile change, no
extra file in the repo, nothing downloaded at build time. **`docker-compose.yml` only** —
never `docker-compose.dev.yml` (the job would run in both environments; `verify.mjs` fails it):

```yaml
  cron:
    image: alpine:3.20
    container_name: __PROJECT_NAME__-cron
    restart: unless-stopped
    depends_on:
      - app
    networks:
      - proxy-network
    environment:
      TZ: ICT-7
    command:
      - /bin/sh
      - -c
      - |
        cat > /etc/crontabs/root <<'CRONTAB'
        0 2 * * * wget -qO- -T 600 --post-data= --header="Authorization: Bearer ${CRON_SECRET}" http://__PROJECT_NAME__:3000__BASE_PATH_PROD__/api/cron/audit-retention >/proc/1/fd/1 2>&1 && echo " [cron] audit-retention ok" >/proc/1/fd/1 || echo "[cron] audit-retention FAILED" >/proc/1/fd/1
        CRONTAB
        exec crond -f -l 8
```

(`logging` + `deploy.resources` as in the asset.) One crontab line per route under
`app/api/cron/` — `verify.mjs` matches them. Why each piece looks the way it does:

| Piece | Why |
| --- | --- |
| Crontab written by `command:` | A bind-mounted file would vanish under a restart — Jenkins runs `cleanWs()` after every build |
| `${CRON_SECRET}` filled in by **compose** | busybox `crond` runs jobs with a minimal env of its own, so the container env never reaches the job. Compose reads it from the deploy `.env` (the app has the same value). Keep `crond -l 8`: a chattier level logs every command, token included |
| `http://__PROJECT_NAME__:3000…` (container name) | Every org project names its service `app` on the shared `proxy-network` — `http://app:3000` can resolve to another project's container. The container name is unique |
| `TZ: ICT-7` | A POSIX zone string (UTC+7) — musl understands it without `tzdata`, so the container installs nothing at start. The schedule above is Bangkok time |
| `wget -qO- -T 600 --post-data=` | busybox wget: POST with an empty body, 10-minute read timeout, exit ≠ 0 on any non-2xx |
| `>/proc/1/fd/1` + `ok` / `FAILED` | Job output goes to crond's stdout = `docker logs __PROJECT_NAME__-cron` — otherwise a 401/500 leaves no trace |
| `depends_on: app` | Starts after the app; Jenkinsfile unchanged (`up -d` starts both, the health poll watches the app only) |

- Changing a schedule = edit the line in `docker-compose.yml` and push — Jenkins redeploys it
- The work runs in the app container, so a deploy during a job kills it, and crond does not
  re-run a missed slot — keep jobs idempotent and don't push `main` at job time (or use the
  hourly pattern below)
- Logs: `docker logs __PROJECT_NAME__-cron` (body + ok/FAILED per run) · the job's own
  `console.log` stays in the app's `docker logs`

## Option: hourly tick + the route decides (`ugt-hrms` `lib/services/cron-schedule.ts`)

Default above = one exact time per job. When a missed run matters (a deploy at 02:00 must
not cost a day) or users must change the run time from the app, use the pattern `ugt-hrms`
ships instead: every crontab line fires **every hour** (`0 * * * *`, staggered minutes per
job), and each route decides whether this tick does the work:

- the run time lives in the database (an admin setting), not in the crontab
- the route compares "now" with that hour and with its own last run — the `ActivityLogs`
  row the job writes anyway is the "already ran this period" marker, so nothing new is stored
- catch-up, not on-the-dot: once the hour has passed, any later tick of the same period runs it

The cost is a small pure gate per route (`isCronDue({ now, runAtHour, lastRunAt, periodStart })`,
unit-tested) — pick it per job, not for the whole project.
