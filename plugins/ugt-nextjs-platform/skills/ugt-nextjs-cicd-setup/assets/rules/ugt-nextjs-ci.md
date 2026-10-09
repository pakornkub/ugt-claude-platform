---
paths:
  - "Jenkinsfile"
  - "Dockerfile"
  - "docker-compose*.yml"
  - "sonar-project.properties"
  - "owasp-suppressions.xml"
  - "next.config.*"
---

<!-- Owned by ugt-nextjs-cicd-setup — may be overwritten wholesale on /plugin update. -->

# CI/CD rules (loads when touching Jenkinsfile / Docker / Sonar config)

## The stage list is the contract — change commands inside stages, never remove stages

```
Checkout → Install → Code Quality (parallel: lint / format:check / typecheck)
  → Unit Tests (JUnit + coverage) → Build
  → OWASP Dependency Check (90-min timeout + suppression file)
  → SonarQube Analysis → Quality Gate (abortPipeline: true)
  → Docker Build → Deploy        ← last 2 stages only on main/develop
post: emailext (success/unstable/failure/aborted) + cleanWs
```

## Quality Gate (measured on new code)

| Condition | Threshold |
| --- | --- |
| `new_violations` | = 0 |
| `new_duplicated_lines_density` | ≤ 3% |
| `new_coverage` | ≥ 60% |
| `new_security_hotspots_reviewed` | = 100% |

Always `waitForQualityGate abortPipeline: true` + a timeout — without
`abortPipeline` the gate goes red while the pipeline stays green, which is
worse than no gate because it manufactures false confidence.

## Secrets

- Secrets in `sh` must be expanded by the **shell**: `"$VAR"` — **never** Groovy
  interpolation `"${VAR}"`, which leaks the value into the build log (watch out
  especially inside `sh """..."""` where Groovy interpolates every `${}`)
- Reading a secret out of the credential file inside `sh`: `set +x` first and
  pass it by **name** (`export X=...; docker run -e X`). `sh` runs with `-x`,
  and `withCredentials` masks only the file path — not the values in the file
- Temp files holding secrets are deleted in `post { always }`
- `NOTIFY_EMAIL` / `SMTP_FROM` are Jenkins Global env vars — never hardcode
- Credential naming: `nvd` · `env-<project>` · `env-<project>-dev` · `sentry-dsn-<project>`

## Branch / per-branch values

`main` = prod · `develop` = dev (everything suffixed `-dev`)

Branch-dependent values **must** be resolved inside `script {}` from
`env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last()` — never in the
global `environment {}` block (global = one value for every branch).

## Scheduled jobs — host cron only (org decision 2026-10-09)

- Every scheduled/recurring job = one **host cron** line in the admin handoff
  cron table → `docker exec <container> wget` the app's `/api/cron/<job>` route
  (`references/docker-deploy.md` §H). **No in-app scheduler**: no `node-cron`,
  `node-schedule`, `setInterval` loops, no SQL Agent job, no Jenkins timer
- `/api/cron/*` routes: `POST` only · `Authorization: Bearer ${CRON_SECRET}`
  checked first (401 otherwise) · idempotent · destructive jobs keep the
  in-code date guard (pitfalls `hardening.md` §4)

## Docker

- `NEXT_PUBLIC_*` is inlined into the bundle at compile time → pass it as
  **`--build-arg`** only; setting it in compose `environment:` does nothing
- Deploy with `--no-build` (reuse the image from the Docker Build stage) —
  letting compose rebuild drops the build args and ships a broken bundle
- Tag images with `BUILD_NUMBER`, not bare `latest` (no rollback otherwise)
- Healthchecks hit `127.0.0.1`, not `localhost` (Alpine resolves it to IPv6 and fails)
- `pull_policy: never` in compose — the image is built locally, not in a registry
- **Migrate before `compose up`, always** — migrate fail = no deploy
- Keep `disableConcurrentBuilds()` in the pipeline `options {}` — otherwise two
  quick pushes run two Deploy stages (migrate + `compose up`) on the same
  container at the same time
- `next.config` must set `output: 'standalone'` or the Dockerfile's
  `COPY .next/standalone` fails
- Version-skew protection: `next.config` `deploymentId: process.env.NEXT_DEPLOYMENT_ID || undefined`
  + Dockerfile `ARG`/`ENV NEXT_DEPLOYMENT_ID` + Jenkins `--build-arg NEXT_DEPLOYMENT_ID=${buildNum}`
  on **both** `docker build` commands — without it a tab left open across a deploy
  fails every Server Action (`references/docker-deploy.md` §I)

## SonarQube config

- Every path in `sonar.sources` / `sonar.tests` **must exist** — a missing path
  fails sonar-scanner instantly
- `sonar.javascript.lcov.reportPaths=coverage/lcov.info` — without that file
  `new_coverage` reads 0% and the gate blocks with no error pointing at the cause
- Every entry in `sonar.cpd.exclusions` / `sonar.issue.ignore.multicriteria`
  and every `<suppress>` in `owasp-suppressions.xml` needs a **comment/`<notes>`
  explaining why**, and may only be added after reviewing a real finding —
  never suppress preemptively

## CI env

`CI=true` + `SKIP_ENV_VALIDATION=1` — **`SKIP_ENV_VALIDATION` is for build/CI
only; never set it in the production container** (it would skip runtime env
validation).
