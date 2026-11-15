# Jenkins project-level setup (repeated for every project)

What the admin prepares in Jenkins/GitHub/the reverse proxy for each new project — moved out of `jenkins-one-time-setup.md` §B (the server-level part and the frequent pitfalls stay there). Section numbers B1–B4 are kept so existing citations still match.

## B. Project level (every project)

### B1. Credentials

Manage Jenkins → Credentials → (global) → Add Credentials:

| Credential ID | Type | Value |
| --- | --- | --- |
| `nvd` | Secret text | NVD API key (free at nvd.nist.gov) — without it OWASP DC is extremely slow (rate limit 5 req/30s) |
| `env-__PROJECT_NAME__` | Secret file | upload `.env.production` — the Deploy stage `cp`s it to `.env` |
| `env-__PROJECT_NAME__-dev` | Secret file | upload `.env.development` — same shape as prod but **separate DATABASE_URL + fresh auth secrets** |
| `sentry-dsn-__PROJECT_NAME__` | Secret text | the `NEXT_PUBLIC_SENTRY_DSN` value (if the project uses Sentry) — prod/dev share one DSN, split by the `SENTRY_ENVIRONMENT` runtime var |

> `nvd` is a server-level credential shared by every project — create it once.

**Secrets in the Jenkinsfile:** let the shell expand them (`"$VAR"` inside
single-quoted Groovy strings) — **never** Groovy interpolation (`"${VAR}"` in
double-quoted strings), which prints the value into the build log and triggers
Jenkins' "secret passed via Groovy String interpolation" warning. Temp files
holding secrets (e.g. `dc-nvd.properties`) must be deleted in `post { always }`.

### B2. Pipeline job config

**Org rule (2026-11-16): prod and dev are always two separate Pipeline jobs —
never Multibranch.**

| Field | Job prod | Job dev |
| --- | --- | --- |
| Item name | `__PROJECT_NAME__` | `__PROJECT_NAME__-dev` |
| Type | Pipeline | Pipeline |
| Build Triggers | GitHub hook trigger for GITScm polling | same |
| Pipeline → Definition | Pipeline script from SCM → Git, repo URL | same |
| Branch Specifier | `*/main` | `*/develop` |
| Script Path | `Jenkinsfile` | `Jenkinsfile` |
| Lightweight checkout | off | off |

- One webhook (§B3) serves both jobs: each polls its own branch and builds only
  when that branch changed
- **Disable "Lightweight checkout"** — Configure → Pipeline → SCM → uncheck.
  Otherwise Jenkins fetches only the Jenkinsfile → later stages find an
  incomplete workspace / the pipeline runs stale code
- Branch detection in the Jenkinsfile:
  `def br = (env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last())` — a
  plain Pipeline job has no `BRANCH_NAME`; `GIT_BRANCH` = `origin/develop`
  → `develop` (the `BRANCH_NAME` half stays only so an old Multibranch job
  still resolves)

### B3. GitHub webhook

GitHub repo → Settings → Webhooks → Add webhook:

| Field | Value |
| --- | --- |
| Payload URL | `http://<jenkins-host>:8080/github-webhook/` |
| Content type | `application/json` |
| Events | Just the push event |

If Jenkins sits on an internal network GitHub can't reach → use
`pollSCM('H/5 * * * *')` in `triggers {}` instead.

### B4. Reverse proxy

The admin creates the project's reverse-proxy entry the way every other project
on that server is done — the handoff states **what** it must cover, in words,
never a config snippet:

- prod path `__BASE_PATH_PROD__` → host port `APP_PORT` prod · dev path
  `__BASE_PATH_DEV__` → host port `APP_PORT` dev
- request-size limit ≥ `UPLOAD_MAX_BYTES` when upload-setup is installed (413 otherwise)
- `<basePath>/api/cron/` blocked from outside when the project has scheduled jobs
