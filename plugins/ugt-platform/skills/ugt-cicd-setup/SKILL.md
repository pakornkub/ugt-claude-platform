---
name: ugt-cicd-setup
description: >
  Use when adding the org-standard CI/CD to an existing project: Jenkins
  pipeline, SonarQube analysis + Quality Gate, OWASP Dependency Check, or
  Docker build/deploy — including creating a Jenkinsfile,
  sonar-project.properties, Dockerfile/docker-compose for CI, wiring Jenkins
  credentials, or debugging CI failures during initial pipeline setup
  (Quality Gate hangs, OWASP timeouts, deploy health-check failures).
  Don't use for writing code that passes the gate (→ ugt-clean-code), for
  installing the test/lint tooling the pipeline calls (→ ugt-quality-setup), or
  for DB/auth setup (→ ugt-database-setup / ugt-auth-setup).
---

# UGT CI/CD Setup

## 1. Overview

ติดตั้ง CI/CD มาตรฐานองค์กรให้ project ที่มีอยู่แล้ว:
**Jenkins declarative pipeline 10 stages + SonarQube Quality Gate (block) +
OWASP Dependency Check + Docker two-image build/deploy** — สกัดจาก pipeline
ที่ใช้งานจริงใน production

โครงไฟล์ของ skill นี้:

| ที่                                     | เนื้อหา                                                          |
| --------------------------------------- | ---------------------------------------------------------------- |
| `assets/`                            | Jenkinsfile, sonar-project.properties, Dockerfile, compose ×2, owasp-suppressions.xml, api-health-route.ts — copy แล้วแทน placeholder |
| `references/jenkins-one-time-setup.md`  | สิ่งที่ admin ต้องเตรียมฝั่ง Jenkins server (plugins/tools/credentials/webhook/snap-Docker gotcha) |
| `references/sonarqube-setup.md`         | สร้าง project, token, Quality Gate thresholds, suppression strategy |
| `references/docker-deploy.md`           | two-image deploy, migrate-then-deploy, health poll, build-arg rule |

## 2. Org Standards

สัญญากลางที่ **ทุก project ต้องมีเหมือนกัน**:

### 2.1 Stages (ครบ 10 ตามลำดับ)

```
Checkout → Install → Code Quality (parallel: lint / format / typecheck)
  → Unit Tests (JUnit + coverage publish) → Build
  → OWASP Dependency Check (90-min timeout + suppression file)
  → SonarQube Analysis → Quality Gate (waitForQualityGate abortPipeline: true)
  → Docker Build → Deploy          ← 2 stage สุดท้ายเฉพาะ main/develop
post: emailext (success/unstable/failure/aborted) + cleanWs
```

### 2.2 Branch model

| Branch    | Environment | ต่างกันที่                                                        |
| --------- | ----------- | ----------------------------------------------------------------- |
| `main`    | prod        | container name, host port, basePath, sonar projectKey, env credential |
| `develop` | dev         | ทุกอย่างมี suffix `-dev` + compose file แยก                       |

ค่า per-branch ทั้งหมด resolve ใน `script {}` จาก
`def br = (env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last())` —
ห้ามใส่ค่า branch-specific ใน global `environment {}`

### 2.3 Quality Gate thresholds (org standard — on New Code)

| Condition                        | Threshold |
| -------------------------------- | --------- |
| `new_coverage`                   | ≥ 60%     |
| `new_violations`                 | = 0       |
| `new_duplicated_lines_density`   | ≤ 3%      |
| `new_security_hotspots_reviewed` | = 100%    |

OWASP publisher: **fail** เมื่อ CRITICAL ≥ 1 · **unstable** เมื่อ HIGH ≥ 1
(suppression-aware — นับเฉพาะ CVE ที่ไม่ถูก suppress)

### 2.4 Credential naming convention

