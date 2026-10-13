---
name: ugt-python-cicd-setup
description: >
  Use when a Python project needs the org-standard delivery pipeline —
  "ทำ CI/CD ให้โปรเจค python", "deploy fastapi/flask/django ด้วย docker",
  "ตั้ง jenkins ให้ python" — producing the 10-stage Jenkinsfile (toolchain in
  docker), sonar-project.properties, Dockerfile (web/batch), both compose files,
  minimal ruff/mypy/pytest tooling + smoke test so the Quality Gate can pass,
  /api/health per framework, volume bind mounts under /home/docker02/appdata, and the
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
| `assets/tooling/pyproject-tooling.toml` · `requirements-dev.txt` · `test_smoke.py` | tooling ขั้นต่ำ (ruff/mypy/pytest+cov) ให้ stage 2–4 **มีคำสั่งให้รันได้จริง** โดยไม่ต้องเขียน test เดิมใหม่ (มติ M4) — แต่โค้ดเดิมต้องผ่าน `ruff format` ก่อน ซึ่งขั้น setup จัดการให้ใน §5.6 |
| `assets/rules/ugt-python-ci.md` | ไฟล์ `.claude/rules/` — โหลดเองเมื่อ session แตะ Jenkinsfile/Docker/Sonar (overwrite ทั้งไฟล์ได้ตอน plugin update) |
| `assets/admin-handoff.template.md` | เอกสารส่งทีม admin — render แล้วเขียนลงโปรเจคเป็น `docs/admin-handoff.md` |
| `references/org-standards.md` | contract ร่วมเต็ม (stages, toolchain, gate, credentials, secret, health, persistent data) — สรุปอยู่ §2 |
| `references/verification.md` | เช็คลิสต์ตรวจเต็มหลัง setup (repo · server · รันจริง) — สรุปอยู่ §7 |
| `references/docker-deploy.md` | ภาพรวม deploy: branch → target, [WEB] vs [BATCH], host cron + ตาราง index ไปไฟล์เชิงลึก: `volumes.md` (ownership/chown, DooD) · `healthcheck.md` · `build-gotchas.md` (`.dockerignore`) · `db-dns.md` · `compose.md` · `django-static.md` |
| `references/legacy-test-generation.md` | ขั้น optional (มติ M7) — ไล่สร้าง characterization test ให้โค้ดเดิม ทำใน session แยก |
| `scripts/verify.mjs` | ตรวจฝั่ง repo ให้อัตโนมัติหลัง setup เสร็จ (§7) |

Server setup ระดับ Jenkins/SonarQube (ทำครั้งเดียวต่อ server) **ไม่ได้คัดลอกมา
ไว้ในนี้** — เป็นงานฝั่ง admin ไม่ใช่ไฟล์ในโปรเจค จึงส่งผ่าน
`assets/admin-handoff.template.md` แทน (ภาคผนวกท้ายไฟล์นั้นคือ server-level setup)

## 2. Org Standards (สรุป — รายละเอียดเต็ม → `references/org-standards.md`)

contract ร่วมที่ **ทุกโปรเจคทำเหมือนกันหมด** ไม่ว่าภาษาอะไร — เหตุผล + กับดักของแต่ละข้ออยู่ใน
`references/org-standards.md` **อ่านก่อนแก้ Jenkinsfile / compose**:

- **Stages (all 10, in order)** — Checkout → Install → Code Quality → Unit Tests → Build →
  OWASP Dependency Check → SonarQube Analysis → Quality Gate → Docker Build → Deploy
  (2 ตัวท้ายเฉพาะ `main`/`develop`) + post `emailext` + `cleanWs` · สลับคำสั่งข้างในได้
  **ห้ามตัด stage** (`Build` เป็น no-op ก็คงไว้) — org-standards §1
- **Toolchain ใน docker (มติ M8)** — ทุก stage ที่ใช้ Python เปิด
  `docker.image('python:3.12-slim').inside` · server ต้องมีปลั๊กอิน `docker-workflow` +
  Jenkins user อยู่ใน `docker` group — org-standards §2
- **Branch** — `main` = prod · `develop` = dev (ต่อท้าย `-dev` + คนละไฟล์ compose) ·
  resolve ใน `script {}` เสมอ — org-standards §3
- **Quality Gate (New Code)** — `new_violations` = 0 · `new_duplicated_lines_density` ≤ 3% ·
  `new_coverage` ≥ 60% · `new_security_hotspots_reviewed` = 100% · OWASP **fail** at
  CRITICAL ≥ 1 · **unstable** at HIGH ≥ 1 · ห้ามลดค่า gate — org-standards §4
