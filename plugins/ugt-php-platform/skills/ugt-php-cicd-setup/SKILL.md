---
name: ugt-php-cicd-setup
description: >
  Use when a PHP project needs the org-standard delivery pipeline —
  "ทำ CI/CD ให้โปรเจค php", "deploy laravel/wordpress ด้วย docker",
  "ตั้ง jenkins ให้ php" — producing the 10-stage Jenkinsfile (toolchain in a
  CI docker image), sonar-project.properties, Dockerfile (web/wordpress),
  both compose files, minimal php-cs-fixer/phpstan/PHPUnit tooling + smoke test
  so the Quality Gate can pass, /api/health per shape, volume bind mounts under
  /srv/appdata, and the admin handoff. Covers Laravel, CodeIgniter, plain PHP
  legacy and WordPress. Not for Next.js (→ ugt-nextjs-cicd-setup) or Python
  (→ ugt-python-cicd-setup).
---

# UGT PHP CI/CD Setup

## 1. Overview

ติดตั้ง CI/CD มาตรฐานองค์กรลงในโปรเจค PHP ที่มีอยู่แล้ว:
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
> | Laravel | ยังไม่ผ่าน pilot |
> | CodeIgniter (CI3 / CI4) | ยังไม่ผ่าน pilot |
> | PHP legacy (ไม่มี framework) | ยังไม่ผ่าน pilot |
> | WordPress | ยังไม่ผ่าน pilot |
>
> แปลว่า: ค่าคงที่ทุกตัวในชุดนี้ (base image, คำสั่ง toolchain, health poll,
> UID chown, DocumentRoot sed) ถูกไล่ตรวจด้วยเหตุผลแล้วแต่**ยังไม่ถูกพิสูจน์
> ด้วย build จริง** — โปรเจคแรกของแต่ละ shape ต้องเผื่อเวลาไล่แก้รอบ pipeline
> จริง แล้วส่ง feedback กลับมาที่ plugin นี้ (PR ที่ repo platform) ไม่ใช่แก้
> ค้างไว้ในโปรเจคเดียว

Skill layout:

| Where | Contents |
| --- | --- |
| `assets/Jenkinsfile` | 10 stages ครบ · toolchain รันใน CI image `<project>-ci` ที่ build จาก `Dockerfile.ci` (มติ M8) · บล็อกติดป้าย `[DB]` `[VOLUME]` `[WEB]` `[WP]` |
| `assets/sonar-project.properties` | projectKey/Name + `sonar.php.*` + exclude `vendor`/`wp-admin`/`wp-includes` + import DC report |
| `assets/owasp-suppressions.xml` | skeleton ว่าง + กติกาการเพิ่ม suppression |
| `assets/docker/Dockerfile.web` · `Dockerfile.wordpress` | เลือกตัวเดียวตาม shape → copy เป็น `Dockerfile` ที่ root |
| `assets/docker/Dockerfile.ci` | image สำหรับ CI เท่านั้น (`php:8.3-cli` + unzip + pcov + composer) → copy เป็น `Dockerfile.ci` ที่ root — สเตจ Install `docker build -f Dockerfile.ci` |
| `assets/docker-compose.yml` · `docker-compose.dev.yml` | prod/dev คนละไฟล์ · `pull_policy: never` · healthcheck 127.0.0.1:80 |
| `assets/health/index.php` | `/api/health` ไฟล์เดียวใช้ได้ทุก shape **ยกเว้น Laravel** (Laravel ใช้ route แทน — โค้ดอยู่ในคอมเมนต์บรรทัดสุดท้ายของไฟล์นี้) |
| `assets/tooling/phpstan.neon` · `.php-cs-fixer.php` · `phpunit.xml` · `SmokeTest.php` · `composer-require-dev.md` | tooling ขั้นต่ำ (php-cs-fixer/phpstan/PHPUnit + smoke test) ให้ stage 2–3 **มีคำสั่งให้รันได้จริง** โดยไม่ต้องเขียน test เดิมใหม่ (มติ M4) — แต่โค้ดเดิมต้องผ่าน `php-cs-fixer fix` ก่อน ซึ่งขั้น setup จัดการให้ใน §5.6 |
| `assets/rules/ugt-php-ci.md` | ไฟล์ `.claude/rules/` — โหลดเองเมื่อ session แตะ Jenkinsfile/Docker/Sonar (overwrite ทั้งไฟล์ได้ตอน plugin update) |
| `assets/admin-handoff.template.md` | เอกสารส่งทีม admin — render แล้วเขียนลงโปรเจคเป็น `docs/admin-handoff.md` |
| `references/docker-deploy.md` | กลไก deploy เชิงลึก: `[WEB]` shape เดียว, WordPress wp-content + core upgrade, `pdo_sqlsrv` + `msodbcsql18`, healthcheck บน apache image, `.dockerignore`, ห้าม `config:cache` ตอน build, compose conventions |
| `references/legacy-test-generation.md` | ขั้น optional (มติ M7) — ไล่สร้าง characterization test ให้โค้ดเดิม ทำใน session แยก |
| `scripts/verify.mjs` | ตรวจฝั่ง repo ให้อัตโนมัติหลัง setup เสร็จ (§7) |

Server setup ระดับ Jenkins/SonarQube (ทำครั้งเดียวต่อ server) **ไม่ได้คัดลอกมา
ไว้ในนี้** — เป็นงานฝั่ง admin ไม่ใช่ไฟล์ในโปรเจค จึงส่งผ่าน
`assets/admin-handoff.template.md` แทน (ภาคผนวกท้ายไฟล์นั้นคือ server-level setup)

## 2. Org Standards

contract ร่วมที่ **ทุกโปรเจคทำเหมือนกันหมด** ไม่ว่าภาษาอะไร:

### 2.1 Stages (all 10, in order)

```
Checkout → Install → Code Quality (parallel: php -l / php-cs-fixer --dry-run / phpstan)
  → Unit Tests (JUnit + coverage publish) → Build
  → OWASP Dependency Check (90-min timeout + suppression file)
  → SonarQube Analysis → Quality Gate (waitForQualityGate abortPipeline: true)
  → Docker Build → Deploy          ← last 2 stages only on main/develop
post: emailext (success/unstable/failure/aborted) + cleanWs
```

รายการ stage คือ contract — สลับคำสั่งข้างในได้ **ห้ามตัด stage**. โครง
10-stage นี้คงไว้แม้ stage `Build` ของ PHP จะเป็น no-op (`echo` เฉย ๆ)
เพราะ PHP มี artifact เดียวคือ image ซึ่งถูกสร้างที่ stage `Docker Build`
อยู่แล้ว — การตัดออกทำให้ pipeline ของแต่ละภาษาเทียบกันไม่ได้

### 2.2 Toolchain รันใน docker (มติ M8 — ไม่แตะ Jenkins Global Tools)

