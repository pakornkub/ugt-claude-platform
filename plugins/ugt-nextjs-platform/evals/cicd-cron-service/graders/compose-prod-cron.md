---
type: llm
focus: { source: file, path: docker-compose.yml }
---
PASS only if ALL hold for uncommented YAML: (1) a second service (e.g. `cron`) uses an `alpine` image and runs busybox `crond -f`, with its crontab written by the service's own `command:` (no bind-mounted crontab file); (2) that service joins `proxy-network` and `depends_on` the app; (3) its environment sets a Bangkok timezone (`TZ: ICT-7`, or `Asia/Bangkok` when it installs tzdata); (4) the app service has `CRON_SECRET` uncommented and `TZ: Asia/Bangkok`. Commented template lines are expected and must not cause a FAIL.
