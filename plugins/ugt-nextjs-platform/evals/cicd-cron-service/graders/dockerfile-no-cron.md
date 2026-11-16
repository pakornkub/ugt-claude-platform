---
type: llm
focus: { source: file, path: Dockerfile }
---
The cron service is plain alpine + busybox crond defined in docker-compose.yml, so the Dockerfile needs nothing for it. PASS only if the Dockerfile has no supercronic download, no `jobs.crontab` COPY, no `supercronic -test` and no other cron-related build step. Comments mentioning cron are fine.