สเตจ `Install` **build CI image เอง** ด้วย
`docker build -f Dockerfile.ci -t <project>-ci .` แล้วทุก stage ที่ต้องใช้ PHP
(`Install` / `Lint` / `Format Check` / `Static Analysis` / `Unit Tests`) เปิด
`docker.image('<project>-ci').inside { ... }` ของตัวเอง — Jenkins server ไม่ต้อง
ติดตั้ง PHP/composer เพิ่มเลย. ที่ต้องมี image ของตัวเองแทนที่จะใช้
`php:8.3-cli` ตรง ๆ เพราะ image ทางการ **ไม่มี coverage driver, ไม่มี composer,
และไม่มี unzip** — `Dockerfile.ci` เติมให้ 3 อย่างพอดี (`unzip` — ไม่มีแล้ว
`composer install` ตายด้วย "zip extension and unzip/7z commands are both
missing", `pecl install pcov`, `COPY --from=composer:2`) ไม่มีอย่างอื่น และ
**ห้ามเอา image นี้ไป deploy**.
`vendor/` ถูกสร้างในสเตจ `Install` แล้วอยู่ใน **workspace** (ไม่ใช่ในตัว
container ที่ถูกทิ้งเมื่อ stage จบ) จึงรอดข้ามไปสเตจถัดไปได้ เพราะ
`docker.image().inside` mount workspace เดิมทุกครั้ง. เงื่อนไขฝั่ง server **สองข้อ**
(อยู่ในเช็คลิสต์ + ภาคผนวกของ admin handoff แล้วทั้งคู่):

1. **ปลั๊กอิน Docker Pipeline (`docker-workflow`)** — เป็นตัวที่ให้ global
   variable `docker` ขาดแล้ว pipeline ตายตั้งแต่ stage Install ด้วย
   `groovy.lang.MissingPropertyException: No such property: docker` ซึ่งอ่านไม่
   ออกว่าหมายถึงปลั๊กอินหาย (ยืนยันจากโปรเจค pilot 2026-08) · **คนละเรื่องกับการ
   มี Docker CLI** — `sh 'docker …'` ไม่ต้องใช้ปลั๊กอินนี้ แต่
   `docker.image().inside{}` ต้องใช้
2. **Jenkins user อยู่ใน `docker` group** ไม่งั้นทุก stage fail ด้วย permission
   denied ต่อ `/var/run/docker.sock`

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
เท่านั้น (ห้าม `localhost` — resolver บางระบบไปที่ IPv6 `::1` ขณะที่ apache
ผูก IPv4) และยิง **port 80 ภายใน container** เสมอ ไม่ใช่ host port.
`php:8.3-apache` / `wordpress:php8.3-apache` ไม่มี `curl` → ทั้งสอง Dockerfile
**ลง `curl` เองและห้าม purge ทิ้ง** แล้ว healthcheck ใช้
`curl -fsS -L http://127.0.0.1:80/api/health` ทั้งใน Dockerfile และ compose.
**`-L` ห้ามตัด** — `/api/health` โดน 301 คนละทิศแล้วแต่ shape (Laravel ตัด `/`
ท้ายทิ้ง · shape ที่เป็นไฟล์เติม `/` เข้ามา) และ `curl -f` ที่ไม่มี `-L` นับ 301
ว่าสำเร็จ = เขียวหลอกทั้งที่ข้างใต้ 503. **ห้ามกลับไปใช้
`php -r file_get_contents`** — พังเงียบเมื่อโปรเจคตั้ง `allow_url_fopen = Off`
ตาม OWASP (container ไม่มีวัน healthy โดยไม่มี error บอก). PHP มี deploy shape
เดียวคือ `[WEB]` — ไม่มี shape ที่ยกเว้น health endpoint ได้
(→ `references/docker-deploy.md` §A, §D)

### 2.9 Persistent data

ข้อมูลที่ต้องรอดข้าม deploy ใช้ bind mount ใต้ `/srv/appdata/<project>/<name>`
(dev = `/srv/appdata/<project>-dev/<name>`) เท่านั้น — ห้าม named volume,
ห้ามเก็บ secret ใน volume, ห้าม bind โค้ดทับ image (ข้อยกเว้นเดียวที่ contract
ประกาศไว้คือ `wp-content` ของ WordPress ซึ่ง **บังคับ** ต้องเป็น volume).
บล็อก `[VOLUME]` ในสเตจ Deploy สร้าง path + `chown` ให้ตรง UID ของ user ใน
container ให้เอง โดยอ่าน UID จาก image จริง ไม่ hardcode — **มันวนเช็คทีละ
subdir** (`for p in …`) จึงสร้าง volume ที่เพิ่มทีหลัง release แรกให้ด้วย และ
ข้ามตัวที่มีอยู่แล้วโดยไม่ chown ซ้ำ — แต่ **session ที่กรอก volume ต้องแทน
`uploads`/`reports` ในบรรทัด `for p in` ด้วยชื่อจริงทุกตัว** subdir ที่ไม่อยู่
ในลิสต์จะถูก dockerd สร้างเป็น `root:root` ตอน `up -d` แล้ว container เขียนไม่ได้
(`verify.mjs` จับข้อนี้ให้). admin เตรียม `/srv/appdata` ให้เขียนได้ครั้งเดียว
ต่อ server (ดู admin handoff). รายละเอียดกลไก chown → `references/docker-deploy.md` §B

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
| Shape | ไล่**ตามลำดับนี้** หยุดที่ข้อแรกที่ตรง: มี `artisan` ที่ root → **laravel** · มี `wp-config.php` (หรือ `wp-config-sample.php`) + `wp-content/` → **wordpress** · มี `system/` คู่กับ `app/` (CI4) หรือ `application/` (CI3) → **codeigniter** · มี `composer.json` และ/หรือ `public/index.php` แต่ไม่เข้า 3 ข้อบน → **legacy** | ข้อ 4 (shape) |
| `__ENTRY_FILE__` candidate | Laravel / CI4 → `public/index.php` · CI3 / legacy → `index.php` ที่ root · **WordPress → `api/health/index.php`** (ไม่ใช่ `index.php` — repo ของ WP ไม่ได้ commit core ไว้) — เลือกไฟล์ที่ **มีจริงและถูก commit ใน repo** เสมอ เพราะ `SmokeTest.php` ใช้ `assertFileExists` กับ path นี้ตรง ๆ (ไม่มีไฟล์ = สเตจ Unit Tests แดง) | §5.2 |
| DocumentRoot | มีโฟลเดอร์ `public/` ที่เป็น webroot จริงไหม (Laravel, CI4) → ต้อง uncomment บล็อก `[LARAVEL]` sed ใน `Dockerfile.web` | §5.3 |
| Route/ไฟล์ `/api/health` เดิม | grep `api/health` ใน `**/*.php` + `routes/*.php` (Laravel) + `app/Config/Routes.php` (CI4) และเช็คว่ามีไฟล์ `api/health/index.php` อยู่แล้วไหม | §5.1 (มีแล้ว → ไม่ copy ทับ แค่ตรวจว่าไม่ต้อง login และไม่คืน version) |
| composer manifest | มี `composer.json` ไหม (ถ้าไม่มีต้อง `composer init` ก่อน — สเตจ Install รัน `composer install` **ทุก shape** ไม่มีข้อยกเว้น); มี `composer.lock` แล้วหรือยัง; มี dev tooling ตัวไหนติดอยู่ก่อนแล้ว. **WordPress แทบไม่เคยมี `composer.json`** → เตรียมใจว่าต้องเดินเส้นเดียวกับ legacy | ข้อ 1 + §5.4 |
| Config lint/test เดิม | `phpstan.neon` / `phpstan.neon.dist`, `.php-cs-fixer.php` / `.php-cs-fixer.dist.php` / `.php_cs` (ตัวเก่า), `phpunit.xml` / `phpunit.xml.dist` | §5.1 (merge ไม่ทับ) |
| Migration tool | Laravel: `database/migrations/` + `artisan` → `php artisan migrate` · CI4: `app/Database/Migrations/` + `spark` → `php spark migrate` · legacy/WordPress: ไม่มี migration มาตรฐาน | ข้อ 5 |
| Test เดิม | มี `tests/` + ไฟล์ `*Test.php` อยู่แล้วไหม · มี `tests/SmokeTest.php` ชื่อชนอยู่แล้วไหม | §5.1 (`tests/SmokeTest.php` ใส่**เสมอ** — เป็นไฟล์แยกไม่ชนของเดิม; ชนชื่อพอดี → ไม่ทับ อ่านของเดิมแล้วเติม assert `__ENTRY_FILE__` เข้าไปถ้ายังไม่มี) |

**ของเดิมไม่เขียนทับ** — ทุกไฟล์ในตาราง §5.1 ถ้ามีอยู่แล้วให้ merge/ปรับ แล้ว
บอกผู้ใช้ว่าไปแตะอะไรบ้าง; ยกเว้นไฟล์เดียวคือ `.claude/rules/ugt-php-ci.md`
ที่ทับทั้งไฟล์ได้ (plugin เป็นเจ้าของ)

## 4. Interview — ถามชุดเดียว (8 ข้อ)

1. **ชื่อโปรเจค** (kebab-case) → กลายเป็นชื่อ image/container/credential/sonar
   key + display name
2. **Host ports** — prod / dev (เช่น 8080 / 8081) — ถ้ายังไม่ได้จัดสรรจาก admin
   ใส่ค่า placeholder ไปก่อนแล้วรอค่าจริงกลับมาทาง admin handoff
3. **อยู่หลัง reverse-proxy subpath ไหม** → ถ้าใช่ ขอ path prod/dev + URL เต็ม
   เพื่อไปตั้งค่าฝั่งแอปเอง (Laravel `APP_URL`/`ASSET_URL` · CI4
   `app.baseURL` · WordPress `WP_HOME`/`WP_SITEURL`) — ไม่มี placeholder ใน
   ชุดไฟล์นี้ เป็นค่าฝั่งแอปล้วน
4. **App shape** — `laravel` / `codeigniter` / `legacy` / `wordpress` (เดาจาก §3
   แล้วให้ยืนยัน) → ตัดสินว่าใช้ `Dockerfile.web` หรือ `Dockerfile.wordpress`,
   วาง health ไว้ที่ไหน (หรือใช้ route แทน), ต้อง uncomment `[LARAVEL]`
   DocumentRoot ไหม, บล็อก `[DB]`/`[WP]` คงหรือลบ
5. **Database + migration** — `php artisan migrate` (Laravel) / `php spark
   migrate` (CI4) / ไม่มี → คงหรือลบบล็อก `[DB]` ทั้งชุด (รวม `DATABASE_URL`
   ใน compose และตัวเลือก extension ใน `Dockerfile.web`)
6. **Volume** — มี path ที่ต้อง persist ข้าม deploy ไหม (uploads, ไฟล์ที่
   generate, storage) → รายชื่อ → บล็อก `[VOLUME]` ในทั้ง 2 compose; ไม่มี →
   ลบบล็อก. **shape = wordpress ข้อนี้ไม่ใช่คำถาม** — `wp-content` เป็น volume
   บังคับเสมอ ถามได้แค่ว่า *นอกจาก* `wp-content` แล้วมีอะไรอีก
7. **Deploy target** — docker host ไหน, Jenkins อยู่เครื่องเดียวกับ docker
   daemon หรือ mount socket, `docker compose` (v2, ไม่มีขีด) หรือ
   `docker-compose` (v1, มีขีด) — **Jenkinsfile ที่ให้มาใช้ v2** ซึ่งเป็น
   ค่ามาตรฐาน ต้องแก้กลับเฉพาะ host เก่าที่มีแต่ v1 (v1 EOL ตั้งแต่กลางปี 2023)
8. **(optional) สร้าง test ครอบคลุมโค้ดเดิมไหม** — **default: ไม่**
   (สร้างแค่ `tests/SmokeTest.php` พอให้สเตจ Unit Tests รันผ่านจริงโดยไม่แตะ
   โค้ดเดิม) ถ้าตอบใช่ → **ทำใน session แยกหลัง pipeline เขียวแล้ว** ตาม
   `references/legacy-test-generation.md` อย่าทำปนใน session นี้

## 5. Setup Steps

### 5.1 Copy assets

| จาก | ไปที่ | เงื่อนไข |
| --- | --- | --- |
| `assets/Jenkinsfile` | `Jenkinsfile` | เสมอ |
| `assets/sonar-project.properties` | `sonar-project.properties` | เสมอ |
| `assets/owasp-suppressions.xml` | `owasp-suppressions.xml` | เสมอ |
| `assets/docker/Dockerfile.web` | `Dockerfile` | shape = laravel / codeigniter / legacy |
| `assets/docker/Dockerfile.wordpress` | `Dockerfile` | shape = wordpress |
| `assets/docker/Dockerfile.ci` | `Dockerfile.ci` (root) | **เสมอ** — สเตจ Install รัน `docker build -f Dockerfile.ci` ถ้าไฟล์นี้ไม่อยู่ที่ root pipeline พังตั้งแต่ stage แรกที่ใช้ PHP |
| `assets/docker-compose.yml` | `docker-compose.yml` | เสมอ |
| `assets/docker-compose.dev.yml` | `docker-compose.dev.yml` | เสมอ |
| `assets/health/index.php` | `api/health/index.php` (CI4 → `public/api/health/index.php`) | shape ≠ laravel — path ต้องเทียบจาก **DocumentRoot ที่ Dockerfile เสิร์ฟจริง** |
| — (ไม่ copy ไฟล์) | `routes/web.php`: `Route::get('/api/health', ...)` | shape = laravel — โค้ดอยู่ในคอมเมนต์บรรทัดสุดท้ายของ `assets/health/index.php` (ดู §5.3) |
| `assets/tooling/phpstan.neon` | `phpstan.neon` (root) | เสมอ |
| `assets/tooling/.php-cs-fixer.php` | `.php-cs-fixer.php` (root) | เสมอ |
| `assets/tooling/phpunit.xml` | `phpunit.xml` (root) | เสมอ |
| `assets/tooling/SmokeTest.php` | `tests/SmokeTest.php` | **เสมอ** — โปรเจคที่มี test อยู่แล้วก็ใส่ (ไฟล์แยก ไม่ชนของเดิม) · มีไฟล์ชื่อนี้อยู่แล้ว = ไม่ทับ ให้เติม test เข้าไปในไฟล์เดิมแทน |
| `assets/tooling/composer-require-dev.md` | **ไม่ copy** — เป็นคำสั่งให้รัน (§5.4) | เสมอ (ทุก shape รวม WordPress) |
| `assets/rules/ugt-php-ci.md` | `.claude/rules/ugt-php-ci.md` | เสมอ (overwrite ทั้งไฟล์ได้ตอน plugin update) — **ไฟล์นี้มี `__PROJECT_NAME__` อยู่ 2 จุด** (ชื่อ CI image) ต้องแทนค่าเหมือนไฟล์อื่น ไม่ใช่ copy ดิบ ๆ |

นอกจากตารางนี้ ต้อง **สร้าง `.dockerignore`** ที่ root ถ้ายังไม่มี (หรือเติม
บรรทัดที่ขาด) อย่างน้อย 4 บรรทัด:

```
vendor
coverage
dc-report
test-results
```

สเตจ Install สร้าง `vendor/` (มี dev dependencies) ไว้ใน workspace เดียวกับที่
Docker Build ใช้เป็น build context และ `Dockerfile.web` ใช้ `COPY . .` —
ไม่กันไว้ `vendor/` เวอร์ชัน CI จะหลุดเข้า build context ทั้งก้อน (image เอง
รัน `composer install --no-dev` สร้าง `vendor/` ของตัวเองอยู่แล้ว)
รายละเอียด → `references/docker-deploy.md` §E

> **`/api/health` ไม่ใช่ของเลือกได้** — ทั้ง `HEALTHCHECK` ใน Dockerfile,
> healthcheck ในทั้ง 2 compose และ health poll ในสเตจ Deploy ยิง path นี้
> ถ้าไม่มี route/ไฟล์จริง container ไม่มีวันขึ้น `healthy` และ Deploy fail
> ที่ `docker inspect` ทุกครั้ง. โปรเจคที่มี endpoint นี้อยู่แล้ว → ไม่ copy ทับ
> แค่ตรวจว่าเข้าถึงได้โดยไม่ต้อง login และไม่คืน version/commit

### 5.2 แทน placeholder (นี่คือรายการครบ)

| Placeholder | ความหมาย | อยู่ในไฟล์ | ตัวอย่าง |
| --- | --- | --- | --- |
| `__PROJECT_NAME__` | kebab-case id — image/container/sonar key/credential suffix + tag ของ CI image (`<project>-ci`) | `Jenkinsfile`, `sonar-project.properties`, `docker-compose.yml`, `docker-compose.dev.yml`, **`rules/ugt-php-ci.md`** (ชื่อ CI image 2 จุด — ไฟล์นี้ถูก copy ทุกโปรเจค ลืมแทนแล้ว rule จะบอกชื่อ image ผิดให้ session ถัดไป), `admin-handoff.template.md`, `tooling/composer-require-dev.md` (เคสที่ต้อง `composer init` — legacy/WordPress) | `hr-portal` |
| `__PROJECT_DISPLAY_NAME__` | ชื่อที่คนอ่าน (sonar `projectName`, หัวเอกสาร handoff) | `Jenkinsfile`, `sonar-project.properties`, `admin-handoff.template.md` | `HR Portal` |
| `__PORT_PROD__` | host port ของ prod (container-internal คงที่ 80 เสมอ — apache) | `docker-compose.yml` | `8080` |
| `__PORT_DEV__` | host port ของ dev | `docker-compose.dev.yml` | `8081` |
| `__ENTRY_FILE__` | path ของ entry point **เทียบจาก root โปรเจค** — ใช้เป็น smoke check ในสเตจ Unit Tests | `tooling/SmokeTest.php` (เสมอ — ไฟล์นี้ copy ทุกโปรเจค) | `public/index.php` |

`__ENTRY_FILE__` ต่อ shape:

```
Laravel      public/index.php
CodeIgniter  public/index.php   (CI4)   ·   index.php   (CI3)
legacy       index.php          (หรือ public/index.php ถ้าใช้ public/ เป็น webroot)
WordPress    api/health/index.php
```

> **WordPress ใช้ `api/health/index.php` ไม่ใช่ `index.php`** — repo ของโปรเจค
> WordPress ไม่ได้ commit core ไว้ (core มากับ base image `wordpress:*` และ
> `Dockerfile.wordpress` ไม่มี `COPY . .`) ดังนั้น `index.php` ที่ root **ไม่มี
> อยู่ใน repo** ที่ CI checkout มา — `assertFileExists` จะ fail แล้วสเตจ Unit
> Tests แดงตั้งแต่ build แรก. `api/health/index.php` เป็นไฟล์ที่ **การันตีว่า
> commit อยู่จริง** เพราะ `Dockerfile.wordpress` `COPY` มันจาก build context
> (ไม่มีไฟล์นี้ = image build ไม่ผ่านตั้งแต่แรกอยู่แล้ว) จึงเป็น smoke check ที่
> ตรงกับความจริงของ shape นี้ที่สุด

placeholder อีก 5 ตัวอยู่ใน `admin-handoff.template.md` **เท่านั้น** เติมตอน
render เอกสารส่ง admin (§5.7):

| Placeholder | เติมด้วย |
| --- | --- |
| `__DATE__` | วันที่ที่ render เอกสาร |
| `__REQUESTER__` | ชื่อผู้ขอ (ทีมพัฒนา) |
| `__REPO_URL__` | URL ของ git repo |
| `__JENKINS_HOST__` | host ของ Jenkins ที่ใช้ตั้ง webhook |
| `__N_CREDS__` | จำนวน credential ที่ admin ต้องสร้าง (ปกติ `2` — `env-<project>` + `env-<project>-dev`; ถ้าเป็นโปรเจคแรกของ server นับ `nvd` ด้วยเป็น `3`) |

> **`__DIR__` ไม่ใช่ placeholder** — เป็น magic constant ของภาษา PHP ที่โผล่ใน
> `tooling/.php-cs-fixer.php` และ `tooling/SmokeTest.php` **ห้ามแทนค่า** (แทน
> แล้วไฟล์ทั้งสองพังทันที). ตอนไล่หา `__*__` ที่ตกค้างให้ยกเว้นตัวนี้ตัวเดียว

ชื่อที่ derive อัตโนมัติจาก `__PROJECT_NAME__`: image/container ของ dev =
`<project>-dev` · CI image = `<project>-ci` · credentials = `env-<project>`,
`env-<project>-dev` · sonar keys = `<project>`, `<project>-dev`

### 5.3 Adjust ตามคำตอบ interview

- **shape = laravel** → `Dockerfile.web` · **uncomment บล็อก `[LARAVEL]` 2
  บรรทัด** (sed ย้าย DocumentRoot ไป `public/`) · **ไม่ copy
  `health/index.php`** — ไฟล์ที่ root ไม่ถูกเสิร์ฟเมื่อ DocumentRoot = `public/`
  ให้เพิ่ม route แทน (โค้ดชุดเดียวกับในไฟล์ health):

  ```php
  // routes/web.php — ต้องอยู่นอก middleware auth (contract: ไม่ต้อง login)
  Route::get('/api/health', function () {
      $ok = true; // [DB] เช็ค DB จริง (SELECT 1) แล้ว $ok = false เมื่อพัง
      return response()->json(['status' => $ok ? 'healthy' : 'degraded'], $ok ? 200 : 503);
  });
  ```

- **shape = codeigniter** → `Dockerfile.web` · **CI4** (มี `public/`): uncomment
  บล็อก `[LARAVEL]` แล้ววาง health ที่ `public/api/health/index.php` ·
  **CI3** (index.php อยู่ที่ root): **ลบ** บล็อก `[LARAVEL]` ทิ้ง แล้ววาง health
  ที่ `api/health/index.php`
- **shape = legacy** → `Dockerfile.web` · ลบบล็อก `[LARAVEL]` ทิ้ง (เว้นแต่
  โปรเจคใช้ `public/` เป็น webroot จริง ๆ) · health ที่ `api/health/index.php`
- **shape = wordpress** → `Dockerfile.wordpress` · health **ต้อง** อยู่ที่
  `api/health/index.php` เป๊ะ ๆ (Dockerfile hardcode path นี้ใน `COPY` และ image
  นี้ **ไม่มี `COPY . .`** — วางที่อื่นแล้วจะไม่มีอะไรเข้า image เลย) · บล็อก
  `[WP]` ในทั้ง 2 compose **ห้ามลบ** · เพิ่ม `define('WP_AUTO_UPDATE_CORE', false);`
  ใน `wp-config.php` (เหตุผล → `references/docker-deploy.md` §B)

  **โค้ดของโปรเจค WordPress ขึ้น container ทางไหน — ต้องบอกผู้ใช้ให้ชัดตั้งแต่
  ตอน setup** เพราะ `Dockerfile.wordpress` = base image + ไฟล์ health เท่านั้น
  ไม่มีอะไรจาก repo เข้า image อีกเลย และ `wp-content` เป็น bind mount ที่**ไม่มี
  อะไรเติมให้อัตโนมัติ**:

  1. **โมเดลหลัก (default) — `wp-content` เป็นข้อมูล runtime** อยู่ที่
     `/srv/appdata/<project>/wp-content` บนโฮสต์ ไม่ใช่ของที่ pipeline ส่งขึ้นไป:
     theme/plugin/media ติดตั้งผ่าน **wp-admin ครั้งแรกหลัง deploy** แล้วอยู่ยาว
     ข้าม deploy ถัดไปเอง (นี่คือเหตุผลที่ volume นี้บังคับ) — deploy รอบถัดไป
     เปลี่ยนแค่ core/health ที่มากับ image ไม่แตะ `wp-content`
  2. **ถ้า repo track theme/plugin ที่เขียนเอง** (มี `wp-content/themes/<custom>`
     หรือ `wp-content/plugins/<custom>` อยู่ใน git) โค้ดชุดนั้น**ยังไม่มีทางขึ้น
     ไปเอง** — ต้องเติมขั้น copy ฝั่งโฮสต์ลง bind mount **ก่อน** `compose up`
     ในสเตจ Deploy (ทำได้เพราะเป็น bind mount ไม่ใช่ named volume):

     ```groovy
     // [WP] เฉพาะโปรเจคที่ track theme/plugin ของตัวเองใน repo —
     // ⚠️ ยังไม่ผ่าน pilot: ต้องพิสูจน์ ownership/permission กับโปรเจคจริงก่อนใช้ยาว
     sh "cp -r wp-content/. /srv/appdata/${containerName}/wp-content/"
     ```

     วางไว้**หลัง**บล็อก `[VOLUME]` (path + chown ต้องมีก่อน) และ **ก่อน**
     `docker-compose ... up -d`. `cp -r <dir>/.` (มีจุดต่อท้าย) = คัดลอก
     *เนื้อใน* ไม่ใช่ตัวโฟลเดอร์ — ไม่งั้นจะได้ `wp-content/wp-content`.
     ข้อนี้ทับไฟล์ชื่อซ้ำแต่**ไม่ลบ**ของที่ผู้ใช้ติดตั้งผ่าน wp-admin ไว้ ถ้า
     ต้องการ mirror เป๊ะ ๆ ค่อยพิจารณา `rsync --delete` เป็นกรณีไป (เสี่ยงลบ
     uploads — ห้ามใส่เป็นค่า default)
  3. **ข้อนี้กำหนดว่า Sonar สแกนอะไรด้วย** — สิ่งที่ scanner เห็นคือโค้ดใน repo
     (theme/plugin ที่เขียนเอง) ไม่ใช่ WordPress core ซึ่งไม่เคยอยู่ใน repo อยู่
     แล้ว และถูก `sonar.exclusions` กัน `wp-admin`/`wp-includes` ไว้ซ้ำอีกชั้น —
     ถ้าโปรเจคไม่มีโค้ดของตัวเองใน repo เลย ให้บอกผู้ใช้ตรง ๆ ว่า Quality Gate
     จะวัดแทบไม่มีอะไร (นั่นเป็นเรื่องปกติของ WP ที่ใช้แต่ปลั๊กอินสำเร็จรูป
     ไม่ใช่สัญญาณว่าตั้งค่าผิด)
- **ไม่มี DB (ข้อ 5 = ไม่มี)** → ลบทุกบล็อกที่ติดป้าย `[DB]`: บล็อก migrate ใน
  สเตจ Deploy ของ `Jenkinsfile`, บรรทัด `DATABASE_URL:` ใน compose **ทั้ง 2
  ไฟล์**, ตัวเลือก extension `[DB]` ใน `Dockerfile.web` และคอมเมนต์ `[DB]` ใน
  ไฟล์ health (ตัว health ยัง return `healthy` ถูกต้องเพราะ `$ok = true` อยู่แล้ว)
- **Laravel (ข้อ 5 = artisan migrate)** → คงบล็อก `[DB]` ไว้ตามที่ template ให้มา
  (`php artisan migrate --force` ผ่าน `--env-file .env`) — ใช้ `--env-file` ทั้ง
  ไฟล์ **ไม่ใช่** `-e DATABASE_URL` ตัวเดียว เพราะ `artisan` boot ทั้ง framework
  ก่อนแตะ DB ขาด `APP_KEY` ก็ตายตั้งแต่ยังไม่ทัน migrate. ผลพลอยได้คือ **ไม่ต้อง
  parse `.env` เองด้วย `grep`/`cut`** (docker อ่านไฟล์ให้ ไม่ต้องลุ้น quote/`\r`)
- **CI4 (ข้อ 5 = spark migrate)** → คงบล็อกไว้ เปลี่ยนคำสั่งเป็น
  `php spark migrate --all` — ห้ามลบบล็อกทิ้ง เพราะ contract คือ migrate ก่อน deploy
- **legacy / WordPress** → ลบบล็อก `[DB]` (ไม่มี migration tool มาตรฐาน;
  WordPress อัปเดต schema ของตัวเองตอน request แรกหลัง core เปลี่ยนเวอร์ชัน)
  แต่ถ้าโปรเจคมีสคริปต์ migration ของตัวเอง ให้**คงบล็อกไว้แล้วเปลี่ยนคำสั่ง**
  เป็นตัวที่โปรเจคใช้จริง
- **ไม่มี volume (ข้อ 6 = ไม่มี)** → ลบบล็อกคอมเมนต์ `[VOLUME]` ในทั้ง 2 compose
  **และ** บล็อก `[VOLUME]` (mkdir + chown) ในสเตจ Deploy ของ `Jenkinsfile`
  (shape = wordpress ข้ามข้อนี้ — `[WP]` บังคับให้มี volume เสมอ)
- **มี volume** → uncomment `volumes:` ในทั้ง 2 compose แล้วแทน `<name>` ด้วย
  ชื่อจริง — path ต้องอยู่ใต้ `/srv/appdata/<project>/` (dev ใช้
  `/srv/appdata/<project>-dev/`) เท่านั้น **แล้วแทนชื่อตัวอย่างในบรรทัด
  `for p in` ของบล็อก `[VOLUME]` ในสเตจ Deploy ด้วยชื่อจริงทุกตัว** — งานนี้ลืมไม่ได้:

  ```sh
  for p in /srv/appdata/${containerName}/uploads /srv/appdata/${containerName}/storage; do
  ```

  compose bind ที่ `/srv/appdata/<project>/<name>` ไม่ใช่ระดับโปรเจคเปล่า ๆ —
  `<name>` ที่ยังไม่มีตอน `up -d` **dockerd สร้างให้เองเป็น `root:root`**
  หลังบล็อก `[VOLUME]` รันจบไปแล้ว → `chown -R` ไม่ทัน แล้ว `www-data` เขียน
  ไม่ได้ (permission denied) ทั้งที่ container ขึ้น `healthy` ปกติ. `chown -R`
  บรรทัดถัดมาครอบทั้ง `/srv/appdata/<project>` อยู่แล้ว จึงคลุม subdir ที่เพิ่ง
  `mkdir` ให้เอง ขอแค่ subdir มีอยู่ก่อน (→ `references/docker-deploy.md` §B)
- **มีทั้ง `[VOLUME]` และ `[WP]` (WordPress ที่มี volume อื่นนอกจาก wp-content)**
  → compose มี **สอง** บล็อกคอมเมนต์ `volumes:` แยกกัน แต่ YAML อนุญาต key
  `volumes:` ได้ **แค่อันเดียวต่อ service** — ต้อง **merge รายการทั้งหมดเข้า
  `volumes:` ก้อนเดียว** ไม่ใช่ปล่อยสองก้อนไว้ (จะ parse ไม่ผ่าน หรือก้อนหลัง
  ทับก้อนแรกเงียบ ๆ ขึ้นกับ parser) และ `wp-content` ต้องอยู่ในรายการที่ merge
  แล้วเสมอ:

  ```yaml
  volumes:
    - /srv/appdata/hr-portal/wp-content:/var/www/html/wp-content
    - /srv/appdata/hr-portal/uploads:/var/www/html/uploads
  ```

- **อยู่หลัง reverse-proxy subpath (ข้อ 3 = ใช่)** → คำตอบนี้ต้องกลายเป็นค่า
  env ฝั่งแอปจริง ๆ ในขั้นนี้ ไม่ใช่แค่จดไว้ (เคยเป็นคำถามที่ไม่มี step
  รองรับ): เพิ่มลง `.env`/`.env.dev` (§5.5) ให้ตรง shape —
  - **Laravel**: `APP_URL=<URL เต็มรวม path>` (+ `ASSET_URL` เมื่อ asset โดน
    proxy ตัด path)
  - **CodeIgniter 4**: `app.baseURL=<URL เต็มรวม path>/`
  - **WordPress**: `WP_HOME` + `WP_SITEURL` = URL เต็มรวม path
  - CI3/legacy: `base_url` ใน config ของโปรเจคเอง
  แล้วเช็คของจริงตาม checklist: เปิดแอป**ผ่าน URL เต็มหลัง proxy** ไม่ใช่
  `localhost:port` (อย่างหลังผ่านเสมอแม้ config ผิด)
- **host มีแต่ `docker-compose` v1 (ข้อ 7)** → เปลี่ยน `docker compose -f ... up`
  ใน Jenkinsfile กลับเป็น `docker-compose -f ... up` (สอง binary ไม่ compatible
  100%) — กรณีนี้ควรเป็นข้อยกเว้น ไม่ใช่ค่าปกติ
- **มี config lint/test เดิมอยู่แล้ว** → merge ค่าจาก asset เข้าของเดิม ไม่ทับ
  ทั้งไฟล์; แต่ 3 ค่านี้ **ต้องได้ผลลัพธ์ตามนี้เสมอ** ไม่งั้น pipeline พังเงียบ ๆ:
  PHPUnit ต้องออก `test-results/junit.xml` และ `clover.xml` (สเตจ Unit Tests
  publish จาก 2 path นี้ · sonar อ่าน `clover.xml` ผ่าน
  `sonar.php.coverage.reportPaths`) และ `phpstan`/`php-cs-fixer` ต้องรันได้ด้วย
  คำสั่งเปล่า (ไม่มี `-c`) เพราะ Jenkinsfile เรียกแบบไม่ระบุ config path

### 5.4 ตรวจ composer + ติดตั้ง dev tooling

**ข้อนี้บังคับทุก shape ไม่มีข้อยกเว้น** — สเตจ `Install` รัน
`composer install` และสเตจ Code Quality/Unit Tests เรียก `vendor/bin/php-cs-fixer`
· `vendor/bin/phpstan` · `vendor/bin/phpunit` **เหมือนกันหมดทั้ง 4 shape**
(Jenkinsfile ไม่มีสาขาแยกตาม shape) ไม่มี `composer.json` = pipeline ตายที่
stage ที่ 1 ก่อนถึงอย่างอื่น

- ต้องมี `composer.json` ที่ root — สเตจ Install รัน `composer install` และ
  `Dockerfile.web` `COPY composer.json composer.lock* ./` ตรง ๆ. โปรเจคที่ยัง
  ไม่มีเลย: `composer init --no-interaction --name org/<project>` ก่อน
- ติดตั้ง dev tooling (เนื้อหาเดียวกับ `assets/tooling/composer-require-dev.md`
  ซึ่ง **ไม่ได้ copy เข้าโปรเจค** — เป็นคำสั่งให้รัน):

  ```bash
  composer require --dev friendsofphp/php-cs-fixer phpstan/phpstan phpunit/phpunit
  ```

> **[WP] WordPress เดินเส้นเดียวกับ legacy ข้อนี้** — repo ของโปรเจค WordPress
> แทบไม่เคยมี `composer.json` (core มากับ base image, ปลั๊กอินติดตั้งผ่าน
> wp-admin) แต่ **ไม่ได้แปลว่าข้ามขั้นนี้ได้** เพราะ Jenkinsfile ยังรัน
> `composer install` + `vendor/bin/*` ให้ shape นี้เหมือนกันเป๊ะ ๆ →
> `composer init --no-interaction --name org/<project>` แล้ว
> `composer require --dev ...` ทั้ง 3 ตัวตามปกติ. `composer.json` ที่ได้จะมีแต่
> `require-dev` (ไม่มี runtime dependency สักตัว) — **ถูกต้องแล้ว** ไม่ใช่ความ
> ผิดพลาด: `Dockerfile.wordpress` ไม่รัน composer เลย ไฟล์ชุดนี้มีไว้ให้ CI
> ใช้อย่างเดียว (`Dockerfile.web` ก็รองรับเคสนี้ด้วย — `composer install
> --no-dev` บน composer.json ที่ไม่มี runtime dependency แค่ไม่ติดตั้งอะไร
> แล้วจบแบบสำเร็จเฉย ๆ ไม่ต้องมี `|| true` มากลืน error)

- **commit `composer.lock`** — Install stage กับ image ต้อง resolve ชุดเดียวกัน
  ทุกครั้ง ไม่งั้น scan กับที่ deploy คนละ dependency tree
- `Dockerfile.web` รัน `composer install --no-dev` → dev tooling ไม่ติดเข้า
  production image (`Dockerfile.wordpress` ไม่รัน composer เลย — core มากับ
  base image)

> **`phpunit.xml` ที่ให้มาเป็น schema ของ PHPUnit ≥ 10** (ใช้ `<source>` +
> `<logging><junit>`). โปรเจค legacy ที่ `composer.json` ปักเวอร์ชัน PHP เก่า
> (`require.php` หรือ `config.platform.php`) จะถูก composer resolve ไปได้แค่
> PHPUnit 9 ซึ่ง **อ่านไฟล์นี้ไม่ออก** (`<source>` ไม่มีใน schema 9 → coverage
> ไม่ถูก config แล้ว `clover.xml` ว่าง/ไม่ถูกสร้าง → `new_coverage` อ่านเป็น 0%
> แล้ว gate บล็อกโดยไม่มี error ชี้สาเหตุ). เลือกทางใดทางหนึ่ง **ก่อน push แรก**:
> (ก) ปลด/bump ข้อจำกัดให้ composer ลง PHPUnit ≥ 10 ได้ (CI image เป็น PHP 8.3
> อยู่แล้ว) หรือ (ข) แปลง `phpunit.xml` เป็น schema 9 (`<coverage><include>
> <directory>` แทน `<source>`) — ทั้งสองทาง **ผลลัพธ์ต้องคงเดิม**: ได้
> `test-results/junit.xml` + `clover.xml` ครบทั้งคู่

### 5.5 ไฟล์ env ในเครื่อง + `.gitignore`

compose อ่าน `${APP_PORT}` / `${DATABASE_URL}` จากไฟล์ชื่อ `.env` ที่อยู่ข้าง
ไฟล์ compose (auto-load) — ตัวเดียวกับที่สเตจ Deploy สร้างด้วย
`cp $ENV_FILE .env` จาก Secret File credential. ให้ developer รัน compose
ในเครื่องได้โดยไม่ต้องรอ Jenkins สร้าง 2 ไฟล์นี้ **ค่าจริงทั้งคู่ gitignore
ทั้งคู่ ไม่ commit ทั้งคู่**:

| ไฟล์ | ใช้กับ | ต้องมีอย่างน้อย |
| --- | --- | --- |
| `.env` | `docker-compose.yml` (prod shape) | `APP_PORT=__PORT_PROD__` + `DATABASE_URL` (ถ้ามี `[DB]`) + secret ที่แอปใช้จริง |
| `.env.dev` | `docker-compose.dev.yml` | `APP_PORT=__PORT_DEV__` + `DATABASE_URL` ชี้ DB dev คนละตัวกับ prod |

```sh
docker compose up                                            # อ่าน .env เอง
docker compose -f docker-compose.dev.yml --env-file .env.dev up
```

(`docker-compose.dev.yml` ไม่ auto-load ไฟล์ชื่อเดียวกัน — ต้องส่ง
`--env-file` ให้ตรง ๆ)

จุดที่ PHP ต่างจากภาษาอื่นและพลาดกันบ่อย 2 ข้อ:

- **Laravel ใช้ `.env` ไฟล์เดียวกันนี้เป็น config ของตัวแอปด้วย** — ไฟล์ที่
  admin ใส่ใน Secret File credential จึงต้องมีทั้งคีย์ที่ compose ใช้
  (`APP_PORT`) และคีย์ที่ framework ใช้ (`APP_KEY`, `APP_ENV`, `DB_*` ฯลฯ)
  ครบในไฟล์เดียว เพราะสเตจ Deploy ส่งไฟล์นี้ต่อให้ `artisan` ด้วย `--env-file .env`
- **ตัวแปรที่แอปต้องใช้ตอน runtime ต้องประกาศใน `environment:` ของ compose ด้วย**
  — `.env` แค่ป้อนค่าให้ compose interpolate ไม่ได้ถูกส่งเข้า container ทั้งไฟล์
  อัตโนมัติ (WordPress ต้องเติม `WORDPRESS_DB_HOST` / `WORDPRESS_DB_USER` /
  `WORDPRESS_DB_PASSWORD` / `WORDPRESS_DB_NAME` เข้าไปในบล็อก `environment:`
  ทั้ง 2 compose ไม่งั้น container ขึ้นมาแล้วไปหน้า install ใหม่ทุกครั้ง)

ตรวจ `.gitignore` ให้มีครบ: `.env`, `.env.dev` (เผื่อของ PHP ทั่วไปด้วย:
`vendor/`, `coverage/`, `clover.xml`, `test-results/`, `dc-report/`,
`.php-cs-fixer.cache`, `.phpunit.result.cache`, `.phpunit.cache/`) — และให้
commit **`.env.example`** ที่มีแต่ชื่อ key ค่าเปล่า เป็นเอกสารว่าต้องขอค่าอะไร
จาก admin บ้าง (Laravel มี `.env.example` มาให้อยู่แล้ว — เติม `APP_PORT` เข้าไป
ไม่ต้องสร้างใหม่) ถ้า `.gitignore` ใช้ pattern กว้างแบบ `.env*` ต้องเติม
`!.env.example` ไม่งั้น example จะถูกกินไปด้วย

> `.env` ที่มีค่าจริงหลุดขึ้น git คือ **เหตุการณ์ secret รั่ว** ไม่ใช่เรื่อง
> สไตล์โค้ด — ตรวจด้วย `git check-ignore .env .env.dev` (exit 0 = ถูก ignore
> แล้ว) ก่อน commit แรก

### 5.6 รัน toolchain ในเครื่องให้ผ่านก่อน push

**ทำก่อน commit/push เสมอ** — นี่คือขั้นที่กันไม่ให้ pipeline แดงตั้งแต่รอบแรก.
สเตจ Code Quality รัน php-cs-fixer/phpstan กับ **โค้ดเดิมทั้งโปรเจค** ไม่ใช่แค่
ไฟล์ที่ skill นี้เพิ่ม — โปรเจคที่ไม่เคยใช้ php-cs-fixer มาก่อน
`php-cs-fixer fix --dry-run` จะแดงแทบแน่นอนตั้งแต่ stage ที่ 2 (จัดรูปแบบไม่ตรง
PSR-12 ≠ โค้ดผิด แต่ `--dry-run` ไม่แยกให้):

```sh
composer install
find . -path ./vendor -prune -o -name '*.php' -print0 | xargs -0 -n1 php -l   # syntax ก่อนเสมอ
vendor/bin/php-cs-fixer fix       # จัดรูปแบบทั้งโปรเจคหนึ่งครั้ง (ไม่ใส่ --dry-run)
vendor/bin/phpstan analyse
vendor/bin/phpunit
```

- **commit การ reformat เป็น commit แยกของมันเอง** (เช่น
  `style: php-cs-fixer PSR-12 ทั้งโปรเจค (ก่อนเปิด CI)`) — diff จะใหญ่แต่เป็น
  whitespace ล้วน ปนกับ commit setup แล้ว review ไม่ได้เลย
- error ของ `phpstan` **ต้องแก้ให้จบ หรือ baseline ไว้อย่างชัดเจน** ก่อน push
  แรก — baseline ที่รับได้คือ `vendor/bin/phpstan analyse --generate-baseline`
  แล้ว commit `phpstan-baseline.neon` คู่กับ `includes:` ใน `phpstan.neon`
  **พร้อมคอมเมนต์เหตุผล + แผนว่าจะลดลงเมื่อไร** หรือ `ignoreErrors` ที่ระบุ
  **message + path เจาะจง + เหตุผลกำกับ** เช่น
  `# โค้ดเดิมย้ายมาจากระบบ AS400 รอ refactor Q4` — **ห้าม** ปิดยกโปรเจค
  (`excludePaths` ครอบ `app/`/`src/` ทั้งก้อน, `ignoreErrors: ['#.*#']`,
  `@phpstan-ignore-file` โปะทั้งไฟล์โดยไม่มีเหตุผล) เพราะนั่นคือปิดตาเครื่องมือ
  ถาวรเพื่อผ่าน stage เดียว. `phpstan.neon` ที่ให้มาตั้ง `level: 0` ไว้เป็น
  พื้นขั้นต่ำ — ขยับขึ้นได้ตามใจ ลดลงไม่ได้ (ไม่มีต่ำกว่า 0)
- เช่นเดียวกันฝั่ง `.php-cs-fixer.php`: `exclude()` ได้เฉพาะ path เจาะจงพร้อม
  คอมเมนต์เหตุผล — **ห้าม** ถอด `@PSR12` ออกจาก rules หรือ exclude ทั้ง `app/`
- `phpunit` ต้องเขียวในเครื่องก่อน — ถ้า test เดิมของโปรเจคพังอยู่แล้ว บอกผู้ใช้
  ตรง ๆ ว่าต้องแก้หรือ mark `markTestIncomplete()`/`markTestSkipped()` พร้อม
  เหตุผล ไม่ใช่ปล่อยให้ไปแดงบน Jenkins
- ยืนยันว่า `clover.xml` + `test-results/junit.xml` ถูกสร้างจริงหลัง
  `vendor/bin/phpunit --coverage-clover clover.xml` (ไม่มี 2 ไฟล์นี้ = สเตจ
  Unit Tests publish ไม่ได้ และ `new_coverage` อ่านเป็น 0% แล้ว gate บล็อกโดย
  ไม่มี error ชี้สาเหตุ). เครื่อง dev ที่ยังไม่มี **pcov หรือ xdebug** จะได้
  คำเตือน "No code coverage driver available" แล้ว `clover.xml` ไม่เกิด —
  ติดตั้ง pcov ในเครื่อง หรืออย่างน้อยรู้ตัวว่าข้อนี้ต้องไปพิสูจน์ที่ build แรก
  บน Jenkins (CI image มี pcov ให้แล้ว)

### 5.7 ฝั่ง server — ส่งรายการให้ admin

**Render `assets/admin-handoff.template.md` → เขียนลงโปรเจคเป็น
`docs/admin-handoff.md`** โดยแทน `__...__` ทุกตัว (ชื่อโปรเจค, credential ID,
sonar key, Jenkins host, repo URL, วันที่, ชื่อผู้ขอ) และ **ลบหัวข้อของสิ่งที่
โปรเจคนี้ไม่ใช้ทิ้งทั้งหัวข้อ**:

- ไม่ใช่โปรเจคแรกของ server → ลบภาคผนวกท้ายไฟล์ (server-level setup)
- ไม่มี volume และไม่ใช่ WordPress → ตัดบรรทัด `/srv/appdata` ในเช็คลิสต์ออก

บอกผู้ใช้ให้ชัด: "ส่งไฟล์ `docs/admin-handoff.md` ให้ทีม admin ได้เลย
แล้วรอค่าที่ต้องส่งกลับ (`APP_PORT` prod/dev + ยืนยัน job/webhook)" —
สรุปในแชทเพิ่มได้ แต่ไฟล์คือของที่ส่งจริง อย่าให้ admin ไปไล่ก๊อบชื่อจาก
บทสนทนา

### 5.8 ทดสอบ

push `develop` → ดู pipeline รันครบ 10 stages → ไล่ §7

## 6. Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| Install stage build `<project>-ci` จาก `Dockerfile.ci` แล้วทุก stage ใช้ `docker.image('<project>-ci').inside` | ขอ admin ติดตั้ง PHP/composer/Global Tool บน Jenkins |
| `Dockerfile.ci` อยู่ที่ **root** (Jenkinsfile `docker build -f Dockerfile.ci`) | วางไว้ใน `docker/` แล้ว build ไม่เจอ / เอา CI image ไป deploy |
| `composer install` ครั้งเดียวในสเตจ Install แล้วใช้ `vendor/` ต่อข้าม stage | `composer install` ใหม่ทุก stage |
| `waitForQualityGate abortPipeline: true` + timeout | ข้าม gate / ใส่ gate โดยไม่มี `abortPipeline` (แดงแต่ pipeline เขียว = มั่นใจหลอก) |
| Deploy ด้วย `--no-build` (reuse image จากสเตจ Docker Build) | ปล่อย compose build เองตอน deploy (ได้ image คนละตัวกับที่ scan ผ่าน) |
| Secret File `env-<project>` → `cp` เป็น `.env` | แยก string credential ต่อ var / hardcode ใน Jenkinsfile |
| Secret ขยายค่าโดย shell (`"$VAR"`) | Groovy interpolation (`"${VAR}"` รั่วลง log) |
| `dependencyCheckPublisher` นับ CVE | `grep` XML ดิบ (นับ suppressed ด้วย → fail หลอก) |
| Tag image ด้วย `BUILD_NUMBER` | `latest` อย่างเดียว (rollback ไม่ได้) |
| Healthcheck ยิง `127.0.0.1:80` ด้วย `curl -fsS -L` (ลง curl เอง ห้าม purge) | `localhost` / host port / ตัด `-L` (301 = เขียวหลอก) / `php -r file_get_contents` (พังเมื่อ `allow_url_fopen=Off`) |
| Laravel migrate ส่ง `--env-file .env` ทั้งไฟล์ ก่อน `compose up` | `-e DATABASE_URL` ตัวเดียว (`artisan` boot ทั้ง framework ต้องการ `APP_KEY` ด้วย) |
| Volume ใต้ `/srv/appdata/<project>/` (dev = `/srv/appdata/<project>-dev/`) | named volume / bind โค้ดทับ image / เก็บ secret ใน volume |
| `mkdir -p` ถึง `<name>` ที่ compose bind จริง ก่อน `chown -R` | mkdir แค่ระดับ `<project>` (dockerd สร้าง subdir เป็น root:root แล้วแอปเขียนไม่ได้) |
| WordPress: `wp-content` เป็น volume เสมอ + `WP_AUTO_UPDATE_CORE = false` | ปล่อย WP self-update ในคอนเทนเนอร์ (ข้าม pipeline + หายตอน deploy รอบหน้า) |
| `[VOLUME]` + `[WP]` รวมเป็น `volumes:` ก้อนเดียวต่อ service | ปล่อยสอง `volumes:` ใน service เดียว (YAML ทับกันเงียบ ๆ) |
| Laravel/CI4: uncomment `[LARAVEL]` sed ให้ DocumentRoot ชี้ `public/` | ปล่อย DocumentRoot ที่ root แล้วโค้ดทั้งโปรเจคเปิดจากเว็บได้ |
| Laravel: health เป็น route นอก middleware `auth` | copy `api/health/index.php` ทิ้งไว้ (ไม่ถูกเสิร์ฟเมื่อ docroot = `public/`) |
| `php-cs-fixer fix` ทั้งโปรเจค + commit แยก **ก่อน** push แรก | ปล่อยให้ `--dry-run` แดงบน Jenkins แล้วค่อยไล่แก้ทีละรอบ |
| Baseline โค้ดเดิมด้วย `phpstan-baseline.neon` / `ignoreErrors` ระบุ path+เหตุผล | `excludePaths` ยกโฟลเดอร์ / `ignoreErrors: ['#.*#']` / ถอด `@PSR12` |
| `.env` / `.env.dev` อยู่ในเครื่อง gitignored · commit แค่ `.env.example` | commit `.env` ค่าจริง (= secret รั่ว ไม่ใช่ style nit) |
| `.dockerignore` กัน `vendor` `coverage` `dc-report` `test-results` | ปล่อย artifact ของ CI หลุดเข้า build context |
| `/api/health` คืนแค่ `healthy`/`degraded` | ใส่ version/commit/hostname ลง response |
| `sonar.sources`/`sonar.tests` ชี้ path ที่มีอยู่จริง + exclude `wp-admin`/`wp-includes` | ปล่อย path ค้าง (sonar-scanner fail ทันที) / สแกน WordPress core |
| ทุก suppression/CPD exclusion มีเหตุผลกำกับ | suppress ล่วงหน้าโดยยังไม่เจอ finding จริง |
| `pdo_sqlsrv` มาคู่กับ `msodbcsql18` + `unixodbc-dev` (→ references §C) | `pecl install sqlsrv` บรรทัดเดียว (fail ที่ configure หา `sql.h` ไม่เจอ) |

## 7. Verification Checklist

**รัน script ก่อน** (cwd = root ของโปรเจคปลายทาง):

```bash
node <skill-dir>/scripts/verify.mjs
```

ครอบฝั่ง repo ให้ทั้งหมด (placeholder ตกค้าง — ยกเว้น `__DIR__`, ครบ 10 stages +
`emailext` ×4, brace balance หลังลบบล็อก, บล็อก `[LARAVEL]` ตรงกับ framework,
`composer install` ใน `Dockerfile.web` ต้องมี `--no-scripts` (ไม่ใช่ `|| true`)
พร้อม `composer dump-autoload` หลัง `COPY . .`, `/api/health` อยู่ใต้ docroot
ที่เสิร์ฟจริง, `volumes:` ก้อนเดียวต่อ service, `mkdir -p` ↔ bind, composer +
require-dev 3 ตัว, schema `phpunit.xml` ตรงกับเวอร์ชันที่ composer resolve,
path ใน `sonar.sources` มีจริง, compose, tooling, health, ไฟล์ที่ §5.1 copy มาครบ)
— ฝั่ง server ยังต้องให้ admin ยืนยันเอง

> **ทุก check ที่อ่าน Jenkinsfile / Dockerfile / compose อ่านเฉพาะบรรทัดที่ยัง
> ทำงานจริง** (ตัดคอมเมนต์ออกก่อน) — ไฟล์ template พก legend, บล็อก `[LARAVEL]`
> และบล็อก `volumes:` ทั้ง `[VOLUME]`/`[WP]` ไว้เป็นคอมเมนต์ ถ้าอ่านดิบ ๆ ป้าย
> พวกนี้กับชื่อ volume ตัวอย่างจะทำให้ check ผ่านฟรีทั้งที่ยังไม่ได้เปิดใช้จริง

**ไม่ตรวจโดยตั้งใจ (out of scope ของ script — ต้องตรวจเอง):**

- **พฤติกรรมตอนรันจริงของ `/api/health`** — script พิสูจน์แค่ว่าไฟล์/route มีจริง
  **และอยู่ใต้ docroot ของ shape นั้น**; ส่วน "เข้าได้โดยไม่ต้อง login" กับ
  "200 healthy / 503 degraded" ต้องยิงจริงตามหัวข้อ **รันจริง** ท้ายหน้านี้
- **[subpath]** (`APP_URL`/`ASSET_URL` · `app.baseURL` · `WP_HOME`/`WP_SITEURL`)
  — ค่าเหล่านี้อยู่ใน `.env` ที่ gitignore ไว้ ตรวจแทนไม่ได้ ต้องเปิดผ่าน URL
  เต็มหลัง proxy เอง
- **§5.6 toolchain ในเครื่อง** (`php -l` / `php-cs-fixer` / `phpstan` /
  `phpunit`) — ต้องมี `vendor/` จริงถึงจะรู้ผล script ไม่รันแทนให้
- **[WP] โค้ดใน `wp-content` ขึ้น container ทางไหน** (§5.3 ข้อ 1 หรือ 2) — เป็น
  มติที่ต้องคุยกับผู้ใช้ ไม่ใช่สิ่งที่อ่านจากไฟล์ได้ · script ตรวจแค่ว่า
  `wp-content` เป็น volume จริงและ `wp-config.php` ปิด auto-update แล้ว
- **ค่าใน `.env` / `.env.dev`** — เช็คแค่ว่ามีไฟล์และมี `APP_PORT` (เตือน ไม่
  fail เพราะ clone ใหม่ยังไม่มีทั้งคู่ตามปกติ) · **ไม่อ่านค่า secret ใด ๆ** ·
  คีย์ที่ framework ต้องใช้ (`APP_KEY`, `WORDPRESS_DB_*`) เป็นของ admin
- **ฝั่ง server ทั้งหมด** (Jenkins tools/credentials/global env, docker group,
  SonarQube projects + gate, webhook, `proxy-network` บน host) — อยู่นอก repo

**ไฟล์ในโปรเจค:**

- [ ] `Jenkinsfile` ครบ 10 stages + post (emailext ×4 + `cleanWs`) — ไม่มี
      `__*__` ค้าง
- [ ] บล็อก `[DB]` / `[VOLUME]` / `[WP]` / `[LARAVEL]` คงหรือถูกลบตรงตามคำตอบ
      interview — และ Groovy ยัง parse ผ่านหลังลบ (brace ครบ) · **`[WEB]` คงไว้
      เสมอ** (PHP มี shape เดียว — §2.8; ป้ายนี้มีไว้บอกว่าก้อนไหนคือ health
      poll ไม่ใช่ให้เลือกลบ)
- [ ] `Dockerfile` มาจาก shape ที่ถูก (`Dockerfile.web` สำหรับ laravel/
      codeigniter/legacy · `Dockerfile.wordpress` สำหรับ wordpress) ·
      `Dockerfile.ci` อยู่ที่ **root** ด้วยอีกไฟล์
- [ ] Laravel/CI4: บล็อก `[LARAVEL]` (sed DocumentRoot → `public/`) ถูก
      uncomment แล้ว · shape อื่น: ถูกลบทิ้งแล้ว
- [ ] [subpath] เปิดแอป**ผ่าน URL เต็มหลัง reverse proxy** ได้จริง (ตั้ง
      `APP_URL`/`ASSET_URL` · `app.baseURL` · `WP_HOME`/`WP_SITEURL` ตาม §5.3
      แล้ว) — ทดสอบแค่ `localhost:port` ผ่านเสมอแม้ config ผิด
- [ ] health endpoint: `/api/health` เข้าถึงได้จริงตาม docroot ของ shape นั้น
      (Laravel = route ใน `routes/web.php` นอก middleware `auth` · CI4 =
      `public/api/health/index.php` · CI3/legacy/WordPress =
      `api/health/index.php`) · ไม่ต้อง login · 200 healthy / 503 degraded ·
      ไม่มี version/commit ใน response
- [ ] `sonar-project.properties`: `sonar.projectKey`/`projectName` แทนค่าแล้ว ·
      **ทุก path ใน `sonar.sources`/`sonar.tests` มีอยู่จริงในโปรเจค** ·
      `sonar.php.coverage.reportPaths=clover.xml`
- [ ] `owasp-suppressions.xml` (skeleton ว่าง) อยู่ที่ root
- [ ] compose ทั้ง 2 ไฟล์: `pull_policy: never` · `APP_PORT` override ได้ ·
      healthcheck ยิง `127.0.0.1:80` · volume (ถ้ามี) อยู่ใต้ `/srv/appdata/` ·
      มี `volumes:` **ก้อนเดียว** ต่อ service
- [ ] shape = wordpress: `wp-content` อยู่ใน `volumes:` ทั้ง 2 ไฟล์ ·
      `wp-config.php` มี `define('WP_AUTO_UPDATE_CORE', false);` ·
      `__ENTRY_FILE__` = `api/health/index.php` (**ไม่ใช่** `index.php` ที่ไม่มี
      ใน repo) · มี `composer.json` + `require-dev` ครบ 3 ตัวเหมือน shape อื่น ·
      บอกผู้ใช้แล้วว่าโค้ดใน `wp-content` ขึ้น container ทางไหน (§5.3 ข้อ 1 หรือ 2)
- [ ] มี volume → ทุก `<name>` ที่ compose bind **ปรากฏในบรรทัด `for p in` ของ
      บล็อก `[VOLUME]`** ในสเตจ Deploy ด้วย (ไม่ใช่แค่ระดับ `<project>`)
- [ ] `.env` + `.env.dev` มีในเครื่อง ตั้ง `APP_PORT` แล้ว และถูก gitignore จริง
      (`git check-ignore .env .env.dev` → exit 0) · `.env.example` commit แล้ว
      และ **ไม่** ถูก ignore
- [ ] `php -l` ทุกไฟล์ · `vendor/bin/php-cs-fixer fix --dry-run` ·
      `vendor/bin/phpstan analyse` · `vendor/bin/phpunit` ผ่านครบในเครื่องก่อน
      push แรก (§5.6) — baseline ที่มีระบุ path+เหตุผล ไม่ใช่ปิดยกโปรเจค
- [ ] `phpunit.xml` ตรงกับเวอร์ชัน PHPUnit ที่ composer resolve จริง (schema ≥10
      ตาม asset หรือแปลงเป็น 9 แล้ว) และออก `test-results/junit.xml` +
      `clover.xml` ครบทั้งคู่
- [ ] `composer.json` + `composer.lock` อยู่ที่ root และ commit แล้ว ·
      dev tooling ทั้ง 3 ตัวอยู่ใน `require-dev` (ไม่ใช่ `require`)
- [ ] `tests/` มีอย่างน้อย 1 ไฟล์ `*Test.php` และ `tests/SmokeTest.php` ชี้
      `__ENTRY_FILE__` ที่มีอยู่จริง (`vendor/bin/phpunit` ผ่านในเครื่อง)
- [ ] `.dockerignore` มี `vendor`, `coverage`, `dc-report`, `test-results`
- [ ] `.claude/rules/ugt-php-ci.md` อยู่ในที่ของมัน **และไม่มี `__PROJECT_NAME__`
      ค้าง** (ชื่อ CI image 2 จุดในไฟล์นั้นต้องถูกแทนค่าแล้ว)
- [ ] `docs/admin-handoff.md` ถูก render แล้ว (ไม่มี `__*__` ค้าง, หัวข้อที่ไม่
      ใช้ถูกลบ)

**ฝั่ง server (admin ยืนยัน) — `docs/admin-handoff.md` ที่ส่งไปครอบรายการนี้
ด้วยชื่อจริงของโปรเจคแล้ว:**

- [ ] Jenkins tool ชื่อตรงเป๊ะ: `SonarQube-Scanner`, `Dependency-Check` ·
      SonarQube server entry ชื่อ `SonarQube` — **ไม่ต้องขอ Global Tool ของ
      PHP/composer/NodeJS** (มติ M8: toolchain รันใน docker ทั้งหมด)
- [ ] **Jenkins user อยู่ใน `docker` group** (มติ M8 — ไม่มีข้อนี้ทุก stage พัง
      ตั้งแต่ Install ที่ `docker build -f Dockerfile.ci`)
- [ ] Credentials ครบ: `nvd`, `env-<project>`, `env-<project>-dev`
- [ ] Global env vars: `NOTIFY_EMAIL`, `SMTP_FROM`
- [ ] webhook ทั้งคู่: GitHub → Jenkins (`/github-webhook/`) และ
      SonarQube → Jenkins (`/sonarqube-webhook/`)
- [ ] SonarQube projects prod+dev สร้างแล้ว + assign Quality Gate ตาม §2.4
      ให้ทั้งสอง
- [ ] ปิด Lightweight checkout ใน job config
- [ ] `/srv/appdata` มีอยู่และ Jenkins user เขียนได้ (ครั้งเดียวต่อ server) —
      บังคับสำหรับ WordPress ทุกโปรเจค (wp-content) และทุกโปรเจคที่ตอบข้อ 6
- [ ] network `proxy-network` มีอยู่บน host (`external: true` ในทั้ง 2 compose)
- [ ] ได้ `APP_PORT` prod/dev ตัวจริงกลับมาแล้ว (ไม่ใช่ค่า placeholder)

**รันจริง:**

- [ ] push `develop` → pipeline เขียวครบ 10 stages · coverage report + DC report
      ขึ้นบนหน้า build
- [ ] container `healthy` ภายใน 4 นาที · เข้าแอปผ่าน reverse proxy ได้
- [ ] shape = wordpress: อัปโหลดไฟล์/ติดตั้ง plugin 1 ตัว → deploy ซ้ำ → ของยัง
      อยู่ (พิสูจน์ว่า `wp-content` bind mount ทำงานจริง)
- [ ] อีเมลผลลัพธ์ถึง `NOTIFY_EMAIL`
- [ ] พิสูจน์ว่า gate บล็อกจริง: ใส่ violation เข้าไป 1 จุด → pipeline ต้อง abort
      ที่สเตจ Quality Gate

## 8. หลังจากนี้ (optional)

ถ้า interview ข้อ 8 ตอบ **ใช่** และ pipeline เขียวแล้ว → เปิด session ใหม่ทำ
characterization test ให้โค้ดเดิมตาม `references/legacy-test-generation.md`
(ไล่ทีละ class จากใบไปหาราก, ทีมต้อง review ทุกไฟล์ก่อน commit เพราะ test
ชุดนี้ล็อกพฤติกรรมปัจจุบันรวม bug ที่มีอยู่, และไม่ใช่เงื่อนไขของ Quality Gate
เพราะ gate นับเฉพาะโค้ดใหม่)
