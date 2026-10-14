---
name: ugt-php-cicd-setup
description: >
  Use when a PHP project needs the org-standard delivery pipeline —
  "ทำ CI/CD ให้โปรเจค php", "deploy laravel/wordpress ด้วย docker",
  "ตั้ง jenkins ให้ php" — producing the 10-stage Jenkinsfile (toolchain in a
  CI docker image), sonar-project.properties, Dockerfile (web/wordpress),
  both compose files, minimal php-cs-fixer/phpstan/PHPUnit tooling + smoke test
  so the Quality Gate can pass, /api/health per shape, volume bind mounts under
  /home/docker02/appdata, and the admin handoff. Covers Laravel, CodeIgniter, plain PHP
  legacy and WordPress. Not for Next.js (→ ugt-nextjs-cicd-setup) or Python
  (→ ugt-python-cicd-setup).
---

# UGT PHP CI/CD Setup

## 1. Overview

ติดตั้ง CI/CD มาตรฐานองค์กรลงในโปรเจค PHP ที่มีอยู่แล้ว:
**10-stage Jenkins declarative pipeline + SonarQube Quality Gate (blocking) +
OWASP Dependency Check + two-image Docker build/deploy** — โครงเดียวกับที่
Next.js ใช้อยู่จริงใน production ต่างกันแค่คำสั่งข้างใน stage

> ### ⚠️ สถานะ pilot ราย shape
>
> มติ M2: ต้องผ่านโปรเจคจริงก่อน tag
>
> | Shape | สถานะ |
> | --- | --- |
> | PHP legacy (ไม่มี framework) | **ผ่าน pilot** — `ugt-mscpl-ana` (2026-08) · `ugt-bd-forecast` (2026-09-03) deploy ขึ้น server จริง |
> | Laravel | ยังไม่ผ่าน pilot |
> | CodeIgniter (CI3 / CI4) | ยังไม่ผ่าน pilot |
> | WordPress | ยังไม่ผ่าน pilot |
>
> shape ที่ยังไม่ผ่าน: ค่าคงที่เฉพาะ shape นั้น (คำสั่ง toolchain, DocumentRoot
> sed, health route) ถูกไล่ตรวจด้วยเหตุผลแล้วแต่**ยังไม่ถูกพิสูจน์ด้วย build
> จริง** — โปรเจคแรกของแต่ละ shape ต้องเผื่อเวลาไล่แก้รอบ pipeline
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
| `references/org-standards.md` | contract ร่วมเต็ม (stages, CI image, gate, credentials, secret, health, persistent data) — สรุปอยู่ §2 |
| `references/shapes.md` | ปรับตาม shape เต็ม: Laravel (route health, DB env) · CodeIgniter · legacy (PHPUnit 9) · WordPress (โค้ดขึ้น container ทางไหน, composer) — ตารางสรุปอยู่ §5.3 |
| `references/docker-deploy.md` | ภาพรวม deploy: branch → target, `[WEB]` shape เดียว, host cron + ตารางชี้ไฟล์เชิงลึกด้านล่าง |
| `references/wordpress-deploy.md` · `sqlserver.md` · `healthcheck.md` · `build-gotchas.md` · `compose.md` · `subpath.md` · `volumes.md` | เชิงลึกทีละหัวข้อ: WordPress wp-content + core upgrade · `pdo_sqlsrv` + `msodbcsql18` + DNS · healthcheck บน apache image · `.dockerignore` / `config:cache` · compose conventions + `no-new-privileges` · subpath · volume ownership (`www-data`) + DooD |
| `references/verification.md` | เช็คลิสต์ตรวจเต็มหลัง setup (repo · server · รันจริง) — สรุปอยู่ §7 |
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
- **Toolchain ใน docker (มติ M8)** — Install `docker build -f Dockerfile.ci -t <project>-ci .`
  แล้วทุก stage ที่ใช้ PHP เปิด `docker.image('<project>-ci').inside` (CI image เติม unzip +
  pcov + composer — **ห้ามเอาไป deploy**) · server ต้องมีปลั๊กอิน `docker-workflow` +
  Jenkins user อยู่ใน `docker` group — org-standards §2