| Credential ID                 | Type        | ใช้ทำอะไร                                       |
| ----------------------------- | ----------- | ----------------------------------------------- |
| `nvd`                         | Secret text | NVD API key (แชร์ทุก project)                   |
| `env-<project>`               | Secret file | `.env` prod → `cp` เข้า workspace ตอน Deploy    |
| `env-<project>-dev`           | Secret file | `.env` dev (DB แยก + secret ใหม่)               |
| `sentry-dsn-<project>`        | Secret text | client-side DSN (optional)                      |
| SonarQube token               | —           | ผูกใน System → SonarQube servers (`withSonarQubeEnv`) — ไม่ bind เองใน Jenkinsfile |

### 2.5 กฎ secrets

- Secret ใน `sh` ให้ **shell expand** (`"$VAR"`) — ห้าม Groovy interpolation
  (`"${VAR}"`) เพราะรั่วลง build log
- ไฟล์ชั่วคราวที่มี secret (เช่น `dc-nvd.properties`) ลบใน `post { always }`
- `NOTIFY_EMAIL` / `SMTP_FROM` = Jenkins Global env vars — ไม่ hardcode

### 2.6 กฎ client-side vars

ตัวแปร `NEXT_PUBLIC_*` ถูก inline เข้า bundle ตอน compile → ต้องส่งเป็น
**`--build-arg` ตอน docker build เท่านั้น** ใส่เป็น runtime environment
ไม่มีผล (รายละเอียด → `references/docker-deploy.md`)

### 2.7 CI env

`CI=true` (เปิด JUnit reporter/standalone output) + `SKIP_ENV_VALIDATION=1`
(ข้าม env schema validation — **เฉพาะใน CI ห้ามตั้งใน production container**)

## 3. Interview — ถามก่อนลงมือ (ถามเป็นชุดเดียว)

1. **ชื่อ project** (kebab-case) → ใช้เป็น image/container/credential/sonar key
   + ชื่อแสดงผล (display name)
2. **Host ports** — prod / dev (เช่น 3000 / 3001)
3. **มี basePath ไหม** (deploy ใต้ subpath ของ reverse proxy?) — ถ้ามี ขอ path
   prod/dev + app URL เต็ม
4. **มี database ไหม** — ถ้ามี Prisma → คง [DB] sections (migrate step + builder
   image); ถ้าไม่มี → ตัดทิ้ง
5. **มี Sentry ไหม** — ถ้าไม่มี → ตัด [SENTRY] sections + credential
6. **Deploy target** — Docker host ไหน, Jenkins อยู่เครื่องเดียวกับ Docker
   daemon หรือใช้ socket mount, มี `docker-compose` v1 หรือ v2

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

> **`/api/health` ไม่ใช่ของเสริม** — Dockerfile `HEALTHCHECK` และ healthcheck ใน compose
> ทั้งสองไฟล์ยิงไปที่ path นี้ ถ้าไม่มี route จริง container จะไม่เคยขึ้น `healthy`
> แล้ว stage Deploy จะ fail ที่ขั้น poll `docker inspect` ทุกครั้ง (ดู `references/docker-deploy.md`)
> ถ้าโปรเจคมี route นี้อยู่แล้ว ให้ตรวจว่ามันไม่ต้อง login และไม่คืน version/commit ออกไป

### 4.2 แทน placeholders (ทั้งหมดมีเท่านี้)

| Placeholder                | ความหมาย                                  | ตัวอย่าง                              |
| -------------------------- | ----------------------------------------- | ------------------------------------- |
| `__PROJECT_NAME__`         | kebab-case id — image/container/sonar key/credential suffix | `my-portal`         |
| `__PROJECT_DISPLAY_NAME__` | ชื่อแสดงผล (sonar name, app name)         | `My Portal`                           |
| `__BASE_PATH_PROD__`       | basePath prod                             | `/my-portal`                          |
| `__BASE_PATH_DEV__`        | basePath dev                              | `/my-portal-dev`                      |
| `__APP_URL_PROD__`         | URL เต็ม prod (รวม basePath)              | `https://apps.example.com/my-portal`  |
| `__APP_URL_DEV__`          | URL เต็ม dev                              | `https://apps.example.com/my-portal-dev` |
| `__PORT_PROD__`            | host port prod                            | `3000`                                |
| `__PORT_DEV__`             | host port dev                             | `3001`                                |

