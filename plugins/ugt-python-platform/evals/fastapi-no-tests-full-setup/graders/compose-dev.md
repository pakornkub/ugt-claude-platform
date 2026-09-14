---
type: llm
focus: { source: file, path: docker-compose.dev.yml }
---
PASS only if: an uncommented volumes: bind maps a host path under /home/docker02/appdata/leave-request-dev/uploads (not a named volume); the healthcheck targets 127.0.0.1:8000 (container port); pull_policy: never is present; no live database service or DATABASE_URL line; no unresolved __X__ token remains. Template comments (including [VOLUME] markers and commented-out examples) are expected and must NOT cause a FAIL.
