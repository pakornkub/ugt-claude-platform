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

## Server names (must match exactly)

SonarQube server entry `SonarQube` · webhook pair GitHub→Jenkins
(`/github-webhook/`) and SonarQube→Jenkins (`/sonarqube-webhook/`) ·
Lightweight checkout disabled on pipeline jobs.