- **Branch** — `main` = prod · `develop` = dev (ต่อท้าย `-dev` + คนละไฟล์ compose) — org-standards §3
- **Quality Gate (New Code)** — `new_violations` = 0 · `new_duplicated_lines_density` ≤ 3% ·
  `new_coverage` ≥ 60% · `new_security_hotspots_reviewed` = 100% · OWASP **fail** at
  CRITICAL ≥ 1 · **unstable** at HIGH ≥ 1 · ห้ามลดค่า gate — org-standards §4
- **Credentials** — `nvd` · `env-<project>` (prod `.env`) · `env-<project>-dev` — org-standards §5
- **Secrets** — ใน `sh` ขยายค่าด้วย shell (`"$VAR"`) ห้าม Groovy interpolation (`"${VAR}"`) — org-standards §6
- **Build & deploy** — tag `BUILD_NUMBER` คู่ `latest` · migrate ก่อน deploy · `--no-build` — org-standards §7
- **Health** — `/api/health` ไม่ต้อง login · 200 `healthy` / 503 `degraded` · ไม่มี
  version/commit · healthcheck `curl -fsS -L http://127.0.0.1:80/api/health` (curl มากับ
  image — ห้าม purge · **ห้ามตัด `-L`** · ห้าม `php -r file_get_contents`) · PHP มี shape
  เดียว `[WEB]` ไม่มี shape ที่ยกเว้น health — org-standards §8
- **Persistent data** — bind mount ใต้ `/home/docker02/appdata/<project>/<name>` (dev =
  `/home/docker02/appdata/<project>-dev/<name>`) เท่านั้น · WordPress `wp-content` เป็น volume
  **บังคับ** · chown ให้ UID ของ `www-data` (`id -u www-data` ไม่ใช่ `id -u` เปล่า) · บรรทัด
  `for p in` ของบล็อก `[VOLUME]` ต้องมีทุก `<name>` — org-standards §9
- **CI env** — `CI=true` อย่างเดียว ไม่มีกติกา build-arg แบบ Next.js — org-standards §10

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

## 4. Interview — ถามชุดเดียว (9 ข้อ)

1. **ชื่อโปรเจค** (kebab-case) → กลายเป็นชื่อ image/container/credential/sonar
   key + display name
2. **Host ports** — prod / dev (เช่น 8081 / 8082 — เลี่ยง 8080 ที่ชนกับ Jenkins บน host) — ถ้ายังไม่ได้จัดสรรจาก admin
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
   **Jenkins host** (`__JENKINS_HOST__`) · repo URL = `git remote get-url origin` (`__REPO_URL__` — ถามเฉพาะเมื่อไม่มี remote)
8. **(optional) สร้าง test ครอบคลุมโค้ดเดิมไหม** — **default: ไม่**
   (สร้างแค่ `tests/SmokeTest.php` พอให้สเตจ Unit Tests รันผ่านจริงโดยไม่แตะ
   โค้ดเดิม) ถ้าตอบใช่ → **ทำใน session แยกหลัง pipeline เขียวแล้ว** ตาม
   `references/legacy-test-generation.md` อย่าทำปนใน session นี้
