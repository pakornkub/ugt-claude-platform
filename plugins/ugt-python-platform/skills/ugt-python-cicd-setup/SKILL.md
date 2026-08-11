---
name: ugt-python-cicd-setup
description: >
  Use when a Python project needs the org-standard delivery pipeline —
  "ทำ CI/CD ให้โปรเจค python", "deploy fastapi/flask/django ด้วย docker",
  "ตั้ง jenkins ให้ python" — producing the 10-stage Jenkinsfile (toolchain in
  docker), sonar-project.properties, Dockerfile (web/batch), both compose files,
  minimal ruff/mypy/pytest tooling + smoke test so the Quality Gate can pass,
  /api/health per framework, volume bind mounts under /srv/appdata, and the
  admin handoff. Covers FastAPI, Flask, Django and batch jobs. Not for Next.js
  (→ ugt-nextjs-cicd-setup) or PHP (→ ugt-php-cicd-setup).
---

# UGT Python CI/CD Setup

## 1. Overview

ติดตั้ง CI/CD มาตรฐานองค์กรลงในโปรเจค Python ที่มีอยู่แล้ว:
**10-stage Jenkins declarative pipeline + SonarQube Quality Gate (blocking) +
OWASP Dependency Check + two-image Docker build/deploy** — โครงเดียวกับที่
Next.js ใช้อยู่จริงใน production ต่างกันแค่คำสั่งข้างใน stage

> ### ⚠️ ยังไม่ผ่าน pilot
>
> **ทุก shape ยังไม่เคยรันกับโปรเจคจริง** (มติ M2: ต้องผ่านภาษาละ 1 โปรเจคก่อน
> tag); shape ที่ผ่านแล้วจะย้ายออกจากรายการนี้
>
> | Shape | สถานะ |
> | --- | --- |
> | FastAPI (web) | ยังไม่ผ่าน pilot |
> | Flask (web) | ยังไม่ผ่าน pilot |
> | Django (web) | ยังไม่ผ่าน pilot |
> | Batch job (ไม่มี web server) | ยังไม่ผ่าน pilot |
>
> แปลว่า: ค่าคงที่ทุกตัวในชุดนี้ (base image, คำสั่ง toolchain, health poll,
> UID chown) ถูกไล่ตรวจด้วยเหตุผลแล้วแต่**ยังไม่ถูกพิสูจน์ด้วย build จริง** —
> โปรเจคแรกของแต่ละ shape ต้องเผื่อเวลาไล่แก้รอบ pipeline จริง แล้วส่ง feedback
> กลับมาที่ plugin นี้ (PR ที่ repo platform) ไม่ใช่แก้ค้างไว้ในโปรเจคเดียว

Skill layout:

| Where | Contents |
| --- | --- |
| `assets/Jenkinsfile` | 10 stages ครบ · toolchain รันใน `docker.image('python:3.12-slim').inside` (มติ M8) · บล็อกติดป้าย `[DB]` `[VOLUME]` `[WEB]` `[BATCH]` |
| `assets/sonar-project.properties` | projectKey/Name + `sonar.python.*` + import DC report |
| `assets/owasp-suppressions.xml` | skeleton ว่าง + กติกาการเพิ่ม suppression |
| `assets/docker/Dockerfile.web` · `Dockerfile.batch` | เลือกตัวเดียวตาม shape → copy เป็น `Dockerfile` ที่ root |
| `assets/docker-compose.yml` · `docker-compose.dev.yml` | prod/dev คนละไฟล์ · `pull_policy: never` · healthcheck 127.0.0.1 |
| `assets/health/fastapi_health.py` · `flask_health.py` · `django_health.py` | `/api/health` ต่อ framework — เอาไปวางในซอร์สของแอป |
| `assets/tooling/pyproject-tooling.toml` · `requirements-dev.txt` · `test_smoke.py` | tooling ขั้นต่ำ (ruff/mypy/pytest+cov) ให้ stage 2–4 รันผ่านโดยไม่แตะโค้ดเดิม (มติ M4) |
| `assets/rules/ugt-python-ci.md` | ไฟล์ `.claude/rules/` — โหลดเองเมื่อ session แตะ Jenkinsfile/Docker/Sonar (overwrite ทั้งไฟล์ได้ตอน plugin update) |
| `assets/admin-handoff.template.md` | เอกสารส่งทีม admin — render แล้วเขียนลงโปรเจคเป็น `docs/admin-handoff.md` |
| `references/docker-deploy.md` | กลไก deploy เชิงลึก: [WEB] vs [BATCH], host cron, volume ownership/chown, healthcheck บน slim, `.dockerignore`, compose conventions |
| `references/legacy-test-generation.md` | ขั้น optional (มติ M7) — ไล่สร้าง characterization test ให้โค้ดเดิม ทำใน session แยก |
| `scripts/verify.mjs` | ตรวจฝั่ง repo ให้อัตโนมัติหลัง setup เสร็จ (§7) |

