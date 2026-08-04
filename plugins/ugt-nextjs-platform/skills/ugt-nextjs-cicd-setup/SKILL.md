---
name: ugt-nextjs-cicd-setup
description: >
  Use when a project needs the org-standard delivery pipeline — "ทำ CI/CD",
  "ตั้ง Jenkins", "deploy ด้วย docker", "ต่อ SonarQube", "ยัง deploy มือทุกครั้ง" —
  producing the Jenkinsfile (10 stages), sonar-project.properties, Dockerfile,
  both compose files, the OWASP suppression file, and the `/api/health` route the
  healthcheck depends on. Also use when the pipeline itself misbehaves during
  setup, because the causes are documented here: Quality Gate that never
  finishes (missing SonarQube→Jenkins webhook), OWASP stage timing out, container
  never reaching `healthy`, `COPY .next/standalone` failing, client-side env vars
  empty in the browser bundle, or a Groovy parse error after removing an optional
  block.
  Run ugt-nextjs-quality-setup first — this pipeline calls `lint`, `format:check` and
  `test:coverage` by exact name and goes red on the third stage without them.
  Not for writing code that passes the gate (→ ugt-nextjs-clean-code) or DB/auth setup
  (→ ugt-nextjs-database-setup / ugt-nextjs-auth-setup).
---

# UGT CI/CD Setup

## 1. Overview

Installs the org-standard CI/CD into an existing project:
**10-stage Jenkins declarative pipeline + SonarQube Quality Gate (blocking) +
OWASP Dependency Check + two-image Docker build/deploy** — extracted from a
pipeline running in production.

Skill layout:

| Where | Contents |
| --- | --- |
| `assets/` | Jenkinsfile, sonar-project.properties, Dockerfile, compose ×2, owasp-suppressions.xml, api-health-route.ts — copy and substitute placeholders |
| `references/jenkins-one-time-setup.md` | what the admin prepares on the Jenkins server (plugins/tools/credentials/webhook/snap-Docker gotcha) |
| `references/sonarqube-setup.md` | creating projects, tokens, Quality Gate thresholds, suppression strategy |
| `references/docker-deploy.md` | two-image deploy, migrate-then-deploy, health polling, build-arg rule |
| `references/external-config-handoff.md` | the three docs above, pulled into **one table** with this project's real substituted names — what actually gets handed to the admin |

## 2. Org Standards

The shared contract **every project follows identically**:

### 2.1 Stages (all 10, in order)

```
Checkout → Install → Code Quality (parallel: lint / format / typecheck)
  → Unit Tests (JUnit + coverage publish) → Build
  → OWASP Dependency Check (90-min timeout + suppression file)
  → SonarQube Analysis → Quality Gate (waitForQualityGate abortPipeline: true)
  → Docker Build → Deploy          ← last 2 stages only on main/develop
post: emailext (success/unstable/failure/aborted) + cleanWs
```

### 2.2 Branch model

| Branch | Environment | Differs in |
| --- | --- | --- |
| `main` | prod | container name, host port, basePath, sonar projectKey, env credential |
| `develop` | dev | everything suffixed `-dev` + separate compose file |

All per-branch values resolve inside `script {}` from
`def br = (env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last())` —
never put branch-specific values in the global `environment {}`.

### 2.3 Quality Gate thresholds (org standard — on New Code)

| Condition | Threshold |
| --- | --- |
| `new_coverage` | ≥ 60% |
| `new_violations` | = 0 |
| `new_duplicated_lines_density` | ≤ 3% |
| `new_security_hotspots_reviewed` | = 100% |

OWASP publisher: **fail** at CRITICAL ≥ 1 · **unstable** at HIGH ≥ 1
(suppression-aware — counts only unsuppressed CVEs)

### 2.4 Credential naming convention

| Credential ID | Type | Purpose |
| --- | --- | --- |
| `nvd` | Secret text | NVD API key (shared by all projects) |
| `env-<project>` | Secret file | prod `.env` → `cp` into the workspace at Deploy |
| `env-<project>-dev` | Secret file | dev `.env` (separate DB + fresh secrets) |
| `sentry-dsn-<project>` | Secret text | client-side DSN (optional) |
| SonarQube token | — | bound in System → SonarQube servers (`withSonarQubeEnv`) — never bound manually in the Jenkinsfile |