ชื่อ derived อัตโนมัติจาก `__PROJECT_NAME__`: image/container dev =
`<project>-dev` · credentials = `env-<project>`, `env-<project>-dev`,
`sentry-dsn-<project>` · sonar keys = `<project>`, `<project>-dev`

### 4.3 ปรับตามคำตอบ interview

- ไม่มี DB → ลบทุก block ที่ comment `[DB]` (prisma generate ใน Install +
  Dockerfile, builder image build, migrate step ใน Deploy, `DATABASE_URL`
  ใน compose, **และ block `[DB]` ใน `app/api/health/route.ts`** — ลบแล้ว health
  ยังคืน `ok` ถูกต้องเพราะ `every()` บน check ว่างคืน `true`)
- ไม่มี Sentry → ลบทุกจุดที่ marker `[SENTRY]`: Jenkinsfile (comment block +
  บรรทัดเปิด `withCredentials` sentry-dsn + closing brace ที่ mark
  `[SENTRY] end withCredentials` + build-arg DSN ×2 — **คง docker build block
  ข้างในไว้ แล้ว unindent 1 ระดับ**), Dockerfile (`ARG`/`ENV`
  `NEXT_PUBLIC_SENTRY_DSN`), compose (`SENTRY_ENVIRONMENT`)
- ไม่มี basePath → basePath = ว่าง, health path = `/api/health`
- เช็ค `package.json` มี scripts ที่ pipeline เรียก: `lint`, `format:check`,
  `test:coverage`, `build` — ไม่มีให้เพิ่มหรือปรับ stage
- vitest ต้องเปิด JUnit reporter เมื่อ `CI=true` (ดู comment ใน template
  Unit Tests stage)

### 4.4 ปรับ next.config

- **`output: 'standalone'` จำเป็น** — Dockerfile copy `.next/standalone` ถ้า
  next.config ไม่เปิด standalone → `COPY` fail (ดู
  `references/docker-deploy.md` §F) — นิยม gate ด้วย CI:
  `output: process.env.CI ? 'standalone' : undefined`
- ถ้า deploy ใต้ basePath (คำตอบ interview ข้อ 3) → ต่อสาย
  `basePath: process.env.NEXT_PUBLIC_BASE_PATH` ใน next.config ด้วย

### 4.5 ฝั่ง server — ส่งรายการให้ admin

- Jenkins: plugins, tools (`NodeJS-22` / `SonarQube-Scanner` /
  `Dependency-Check` — ชื่อต้องตรงเป๊ะ), credentials, Global env vars,
  webhook, ปิด Lightweight checkout →
  **`references/jenkins-one-time-setup.md`**
- SonarQube: project ×2 (prod/dev), Global Analysis Token, Quality Gate ตาม
  §2.3, webhook กลับมา Jenkins → **`references/sonarqube-setup.md`**

### 4.6 ทดสอบ

Push `develop` → ดู pipeline วิ่งครบ 10 stages → เช็ค Verification Checklist §6

## 5. Quick Rules

| DO ✅                                                        | DON'T ❌                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| `waitForQualityGate abortPipeline: true` + timeout           | ข้าม Quality Gate หรือปล่อยไม่มี timeout                      |
| Deploy ด้วย `--no-build` (reuse image จาก Docker Build)      | ให้ compose rebuild ตอน deploy (build args หาย → bundle พัง)  |
| Client-side vars เป็น `--build-arg`                          | ใส่ใน compose `environment:` (ไม่มีผล)                        |
| Secret File credential `env-<project>` → `cp` เป็น `.env`    | สร้าง string credential แยกรายตัวแปร / hardcode ใน Jenkinsfile |
| Secret expand โดย shell (`"$VAR"`)                           | Groovy interpolation secret (`"${VAR}"` รั่วลง log)           |
| `dependencyCheckPublisher` นับ CVE                           | grep XML ดิบ (จับ suppressed ด้วย → false fail)               |
| Tag image ด้วย `BUILD_NUMBER`                                | ใช้ `latest` เดี่ยว ๆ (rollback ไม่ได้)                       |
| Healthcheck ที่ `127.0.0.1` + poll `docker inspect`          | `localhost` (Alpine → IPv6) / wget จาก Jenkins                |
| `SKIP_ENV_VALIDATION=1` เฉพาะ CI/build                       | ตั้งใน production container                                   |
| migrate ก่อน `compose up` — fail = ไม่ deploy                | deploy ก่อนแล้วค่อย migrate                                   |
| ทุก suppression/CPD exclusion มี rationale comment           | suppress ล่วงหน้าโดยไม่มี finding จริง                        |