9. **Job ตามรอบ + ชื่อ DB** — มีงานที่ต้องรันตามเวลาไหม (ชื่อ · ทำอะไร · ทุกเมื่อ)
   → แถวในตาราง cron `[CRON]` ของ admin handoff (WordPress มีแถว `wp-cron.php` เสมอ) · ไม่มี = ลบตาราง ·
   และ (ถ้ามี DB) ชื่อ database + login ของ prod/dev → `__DB_NAME_*__` / `__DB_LOGIN_*__`
   — ไม่รู้ให้เสนอ `<ชื่อระบบ>` / `<ชื่อระบบ>_Dev` และ `<project>_app` / `<project>_dev`

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
| — (ไม่ copy ไฟล์) | `routes/api.php`: `Route::get('/health', ...)` (เสิร์ฟที่ `/api/health` ผ่าน `apiPrefix` ดีฟอลต์) | shape = laravel — โค้ดอยู่ในคอมเมนต์บรรทัดสุดท้ายของ `assets/health/index.php` (ดู §5.3 · `references/shapes.md` §Laravel) · **ห้ามอยู่ใน `routes/web.php`** เพราะ middleware group `web` รัน `StartSession` — ถ้า `SESSION_DRIVER=database` แล้วยังไม่มีตาราง `sessions` (โปรเจคที่ยังไม่ migrate) endpoint จะ 500 แทนที่จะ healthy/degraded |
| `assets/tooling/phpstan.neon` | `phpstan.neon` (root) | เสมอ |
| `assets/tooling/.php-cs-fixer.php` | `.php-cs-fixer.php` (root) | เสมอ |
| `assets/tooling/phpunit.xml` | `phpunit.xml` (root) | เสมอ |
| `assets/tooling/SmokeTest.php` | `tests/SmokeTest.php` | **เสมอ** — โปรเจคที่มี test อยู่แล้วก็ใส่ (ไฟล์แยก ไม่ชนของเดิม) · มีไฟล์ชื่อนี้อยู่แล้ว = ไม่ทับ ให้เติม test เข้าไปในไฟล์เดิมแทน |
| `assets/tooling/composer-require-dev.md` | **ไม่ copy** — เป็นคำสั่งให้รัน (§5.4) | เสมอ (ทุก shape รวม WordPress) |
| `assets/env.example` | `.env.example` (root — key อย่างเดียว ไม่มีค่า, commit ได้; `verify.mjs` เช็คว่ามีไฟล์นี้) | **เสมอ** — ลบ/คงบรรทัด `[DB]`/`[LARAVEL]`/`[WP]`/`[SUBPATH]` ตามคำตอบ interview · **Laravel มี `.env.example` มาให้อยู่แล้ว → ไม่ทับ ให้เติม `APP_PORT` (+ `DATABASE_URL` ถ้าใช้) เข้าไปในไฟล์เดิม** |
| `assets/rules/ugt-php-ci.md` | `.claude/rules/ugt-php-ci.md` | เสมอ (overwrite ทั้งไฟล์ได้ตอน plugin update) — **ไฟล์นี้มี `__PROJECT_NAME__` อยู่ 2 จุด** (ชื่อ CI image) ต้องแทนค่าเหมือนไฟล์อื่น ไม่ใช่ copy ดิบ ๆ |

นอกจากตารางนี้ ต้อง **สร้าง `.dockerignore`** ที่ root ถ้ายังไม่มี (หรือเติม
บรรทัดที่ขาด) อย่างน้อย 7 บรรทัด:

```
vendor
coverage
dc-report
test-results
.env
.env.*
!.env.example
```

`vendor` กัน `vendor/` เวอร์ชัน CI (มี dev deps) หลุดเข้า build context ของ `COPY . .` ·
`.env`/`.env.*`/`!.env.example` กัน `.env` ค่าจริงไม่ให้ถูกฝังลง image layer ถาวร ·
**โปรเจค CI3/legacy ที่เก็บ DB credential ในไฟล์ config เอง ไม่ใช่ `.env`** (เช่น
`application/config/database.php`) ต้องเพิ่มชื่อไฟล์นั้นเข้า `.dockerignore` เอง — plugin
เดาชื่อไฟล์ของ legacy app ไม่ได้. เหตุผลเต็ม → `references/build-gotchas.md`

> **`/api/health` ไม่ใช่ของเลือกได้ — กติกาทั้งหมดอยู่ที่ `references/org-standards.md` §8**
> (โปรเจคที่มี endpoint นี้อยู่แล้ว → ไม่ copy ทับ แค่ตรวจให้ตรงข้อนั้น)

### 5.2 แทน placeholder (นี่คือรายการครบ)

| Placeholder | ความหมาย | อยู่ในไฟล์ | ตัวอย่าง |
| --- | --- | --- | --- |
| `__PROJECT_NAME__` | kebab-case id — image/container/sonar key/credential suffix + tag ของ CI image (`<project>-ci`) | `Jenkinsfile`, `sonar-project.properties`, `docker-compose.yml`, `docker-compose.dev.yml`, **`rules/ugt-php-ci.md`** (ชื่อ CI image 2 จุด — ไฟล์นี้ถูก copy ทุกโปรเจค ลืมแทนแล้ว rule จะบอกชื่อ image ผิดให้ session ถัดไป), `admin-handoff.template.md`, `tooling/composer-require-dev.md` (เคสที่ต้อง `composer init` — legacy/WordPress) | `hr-portal` |
| `__PROJECT_DISPLAY_NAME__` | ชื่อที่คนอ่าน (sonar `projectName`, หัวเอกสาร handoff) | `Jenkinsfile`, `sonar-project.properties`, `admin-handoff.template.md` | `HR Portal` |
| `__PORT_PROD__` | host port ของ prod (container-internal คงที่ 80 เสมอ — apache) | `docker-compose.yml`, `env.example` (คอมเมนต์บรรทัด `APP_PORT`) | `8081` |
| `__PORT_DEV__` | host port ของ dev (**ต้องคนละตัวกับ prod** — prod/dev อยู่บน host เดียวกันได้) | `docker-compose.dev.yml`, `env.example` (คอมเมนต์บรรทัด `APP_PORT`) | `8082` |
| `__ENTRY_FILE__` | path ของ entry point **เทียบจาก root โปรเจค** — ใช้เป็น smoke check ในสเตจ Unit Tests | `tooling/SmokeTest.php` (เสมอ — ไฟล์นี้ copy ทุกโปรเจค) | `public/index.php` |