- **Credentials** — `nvd` · `env-<project>` (prod `.env`) · `env-<project>-dev` · SonarQube
  token ผูกที่ `withSonarQubeEnv` — org-standards §5
- **Secrets** — ใน `sh` ขยายค่าด้วย shell (`"$VAR"`) ห้าม Groovy interpolation (`"${VAR}"`)
  · ลบ `dc-nvd.properties` ใน `post { always }` · `NOTIFY_EMAIL`/`SMTP_FROM` = Global env — org-standards §6
- **Build & deploy** — tag `BUILD_NUMBER` คู่ `latest` · migrate ก่อน deploy · `--no-build` ·
  `pull_policy: never` — org-standards §7
- **Health** — `/api/health` ไม่ต้อง login · 200 `healthy` / 503 `degraded` · ไม่มี
  version/commit · healthcheck ยิง `127.0.0.1:8000` ด้วย `python -c urllib` (slim ไม่มี
  `wget`/`curl`) · shape `[BATCH]` ไม่มี health — org-standards §8
- **Persistent data** — bind mount ใต้ `/home/docker02/appdata/<project>/<name>` (dev =
  `/home/docker02/appdata/<project>-dev/<name>`) เท่านั้น · บรรทัด `for p in` ของบล็อก
  `[VOLUME]` ต้องมีทุก `<name>` — org-standards §9
- **CI env** — `CI=true` อย่างเดียว ไม่มีกติกา build-arg แบบ Next.js — org-standards §10

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
| Test เดิม | มี `tests/` + ไฟล์ `test_*.py` อยู่แล้วไหม · มี `tests/test_smoke.py` ชื่อชนอยู่แล้วไหม | §5 (`tests/test_smoke.py` ใส่**เสมอ** — เป็นไฟล์แยกไม่ชนของเดิม; ชนชื่อพอดี → ไม่ทับ อ่านของเดิมแล้วเติม assert import `__APP_MODULE__` เข้าไปถ้ายังไม่มี) |

**ของเดิมไม่เขียนทับ** — ทุกไฟล์ในตาราง §5.1 ถ้ามีอยู่แล้วให้ merge/ปรับ แล้ว
บอกผู้ใช้ว่าไปแตะอะไรบ้าง; ยกเว้นไฟล์เดียวคือ `.claude/rules/ugt-python-ci.md`
ที่ทับทั้งไฟล์ได้ (plugin เป็นเจ้าของ)

## 4. Interview — ถามชุดเดียว (9 ข้อ)

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
   daemon หรือ mount socket, `docker compose` (v2, ไม่มีขีด) หรือ
   `docker-compose` (v1, มีขีด) — **Jenkinsfile ที่ให้มาใช้ v2** ซึ่งเป็น
   ค่ามาตรฐาน ต้องแก้กลับเฉพาะ host เก่าที่มีแต่ v1 (v1 EOL ตั้งแต่กลางปี 2023)
8. **(optional) สร้าง test ครอบคลุมโค้ดเดิมไหม** — **default: ไม่**
   (สร้างแค่ `tests/test_smoke.py` พอให้สเตจ Unit Tests รันผ่านจริงโดยไม่แตะ
   โค้ดเดิม) ถ้าตอบใช่ → **ทำใน session แยกหลัง pipeline เขียวแล้ว** ตาม
   `references/legacy-test-generation.md` อย่าทำปนใน session นี้
9. **Job ตามรอบ + ชื่อ DB** — มีงานที่ต้องรันตามเวลาไหม (ชื่อ · ทำอะไร · ทุกเมื่อ)
   → แถวในตาราง cron `[CRON]` ของ admin handoff (batch มีอย่างน้อย 1 แถวเสมอ) · ไม่มี = ลบตาราง ·
   และ (ถ้ามี DB) ชื่อ database + login ของ prod/dev → `__DB_NAME_*__` / `__DB_LOGIN_*__`
   — ไม่รู้ให้เสนอ `<ชื่อระบบ>` / `<ชื่อระบบ>_Dev` และ `<project>_app` / `<project>_dev`

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
| `assets/tooling/test_smoke.py` | `tests/test_smoke.py` | **เสมอ** — โปรเจคที่มี test อยู่แล้วก็ใส่ (ไฟล์แยก ไม่ชนของเดิม) · มีไฟล์ชื่อนี้อยู่แล้ว = ไม่ทับ ให้เติม test เข้าไปในไฟล์เดิมแทน |
| `assets/env.example` | `.env.example` (root — key อย่างเดียว, commit ได้; verify เช็คว่ามีไฟล์นี้) | เสมอ — ลบ/คงบรรทัด `[DB]`/`[SUBPATH]` ตามคำตอบ interview |
| `assets/rules/ugt-python-ci.md` | `.claude/rules/ugt-python-ci.md` | เสมอ (overwrite ทั้งไฟล์ได้ตอน plugin update) |

