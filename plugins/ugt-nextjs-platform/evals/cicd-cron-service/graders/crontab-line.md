---
type: llm
focus: { source: file, path: jobs.crontab }
---
PASS only if a line schedules Monday 08:00 (`0 8 * * 1`) and calls the app over the network by container name — a POST to `http://leave-request:3000/leave-request/api/cron/weekly-summary` — sending `Bearer ` + `process.env.CRON_SECRET` (read from the environment, never a literal secret), and exits non-zero on a non-2xx response. FAIL if it targets 127.0.0.1, uses `docker exec`, or omits the basePath.