### 2.5 Secret rules

- Secrets in `sh` are expanded by the **shell** (`"$VAR"`) — never Groovy
  interpolation (`"${VAR}"`), which leaks them into the build log
- Temp files holding secrets (e.g. `dc-nvd.properties`) are deleted in `post { always }`
- `NOTIFY_EMAIL` / `SMTP_FROM` = Jenkins Global env vars — never hardcoded

### 2.6 Client-side vars rule

`NEXT_PUBLIC_*` vars are inlined into the bundle at compile time → they must be
**`--build-arg` at docker build only** — setting them as runtime environment
does nothing (details → `references/docker-deploy.md`)

### 2.7 CI env

`CI=true` (enables the JUnit reporter / standalone output) +
`SKIP_ENV_VALIDATION=1` (skips env schema validation — **CI only; never set in
the production container**)

## 3. Interview — ask first (one batch)

1. **Project name** (kebab-case) → becomes image/container/credential/sonar key
   + display name
2. **Host ports** — prod / dev (e.g. 3000 / 3001)
3. **basePath?** (deployed under a reverse-proxy subpath?) — if yes, get the
   prod/dev paths + full app URLs
4. **Database?** — Prisma present → keep the [DB] sections (migrate step +
   builder image); absent → cut them
5. **Sentry?** — absent → cut the [SENTRY] sections + credential
6. **Deploy target** — which Docker host, is Jenkins on the same machine as the
   Docker daemon or socket-mounted, `docker-compose` v1 or v2

## 4. Setup Steps

### 4.1 Copy assets → project root

```
assets/Jenkinsfile                → Jenkinsfile
assets/sonar-project.properties   → sonar-project.properties
assets/Dockerfile                 → Dockerfile
assets/docker-compose.yml         → docker-compose.yml
assets/docker-compose.dev.yml     → docker-compose.dev.yml
assets/owasp-suppressions.xml     → owasp-suppressions.xml
assets/api-health-route.ts        → app/api/health/route.ts
```

> **`/api/health` is not optional** — the Dockerfile `HEALTHCHECK` and both
> compose healthchecks hit this path. Without a real route the container never
> reports `healthy` and the Deploy stage fails at the `docker inspect` poll
> every time (see `references/docker-deploy.md`). If the project already has
> this route, verify it needs no login and returns no version/commit info.

### 4.2 Substitute placeholders (this is the complete list)

| Placeholder | Meaning | Example |
| --- | --- | --- |
| `__PROJECT_NAME__` | kebab-case id — image/container/sonar key/credential suffix | `my-portal` |
| `__PROJECT_DISPLAY_NAME__` | display name (sonar name, app name) | `My Portal` |
| `__BASE_PATH_PROD__` | prod basePath | `/my-portal` |
| `__BASE_PATH_DEV__` | dev basePath | `/my-portal-dev` |
| `__APP_URL_PROD__` | full prod URL (incl. basePath) | `https://apps.example.com/my-portal` |
| `__APP_URL_DEV__` | full dev URL | `https://apps.example.com/my-portal-dev` |
| `__PORT_PROD__` | prod host port | `3000` |
| `__PORT_DEV__` | dev host port | `3001` |

Names derived automatically from `__PROJECT_NAME__`: dev image/container =
`<project>-dev` · credentials = `env-<project>`, `env-<project>-dev`,
`sentry-dsn-<project>` · sonar keys = `<project>`, `<project>-dev`

### 4.3 Adjust per interview answers

- No DB → delete every block commented `[DB]` (prisma generate in Install +
  Dockerfile, builder image build, migrate step in Deploy, `DATABASE_URL` in
  compose, **and the `[DB]` block in `app/api/health/route.ts`** — after
  removal health still correctly returns `ok`, because `every()` on an empty
  check set is `true`)
