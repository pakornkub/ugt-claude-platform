# Design — `ugt-python-platform` + `ugt-php-platform` (cicd/deploy skill) และมาตรฐาน volume กลาง

> **Status:** Approved-in-chat, รอ review ลายลักษณ์อักษร · **Date:** 2026-08-11
> **Applies-to:** ugt-core 2.x, ugt-nextjs-platform 4.12.0
> **ที่มา:** ทีมมีโปรเจค Python และ PHP ซ้ำหลายตัวที่ต้อง deploy บน Docker ผ่าน
> pipeline องค์กร (Jenkins + SonarQube + OWASP + Quality Gate) แต่ยังไม่มี skill
> รองรับ — และเรื่อง volume ยังไม่มีมาตรฐานกลางของทั้ง 3 stack

## 1. เป้าหมายและขอบเขต

สร้าง plugin ใหม่ 2 ตัวตาม pattern ของ `ugt-nextjs-platform` (แยกภาษา
maintain แยกกัน ตัวอย่างสอดคล้องกับภาษานั้น):

- `ugt-python-platform` → skill เดียว: `ugt-python-cicd-setup`
- `ugt-php-platform` → skill เดียว: `ugt-php-cicd-setup`

**ขอบเขตรอบแรก = delivery pipeline เท่านั้น** (Jenkinsfile, Sonar, OWASP,
Docker, deploy, tooling ขั้นต่ำให้ stage ผ่าน) — ไม่มี database / auth /
design / harness skill ของ 2 ภาษานี้ (backlog เดิมใน
`docs/multi-stack-proposal.md` ยังเปิดอยู่)

พร้อมกันนั้น **เพิ่มมาตรฐาน volume เข้า contract กลาง** และอัปเดต
`ugt-nextjs-cicd-setup` ให้ถามเรื่อง volume ด้วย — ทั้ง 3 stack ใช้กติกาเดียวกัน

## 2. มติที่เคาะแล้ว (จาก interview 2026-08-11)

| # | เรื่อง | มติ |
| --- | --- | --- |
| M1 | โครง plugin | แยก plugin ต่อภาษา ตาม pattern Next.js — ไม่รวมเป็น skill กลางตัวเดียว |
| M2 | Shape ที่รองรับ | Python: FastAPI / Flask / Django / batch script · PHP: Laravel / CodeIgniter / PHP legacy / WordPress — **เขียนครบทุก shape ตั้งแต่ต้น** แต่ต้องผ่าน pilot ภาษาละ 1 โปรเจคก่อน tag release; shape ที่ยังไม่ผ่านของจริง mark "ยังไม่ผ่าน pilot" ใน SKILL.md |
| M3 | Quality Gate | ใช้ gate เดิมของ contract ทุกโปรเจค ไม่มี gate ผ่อนปรน (`new_violations=0`, dup ≤3%, coverage ใหม่ ≥60%, hotspots 100%) |
| M4 | โปรเจคไม่มี lint/test | skill ติดตั้ง tooling ขั้นต่ำให้ — stage 2–4 รันผ่านได้จริงโดยไม่แตะโค้ดเดิม (เพิ่มเฉพาะไฟล์ config + smoke test) |
| M5 | Volume | bind mount ใต้ path กลาง `/srv/appdata/<project>/<name>` — เขียนเป็น section ใหม่ใน `ugt-core/contracts/cicd.md` ใช้ทั้ง next/python/php |
| M6 | Health endpoint | `/api/health` เหมือน Next.js ทุก stack (contract เดิม: ไม่ต้อง login, ไม่โชว์ version, 200/503) |
| M7 | Test ครอบคลุมโค้ดเดิม | **optional** — interview ถาม 1 ข้อ ถ้าเอาจึงทำเป็นขั้นต่อท้าย (characterization test ทีละ module, ทีมต้อง review) ค่า default คือ smoke test อย่างเดียว |
| M8 | Toolchain บน Jenkins | ไม่ติดตั้ง Python/PHP บน Jenkins server — stage Install/Quality/Test/Build รันใน docker container (`docker.image(...).inside`) server ไม่ต้อง config ใหม่ต่อภาษา |

