---
type: llm
focus: { source: file, path: docs/admin-handoff.md }
---
PASS only if the admin handoff asks the admin for NO host crontab line (no "crontab -u jenkins" step, no `docker exec … /api/cron/` line — the jobs run in the compose cron service), while it still asks nginx to deny `/leave-request/api/cron/` (and the dev path) from outside. No unresolved `__X__` placeholder remains.
