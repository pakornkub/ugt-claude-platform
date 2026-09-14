---
type: llm
focus: { source: file, path: docker-compose.yml }
---
PASS only if: an uncommented volumes: bind maps a host path under /home/docker02/appdata/leave-request/uploads into the container (not a named volume); the healthcheck targets 127.0.0.1:8000; pull_policy: never is present; there is no live database service or DATABASE_URL line; no unresolved __X__ token remains. Explanatory comments inherited from the template — including [VOLUME] marker comments and commented-out environment: examples — are expected and must NOT cause a FAIL.