## 3. โครง plugin (เหมือนกันทั้ง 2 ตัว)

```
plugins/ugt-python-platform/                 # ugt-php-platform โครงเดียวกัน
├── .claude-plugin/plugin.json               # v0.1.0, dependencies: ["ugt-core"]
├── CHANGELOG.md
└── skills/ugt-python-cicd-setup/
    ├── SKILL.md                             # skeleton เดียวกับ ugt-nextjs-cicd-setup:
    │                                        # Overview / Org Standards (restate contract) /
    │                                        # Interview / Setup Steps / Quick Rules / Verification
    ├── assets/
    │   ├── Jenkinsfile                      # 10 stages ตาม contract, บล็อกติดป้าย [WEB]/[BATCH]/[DB]/[WP]
    │   ├── sonar-project.properties
    │   ├── owasp-suppressions.xml
    │   ├── docker-compose.yml               # + docker-compose.dev.yml, บล็อก [VOLUME]
    │   ├── docker-compose.dev.yml
    │   ├── admin-handoff.template.md        # สิ่งที่ admin ต้องตั้งเอง (credentials, Sonar project,
    │   │                                    # webhook, mkdir+chown /srv/appdata/<project>)
    │   ├── docker/                          # Dockerfile ต่อ shape (ดู §4)
    │   ├── health/                          # health endpoint ต่อ framework (ดู §4)
    │   ├── tooling/                         # config lint/test ขั้นต่ำ + smoke test (ดู §4)
    │   └── rules/ugt-python-ci.md           # .claude/rules ไฟล์ (php: ugt-php-ci.md)
    ├── references/
    │   ├── docker-deploy.md                 # กลไก deploy + volume + gotcha ของ stack นั้น
    │   └── legacy-test-generation.md        # ขั้น optional M7: วิธีไล่สร้าง characterization test
    ├── scripts/verify.mjs                   # Node ตามมติ D8 เดิม
    └── evals/evals.json + trigger-evals.json
```

หมายเหตุ: server setup (Jenkins/SonarQube หนึ่งครั้งต่อ server) **ไม่คัดลอกมา**
— SKILL.md ชี้ผู้อ่านไปที่เอกสารเดียวกับของ Next.js ผ่าน admin-handoff
(เป็นงานของ admin ฝั่ง server ไม่ใช่ไฟล์ในโปรเจค จึงไม่ผิดกติกา self-contained)

## 4. เนื้อในต่อภาษา

### 4.1 Interview (ถามชุดเดียวตอนต้น — pattern เดิมของ Next.js)

1. ชื่อโปรเจค (kebab-case) → image/container/credential/sonar key
2. Host ports prod / dev
3. อยู่หลัง reverse-proxy subpath ไหม (web เท่านั้น) → basePath / URL
4. **App shape** — Python: fastapi / flask / django / batch · PHP: laravel /
   codeigniter / legacy / wordpress
5. Database + migration ไหม (alembic / django migrate / artisan migrate / ไม่มี)
6. **Volume** — มี path ที่ต้อง persist ข้าม deploy ไหม (uploads, ไฟล์ SQLite,
   `wp-content`, …) → รายการชื่อ volume
7. Deploy target — docker host ไหน, compose v1/v2
8. **Optional (M7)** — ต้องการให้สร้าง test ครอบคลุมโค้ดเดิมไหม (default: ไม่)

ก่อนถาม skill ต้อง**อ่าน codebase ก่อน**: หา entry point จริง (`app = FastAPI()`,
`wsgi.py`, `public/index.php`, `artisan`), เช็คว่ามี `requirements.txt` /
`composer.lock` / config lint/test / route ชน `/api/health` อยู่แล้วหรือไม่ —
ของที่มีอยู่แล้วไม่เขียนทับ และคำตอบบางข้อ (shape, DB) เดาจากโค้ดได้เลย
เหลือแค่ให้ user ยืนยัน

### 4.2 Assets ต่อ shape

