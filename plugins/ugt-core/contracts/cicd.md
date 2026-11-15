# Contract — Delivery pipeline (Jenkins + SonarQube + Docker, stack-agnostic)

The stage list is the contract: stacks swap the commands inside stages, never
the stages themselves.

> **Maintenance:** editing this file? `grep` the stack platforms for restated
> text and update it too — currently `ugt-nextjs-platform`'s
> `ugt-nextjs-cicd-setup` (primary), `ugt-nextjs-test-lint-setup` (lint/test
> stages), and `ugt-nextjs-full-setup` (summary); `ugt-python-platform`'s
> `ugt-python-cicd-setup`; and `ugt-php-platform`'s `ugt-php-cicd-setup` all
> restate this. Bump the relevant plugin's `plugin.json` version and CHANGELOG
> when you do — ugt-core when the contract text changes, the stack platform
> when its restated copy changes.

## Stages (all 10, in order)

```
Checkout → Install → Code Quality (parallel: lint / format-check / typecheck)
  → Unit Tests (JUnit + coverage publish) → Build
  → OWASP Dependency Check (90-min timeout + suppression file)
  → SonarQube Analysis → Quality Gate (waitForQualityGate abortPipeline: true)
  → Docker Build → Deploy          ← last 2 stages only on main/develop
post: emailext (success/unstable/failure/aborted) + cleanWs
```

## Branch model

`main` = prod · `develop` = dev (every name suffixed `-dev`, separate compose
file, separate env credential, separate Sonar project). Per-branch values are
resolved inside the pipeline script from the branch name — never in global
environment blocks.

Jenkins: prod and dev are always **two separate Pipeline jobs** on the same
`Jenkinsfile` — `<project>` (branch `*/main`) and `<project>-dev` (branch
`*/develop`), "Pipeline script from SCM", Lightweight checkout off, trigger
"GitHub hook trigger for GITScm polling" — **never Multibranch** (มติผู้ดูแล
2026-11-16). A plain Pipeline job has no `BRANCH_NAME`; the branch comes from
`GIT_BRANCH` (`origin/develop` → `develop`).

## Quality Gate thresholds (on New Code — identical for every language)

| Condition | Threshold |
| --- | --- |
| `new_violations` | = 0 |
| `new_duplicated_lines_density` | ≤ 3% |
| `new_coverage` | ≥ 60% |
| `new_security_hotspots_reviewed` | = 100% |

Dependency scan: **fail** at CRITICAL ≥ 1 · **unstable** at HIGH ≥ 1,
suppression-aware; every suppression carries a written rationale and is added
only after a real finding was reviewed.

## Credential naming

| ID | Type | Purpose |
| --- | --- | --- |
| `nvd` | Secret text | NVD API key, shared server-wide |
| `env-<project>` | Secret file | prod `.env`, copied into the workspace at Deploy |
| `env-<project>-dev` | Secret file | dev `.env` — separate DB + fresh secrets |
| `sentry-dsn-<project>` | Secret text | client-side DSN (optional) |

SonarQube analysis token is bound once in the Jenkins server config
(`withSonarQubeEnv`), never bound manually in a pipeline.

## Secret rules

- Secrets in shell steps are expanded by the **shell** (`"$VAR"`), never by the
  pipeline language's string interpolation (leaks into build logs)
- Temp files holding secrets are deleted in the always-post block
- `NOTIFY_EMAIL` / `SMTP_FROM` are server-global env vars, never hardcoded

## Build & deploy rules

- Images tagged with the build number (bare `latest` alone forbids rollback)
- **Migrate before deploy** — migration failure = no deploy
- Deploy reuses the built image (`--no-build`); rebuilding at deploy time is forbidden
- Every long-running service exposes an unauthenticated health endpoint returning 200
  healthy / 503 degraded, with **no version/commit information**; container
  healthchecks poll `127.0.0.1` (never `localhost`)
- Compose: `pull_policy: never` for locally-built images, host port
  overridable, log rotation bounded
- Compose passes runtime env **by name only** (`environment:` list, no `env_file:`) —
  `.env` just substitutes `${VAR}` in the compose file. A variable the app starts
  reading is added to `environment:` of both compose files in the same change,
  or it never reaches the container

## Persistent data (volumes)

Containers are disposable — anything that must survive a deploy (uploads,
SQLite files, `wp-content`, generated reports) uses a **bind mount** under the
org path, never a named or anonymous Docker volume:

```
/home/docker02/appdata/<project>/<name>        # prod
/home/docker02/appdata/<project>-dev/<name>    # dev
```

- Declared in the compose `volumes:` list; the Deploy stage ensures each
  project path exists and is owned by the container's runtime UID before the
  first `up -d` (idempotent). The server admin creates `/home/docker02/appdata` itself
  once, writable by the Jenkins user (see the skill's admin handoff).
- Never store secrets in a volume · never bind-mount code over the image
  (single declared exception: WordPress `wp-content`)
- Host file backup covers `/home/docker02/appdata` once for every project

## Scheduled jobs = a cron service in the project's own prod compose (มติผู้ดูแล 2026-10-09 · container-only 2026-11-16)

Every scheduled job / recurring task runs from a **cron service in the project's
own `docker-compose.yml`** — a second service built from the app's own image runs a
container cron daemon (supercronic) on a crontab committed to the repo. Jenkins
deploys it together with the app, so jobs move with every deploy, the repo shows
every schedule, and the admin edits nothing on the server: **never a host crontab
line**, and the admin handoff has no cron section. Nothing else schedules:

- **No in-app scheduler** — no `node-cron` / `node-schedule` / `setInterval`
  loops, no APScheduler / Celery beat / `schedule`, no Laravel `schedule:run`
  driver
- **No SQL Agent job** and no Jenkins timed build for application work
  (Jenkins timers stay for CI upkeep only, e.g. the NVD update job)
- It is **not** an in-app scheduler: its own container and process, and a
  restart re-reads the same schedule. Jobs are idempotent, run on **prod only**
  (the service never appears in `docker-compose.dev.yml`; dev = run by hand when
  testing), times in the service's `TZ` (set it — `Asia/Bangkok`), output in
  `docker logs` (json-file rotation) plus the job's own log where it writes one
- The reverse proxy blocks any HTTP job endpoint (Next.js `<basePath>/api/cron/`)
  from outside — stated in words in the admin handoff
- Each stack defines how the crontab line reaches the code — Next.js
  `ugt-nextjs-cicd-setup` `references/scheduled-jobs.md` (`node` `fetch` POST to the
  app's `/api/cron/<job>` route with `CRON_SECRET`, over `proxy-network`) · Python
  `ugt-python-cicd-setup` `references/docker-deploy.md` §C

**Transition:** the Python and PHP cicd skills still ship the older host-cron
default (Python: host cron + the compose service as an option · PHP: host cron
only) until their kits are migrated — a new project on those stacks follows this
contract and uses the compose service by hand.

## Server names (must match exactly)

SonarQube server entry `SonarQube` · webhook pair GitHub→Jenkins
(`/github-webhook/`) and SonarQube→Jenkins (`/sonarqube-webhook/`) ·
Lightweight checkout disabled on pipeline jobs.
