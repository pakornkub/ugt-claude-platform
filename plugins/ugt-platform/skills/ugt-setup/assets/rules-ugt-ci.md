---
paths:
  - "Jenkinsfile"
  - "Dockerfile"
  - "docker-compose*.yml"
  - "sonar-project.properties"
  - "owasp-suppressions.xml"
  - "next.config.*"
---

<!-- Owned by ugt-cicd-setup — may be overwritten wholesale on /plugin update. -->

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
- Temp files holding secrets are deleted in `post { always }`
- `NOTIFY_EMAIL` / `SMTP_FROM` are Jenkins Global env vars — never hardcode
- Credential naming: `nvd` · `env-<project>` · `env-<project>-dev` · `sentry-dsn-<project>`

## Branch / per-branch values

`main` = prod · `develop` = dev (everything suffixed `-dev`)

Branch-dependent values **must** be resolved inside `script {}` from
`env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last()` — never in the
global `environment {}` block (global = one value for every branch).

## Docker

- `NEXT_PUBLIC_*` is inlined into the bundle at compile time → pass it as
  **`--build-arg`** only; setting it in compose `environment:` does nothing
- Deploy with `--no-build` (reuse the image from the Docker Build stage) —
  letting compose rebuild drops the build args and ships a broken bundle
- Tag images with `BUILD_NUMBER`, not bare `latest` (no rollback otherwise)
- Healthchecks hit `127.0.0.1`, not `localhost` (Alpine resolves it to IPv6 and fails)
- `pull_policy: never` in compose — the image is built locally, not in a registry
- **Migrate before `compose up`, always** — migrate fail = no deploy
- `next.config` must set `output: 'standalone'` or the Dockerfile's
  `COPY .next/standalone` fails

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
