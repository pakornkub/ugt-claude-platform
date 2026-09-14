---
type: llm
focus: { source: file, path: docker-compose.yml }
---
PASS only if: an uncommented volumes: bind maps a host path under /home/docker02/appdata/leave-request/uploads to the container's storage/uploads (not a named volume); the [DB] block passes the DB connection through as environment variables (DB_* for Laravel or DATABASE_URL) — an in-compose database service is NOT expected (org DB is external); the app healthcheck targets 127.0.0.1:80 /api/health (or equivalent); pull_policy: never is present; no __X__ placeholder remains (except __DIR__). Explanatory comments inherited from the template (including [VOLUME]/[DB] marker comments and commented-out examples) are expected and must NOT cause a FAIL.