Server setup ระดับ Jenkins/SonarQube (ทำครั้งเดียวต่อ server) **ไม่ได้คัดลอกมา
ไว้ในนี้** — เป็นงานฝั่ง admin ไม่ใช่ไฟล์ในโปรเจค จึงส่งผ่าน
`assets/admin-handoff.template.md` แทน (ภาคผนวกท้ายไฟล์นั้นคือ server-level setup)

## 2. Org Standards

contract ร่วมที่ **ทุกโปรเจคทำเหมือนกันหมด** ไม่ว่าภาษาอะไร:

### 2.1 Stages (all 10, in order)

```
Checkout → Install → Code Quality (parallel: ruff check / ruff format --check / mypy)
  → Unit Tests (JUnit + coverage publish) → Build
  → OWASP Dependency Check (90-min timeout + suppression file)
  → SonarQube Analysis → Quality Gate (waitForQualityGate abortPipeline: true)
  → Docker Build → Deploy          ← last 2 stages only on main/develop
post: emailext (success/unstable/failure/aborted) + cleanWs
```

รายการ stage คือ contract — สลับคำสั่งข้างในได้ **ห้ามตัด stage**. โครง
10-stage นี้คงไว้แม้ stage `Build` ของ Python จะเป็น no-op (`echo` เฉย ๆ)
เพราะ Python มี artifact เดียวคือ image ซึ่งถูกสร้างที่ stage `Docker Build`
อยู่แล้ว — การตัดออกทำให้ pipeline ของแต่ละภาษาเทียบกันไม่ได้

### 2.2 Toolchain รันใน docker (มติ M8 — ไม่แตะ Jenkins Global Tools)

ทุก stage ที่ต้องใช้ Python (`Install` / `Lint` / `Format Check` / `Type Check`
/ `Unit Tests`) เปิด `docker.image('python:3.12-slim').inside { ... }` ของตัวเอง
— Jenkins server ไม่ต้องติดตั้ง Python เพิ่มเลย. `.venv` ถูกสร้างในสเตจ
`Install` แล้วอยู่ใน **workspace** (ไม่ใช่ในตัว container ที่ถูกทิ้งเมื่อ stage
จบ) จึงรอดข้ามไปสเตจถัดไปได้ เพราะ `docker.image().inside` mount workspace เดิม
ทุกครั้ง. เงื่อนไขฝั่ง server ข้อเดียว: **Jenkins user ต้องอยู่ใน `docker`
group** ไม่งั้นทุก stage fail ด้วย permission denied ต่อ `/var/run/docker.sock`
(อยู่ในเช็คลิสต์ admin handoff แล้ว)

### 2.3 Branch model

| Branch | Environment | Differs in |
| --- | --- | --- |
| `main` | prod | container name, host port, sonar projectKey, env credential |
| `develop` | dev | ทุกอย่างต่อท้าย `-dev` + คนละไฟล์ compose |

ค่าที่ขึ้นกับ branch resolve ใน `script {}` จาก
`def br = (env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last())` เสมอ —
ห้ามใส่ค่าเฉพาะ branch ใน `environment {}` ระดับ global

### 2.4 Quality Gate thresholds (org standard — วัดที่ New Code)

| Condition | Threshold |
| --- | --- |
| `new_violations` | = 0 |
| `new_duplicated_lines_density` | ≤ 3% |
| `new_coverage` | ≥ 60% |
| `new_security_hotspots_reviewed` | = 100% |

OWASP publisher: **fail** at CRITICAL ≥ 1 · **unstable** at HIGH ≥ 1
(suppression-aware — นับเฉพาะ CVE ที่ไม่ถูก suppress)

ห้ามลดค่า gate ในฝั่ง SonarQube เพื่อให้ pipeline ผ่านง่ายขึ้น — โปรเจคที่ผ่อน
ค่าเองทำให้ตัวเลขทั้งองค์กรเทียบกันไม่ได้

### 2.5 Credential naming convention

| Credential ID | Type | Purpose |
| --- | --- | --- |
| `nvd` | Secret text | NVD API key (ตัวเดียวทั้ง server ทุกโปรเจคใช้ร่วมกัน) |
| `env-<project>` | Secret file | prod `.env` → `cp` เข้า workspace ตอน Deploy |
| `env-<project>-dev` | Secret file | dev `.env` (คนละ DB คนละ secret กับ prod) |
| SonarQube token | — | ผูกที่ System → SonarQube servers (`withSonarQubeEnv`) — ห้าม bind มือใน Jenkinsfile |

stack นี้ **ไม่มี** `sentry-dsn-<project>` (ไม่มี client bundle ให้ inline DSN)

### 2.6 Secret rules