นอกจากตารางนี้ ต้อง **สร้าง `.dockerignore`** ที่ root ถ้ายังไม่มี (หรือเติม
บรรทัดที่ขาด) อย่างน้อย 7 บรรทัด:

```
.venv
coverage
dc-report
test-results
.env
.env.*
!.env.example
```

สเตจ Install สร้าง `.venv` ไว้ใน workspace เดียวกับที่ Docker Build ใช้เป็น
build context และ Dockerfile ทั้งสอง shape ใช้ `COPY . .` — ไม่กันไว้ `.venv`
(มักเกิน 100 MB, มีไบนารีเฉพาะ platform ของ Jenkins agent) จะหลุดเข้า image
— สามบรรทัด `.env`/`.env.*`/`!.env.example` กัน `.env` จริงที่เผลอเหลือใน
workspace ไม่ให้ `COPY . .` ฝัง secret ลง image layer ถาวร (Docker layer เป็น
append-only)
รายละเอียด → `references/build-gotchas.md`

> **`/api/health` ไม่ใช่ของเลือกได้สำหรับ shape web — กติกาทั้งหมดอยู่ที่ `references/org-standards.md` §8**
> (โปรเจคที่มี route นี้อยู่แล้ว → ไม่ copy ทับ แค่ตรวจให้ตรง `references/org-standards.md` §8)

### 5.2 แทน placeholder (นี่คือรายการครบ)

| Placeholder | ความหมาย | อยู่ในไฟล์ | ตัวอย่าง |
| --- | --- | --- | --- |
| `__PROJECT_NAME__` | kebab-case id — image/container/sonar key/credential suffix | `Jenkinsfile`, `sonar-project.properties`, `docker-compose.yml`, `docker-compose.dev.yml`, `admin-handoff.template.md` | `stock-sync` |
| `__PROJECT_DISPLAY_NAME__` | ชื่อที่คนอ่าน (sonar `projectName`, หัวเอกสาร handoff) | `Jenkinsfile`, `sonar-project.properties`, `admin-handoff.template.md` | `Stock Sync` |
| `__PORT_PROD__` | host port ของ prod (container-internal คงที่ 8000 เสมอ) | `docker-compose.yml`, `env.example` (คอมเมนต์บรรทัด `APP_PORT`) | `8000` |
| `__PORT_DEV__` | host port ของ dev | `docker-compose.dev.yml`, `env.example` (คอมเมนต์บรรทัด `APP_PORT`) | `8001` |
| `__APP_MODULE__` | โมดูลหลักที่ import ได้ — ใช้เป็น smoke check ทั้งใน CI และใน image | **ทุก shape**: `tooling/test_smoke.py` (เสมอ — ไฟล์นี้ copy ทุกโปรเจค) · shape = batch เพิ่ม `Jenkinsfile` (บล็อก `[BATCH]`) และ `docker/Dockerfile.batch` | `app` |
| `__START_CMD_JSON__` | คำสั่ง start เป็น **JSON array** (exec form) เติมจาก entry point จริงที่อ่านเจอใน §3 | `docker/Dockerfile.web` | `["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]` |

`__START_CMD_JSON__` ต่อ framework (ตัวอย่างอยู่ในคอมเมนต์ท้าย `Dockerfile.web` ด้วย):

```
FastAPI  ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
Flask    ["gunicorn", "-b", "0.0.0.0:8000", "app:app"]
Django   ["gunicorn", "-b", "0.0.0.0:8000", "config.wsgi:application"]
```

placeholder อีกชุดอยู่ใน `admin-handoff.template.md` **เท่านั้น** เติมตอน
render เอกสารส่ง admin (§5.7):

| Placeholder | เติมด้วย |
| --- | --- |
| `__DATE__` | วันที่ที่ render เอกสาร |
| `__REQUESTER__` | ชื่อผู้ขอ (ทีมพัฒนา) |
| `__REPO_URL__` | URL ของ git repo |
| `__JENKINS_HOST__` | host ของ Jenkins ที่ใช้ตั้ง webhook |
| `__DB_NAME_PROD__` / `__DB_NAME_DEV__` | ชื่อ database prod/dev — จากคำตอบ interview; ไม่รู้ → เสนอ `<ชื่อระบบ>` / `<ชื่อระบบ>_Dev` |
| `__DB_LOGIN_PROD__` / `__DB_LOGIN_DEV__` | login ของ DB — ไม่รู้ → เสนอ `<project>_app` / `<project>_dev` |
| `__VOLUME__` | ชื่อ volume ใน compose — หนึ่งคู่แถว prod/dev ต่อ volume |
| `__JOB_NAME__` / `__JOB_WHEN__` / `__CRON_SCHEDULE__` / `__JOB_CMD__` | ต่อ job หนึ่งแถวในตาราง cron: ชื่อ job · รอบเวลาภาษาคน ("ทุกวัน 02:00") · cron 5 ช่อง (`0 2 * * *`) · คำสั่ง — batch: `cd /opt/apps/<project> && docker compose run --rm job` · web: `docker exec <project> python -m <module>` (`references/docker-deploy.md`) |

