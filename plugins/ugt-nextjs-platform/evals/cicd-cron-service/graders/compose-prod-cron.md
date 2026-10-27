---
type: llm
focus: { source: file, path: docker-compose.yml }
---
PASS only if ALL hold for uncommented YAML: (1) a second service (e.g. `cron`) uses image `leave-request:latest` with `pull_policy: never` and runs `supercronic` on `/app/jobs.crontab`; (2) that service joins `proxy-network`; (3) its environment sets `TZ: Asia/Bangkok` and `CRON_SECRET: ${CRON_SECRET}`; (4) its healthcheck is disabled; (5) the app service also has `CRON_SECRET` uncommented. Commented template lines are expected and must not cause a FAIL.