- Secrets ใน `sh` ต้องถูกขยายค่าโดย **shell** (`"$VAR"`) — ห้าม Groovy
  interpolation (`"${VAR}"`) เพราะรั่วลง build log (ระวังเป็นพิเศษใน
  `sh """..."""` ที่ Groovy interpolate ทุก `${}` ที่เจอ)
- ไฟล์ชั่วคราวที่เก็บ secret (`dc-nvd.properties`) ลบใน `post { always }`
- `NOTIFY_EMAIL` / `SMTP_FROM` = Jenkins Global env vars — ห้าม hardcode

### 2.7 Build & deploy rules

- Tag image ด้วย `BUILD_NUMBER` คู่กับ `latest` เสมอ — `latest` เปล่า ๆ =
  rollback ไม่ได้
- **Migrate ก่อน deploy** — migration fail = ไม่ deploy
- Deploy ด้วย `--no-build` (reuse image ที่เพิ่งผ่าน Quality Gate) — ปล่อยให้
  compose build เองจะได้ image คนละตัวกับที่ scan ผ่าน
- Compose: `pull_policy: never` · host port override ได้จาก `.env`
  (`${APP_PORT:-...}`) · log rotation จำกัดขนาด

### 2.8 Health endpoint

`/api/health` — ไม่ต้อง login · 200 `healthy` / 503 `degraded` · **ห้ามใส่
version หรือ commit hash ใน response**. Container healthcheck ยิง `127.0.0.1`
เท่านั้น (ห้าม `localhost` — slim/Debian resolve เป็น IPv6 `::1` ขณะที่
uvicorn/gunicorn ผูก IPv4) และยิง **port 8000 ภายใน container** เสมอ ไม่ใช่
host port. `python:3.12-slim` ไม่มี `wget`/`curl` → healthcheck ใช้
`python -c "import urllib.request,sys; ..."` (stdlib ล้วน) ทั้งใน Dockerfile และ
compose. Shape `[BATCH]` ไม่มี health endpoint เลย (ไม่มี long-running process
ให้ poll) — ดู `references/docker-deploy.md` §E

### 2.9 Persistent data

ข้อมูลที่ต้องรอดข้าม deploy ใช้ bind mount ใต้ `/srv/appdata/<project>/<name>`
(dev = `/srv/appdata/<project>-dev/<name>`) เท่านั้น — ห้าม named volume,
ห้ามเก็บ secret ใน volume, ห้าม bind โค้ดทับ image. บล็อก `[VOLUME]` ในสเตจ
Deploy สร้าง path + `chown` ให้ตรง UID ของ user `app` ใน container ให้เอง
เฉพาะครั้งแรก (idempotent) โดยอ่าน UID จาก image จริง ไม่ hardcode;
admin เตรียม `/srv/appdata` ให้เขียนได้ครั้งเดียวต่อ server (ดู admin handoff).
รายละเอียดกลไก chown → `references/docker-deploy.md` §D

### 2.10 CI env

`CI=true` อย่างเดียว. **ไม่มีกติกา build-arg สำหรับ client-side env vars**
แบบที่ Next.js ต้องมี (`NEXT_PUBLIC_*` ต้องเป็น `--build-arg`) เพราะ stack นี้
ไม่มี compile-time client bundle — secret ทุกตัวเป็น runtime env จาก `.env`
ล้วน ๆ นี่คือความง่ายที่ได้มา ไม่ใช่ของที่หายไป

## 3. อ่าน codebase ก่อนถาม

คำตอบครึ่งหนึ่งของ §4 หาเจอในโค้ดอยู่แล้ว — อ่านก่อน แล้วถามเพื่อ **ยืนยัน**
ไม่ใช่ถามเปล่า:

| หาอะไร | หายังไง | ใช้ตอบข้อไหน |
| --- | --- | --- |
| Entry point + shape | grep `FastAPI()` · `Flask(` · `manage.py` / `wsgi.py` / `asgi.py`; ไม่เจอทั้งหมด + มี `if __name__ == "__main__"` → batch | ข้อ 4 (shape) + `__START_CMD_JSON__` / `__APP_MODULE__` |
| Dependency manifest | มี `requirements.txt` ไหม (ถ้าไม่มีต้องสร้างก่อน — Dockerfile และสเตจ Install `COPY`/อ่านไฟล์นี้ตรง ๆ); มี `pyproject.toml`/lock อยู่แล้วไหม | ข้อ 1 + §5 |
| Route `/api/health` เดิม | grep `"/api/health"` ทั้ง `**/*.py` | §5 (มีแล้ว → ไม่ copy ทับ แค่ตรวจว่าไม่ต้อง login และไม่คืน version) |
| Config lint/test เดิม | `[tool.ruff]` / `[tool.pytest.ini_options]` / `[tool.mypy]` ใน `pyproject.toml`, `setup.cfg`, `ruff.toml`, `pytest.ini`, `mypy.ini` | §5 (merge ไม่ทับ) |
| Migration tool | มี `alembic.ini`/`alembic/` → alembic · มี `manage.py` → `manage.py migrate` · ไม่มีเลย → ไม่มี DB migration | ข้อ 5 |
| Test เดิม | มี `tests/` + ไฟล์ `test_*.py` อยู่แล้วไหม | §5 (มีแล้ว → ไม่ต้องเพิ่ม `test_smoke.py`) |