ชื่อที่ derive อัตโนมัติจาก `__PROJECT_NAME__`: image/container ของ dev =
`<project>-dev` · credentials = `env-<project>`, `env-<project>-dev` ·
sonar keys = `<project>`, `<project>-dev`

### 5.3 Adjust ตามคำตอบ interview

- **ไม่มี DB (ข้อ 5 = ไม่มี)** → ลบทุกบล็อกที่ติดป้าย `[DB]`: บล็อก migrate ใน
  สเตจ Deploy ของ `Jenkinsfile`, บรรทัด `DATABASE_URL:` ใน compose **ทั้ง 2
  ไฟล์**, และคอมเมนต์ `[DB]` ในไฟล์ health (ตัว health ยัง return `healthy`
  ถูกต้องเพราะ `ok = True` อยู่แล้ว)
- **Django (ข้อ 5 = django migrate)** → สลับบล็อก `[DB]` ของสเตจ Deploy **ทั้ง
  ก้อน** เป็นบรรทัดเดียว (คอมเมนต์ `[DB] Django variant` ใน Jenkinsfile เขียน
  ไว้ให้แล้ว):

  ```groovy
  sh "docker run --rm --env-file .env ${imageName}:${buildNum} python manage.py migrate --noinput"
  ```

  ใช้ `--env-file .env` **ไม่ใช่** `-e DATABASE_URL` ตัวเดียวแบบ alembic เพราะ
  `manage.py` โหลด `settings.py` ทั้งไฟล์ก่อนทำอะไรทั้งนั้น — ขาด `SECRET_KEY`
  หรือ `ALLOWED_HOSTS` ก็ตายตั้งแต่ `ImproperlyConfigured` ยังไม่ทันแตะ DB.
  ผลพลอยได้คือ **ตัดบรรทัด `grep`/`cut`/`tr` ที่ parse `.env` เองทิ้งได้เลย**
  (docker อ่านไฟล์ให้ — ไม่ต้องมาลุ้นเรื่อง quote/`\r` ใน value อีก)
- **มี DB แต่ไม่ใช่ทั้งสองแบบ** → คงบล็อก `[DB]` ไว้แล้วเปลี่ยนคำสั่งเป็นตัวที่
  โปรเจคใช้จริง — ห้ามลบบล็อกทิ้ง เพราะ contract คือ migrate ก่อน deploy
- **ไม่มี volume (ข้อ 6 = ไม่มี)** → ลบบล็อกคอมเมนต์ `[VOLUME]` ในทั้ง 2 compose
  **และ** บล็อก `[VOLUME]` (mkdir + chown) ในสเตจ Deploy ของ `Jenkinsfile`
- **มี volume** → uncomment `volumes:` ในทั้ง 2 compose แล้วแทน `<name>` ด้วย
  ชื่อจริง — path ต้องอยู่ใต้ `/home/docker02/appdata/<project>/` (dev ใช้
  `/home/docker02/appdata/<project>-dev/`) เท่านั้น **แล้วแทนชื่อตัวอย่างในบรรทัด
  `for p in` ของบล็อก `[VOLUME]` ในสเตจ Deploy ด้วยชื่อจริงทุกตัว** — งานนี้ลืมไม่ได้:

  ```sh
  for p in /home/docker02/appdata/${containerName}/uploads /home/docker02/appdata/${containerName}/reports; do
  ```

  `<name>` ที่ไม่อยู่ในบรรทัดนี้ถูก dockerd สร้างเป็น `root:root` ตอน `up -d` แล้ว user
  `app` เขียนไม่ได้ทั้งที่ container `healthy` — กลไก chown ตาม `references/org-standards.md` §9 / `references/volumes.md`
- **shape = web (`[WEB]`)** → ใช้ `Dockerfile.web`, คงบล็อก health poll ท้าย
  สเตจ Deploy ไว้, ลบคอมเมนต์ `[BATCH]` 2 บรรทัดท้ายสเตจทิ้ง
