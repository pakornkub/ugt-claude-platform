---
type: llm
focus: { source: file, path: docs/admin-handoff.md }
---
PASS only if ALL hold: (1) the admin handoff asks the admin for NO host crontab line (no "crontab -u jenkins" step, no `docker exec … /api/cron/` line, no cron section — the jobs run in the compose cron service that deploys with the app); (2) the reverse-proxy section still asks, in words, that `/leave-request/api/cron/` (and the dev path) be blocked from outside; (3) it hands the admin no nginx config snippet (no `location … {`, `proxy_pass`, `deny all;`); (4) Jenkins is two Pipeline jobs, `leave-request` on `*/main` and `leave-request-dev` on `*/develop` — not Multibranch. No unresolved `__X__` placeholder remains.