**ของเดิมไม่เขียนทับ** — ทุกไฟล์ในตาราง §5.1 ถ้ามีอยู่แล้วให้ merge/ปรับ แล้ว
บอกผู้ใช้ว่าไปแตะอะไรบ้าง; ยกเว้นไฟล์เดียวคือ `.claude/rules/ugt-python-ci.md`
ที่ทับทั้งไฟล์ได้ (plugin เป็นเจ้าของ)

## 4. Interview — ถามชุดเดียว (8 ข้อ)

1. **ชื่อโปรเจค** (kebab-case) → กลายเป็นชื่อ image/container/credential/sonar
   key + display name
2. **Host ports** — prod / dev (เช่น 8000 / 8001) — ถ้ายังไม่ได้จัดสรรจาก admin
   ใส่ค่า placeholder ไปก่อนแล้วรอค่าจริงกลับมาทาง admin handoff
3. **อยู่หลัง reverse-proxy subpath ไหม** (เฉพาะ shape web) → ถ้าใช่ ขอ path
   prod/dev + URL เต็ม เพื่อไปตั้ง `root_path`/`SCRIPT_NAME`/`FORCE_SCRIPT_NAME`
   ของ framework เอง (ไม่มี placeholder ในชุดไฟล์นี้ — เป็นค่าฝั่งแอป)
4. **App shape** — `fastapi` / `flask` / `django` / `batch` (เดาจาก §3 แล้วให้
   ยืนยัน) → ตัดสินว่าใช้ `Dockerfile.web` หรือ `Dockerfile.batch`, ใช้ health
   ไฟล์ไหน, Deploy stage จบแบบ `[WEB]` หรือ `[BATCH]`
5. **Database + migration** — `alembic` / `django migrate` / ไม่มี → คงหรือลบ
   บล็อก `[DB]` ทั้งชุด
6. **Volume** — มี path ที่ต้อง persist ข้าม deploy ไหม (uploads, ไฟล์ SQLite,
   รายงานที่ generate) → รายชื่อ → บล็อก `[VOLUME]` ในทั้ง 2 compose; ไม่มี →
   ลบบล็อก
7. **Deploy target** — docker host ไหน, Jenkins อยู่เครื่องเดียวกับ docker
   daemon หรือ mount socket, `docker-compose` (v1, hyphen) หรือ
   `docker compose` (v2 plugin) — Jenkinsfile ที่ให้มาใช้ v1 ต้องแก้ถ้า host
   มีแต่ v2
8. **(optional) สร้าง test ครอบคลุมโค้ดเดิมไหม** — **default: ไม่**
   (สร้างแค่ `tests/test_smoke.py` พอให้สเตจ Unit Tests รันผ่านจริงโดยไม่แตะ
   โค้ดเดิม) ถ้าตอบใช่ → **ทำใน session แยกหลัง pipeline เขียวแล้ว** ตาม
   `references/legacy-test-generation.md` อย่าทำปนใน session นี้

## 5. Setup Steps

### 5.1 Copy assets

| จาก | ไปที่ | เงื่อนไข |
| --- | --- | --- |
| `assets/Jenkinsfile` | `Jenkinsfile` | เสมอ |
| `assets/sonar-project.properties` | `sonar-project.properties` | เสมอ |
| `assets/owasp-suppressions.xml` | `owasp-suppressions.xml` | เสมอ |
| `assets/docker/Dockerfile.web` | `Dockerfile` | shape = fastapi / flask / django |
| `assets/docker/Dockerfile.batch` | `Dockerfile` | shape = batch |
| `assets/docker-compose.yml` | `docker-compose.yml` | เสมอ |
| `assets/docker-compose.dev.yml` | `docker-compose.dev.yml` | เสมอ |
| `assets/health/fastapi_health.py` | ในซอร์สของแอป เช่น `app/health.py` แล้ว `app.include_router(health_router)` | shape = fastapi |
| `assets/health/flask_health.py` | ในซอร์สของแอป เช่น `app/health.py` แล้ว `app.register_blueprint(health_bp)` | shape = flask |
| `assets/health/django_health.py` | ในซอร์สของแอป เช่น `<app>/health.py` แล้ว `path("api/health", health)` ใน `urls.py` | shape = django |
| `assets/tooling/pyproject-tooling.toml` | **merge เข้า** `pyproject.toml` (ไม่มีไฟล์ → สร้างใหม่ด้วยเนื้อนี้) | เสมอ |
| `assets/tooling/requirements-dev.txt` | `requirements-dev.txt` (root) | เสมอ |
| `assets/tooling/test_smoke.py` | `tests/test_smoke.py` | เสมอ (โปรเจคที่มี test อยู่แล้วก็ใส่ได้ — เป็นไฟล์แยก ไม่ชนของเดิม) |
| `assets/rules/ugt-python-ci.md` | `.claude/rules/ugt-python-ci.md` | เสมอ (overwrite ทั้งไฟล์ได้ตอน plugin update) |

