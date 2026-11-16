---
type: llm
focus: { source: file, path: docker-compose.dev.yml }
---
PASS only if no uncommented service runs crond, supercronic or any cron daemon (the cron service is prod only), the app service has `CRON_SECRET` uncommented (the route is tested by hand on dev), and the app service sets `TZ: Asia/Bangkok`. Commented template lines must not cause a FAIL.
