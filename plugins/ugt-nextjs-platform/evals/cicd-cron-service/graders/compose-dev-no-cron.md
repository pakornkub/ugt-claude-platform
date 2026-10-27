---
type: llm
focus: { source: file, path: docker-compose.dev.yml }
---
PASS only if no uncommented service runs supercronic or any cron daemon (the cron service is prod only), and the app service has `CRON_SECRET` uncommented (the route is tested by hand on dev). Commented template lines must not cause a FAIL.