นอกจากตารางนี้ ต้อง **สร้าง `.dockerignore`** ที่ root ถ้ายังไม่มี (หรือเติม
บรรทัดที่ขาด) อย่างน้อย 4 บรรทัด:

```
.venv
coverage
dc-report
test-results
```

สเตจ Install สร้าง `.venv` ไว้ใน workspace เดียวกับที่ Docker Build ใช้เป็น
build context และ Dockerfile ทั้งสอง shape ใช้ `COPY . .` — ไม่กันไว้ `.venv`
(มักเกิน 100 MB, มีไบนารีเฉพาะ platform ของ Jenkins agent) จะหลุดเข้า image
รายละเอียด → `references/docker-deploy.md` §F

> **`/api/health` ไม่ใช่ของเลือกได้** สำหรับ shape web — ทั้ง `HEALTHCHECK` ใน
> Dockerfile, healthcheck ในทั้ง 2 compose และ health poll ในสเตจ Deploy ยิง
> path นี้ ถ้าไม่มี route จริง container ไม่มีวันขึ้น `healthy` และ Deploy fail
> ที่ `docker inspect` ทุกครั้ง. โปรเจคที่มี route นี้อยู่แล้ว → ไม่ copy ทับ
> แค่ตรวจว่าเข้าถึงได้โดยไม่ต้อง login และไม่คืน version/commit

### 5.2 แทน placeholder (นี่คือรายการครบ)

| Placeholder | ความหมาย | อยู่ในไฟล์ | ตัวอย่าง |
| --- | --- | --- | --- |
| `__PROJECT_NAME__` | kebab-case id — image/container/sonar key/credential suffix | `Jenkinsfile`, `sonar-project.properties`, `docker-compose.yml`, `docker-compose.dev.yml`, `admin-handoff.template.md` | `stock-sync` |
| `__PROJECT_DISPLAY_NAME__` | ชื่อที่คนอ่าน (sonar `projectName`, หัวเอกสาร handoff) | `Jenkinsfile`, `sonar-project.properties`, `admin-handoff.template.md` | `Stock Sync` |
| `__PORT_PROD__` | host port ของ prod (container-internal คงที่ 8000 เสมอ) | `docker-compose.yml` | `8000` |
| `__PORT_DEV__` | host port ของ dev | `docker-compose.dev.yml` | `8001` |
| `__APP_MODULE__` | โมดูลหลักที่ import ได้ — ใช้เป็น smoke check ทั้งใน CI และใน image | `Jenkinsfile` (บล็อก `[BATCH]`), `docker/Dockerfile.batch`, `tooling/test_smoke.py` | `app` |
| `__START_CMD_JSON__` | คำสั่ง start เป็น **JSON array** (exec form) เติมจาก entry point จริงที่อ่านเจอใน §3 | `docker/Dockerfile.web` | `["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]` |

`__START_CMD_JSON__` ต่อ framework (ตัวอย่างอยู่ในคอมเมนต์ท้าย `Dockerfile.web` ด้วย):

```
FastAPI  ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
Flask    ["gunicorn", "-b", "0.0.0.0:8000", "app:app"]
Django   ["gunicorn", "-b", "0.0.0.0:8000", "config.wsgi:application"]
```

placeholder อีก 5 ตัวอยู่ใน `admin-handoff.template.md` **เท่านั้น** เติมตอน
render เอกสารส่ง admin (§5.5):

| Placeholder | เติมด้วย |
| --- | --- |
| `__DATE__` | วันที่ที่ render เอกสาร |
| `__REQUESTER__` | ชื่อผู้ขอ (ทีมพัฒนา) |
| `__REPO_URL__` | URL ของ git repo |
| `__JENKINS_HOST__` | host ของ Jenkins ที่ใช้ตั้ง webhook |
| `__N_CREDS__` | จำนวน credential ที่ admin ต้องสร้าง (ปกติ `2` — `env-<project>` + `env-<project>-dev`; ถ้าเป็นโปรเจคแรกของ server นับ `nvd` ด้วยเป็น `3`) |

ชื่อที่ derive อัตโนมัติจาก `__PROJECT_NAME__`: image/container ของ dev =
`<project>-dev` · credentials = `env-<project>`, `env-<project>-dev` ·
sonar keys = `<project>`, `<project>-dev`

### 5.3 Adjust ตามคำตอบ interview