`__ENTRY_FILE__` ต่อ shape:

```
Laravel      public/index.php
CodeIgniter  public/index.php   (CI4)   ·   index.php   (CI3)
legacy       index.php          (หรือ public/index.php ถ้าใช้ public/ เป็น webroot)
WordPress    api/health/index.php   (ไม่ใช่ index.php — repo ของ WP ไม่ได้ commit core · references/shapes.md §WordPress)
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
| `__JOB_NAME__` / `__JOB_WHEN__` / `__CRON_SCHEDULE__` / `__JOB_CMD__` | ต่อ job หนึ่งแถวในตาราง cron: ชื่อ job · รอบเวลาภาษาคน ("ทุกวัน 02:00") · cron 5 ช่อง (`0 2 * * *`) · คำสั่ง — `docker exec -u www-data <project> php artisan <command>` · legacy `docker exec -u www-data <project> php jobs/<name>.php` · WordPress `docker exec -u www-data <project> php /var/www/html/wp-cron.php` (ทุก 10 นาที) (`references/docker-deploy.md`) |

> **`__DIR__` ไม่ใช่ placeholder** — เป็น magic constant ของภาษา PHP ที่โผล่ใน
> `tooling/.php-cs-fixer.php` และ `tooling/SmokeTest.php` **ห้ามแทนค่า** (แทน
> แล้วไฟล์ทั้งสองพังทันที). ตอนไล่หา `__*__` ที่ตกค้างให้ยกเว้นตัวนี้ตัวเดียว

ชื่อที่ derive อัตโนมัติจาก `__PROJECT_NAME__`: image/container ของ dev =
`<project>-dev` · CI image = `<project>-ci` · credentials = `env-<project>`,
`env-<project>-dev` · sonar keys = `<project>`, `<project>-dev`

### 5.3 Adjust ตามคำตอบ interview

**ต่อ shape** (รายละเอียดเต็ม + โค้ด route ของ Laravel + โมเดลโค้ด WordPress → **`references/shapes.md`**):

| Shape | Dockerfile | บล็อก `[LARAVEL]` (DocumentRoot → `public/`) | `/api/health` | อื่น ๆ |
| --- | --- | --- | --- | --- |
| laravel | `Dockerfile.web` | **uncomment** | route ใน **`routes/api.php`** (ไม่ใช่ `routes/web.php` — `StartSession` ทำ 500 ตอนยังไม่ migrate) · ไม่ copy `health/index.php` | DB env ใช้บรรทัด `[DB][LARAVEL]` แทน `DATABASE_URL:` |
| codeigniter | `Dockerfile.web` | CI4 uncomment · CI3 **ลบ** | CI4 `public/api/health/index.php` · CI3 `api/health/index.php` | — |
| legacy | `Dockerfile.web` | **ลบ** (เว้นแต่ใช้ `public/` เป็น webroot จริง) | `api/health/index.php` | PHPUnit 9 ถ้า `composer.json` ปัก PHP เก่า |
| wordpress | `Dockerfile.wordpress` | — | `api/health/index.php` **เป๊ะ ๆ** (Dockerfile hardcode `COPY`) | บล็อก `[WP]` ห้ามลบ · `WP_AUTO_UPDATE_CORE = false` · `compose up` เติม `--force-recreate --renew-anon-volumes` · **บอกผู้ใช้ว่าโค้ดใน `wp-content` ขึ้น container ทางไหน** |

**ข้อที่ไม่ขึ้นกับ shape:**

- **ไม่มี DB (ข้อ 5 = ไม่มี)** → ลบทุกบล็อกที่ติดป้าย `[DB]`: บล็อก migrate ใน
  สเตจ Deploy ของ `Jenkinsfile`, บรรทัด `DATABASE_URL:` ใน compose **ทั้ง 2
  ไฟล์**, ตัวเลือก extension `[DB]` ใน `Dockerfile.web` และคอมเมนต์ `[DB]` ใน
  ไฟล์ health (ตัว health ยัง return `healthy` ถูกต้องเพราะ `$ok = true` อยู่แล้ว)
- **Laravel (ข้อ 5 = artisan migrate)** → คงบล็อก `[DB]` (`php artisan migrate --force` ผ่าน
  `--env-file .env` ทั้งไฟล์ — **ไม่ใช่** `-e DATABASE_URL` ตัวเดียว) + ใช้บรรทัด `[DB][LARAVEL]` ใน compose
  ทั้ง 2 ไฟล์แทน `DATABASE_URL:` (เหตุผล → `references/shapes.md` §Laravel)
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
  ชื่อจริง — path ต้องอยู่ใต้ `/home/docker02/appdata/<project>/` (dev ใช้
  `/home/docker02/appdata/<project>-dev/`) เท่านั้น **แล้วแทนชื่อตัวอย่างในบรรทัด
  `for p in` ของบล็อก `[VOLUME]` ในสเตจ Deploy ด้วยชื่อจริงทุกตัว** — งานนี้ลืมไม่ได้:

  ```sh
  for p in /home/docker02/appdata/${containerName}/uploads /home/docker02/appdata/${containerName}/storage; do
  ```

  `<name>` ที่ไม่อยู่ในบรรทัดนี้ถูก dockerd สร้างเป็น `root:root` ตอน `up -d` แล้ว
  `www-data` เขียนไม่ได้ทั้งที่ container `healthy` — กลไก chown ตาม `references/org-standards.md` §9 / `references/volumes.md`
- **มีทั้ง `[VOLUME]` และ `[WP]` (WordPress ที่มี volume อื่นนอกจาก wp-content)** → compose มี
  **สอง** บล็อกคอมเมนต์ `volumes:` แต่ YAML ยอม key `volumes:` **แค่อันเดียวต่อ service**
  (สองก้อน = parse ไม่ผ่าน หรือก้อนหลังทับก้อนแรกเงียบ ๆ ขึ้นกับ parser) — ต้อง **merge
  ทั้งหมดเข้า `volumes:` ก้อนเดียว** และ `wp-content` ต้องอยู่ในรายการที่ merge แล้วเสมอ:

  ```yaml
  volumes:
    - /home/docker02/appdata/hr-portal/wp-content:/var/www/html/wp-content
    - /home/docker02/appdata/hr-portal/uploads:/var/www/html/uploads
  ```

- **อยู่หลัง reverse-proxy subpath (ข้อ 3 = ใช่)** → คำตอบนี้ต้องกลายเป็นค่า
  env ฝั่งแอปจริง ๆ ในขั้นนี้ ไม่ใช่แค่จดไว้: เพิ่มลง `.env`/`.env.dev` (§5.5) ให้ตรง shape
  (Laravel `APP_URL`/`ASSET_URL` · CI4 `app.baseURL` · WordPress `WP_HOME`/`WP_SITEURL` ·
  CI3/legacy `base_url` หรือสูตร inline redirect สำหรับ asset relative) → **`references/subpath.md`**
  · เช็คของจริงด้วยการเปิด**ผ่าน URL เต็มหลัง proxy** ไม่ใช่ `localhost:port`
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

> **[WP] WordPress ไม่ข้ามขั้นนี้** — `composer init` + `require --dev` ทั้ง 3 ตัวเหมือน legacy
> (`composer.json` ที่มีแต่ `require-dev` ถูกต้องแล้ว — `references/shapes.md` §WordPress)

- **commit `composer.lock`** — Install stage กับ image ต้อง resolve ชุดเดียวกัน
  ทุกครั้ง ไม่งั้น scan กับที่ deploy คนละ dependency tree
- `Dockerfile.web` รัน `composer install --no-dev` → dev tooling ไม่ติดเข้า
  production image (`Dockerfile.wordpress` ไม่รัน composer เลย — core มากับ
  base image)

> **`phpunit.xml` ที่ให้มาเป็น schema ของ PHPUnit ≥ 10** — โปรเจคที่ composer resolve ได้แค่
> PHPUnit 9 (ปัก PHP เก่า) ต้องแก้ **ก่อน push แรก** ไม่งั้น `clover.xml` ไม่เกิดแล้ว gate อ่าน
> coverage 0% → สองทางแก้ใน `references/shapes.md` §legacy

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
จาก admin บ้าง — copy มาจาก `assets/env.example` ตาม §5.1 (Laravel มี
`.env.example` มาให้อยู่แล้ว — เติม `APP_PORT` เข้าไปในไฟล์เดิม ไม่ต้องสร้างใหม่) ถ้า `.gitignore` ใช้ pattern กว้างแบบ `.env*` ต้องเติม
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

- **ขอบเขตของขั้นนี้คือทำให้ toolchain รันผ่านบนโค้ดเดิม ไม่ใช่ปรับปรุงโค้ดเดิม** —
  แก้เฉพาะ format (`php-cs-fixer fix`) ที่เหลือ baseline ตามข้อถัดไปแล้ว
  รายงานเป็น follow-up ในสรุป ไม่ไล่แก้ logic ของโปรเจคในรอบ setup
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
`docs/admin-handoff.md`** ตาม RENDER RULES ที่หัวไฟล์: แทน `__...__` ทุกตัว ·
ลบแถว/หัวข้อที่ติดป้าย `[TAG]` ที่โปรเจคไม่มี (ไม่มี DB → ไม่มีตาราง A · ไม่มี
volume → ไม่มีตาราง B · ไม่มี job ตามรอบ → ไม่มีตาราง G cron (WordPress มีเสมอ — แถว `wp-cron.php`) · ไม่ใช่โปรเจคแรกของ
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
| Install stage build `<project>-ci` จาก `Dockerfile.ci` แล้วทุก stage ใช้ `docker.image('<project>-ci').inside` | ขอ admin ติดตั้ง PHP/composer/Global Tool บน Jenkins |
| `Dockerfile.ci` อยู่ที่ **root** (Jenkinsfile `docker build -f Dockerfile.ci`) | วางไว้ใน `docker/` แล้ว build ไม่เจอ / เอา CI image ไป deploy |
| `composer install` ครั้งเดียวในสเตจ Install แล้วใช้ `vendor/` ต่อข้าม stage | `composer install` ใหม่ทุก stage |
| `waitForQualityGate abortPipeline: true` + timeout | ข้าม gate / ใส่ gate โดยไม่มี `abortPipeline` (แดงแต่ pipeline เขียว = มั่นใจหลอก) |
| `dependencyCheckPublisher` นับ CVE | `grep` XML ดิบ (นับ suppressed ด้วย → fail หลอก) |
| Healthcheck ยิง `127.0.0.1:80` ด้วย `curl -fsS -L` (curl มากับ image แล้ว — ห้าม purge) | `localhost` / host port / ตัด `-L` (301 = เขียวหลอก) / `php -r file_get_contents` (พังเมื่อ `allow_url_fopen=Off`) / `wget` (ไม่มีใน image) |
| Laravel migrate ส่ง `--env-file .env` ทั้งไฟล์ ก่อน `compose up` | `-e DATABASE_URL` ตัวเดียว (`artisan` boot ทั้ง framework ต้องการ `APP_KEY` ด้วย) |
| `mkdir -p` ถึง `<name>` ที่ compose bind จริง ก่อน `chown -R` | mkdir แค่ระดับ `<project>` (dockerd สร้าง subdir เป็น root:root แล้วแอปเขียนไม่ได้) |
| WordPress: `wp-content` เป็น volume เสมอ + `WP_AUTO_UPDATE_CORE = false` | ปล่อย WP self-update ในคอนเทนเนอร์ (ข้าม pipeline + หายตอน deploy รอบหน้า) |
| `[VOLUME]` + `[WP]` รวมเป็น `volumes:` ก้อนเดียวต่อ service | ปล่อยสอง `volumes:` ใน service เดียว (YAML ทับกันเงียบ ๆ) |
| Laravel/CI4: uncomment `[LARAVEL]` sed ให้ DocumentRoot ชี้ `public/` | ปล่อย DocumentRoot ที่ root แล้วโค้ดทั้งโปรเจคเปิดจากเว็บได้ |
| Laravel: health เป็น route นอก middleware `auth` | copy `api/health/index.php` ทิ้งไว้ (ไม่ถูกเสิร์ฟเมื่อ docroot = `public/`) |
| `php-cs-fixer fix` ทั้งโปรเจค + commit แยก **ก่อน** push แรก | ปล่อยให้ `--dry-run` แดงบน Jenkins แล้วค่อยไล่แก้ทีละรอบ |
| Baseline โค้ดเดิมด้วย `phpstan-baseline.neon` / `ignoreErrors` ระบุ path+เหตุผล | `excludePaths` ยกโฟลเดอร์ / `ignoreErrors: ['#.*#']` / ถอด `@PSR12` |
| `.env` / `.env.dev` อยู่ในเครื่อง gitignored · commit แค่ `.env.example` | commit `.env` ค่าจริง (= secret รั่ว ไม่ใช่ style nit) |
| `.dockerignore` กัน `vendor` `coverage` `dc-report` `test-results` `.env`/`.env.*` | ปล่อย artifact ของ CI หรือ secret จริงหลุดเข้า build context |
| `pdo_sqlsrv` มาคู่กับ `msodbcsql18` + `unixodbc-dev` (→ `references/sqlserver.md`) | `pecl install sqlsrv` บรรทัดเดียว (fail ที่ configure หา `sql.h` ไม่เจอ) |

## 7. Verification Checklist

**ไม่มี shell = เขียนว่า "ยังไม่ได้รัน"** + คำสั่งให้ผู้ใช้รัน — ห้าม "ผ่าน"/"ไล่ตรวจด้วยมือแล้วตรงหมด" · บอกชื่อไฟล์ที่เขียนไม่สำเร็จ (`references/verification.md`)

**รัน script ก่อน** (cwd = root ของโปรเจคปลายทาง):

```bash
node <skill-dir>/scripts/verify.mjs
```

script ครอบฝั่ง repo ให้ทั้งหมด (อ่านเฉพาะบรรทัดที่ยังทำงานจริง — ตัดคอมเมนต์ออกก่อน)
ส่วนที่เหลือไล่ตาม **`references/verification.md`** ซึ่งมีรายการเต็ม: สิ่งที่ script
ไม่ตรวจโดยตั้งใจ · ไฟล์ในโปรเจค · ฝั่ง server (admin ยืนยัน) · รันจริง. ขั้นต่ำที่ห้ามข้าม:

- [ ] `verify.mjs` ไม่มี fail · ไม่มี `__*__` ค้าง (ยกเว้น `__DIR__`) ทั้งในไฟล์โปรเจค,
      `.claude/rules/ugt-php-ci.md` และ `docs/admin-handoff.md`
- [ ] toolchain §5.6 ผ่านในเครื่อง (`php -l` · `php-cs-fixer fix --dry-run` · `phpstan` ·
      `phpunit`) และได้ `clover.xml` + `test-results/junit.xml` จริง
- [ ] ยิง `/api/health` จริงตาม docroot ของ shape — ไม่ต้อง login · 200 healthy /
      503 degraded · ไม่มี version/commit · [subpath] เปิดผ่าน **URL เต็มหลัง proxy**
- [ ] shape = wordpress: บอกผู้ใช้แล้วว่าโค้ดใน `wp-content` ขึ้น container ทางไหน ·
      deploy ซ้ำแล้วไฟล์ที่อัปโหลดยังอยู่
- [ ] admin ยืนยันฝั่ง server ครบตาม `docs/admin-handoff.md` (`docker` group, credentials `nvd` /
      `env-<project>` / `env-<project>-dev`, webhook ทั้งคู่, Quality Gate ตาม §2, `proxy-network`)
- [ ] push `develop` → เขียวครบ 10 stages · ใส่ violation 1 จุดแล้ว pipeline abort ที่ Quality Gate

## 8. หลังจากนี้ (optional)

ถ้า interview ข้อ 8 ตอบ **ใช่** และ pipeline เขียวแล้ว → เปิด session ใหม่ทำ
characterization test ให้โค้ดเดิมตาม `references/legacy-test-generation.md`
(ไล่ทีละ class จากใบไปหาราก, ทีมต้อง review ทุกไฟล์ก่อน commit เพราะ test
ชุดนี้ล็อกพฤติกรรมปัจจุบันรวม bug ที่มีอยู่, และไม่ใช่เงื่อนไขของ Quality Gate
เพราะ gate นับเฉพาะโค้ดใหม่)
