---
type: llm
focus: { source: file, path: app/api/cron/weekly-summary/route.ts }
---
PASS only if the route exports `POST` (not only GET), rejects a request whose `Authorization` is not `Bearer <CRON_SECRET>` with 401 before doing any work, and refuses every call when CRON_SECRET is unset.
You see only this file. When the bearer check is delegated to an imported helper (e.g. `isCronAuthorized(request, process.env.CRON_SECRET)` from `@/lib/cron-auth`) that is called before any work and returns 401 on false, PASS on that — the unset-secret handling lives in the helper you cannot see; do not FAIL for not seeing it.
Imports must resolve: this project has no database setup, so there is no `lib/env.ts` — reading `process.env.CRON_SECRET` directly is correct here, and importing `@/lib/env` is a FAIL.