- **shape = batch (`[BATCH]`)** → ใช้ `Dockerfile.batch` (ไม่มี `EXPOSE`/
  `HEALTHCHECK` — **ตัดทิ้งจริง ไม่ใช่ comment out**), **ไม่ต้อง copy ไฟล์
  health เลย**, ในสเตจ Deploy แทน `docker-compose up` + health poll ด้วย 2
  บรรทัดที่คอมเมนต์ `[BATCH]` ไว้ให้แล้ว, และแก้ compose ทั้ง 2 ไฟล์เป็น
  variant `[BATCH]`: service name `app` → `job`, ตัด `ports:` / `healthcheck:`
  / `networks:` ทิ้ง, `restart: unless-stopped` → `restart: "no"`
  (batch รันจบต้องหายไป — restart loop = รัน job ซ้ำไม่หยุด). ตัว job เรียก
  โดย **host cron** ไม่ใช่ Jenkins → เป็นแถวในตาราง cron `[CRON]` ของ admin handoff
  (ดู `references/docker-deploy.md` §B–C)
- **อยู่หลัง reverse-proxy subpath (ข้อ 3 = ใช่)** → คำตอบนี้ต้องกลายเป็น
  config ฝั่งแอปจริง ๆ ในขั้นนี้ ไม่ใช่แค่จดไว้ (ไม่ตั้ง = แอป 404 หลัง
  proxy โดยไม่มีอะไรจับ):
  - **FastAPI**: `FastAPI(root_path=os.environ.get("ROOT_PATH", ""))` +
    เพิ่ม `ROOT_PATH` ลง compose ทั้ง 2 ไฟล์ (prod = path prod, dev = path dev)
  - **Flask**: ตั้ง `SCRIPT_NAME` env ใน compose ทั้ง 2 ไฟล์ หรือใช้ `ProxyFix`
    + ให้ proxy ส่ง `X-Forwarded-Prefix`.
    ⚠️ **`SCRIPT_NAME` อ่านโดย gunicorn เท่านั้น** (มันเซ็ตค่าลง WSGI environ ให้)
    — **dev server ของ werkzeug ไม่อ่าน**: `flask run` เมินตัวแปรนี้ทั้งตัว
    แปลว่าเทสต์ในเครื่องจะไม่เห็นผลของ subpath เลย ต้องทดสอบผ่าน container
    (ซึ่งรัน gunicorn) หรือผ่าน proxy จริงเท่านั้น อย่าสรุปว่า "ตั้งแล้วไม่ทำงาน"
    จากการลองด้วย `flask run`
  - **Django**: `FORCE_SCRIPT_NAME = os.environ.get("FORCE_SCRIPT_NAME")` ใน
    settings + ปรับ `STATIC_URL`/`MEDIA_URL` ให้ขึ้นต้นด้วย path เดียวกัน +
    ตัวแปรลง compose ทั้ง 2 ไฟล์ (ตัว static เองต้องมี WhiteNoise +
    `collectstatic` ตาม §5.4 ก่อน ไม่งั้นตั้ง URL ถูกก็ยังไม่มีไฟล์ให้เสิร์ฟ)
  - แล้วเช็คของจริงตาม checklist: เปิดแอป **ผ่าน URL เต็มหลัง proxy** ไม่ใช่
    `localhost:port` ตรง ๆ (อย่างหลังผ่านเสมอแม้ config ผิด)
- **host มีแต่ `docker-compose` v1 (ข้อ 7)** → เปลี่ยน `docker compose -f ... up`
  ใน Jenkinsfile กลับเป็น `docker-compose -f ... up` (สอง binary ไม่ compatible
  100%) — กรณีนี้ควรเป็นข้อยกเว้น ไม่ใช่ค่าปกติ
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
- **ตัว server ที่ `CMD` เรียก ต้องอยู่ใน `requirements.txt` จริง ๆ** —
  `Dockerfile.web` ติดตั้งแค่ไฟล์นี้ไฟล์เดียว ถ้า `CMD` เรียก `gunicorn`/
  `uvicorn` ที่ไม่ได้ประกาศไว้ **image build ผ่าน** (สเตจ Docker Build เขียว)
  แล้วไปตายตอนรันด้วย `exec: "gunicorn": not found` — โผล่เป็นแค่ container ที่
  ไม่ยอมขึ้น `healthy` ซึ่งไล่สาเหตุยาก. โปรเจค Flask/Django ส่วนใหญ่**ไม่เคยมี**
  gunicorn เพราะในเครื่องใช้ `flask run`/`runserver` — เติมให้ตรง shape:
  FastAPI → `uvicorn[standard]` · Flask → `gunicorn` · Django → `gunicorn` +
  `whitenoise` (ข้อถัดไป). `verify.mjs` เช็คให้แล้ว (อ่าน `CMD` เทียบ requirements)