| ชิ้น | Python | PHP |
| --- | --- | --- |
| `docker/Dockerfile.web` | `python:3.12-slim`, non-root user, start ต่างกันตาม framework: uvicorn (FastAPI) / gunicorn (Flask, Django) — คำสั่ง start คือ placeholder ที่เติมจากการอ่าน entry point | `php:8.3-apache` ตัวเดียวคลุม Laravel / CodeIgniter / legacy (ponytail: ไม่แยก fpm+nginx จนกว่ามีเหตุด้าน performance จริง) |
| `docker/Dockerfile.batch` | ไม่มี port/health — deploy เป็น image, รันผ่าน host cron: `docker compose run --rm job` (บันทึกไว้ใน references/docker-deploy.md) | — (ยังไม่มีเคส; เพิ่มเมื่อเจอ) |
| `docker/Dockerfile.wordpress` | — | ต่อยอด `wordpress:php8.3-apache`; volume `wp-content` **บังคับ** |
| `health/` | FastAPI router / Flask blueprint / Django view — DB check ถ้ามี DB | `api/health/index.php` ไฟล์เดียววางได้ทุก shape (Laravel ใช้ route แทน) |
| `tooling/` | `pyproject.toml` snippet: `[tool.ruff]` + `[tool.pytest.ini_options]` (junitxml + coverage.xml) + mypy ผ่อนปรน (`ignore_missing_imports`, non-strict) + `tests/test_smoke.py` (assert import entry point ได้) | `phpstan.neon` (level 0) + `.php-cs-fixer.php` + `phpunit.xml` (log-junit + clover) + `tests/SmokeTest.php` |
| coverage → Sonar | `sonar.python.coverage.reportPaths=coverage.xml` | `sonar.php.coverage.reportPaths=clover.xml` |

### 4.3 Jenkinsfile — 10 stages ตาม contract, swap เฉพาะคำสั่ง

| Stage | Python | PHP |
| --- | --- | --- |
| Install | `pip install -r requirements.txt` (uv ถ้ามี lock) | `composer install --no-dev` แยก dev สำหรับ CI |
| Code Quality (×3) | ruff check / ruff format --check / mypy | php-cs-fixer --dry-run / phpstan / (ช่อง typecheck = phpstan) |
| Unit Tests | pytest → junit.xml + coverage.xml | phpunit → junit.xml + clover.xml (เปิด pcov) |
| Build | ไม่มีขั้น build แยก — Docker Build ทำหน้าที่นี้ (stage คงอยู่, log ว่า absorbed) | เดียวกัน |
| OWASP DC | as-is (สแกน requirements/lock) | as-is (สแกน composer.lock; legacy ไม่มี lock → สแกน source, signal อ่อน — ระบุใน SKILL.md) |
| Sonar / Quality Gate | เหมือน contract ทุกอย่าง | เหมือน contract ทุกอย่าง |
| Docker Build / Deploy | tag ด้วย BUILD_NUMBER · migrate-ก่อน-deploy (alembic/manage.py) · `--no-build` | เดียวกัน (artisan migrate) |

ทุก stage ที่ต้องใช้ toolchain รันใน docker (M8): `docker.image('python:3.12-slim').inside` /
`docker.image('composer:2').inside` ฯลฯ — Jenkins server แตะแค่ docker daemon
เดิมที่มีอยู่แล้ว ไม่เพิ่ม Global Tool ใหม่

หมายเหตุ Next.js parity: กติกา `NEXT_PUBLIC_*` build-arg หายไปเอง (ไม่มี
compile-time client env ใน 2 stack นี้) — ระบุใน SKILL.md ว่าไม่ใช่ของหาย
แต่เป็นความง่ายที่ได้มา

### 4.4 ขั้น optional M7 — test ครอบคลุมโค้ดเดิม

ถ้า interview ข้อ 8 ตอบใช่: หลังไฟล์ deploy ครบ ให้เปิด session แยกตาม
`references/legacy-test-generation.md` — ไล่ module สร้าง characterization test
(ล็อกพฤติกรรมปัจจุบัน) + รายงาน coverage ที่ได้ พร้อมประกาศชัดว่า (1) test
เหล่านี้ล็อกพฤติกรรมรวม bug ที่มีอยู่ — ทีมต้อง review ก่อน commit (2) ไม่ใช่
เงื่อนไขของ pipeline เพราะ gate นับเฉพาะโค้ดใหม่