## 6. Verification Checklist

**รันสคริปต์ก่อน** (cwd = root ของโปรเจคปลายทาง):

```bash
node <skill-dir>/scripts/verify.mjs
```

มันตรวจฝั่ง repo ให้ครบ (placeholder, 10 stages, brace สมดุลหลังตัด block, path ใน
`sonar.sources` มีจริง, compose, health route) — ฝั่ง server ยังต้องให้ admin ยืนยันเอง

**ไฟล์ใน repo:**

- [ ] Jenkinsfile ครบ 10 stages + post (emailext ×4 + cleanWs) — ไม่เหลือ
      placeholder `__*__` ค้าง
- [ ] `[DB]` / `[SENTRY]` blocks ถูกคงไว้หรือตัดตามคำตอบ interview แล้ว
- [ ] sonar-project.properties: sources/tests/exclusions ตรง layout จริง ·
      **ทุก path ใน `sonar.sources`/`sonar.tests` มีอยู่จริงใน repo**
      (sonar-scanner fail ทันทีถ้า path ไม่มี) ·
      CPD/multicriteria เริ่มว่าง (มีแต่ example ใน comment)
- [ ] owasp-suppressions.xml ว่าง (skeleton) อยู่ที่ root
- [ ] `app/api/health/route.ts` มีอยู่จริง · เรียกได้โดยไม่ต้อง login ·
      คืน 200 เมื่อปกติ / 503 เมื่อ DB ล่ม · ไม่มี version/commit ใน response
- [ ] compose ทั้งสองไฟล์: `pull_policy: never` · `APP_PORT` override ได้ ·
      healthcheck ใช้ `127.0.0.1` + basePath ถูก env
- [ ] `package.json` มี scripts: `lint`, `format:check`, `test:coverage`,
      `build` · test runner ออก `test-results/junit.xml` เมื่อ `CI=true`

**ฝั่ง server (ให้ admin ยืนยัน):**

- [ ] Jenkins tools ชื่อตรง: `NodeJS-22`, `SonarQube-Scanner`,
      `Dependency-Check` · SonarQube server ชื่อ `SonarQube`
- [ ] Credentials ครบ: `nvd`, `env-<project>`, `env-<project>-dev`
      (+ `sentry-dsn-<project>` ถ้าใช้)
- [ ] Global env vars: `NOTIFY_EMAIL`, `SMTP_FROM`
- [ ] Webhooks สองทาง: GitHub → Jenkins (`/github-webhook/`) และ
      SonarQube → Jenkins (`/sonarqube-webhook/`)
- [ ] SonarQube projects prod+dev สร้างแล้ว + Quality Gate ตาม §2.3 assign ครบ
- [ ] Lightweight checkout ปิดแล้วใน job config

**รันจริง:**

- [ ] Push `develop` → pipeline เขียวครบ 10 stages · coverage report + DC
      report โผล่บนหน้า build
- [ ] Container `healthy` ภายใน 4 นาที · app เปิดผ่าน reverse proxy ได้
- [ ] Email แจ้งผลเข้าตาม `NOTIFY_EMAIL`
- [ ] ทดสอบ gate block จริง: แกล้งใส่ violation → pipeline abort ที่
      Quality Gate stage