- **[DJANGO] static ต้องมีคนเสิร์ฟ** — `DEBUG=False` ทำให้ Django เลิกเสิร์ฟ
  static เอง หน้า admin/CSS จะโล่งโดย **ไม่มี error ใน log และ health ยังเขียว**
  (pipeline จับไม่ได้เลย) ทางที่ชุดนี้เลือกคือ **WhiteNoise** 3 จุด:
  `whitenoise` ใน `requirements.txt` · middleware ถัดจาก `SecurityMiddleware`
  ทันที + `STATIC_ROOT` ใน `settings.py` · `RUN python manage.py collectstatic
  --noinput` ใน `Dockerfile.web` หลัง `COPY . .` ก่อน `USER app`
  (→ `references/django-static.md` สำหรับโค้ดเต็มและกับดักตอน build)

### 5.5 ไฟล์ env ในเครื่อง + `.gitignore`

compose อ่าน `${APP_PORT}` / `${DATABASE_URL}` จากไฟล์ชื่อ `.env` ที่อยู่ข้าง
ไฟล์ compose (auto-load) — ตัวเดียวกับที่สเตจ Deploy สร้างด้วย
`cp $ENV_FILE .env` จาก Secret File credential. ให้ developer รัน compose
ในเครื่องได้โดยไม่ต้องรอ Jenkins สร้าง 2 ไฟล์นี้ **ค่าจริงทั้งคู่ gitignore
ทั้งคู่ ไม่ commit ทั้งคู่**:

| ไฟล์ | ใช้กับ | ต้องมีอย่างน้อย |
| --- | --- | --- |
| `.env` | `docker-compose.yml` (prod shape) | `APP_PORT=__PORT_PROD__` + `DATABASE_URL` (ถ้ามี DB) + secret ที่แอปใช้จริง |
| `.env.dev` | `docker-compose.dev.yml` | `APP_PORT=__PORT_DEV__` + `DATABASE_URL` ชี้ DB dev คนละตัวกับ prod |

```sh
docker compose up                                            # อ่าน .env เอง
docker compose -f docker-compose.dev.yml --env-file .env.dev up
```

(`docker-compose.dev.yml` ไม่ auto-load ไฟล์ชื่อเดียวกัน — ต้องส่ง
`--env-file` ให้ตรง ๆ)

ตรวจ `.gitignore` ให้มีครบ: `.env`, `.env.dev` (เผื่อของ Python ทั่วไปด้วย:
`.venv/`, `__pycache__/`, `coverage/`, `coverage.xml`, `test-results/`,
`dc-report/`) — และให้ commit **`.env.example`** ที่มีแต่ชื่อ key ค่าเปล่า
เป็นเอกสารว่าต้องขอค่าอะไรจาก admin บ้าง ถ้า `.gitignore` ใช้ pattern กว้าง
แบบ `.env*` ต้องเติม `!.env.example` ไม่งั้น example จะถูกกินไปด้วย

> `.env` ที่มีค่าจริงหลุดขึ้น git คือ **เหตุการณ์ secret รั่ว** ไม่ใช่เรื่อง
> สไตล์โค้ด — ตรวจด้วย `git check-ignore .env .env.dev` (exit 0 = ถูก ignore
> แล้ว) ก่อน commit แรก

### 5.6 รัน toolchain ในเครื่องให้ผ่านก่อน push

**ทำก่อน commit/push เสมอ** — นี่คือขั้นที่กันไม่ให้ pipeline แดงตั้งแต่รอบแรก.
สเตจ Code Quality รัน ruff/mypy กับ **โค้ดเดิมทั้งโปรเจค** ไม่ใช่แค่ไฟล์ที่
skill นี้เพิ่ม — โปรเจคที่ไม่เคยใช้ ruff มาก่อน `ruff format --check .`
จะแดงแทบแน่นอนตั้งแต่ stage ที่ 2 (จัดรูปแบบไม่ตรง formatter คนละตัว ≠ โค้ดผิด
แต่ `--check` ไม่แยกให้):

```sh
python -m venv .venv
.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
.venv/bin/ruff format .          # จัดรูปแบบทั้งโปรเจคหนึ่งครั้ง
.venv/bin/ruff check --fix .     # แก้ที่ auto-fix ได้
.venv/bin/mypy .
.venv/bin/pytest
```