## 5. มาตรฐาน volume กลาง (แตะทั้ง 3 stack)

### 5.1 เพิ่ม section "Persistent data" ใน `ugt-core/contracts/cicd.md`

- ข้อมูลที่ต้องรอดข้าม deploy ใช้ **bind mount** ใต้
  `/srv/appdata/<project>/<name>` · dev = `/srv/appdata/<project>-dev/<name>`
- Deploy stage สร้าง path + `chown` ให้ตรง user ใน container ก่อน `up -d`
  ครั้งแรก (idempotent — มีแล้วข้าม)
- ห้ามเก็บ secret ใน volume · ห้าม bind โค้ดทับ image
  (ข้อยกเว้นเดียวที่ประกาศ: `wp-content` ของ WordPress)
- Backup = file backup ของ host ที่ครอบ `/srv/appdata` ทีเดียวคลุมทุกโปรเจค
- ตาม maintenance note ของ contract: bump `ugt-core` minor + CHANGELOG
  พร้อมกันในการแก้ครั้งนี้

### 5.2 อัปเดต `ugt-nextjs-cicd-setup` ให้สอดคล้อง

- Interview เพิ่มข้อ 7: volume (ถ้าไม่มีอะไรต้อง persist — ตอบไม่มี จบ ไม่มีไฟล์เปลี่ยน)
- Compose ทั้ง 2 ไฟล์เพิ่มบล็อก `[VOLUME]` (คอมเมนต์ไว้ ตัดทิ้งได้เหมือน `[DB]`)
- `admin-handoff.template.md` เพิ่มรายการ mkdir+chown
- bump minor + CHANGELOG

## 6. งานระดับ repo (นอกตัว plugin)

- `marketplace.json` — เพิ่ม 2 entries
- `scripts/check-contract-drift.mjs` — ครอบ SKILL.md ของ 2 plugin ใหม่
  (ค่า threshold ที่ restate ต้องตรง contract) + ค่าใหม่จาก section volume
- `docs/multi-stack-proposal.md` — อัปเดตสถานะ (Python cicd เริ่มทำจริง,
  มติ M1–M8 อ้างมาที่ spec นี้) + เพิ่ม section PHP ที่ยังไม่เคยมี
- README (ทั้ง root และของ plugin ตามแบบแผนเดิม) — เพิ่ม 2 plugin
- **ยังไม่สร้าง** bundle `ugt-python-standard` / `ugt-php-standard` — รอมี
  skill มากกว่า 1 ตัวต่อ stack ก่อน

## 7. เงื่อนไขปล่อยและการทดสอบ

- **Pilot gate:** v0.1.0 ยังไม่ tag release จนกว่าจะรัน skill กับโปรเจคจริง
  อย่างน้อยภาษาละ 1 ตัวและ pipeline เขียวถึง Deploy — deviation ที่เจอเขียน
  กลับเข้า skill ก่อน tag
- Shape ที่ pilot ยังไม่ครอบ mark "ยังไม่ผ่าน pilot" ใน SKILL.md ตาม M2
- `scripts/verify.mjs` ต่อ skill: เช็คว่าไฟล์ครบ, placeholder ถูกแทนหมด,
  health route มีจริง, compose ไม่มี volume ที่ไม่อยู่ใต้ path กลาง
- `evals/` ตาม format เดิมของ marketplace (evals.json + trigger-evals.json)

## 8. นอกขอบเขต (ประกาศชัด)

- Database / auth / design / harness / clean-code skill ของ Python และ PHP
- Sentry สำหรับ 2 stack นี้ (Next.js มีเพราะสกัดจากโปรเจคจริง — ยังไม่มีเคส)
- React SPA (backlog เดิมใน multi-stack-proposal ไม่เปลี่ยนสถานะ)
- การย้ายโปรเจคขึ้น Kubernetes หรือ registry กลาง — pipeline ยัง build บน
  host เดียวกับที่ deploy ตาม contract เดิม
