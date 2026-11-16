---
type: llm
focus: { source: file, path: docker-compose.yml }
---
Judge the crontab inside the `cron` service's `command:`. PASS only if a line schedules Monday 08:00 (`0 8 * * 1`) and POSTs (e.g. busybox `wget --post-data=`) to `http://leave-request:3000/leave-request/api/cron/weekly-summary` — the app's container name — with an `Authorization: Bearer ${CRON_SECRET}` header filled in by compose (never a literal secret), and sends its output / a failure marker to the container log (e.g. `>/proc/1/fd/1`). FAIL if it targets `http://app:…`, 127.0.0.1, uses `docker exec`, omits the basePath, or a `__X__` placeholder is left.