- **ขอบเขตของขั้นนี้คือทำให้ toolchain รันผ่านบนโค้ดเดิม ไม่ใช่ปรับปรุงโค้ดเดิม** —
  แก้เฉพาะ format กับสิ่งที่ `--fix` แก้ให้ ที่เหลือ baseline ตามข้อถัดไปแล้ว
  รายงานเป็น follow-up ในสรุป ไม่ไล่แก้ logic ของโปรเจคในรอบ setup
- **commit การ reformat เป็น commit แยกของมันเอง** (เช่น
  `style: ruff format ทั้งโปรเจค (ก่อนเปิด CI)`) — diff จะใหญ่แต่เป็น whitespace
  ล้วน ปนกับ commit setup แล้ว review ไม่ได้เลย
- violation ที่ `--fix` แก้ไม่ได้ กับ error ของ `mypy` **ต้องแก้ให้จบ หรือ
  baseline ไว้อย่างชัดเจน** ก่อน push แรก — baseline ที่รับได้คือ
  `[tool.ruff.lint.per-file-ignores]` / `[[tool.mypy.overrides]]` ที่ระบุ **rule
  code + path เจาะจง + คอมเมนต์เหตุผลกำกับ** เช่น
  `"legacy/reports.py" = ["E501"]  # โค้ดเดิมย้ายมาจากระบบ AS400 รอ refactor Q4`
  — **ห้าม** ปิดยกโปรเจค (ลบ rule ออกจาก `select` ทั้งชุด / `ignore_errors`
  ทั้งไฟล์ทั้งโฟลเดอร์) เพราะนั่นคือปิดตาเครื่องมือถาวรเพื่อผ่าน stage เดียว
- `pytest` ต้องเขียวในเครื่องก่อน — ถ้า test เดิมของโปรเจคพังอยู่แล้ว บอกผู้ใช้
  ตรง ๆ ว่าต้องแก้หรือ mark `xfail` พร้อมเหตุผล ไม่ใช่ปล่อยให้ไปแดงบน Jenkins
- ยืนยันว่า `coverage.xml` + `test-results/junit.xml` ถูกสร้างจริงหลัง `pytest`
  (ไม่มี 2 ไฟล์นี้ = สเตจ Unit Tests publish ไม่ได้ และ `new_coverage` อ่านเป็น
  0% แล้ว gate บล็อกโดยไม่มี error ชี้สาเหตุ)

### 5.7 ฝั่ง server — ส่งรายการให้ admin

**Render `assets/admin-handoff.template.md` → เขียนลงโปรเจคเป็น
`docs/admin-handoff.md`** ตาม RENDER RULES ที่หัวไฟล์: แทน `__...__` ทุกตัว ·
ลบแถว/หัวข้อที่ติดป้าย `[TAG]` ที่โปรเจคไม่มี (ไม่มี DB → ไม่มีตาราง A · ไม่มี
volume → ไม่มีตาราง B · ไม่มี job ตามรอบ → ไม่มีตาราง G cron (shape batch มีเสมอ) · ไม่ใช่โปรเจคแรกของ
server → ไม่มีภาคผนวก) · เรียงเลข # ในตารางขั้นตอนรวมใหม่ (ตัวอักษรหัวข้อ/anchor คงที่ ข้ามได้) · ลบ
comment กติกาและ comment ป้ายออก · **รูปแบบตายตัว**: ตารางขั้นตอนรวม → ตารางแยก
ต่อระบบ → ตาราง "ส่งกลับ" ห้ามเพิ่มย่อหน้าอธิบาย

บอกผู้ใช้ให้ชัด: "ส่งไฟล์ `docs/admin-handoff.md` ให้ทีม admin ได้เลย
แล้วรอตาราง "ส่งกลับ" (DB host + รหัสผ่าน, `APP_PORT` prod/dev, ลิงก์ job)" —
สรุปในแชทเพิ่มได้ แต่ไฟล์คือของที่ส่งจริง อย่าให้ admin ไปไล่ก๊อบชื่อจาก
บทสนทนา

### 5.8 ทดสอบ

push `develop` → ดู pipeline รันครบ 10 stages → ไล่ §7