- No Sentry → delete everything marked `[SENTRY]`: Jenkinsfile (comment block +
  the opening `withCredentials` sentry-dsn line + the closing brace marked
  `[SENTRY] end withCredentials` + both DSN build-args — **keep the docker
  build block inside, unindented one level**), Dockerfile (`ARG`/`ENV`
  `NEXT_PUBLIC_SENTRY_DSN`), compose (`SENTRY_ENVIRONMENT`)
- No basePath → basePath = empty, health path = `/api/health`
- Check `package.json` has the scripts the pipeline calls: `lint`,
  `format:check`, `test:coverage`, `build` — add or adjust the stage if missing
- vitest must enable the JUnit reporter when `CI=true` (see the comment in the
  template's Unit Tests stage)

### 4.4 Adjust next.config

- **`output: 'standalone'` is required** — the Dockerfile copies
  `.next/standalone`; without it the `COPY` fails (see
  `references/docker-deploy.md` §F) — commonly gated on CI:
  `output: process.env.CI ? 'standalone' : undefined`
- If deploying under a basePath (interview answer 3) → also wire
  `basePath: process.env.NEXT_PUBLIC_BASE_PATH` in next.config

### 4.5 Local env files for `docker compose` testing

`.env.local` (from database/auth setup) is read by `next dev` — it is **not**
read by `docker compose`, which auto-loads a file literally named `.env` in
the compose file's directory. To let a developer run the prod-shaped and
dev-shaped compose files locally without waiting on a Jenkins deploy, create
two more files alongside `.env.local`, **both gitignored, both real values,
neither ever committed**:

| File | Copy of | Add/override |
| --- | --- | --- |
| `.env` | `.env.local` | `APP_PORT=__PORT_PROD__` |
| `.env.dev` | `.env.local` | `APP_PORT=__PORT_DEV__` + point `DATABASE_URL` at the dev DB if it differs |

Run with `docker compose up` (reads `.env` automatically) and
`docker compose -f docker-compose.dev.yml --env-file .env.dev up`
(`.dev.yml` doesn't auto-load a same-named env file — pass `--env-file`
explicitly).

Ensure `.gitignore` has all of: `.env`, `.env.dev`, `.env.local`, `.env*.local`
— and that `.env.example` is **not** matched by any of those patterns (add
`!.env.example` if the project's `.gitignore` uses a broad `.env*` rule). A
bare `.env` full of real values committed to git is a leaked-secrets incident,
not a style nit.

### 4.6 Server side — hand the list to the admin

- Jenkins: plugins, tools (`NodeJS-22` / `SonarQube-Scanner` /
  `Dependency-Check` — names must match exactly), credentials, global env vars,
  webhook, disable Lightweight checkout →
  **`references/jenkins-one-time-setup.md`**
- SonarQube: projects ×2 (prod/dev), Global Analysis Token, Quality Gate per
  §2.3, webhook back to Jenkins → **`references/sonarqube-setup.md`**
- **Render `assets/admin-handoff.template.md` → write it to the project as
  `docs/admin-handoff.md`** with every `{{...}}` substituted (project name,
  ports, basePaths, credential IDs, URLs) and every section for an unselected
  system deleted (no Sentry → no Sentry row; no SSO → no Keycloak section;
  not the first project on the server → no server-level appendix). This is
  the **standard handoff file** the user forwards to the admin/DevOps team:
  plain-Thai steps, exact names, and a fill-in "ค่าที่ต้องส่งกลับ" section
  the admin completes and returns. Tell the user explicitly: "ส่งไฟล์
  `docs/admin-handoff.md` ให้ทีม admin ได้เลย แล้วรอค่าตอบกลับมาใส่
  `.env.local`". A chat summary is fine too, but the file is the deliverable
  — don't make admins copy names out of a chat log or cross-reference three
  documents. (The raw per-system detail stays in
  `references/external-config-handoff.md` + the two setup references.)

### 4.7 Test

Push `develop` → watch the pipeline run all 10 stages → check the Verification
Checklist §6

## 5. Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| `waitForQualityGate abortPipeline: true` + timeout | Skip the Quality Gate or leave it without a timeout |
| Deploy with `--no-build` (reuse the Docker Build image) | Let compose rebuild at deploy (build args lost → broken bundle) |
| Client-side vars as `--build-arg` | In compose `environment:` (no effect) |
| Secret File credential `env-<project>` → `cp` to `.env` | Separate string credentials per var / hardcoding in the Jenkinsfile |
| Secrets expanded by the shell (`"$VAR"`) | Groovy-interpolated secrets (`"${VAR}"` leaks into the log) |
| `dependencyCheckPublisher` counts CVEs | Grepping the raw XML (counts suppressed too → false fails) |
| Tag images with `BUILD_NUMBER` | Bare `latest` (no rollback) |
| Healthcheck on `127.0.0.1` + poll `docker inspect` | `localhost` (Alpine → IPv6) / wget from Jenkins |
| `SKIP_ENV_VALIDATION=1` for CI/build only | Setting it in the production container |
| `.env` / `.env.dev` local, gitignored, mirror the real Jenkins credential | Committing either — same as `.env.local`, they hold real secrets |
| `NODE_TLS_REJECT_UNAUTHORIZED=0` in local `.env.local`/`.env.dev` only, if at all | Ever in `env-<project>` / `env-<project>-dev` (the prod/dev Jenkins credentials) |
| Migrate before `compose up` — fail = no deploy | Deploy first, migrate later |
| Every suppression/CPD exclusion carries a rationale comment | Suppressing preemptively with no real finding |

## 6. Verification Checklist

**Run the script first** (cwd = target project root):

```bash
node <skill-dir>/scripts/verify.mjs
```

It covers the repo side fully (placeholders, 10 stages, brace balance after
block removal, `sonar.sources` paths existing, compose, health route) — the
server side still needs admin confirmation.

**Files in the repo:**

- [ ] Jenkinsfile has all 10 stages + post (emailext ×4 + cleanWs) — no
      `__*__` placeholders left
- [ ] `[DB]` / `[SENTRY]` blocks kept or cut per the interview answers
- [ ] `app/api/health/route.ts` exists · reachable without login · returns 200
      healthy / 503 when the DB is down · no version/commit in the response
- [ ] sonar-project.properties: sources/tests/exclusions match the real layout ·
      **every path in `sonar.sources`/`sonar.tests` exists in the repo**
      (sonar-scanner fails instantly otherwise) · CPD/multicriteria start empty
      (examples in comments only)
- [ ] owasp-suppressions.xml (empty skeleton) at the root
- [ ] Both compose files: `pull_policy: never` · `APP_PORT` overridable ·
      healthcheck uses `127.0.0.1` + the right basePath per env
- [ ] `package.json` has scripts: `lint`, `format:check`, `test:coverage`,
      `build` · the test runner emits `test-results/junit.xml` when `CI=true`
- [ ] `.env` and `.env.dev` exist locally with `APP_PORT` set, and both are
      gitignored (`git check-ignore .env .env.dev` — exit 0, they're ignored)

**Server side (admin confirms) — `references/external-config-handoff.md` filled
in and handed over covers this list by exact project name; the items:**

- [ ] Jenkins tools named exactly: `NodeJS-22`, `SonarQube-Scanner`,
      `Dependency-Check` · SonarQube server named `SonarQube`
- [ ] Credentials present: `nvd`, `env-<project>`, `env-<project>-dev`
      (+ `sentry-dsn-<project>` if used)
- [ ] Global env vars: `NOTIFY_EMAIL`, `SMTP_FROM`
- [ ] Both webhooks: GitHub → Jenkins (`/github-webhook/`) and
      SonarQube → Jenkins (`/sonarqube-webhook/`)
- [ ] SonarQube prod+dev projects created + the §2.3 Quality Gate assigned to both
- [ ] Lightweight checkout disabled in the job config

**Live run:**

- [ ] Push `develop` → pipeline green through all 10 stages · coverage report +
      DC report appear on the build page
- [ ] Container `healthy` within 4 minutes · app reachable through the reverse proxy
- [ ] Result email arrives at `NOTIFY_EMAIL`
- [ ] Prove the gate actually blocks: introduce a violation → pipeline aborts at
      the Quality Gate stage
