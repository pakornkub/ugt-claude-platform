# Scheduled jobs — host cron → `/api/cron/<job>` (org decision 2026-10-09)

How a recurring job runs in an org Next.js app: one host-crontab line per job calling a `POST` route inside the container.

Every recurring job runs from the **host crontab** (`ugt-core/contracts/cicd.md`
§ Scheduled jobs). The standalone image holds no scripts or `tsx`, so the job
body lives in the app as a Route Handler and cron calls it **from inside the
container** (with `node`, which the image always has) — `CRON_SECRET` never leaves the container, the port is always
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
# PROD Docker host: sudo crontab -u jenkins -e  (jenkins owns /home/docker02/appdata, is in group docker)
0 2 * * * docker exec __PROJECT_NAME__ node -e "fetch('http://127.0.0.1:3000__BASE_PATH_PROD__/api/cron/audit-retention',{method:'POST',headers:{authorization:'Bearer '+process.env.CRON_SECRET},signal:AbortSignal.timeout(600000)}).then(async r=>{console.log(new Date().toISOString(),r.status,await r.text());process.exit(r.ok?0:1)},e=>{console.error(e);process.exit(1)})" >> /home/docker02/appdata/__PROJECT_NAME__/logs/cron.log 2>&1
```

- `node -e` + `fetch` reads `CRON_SECRET` from the container's own environment — the
  secret is never on a command line, so `ps` on the Docker host cannot see it
  (a `sh -c 'wget --header="…$CRON_SECRET"'` line would expose it in argv)
- Non-2xx → exit 1, and status + body land in `cron.log` with a timestamp
- nginx blocks `/api/cron/` from outside (`location ^~ <basePath>/api/cron/ { deny all; }`,
  admin handoff table H) — the bearer check is the second wall, not the only one
- `proxy.ts` lets `/api/cron/` through without a session cookie — the route's
  own `CRON_SECRET` check is the guard. Never skip it; export **`POST` only**
  (the cron call is a POST — a `GET` handler answers 405 and the job never runs)
- `CRON_SECRET` (≥ 32 chars, `openssl rand -base64 32`) lives in `.env.example`
  section 1, `lib/env.ts` (`z.string().min(32).optional()`) and the compose
  `[CRON]` line — different value in prod and dev
- Prod only; on dev call the route by hand when testing (same `docker exec`
  line against `__PROJECT_NAME__-dev`)
- Forbidden: `node-cron` / `node-schedule` / `setInterval` loops in the app
  (every container restart or second replica double-runs them, nobody sees
  them in the handoff), SQL Agent jobs, Jenkins timed builds for app work