- **ไม่มี DB (ข้อ 5 = ไม่มี)** → ลบทุกบล็อกที่ติดป้าย `[DB]`: บล็อก migrate ใน
  สเตจ Deploy ของ `Jenkinsfile`, บรรทัด `DATABASE_URL:` ใน compose **ทั้ง 2
  ไฟล์**, และคอมเมนต์ `[DB]` ในไฟล์ health (ตัว health ยัง return `healthy`
  ถูกต้องเพราะ `ok = True` อยู่แล้ว)
- **Django (ข้อ 5 = django migrate)** → ในบล็อก `[DB]` ของสเตจ Deploy สลับ
  `alembic upgrade head` เป็น `python manage.py migrate --noinput` (บรรทัดอ่าน
  `DATABASE_URL` จาก `.env` คงเดิม — Django อ่านผ่าน settings ของตัวเอง ตรวจว่า
  settings อ่าน env นี้จริง)
- **มี DB แต่ไม่ใช่ทั้งสองแบบ** → คงบล็อก `[DB]` ไว้แล้วเปลี่ยนคำสั่งเป็นตัวที่
  โปรเจคใช้จริง — ห้ามลบบล็อกทิ้ง เพราะ contract คือ migrate ก่อน deploy
- **ไม่มี volume (ข้อ 6 = ไม่มี)** → ลบบล็อกคอมเมนต์ `[VOLUME]` ในทั้ง 2 compose
  **และ** บล็อก `[VOLUME]` (mkdir + chown) ในสเตจ Deploy ของ `Jenkinsfile`
- **มี volume** → uncomment `volumes:` ในทั้ง 2 compose แล้วแทน `<name>` ด้วย
  ชื่อจริง — path ต้องอยู่ใต้ `/srv/appdata/<project>/` (dev ใช้
  `/srv/appdata/<project>-dev/`) เท่านั้น
- **shape = web (`[WEB]`)** → ใช้ `Dockerfile.web`, คงบล็อก health poll ท้าย
  สเตจ Deploy ไว้, ลบคอมเมนต์ `[BATCH]` 2 บรรทัดท้ายสเตจทิ้ง
- **shape = batch (`[BATCH]`)** → ใช้ `Dockerfile.batch` (ไม่มี `EXPOSE`/
  `HEALTHCHECK` — **ตัดทิ้งจริง ไม่ใช่ comment out**), **ไม่ต้อง copy ไฟล์
  health เลย**, ในสเตจ Deploy แทน `docker-compose up` + health poll ด้วย 2
  บรรทัดที่คอมเมนต์ `[BATCH]` ไว้ให้แล้ว, และแก้ compose ทั้ง 2 ไฟล์เป็น
  variant `[BATCH]`: service name `app` → `job`, ตัด `ports:` / `healthcheck:`
  / `networks:` ทิ้ง, `restart: unless-stopped` → `restart: "no"`
  (batch รันจบต้องหายไป — restart loop = รัน job ซ้ำไม่หยุด). ตัว job เรียก
  โดย **host cron** ไม่ใช่ Jenkins → เป็นรายการ `[BATCH]` ใน admin handoff
  (ดู `references/docker-deploy.md` §B–C)
- **`docker compose` v2 บน host (ข้อ 7)** → เปลี่ยน `docker-compose -f ... up`
  ใน Jenkinsfile เป็น `docker compose -f ... up` (สอง binary ไม่ compatible
  100%)
- **มี config lint/test เดิมอยู่แล้ว** → merge ค่าจาก `pyproject-tooling.toml`
  เข้าของเดิม ไม่ทับทั้ง section; แต่ 2 ค่านี้ **ต้องได้ผลลัพธ์ตามนี้เสมอ**
  ไม่งั้น pipeline พังเงียบ ๆ: pytest ต้องออก `test-results/junit.xml` และ
  `coverage.xml` (สเตจ Unit Tests publish จาก 2 path นี้ · sonar อ่าน
  `coverage.xml`)

### 5.4 ตรวจ requirements

- ต้องมี `requirements.txt` ที่ root — สเตจ Install และ Dockerfile ทั้งสอง shape
  อ้างไฟล์นี้ตรง ๆ. โปรเจคที่ใช้ `pyproject.toml`/poetry/uv อย่างเดียวต้อง
  export ออกมาเป็น `requirements.txt` (หรือแก้ทั้ง Install stage และ Dockerfile
  ให้ตรงกัน — แก้ที่เดียวไม่พอ)
- `requirements-dev.txt` (ruff/mypy/pytest/pytest-cov) ต้องแยกจาก
  `requirements.txt` — Dockerfile ไม่ติดตั้ง dev deps เข้า production image

### 5.5 ฝั่ง server — ส่งรายการให้ admin