## 6. Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| ทุก stage ที่ใช้ Python เปิด `docker.image('python:3.12-slim').inside` ของตัวเอง | ขอ admin ติดตั้ง Python/Global Tool บน Jenkins |
| สร้าง `.venv` ใน workspace แล้วใช้ต่อข้าม stage (`.venv/bin/ruff` …) | `pip install` ใหม่ทุก stage หรือ install ลง system python ของ container |
| `waitForQualityGate abortPipeline: true` + timeout | ข้าม gate / ใส่ gate โดยไม่มี `abortPipeline` (แดงแต่ pipeline เขียว = มั่นใจหลอก) |
| `dependencyCheckPublisher` นับ CVE | `grep` XML ดิบ (นับ suppressed ด้วย → fail หลอก) |
| Healthcheck ยิง `127.0.0.1:8000` + poll `docker inspect` | `localhost` (slim → IPv6) / host port / `wget` จาก Jenkins |
| `mkdir -p` ถึง `<name>` ที่ compose bind จริง ก่อน `chown -R` | mkdir แค่ระดับ `<project>` (dockerd สร้าง subdir เป็น root:root แล้วแอปเขียนไม่ได้) |
| Django migrate ส่ง `--env-file .env` ทั้งไฟล์ | `-e DATABASE_URL` ตัวเดียว (`settings.py` ต้องการ `SECRET_KEY` ฯลฯ ด้วย) |
| `ruff format .` ทั้งโปรเจค + commit แยก **ก่อน** push แรก | ปล่อยให้ `ruff format --check` แดงบน Jenkins แล้วค่อยไล่แก้ทีละรอบ |
| Baseline โค้ดเดิมด้วย `per-file-ignores` ระบุ rule+path+เหตุผล | ตัด rule ออกจาก `select` / `ignore_errors` ยกโฟลเดอร์ |
| `.env` / `.env.dev` อยู่ในเครื่อง gitignored · commit แค่ `.env.example` | commit `.env` ค่าจริง (= secret รั่ว ไม่ใช่ style nit) |
| `.dockerignore` กัน `.venv` `coverage` `dc-report` `test-results` `.env`/`.env.*` | ปล่อย artifact ของ CI หรือ secret จริงหลุดเข้า build context |
| batch: `restart: "no"` + host cron เรียก `docker compose run --rm job` | `restart: unless-stopped` กับ batch (รัน job ซ้ำไม่หยุด) |

## 7. Verification Checklist

**ไม่มี shell = เขียนว่า "ยังไม่ได้รัน"** + คำสั่งให้ผู้ใช้รัน — ห้าม "ผ่าน"/"ไล่ตรวจด้วยมือแล้วตรงหมด" · บอกชื่อไฟล์ที่เขียนไม่สำเร็จ (`references/verification.md`)

**รัน script ก่อน** (cwd = root ของโปรเจคปลายทาง):

```bash
node <skill-dir>/scripts/verify.mjs
```

script ครอบฝั่ง repo ให้ทั้งหมด (อ่านเฉพาะบรรทัดที่ยังทำงานจริง — ตัดคอมเมนต์ออกก่อน)
ส่วนที่เหลือไล่ตาม **`references/verification.md`** ซึ่งมีรายการเต็ม: สิ่งที่ script
ไม่ตรวจโดยตั้งใจ · ไฟล์ในโปรเจค · ฝั่ง server (admin ยืนยัน) · รันจริง. ขั้นต่ำที่ห้ามข้าม:

- [ ] `verify.mjs` ไม่มี fail · ไม่มี `__*__` ค้างทั้งในไฟล์โปรเจคและ `docs/admin-handoff.md`
- [ ] toolchain §5.6 ผ่านในเครื่อง (`ruff format --check` · `ruff check` · `mypy` · `pytest`)
      และได้ `coverage.xml` + `test-results/junit.xml` จริง
- [ ] shape web: ยิง `/api/health` จริง — ไม่ต้อง login · 200 healthy / 503 degraded ·
      ไม่มี version/commit · [subpath] เปิดผ่าน **URL เต็มหลัง proxy** ไม่ใช่ `localhost:port`
- [ ] admin ยืนยันฝั่ง server ครบตาม `docs/admin-handoff.md` (ปลั๊กอิน `docker-workflow`,
      `docker` group, credentials `nvd` / `env-<project>` / `env-<project>-dev`, webhook ทั้งคู่,
      Quality Gate ตาม §2)
- [ ] push `develop` → เขียวครบ 10 stages · ใส่ violation 1 จุดแล้ว pipeline abort ที่ Quality Gate

## 8. หลังจากนี้ (optional)

ถ้า interview ข้อ 8 ตอบ **ใช่** และ pipeline เขียวแล้ว → เปิด session ใหม่ทำ
characterization test ให้โค้ดเดิมตาม `references/legacy-test-generation.md`
(ไล่ทีละ module จากใบไปหาราก, ทีมต้อง review ทุกไฟล์ก่อน commit เพราะ test
ชุดนี้ล็อกพฤติกรรมปัจจุบันรวม bug ที่มีอยู่, และไม่ใช่เงื่อนไขของ Quality Gate
เพราะ gate นับเฉพาะโค้ดใหม่)