**Render `assets/admin-handoff.template.md` → เขียนลงโปรเจคเป็น
`docs/admin-handoff.md`** โดยแทน `__...__` ทุกตัว (ชื่อโปรเจค, credential ID,
sonar key, Jenkins host, repo URL, วันที่, ชื่อผู้ขอ) และ **ลบหัวข้อของสิ่งที่
โปรเจคนี้ไม่ใช้ทิ้งทั้งหัวข้อ**:

- shape = web → ลบแถวและหัวข้อ `[BATCH]` (host cron) ทั้งหมด
- ไม่ใช่โปรเจคแรกของ server → ลบภาคผนวกท้ายไฟล์ (server-level setup)

บอกผู้ใช้ให้ชัด: "ส่งไฟล์ `docs/admin-handoff.md` ให้ทีม admin ได้เลย
แล้วรอค่าที่ต้องส่งกลับ (`APP_PORT` prod/dev + ยืนยัน job/webhook)" —
สรุปในแชทเพิ่มได้ แต่ไฟล์คือของที่ส่งจริง อย่าให้ admin ไปไล่ก๊อบชื่อจาก
บทสนทนา

### 5.6 ทดสอบ

push `develop` → ดู pipeline รันครบ 10 stages → ไล่ §7

## 6. Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| ทุก stage ที่ใช้ Python เปิด `docker.image('python:3.12-slim').inside` ของตัวเอง | ขอ admin ติดตั้ง Python/Global Tool บน Jenkins |
| สร้าง `.venv` ใน workspace แล้วใช้ต่อข้าม stage (`.venv/bin/ruff` …) | `pip install` ใหม่ทุก stage หรือ install ลง system python ของ container |
| `waitForQualityGate abortPipeline: true` + timeout | ข้าม gate / ใส่ gate โดยไม่มี `abortPipeline` (แดงแต่ pipeline เขียว = มั่นใจหลอก) |
| Deploy ด้วย `--no-build` (reuse image จากสเตจ Docker Build) | ปล่อย compose build เองตอน deploy (ได้ image คนละตัวกับที่ scan ผ่าน) |
| Secret File `env-<project>` → `cp` เป็น `.env` | แยก string credential ต่อ var / hardcode ใน Jenkinsfile |
| Secret ขยายค่าโดย shell (`"$VAR"`) | Groovy interpolation (`"${VAR}"` รั่วลง log) |
| `dependencyCheckPublisher` นับ CVE | `grep` XML ดิบ (นับ suppressed ด้วย → fail หลอก) |
| Tag image ด้วย `BUILD_NUMBER` | `latest` อย่างเดียว (rollback ไม่ได้) |
| Healthcheck ยิง `127.0.0.1:8000` + poll `docker inspect` | `localhost` (slim → IPv6) / host port / `wget` จาก Jenkins |
| Migrate ก่อน `compose up` — fail = ไม่ deploy | deploy ก่อน แล้วค่อย migrate |
| Volume ใต้ `/srv/appdata/<project>/` (dev = `/srv/appdata/<project>-dev/`) | named volume / bind โค้ดทับ image / เก็บ secret ใน volume |
| `.dockerignore` กัน `.venv` `coverage` `dc-report` `test-results` | ปล่อย artifact ของ CI หลุดเข้า build context |
| `/api/health` คืนแค่ `healthy`/`degraded` | ใส่ version/commit/hostname ลง response |
| `sonar.sources`/`sonar.tests` ชี้ path ที่มีอยู่จริง | ปล่อย path ค้าง (sonar-scanner fail ทันที) |
| ทุก suppression/CPD exclusion มีเหตุผลกำกับ | suppress ล่วงหน้าโดยยังไม่เจอ finding จริง |
| batch: `restart: "no"` + host cron เรียก `docker compose run --rm job` | `restart: unless-stopped` กับ batch (รัน job ซ้ำไม่หยุด) |

## 7. Verification Checklist

**รัน script ก่อน** (cwd = root ของโปรเจคปลายทาง):

```bash
node <skill-dir>/scripts/verify.mjs
```

ครอบฝั่ง repo ให้ทั้งหมด (placeholder ตกค้าง, ครบ 10 stages, brace balance หลัง
ลบบล็อก, path ใน `sonar.sources` มีจริง, compose, tooling, health) — ฝั่ง server
ยังต้องให้ admin ยืนยันเอง

**ไฟล์ในโปรเจค:**

- [ ] `Jenkinsfile` ครบ 10 stages + post (emailext ×4 + `cleanWs`) — ไม่มี
      `__*__` ค้าง
- [ ] บล็อก `[DB]` / `[VOLUME]` / `[WEB]` / `[BATCH]` คงหรือถูกลบตรงตามคำตอบ
      interview — และ Groovy ยัง parse ผ่านหลังลบ (brace ครบ)
- [ ] `Dockerfile` มาจาก shape ที่ถูก (`Dockerfile.web` = มี `EXPOSE 8000` +
      `HEALTHCHECK` · `Dockerfile.batch` = ไม่มีทั้งคู่) · `CMD` เป็น JSON array
      จริง ไม่ใช่ `__START_CMD_JSON__` ค้าง
- [ ] health endpoint (shape web): `/api/health` มีจริงในซอร์ส · เข้าได้โดยไม่
      ต้อง login · 200 healthy / 503 degraded · ไม่มี version/commit ใน response
- [ ] `sonar-project.properties`: `sonar.projectKey`/`projectName` แทนค่าแล้ว ·
      **ทุก path ใน `sonar.sources`/`sonar.tests` มีอยู่จริงในโปรเจค** ·
      `sonar.python.coverage.reportPaths=coverage.xml`
- [ ] `owasp-suppressions.xml` (skeleton ว่าง) อยู่ที่ root
- [ ] compose ทั้ง 2 ไฟล์: `pull_policy: never` · `APP_PORT` override ได้ ·
      healthcheck ยิง `127.0.0.1:8000` · volume (ถ้ามี) อยู่ใต้ `/srv/appdata/`
- [ ] `pyproject.toml` มี `[tool.ruff]` + `[tool.pytest.ini_options]` ที่ออก
      `test-results/junit.xml` + `coverage.xml`
- [ ] `requirements.txt` + `requirements-dev.txt` อยู่ที่ root คนละไฟล์
- [ ] `tests/` มีอย่างน้อย 1 ไฟล์ `test_*.py` และ `tests/test_smoke.py` import
      `__APP_MODULE__` ตัวจริงได้ (`.venv/bin/pytest` ผ่านในเครื่อง)
- [ ] `.dockerignore` มี `.venv`, `coverage`, `dc-report`, `test-results`
- [ ] `.claude/rules/ugt-python-ci.md` อยู่ในที่ของมัน
- [ ] `docs/admin-handoff.md` ถูก render แล้ว (ไม่มี `__*__` ค้าง, หัวข้อที่ไม่
      ใช้ถูกลบ)

**ฝั่ง server (admin ยืนยัน) — `docs/admin-handoff.md` ที่ส่งไปครอบรายการนี้
ด้วยชื่อจริงของโปรเจคแล้ว:**

- [ ] Jenkins tool ชื่อตรงเป๊ะ: `SonarQube-Scanner`, `Dependency-Check` ·
      SonarQube server entry ชื่อ `SonarQube`
- [ ] **Jenkins user อยู่ใน `docker` group** (มติ M8 — ไม่มีข้อนี้ทุก stage พัง
      ตั้งแต่ Install)
- [ ] Credentials ครบ: `nvd`, `env-<project>`, `env-<project>-dev`
- [ ] Global env vars: `NOTIFY_EMAIL`, `SMTP_FROM`
- [ ] webhook ทั้งคู่: GitHub → Jenkins (`/github-webhook/`) และ
      SonarQube → Jenkins (`/sonarqube-webhook/`)
- [ ] SonarQube projects prod+dev สร้างแล้ว + assign Quality Gate ตาม §2.4
      ให้ทั้งสอง
- [ ] ปิด Lightweight checkout ใน job config
- [ ] `/srv/appdata` มีอยู่และ Jenkins user เขียนได้ (ครั้งเดียวต่อ server)
- [ ] [BATCH] เท่านั้น: ตั้ง host cron เรียก `docker compose run --rm job` แล้ว
      + ทดสอบรันมือ 1 รอบผ่าน
- [ ] ได้ `APP_PORT` prod/dev ตัวจริงกลับมาแล้ว (ไม่ใช่ค่า placeholder)

**รันจริง:**

- [ ] push `develop` → pipeline เขียวครบ 10 stages · coverage report + DC report
      ขึ้นบนหน้า build
- [ ] shape web: container `healthy` ภายใน 4 นาที · เข้าแอปผ่าน reverse proxy ได้
- [ ] shape batch: สเตจ Deploy import โมดูลหลักจาก image จริงผ่าน · host cron
      รันมือ 1 รอบได้ผลตามคาด
- [ ] อีเมลผลลัพธ์ถึง `NOTIFY_EMAIL`
- [ ] พิสูจน์ว่า gate บล็อกจริง: ใส่ violation เข้าไป 1 จุด → pipeline ต้อง abort
      ที่สเตจ Quality Gate

## 8. หลังจากนี้ (optional)

ถ้า interview ข้อ 8 ตอบ **ใช่** และ pipeline เขียวแล้ว → เปิด session ใหม่ทำ
characterization test ให้โค้ดเดิมตาม `references/legacy-test-generation.md`
(ไล่ทีละ module จากใบไปหาราก, ทีมต้อง review ทุกไฟล์ก่อน commit เพราะ test
ชุดนี้ล็อกพฤติกรรมปัจจุบันรวม bug ที่มีอยู่, และไม่ใช่เงื่อนไขของ Quality Gate
เพราะ gate นับเฉพาะโค้ดใหม่)
