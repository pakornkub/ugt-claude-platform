---
paths:
  - "Jenkinsfile"
  - "Dockerfile*"
  - "docker-compose*"
  - "sonar-project.properties"
---

<!-- Owned by ugt-php-cicd-setup — may be overwritten wholesale on /plugin update. -->

# CI/CD rules (loads when touching Jenkinsfile / Docker / Sonar config)

## รายการ stage คือ contract — แก้คำสั่งข้างในได้ แต่ห้ามตัด stage

```
Checkout → Install → Code Quality (parallel: Lint / Format Check / Static Analysis)
  → Unit Tests (JUnit + coverage) → Build (no-op — PHP มี artifact เดียวคือ image)
  → OWASP Dependency Check (90-min timeout + suppression file)
  → SonarQube Analysis → Quality Gate (abortPipeline: true)
  → Docker Build → Deploy        ← 2 stage สุดท้ายรันเฉพาะ main/develop
post: emailext (success/unstable/failure/aborted) + cleanWs
```

10 stages ห้ามตัด — แม้ "Build" จะเป็น no-op (echo เฉย ๆ) ก็ต้องคงไว้ตาม contract
ของ pipeline องค์กร

## Quality Gate (วัดที่ new code)

| เงื่อนไข | ค่า |
| --- | --- |
| `new_violations` | = 0 |
| `new_duplicated_lines_density` | ≤ 3% |
| `new_coverage` | ≥ 60% |
| `new_security_hotspots_reviewed` | = 100% |

แก้ pipeline แล้วค่า Quality Gate ต้องตรง contract นี้เสมอ — ห้ามลดค่าใน
SonarQube gate เพื่อให้ pipeline ผ่านง่ายขึ้น ใช้ `waitForQualityGate
abortPipeline: true` คู่กับ timeout เสมอ — ถ้าไม่ใส่ `abortPipeline` gate จะขึ้น
แดงแต่ pipeline ยังเขียวต่อ ซึ่งแย่กว่าไม่มี gate เพราะสร้างความมั่นใจหลอก ๆ

## Toolchain รันใน docker (มติ M8 — ไม่ใช้ Jenkins Global Tool)

- **Install stage สร้าง CI image ครั้งเดียว** ด้วย `docker build -f Dockerfile.ci -t __PROJECT_NAME__-ci .`
  (FROM php:8.3-cli + unzip + pecl pcov + composer — unzip ต้องมี ไม่งั้น
  `composer install` ตายด้วย "zip extension and unzip/7z commands are both
  missing") — ครั้งแรกช้า ครั้งถัดไปโดน cache
- ทุก stage ถัดมา (Lint / Format Check / Static Analysis / Unit Tests) **ใช้ image เดิม**
  `docker.image('__PROJECT_NAME__-ci').inside { ... }` — Jenkins agent ไม่มี PHP
  tool ติดตั้งไว้ล่วงหน้า
- `vendor` ถูกสร้างในสเตจ Install แล้วอยู่ในไฟล์ workspace (ไม่ใช่ในตัว
  container ที่ถูกทิ้งเมื่อ stage จบ) จึงรอดข้าม stage ถัดไปได้ เพราะ
  `docker.image().inside` mount workspace เดิมทุกครั้ง
- ต้องมี Jenkins user อยู่ใน `docker` group บนโฮสต์ ไม่งั้นทุก stage ที่เรียก
  `docker.image().inside` จะ fail ด้วย permission denied ต่อ
  `/var/run/docker.sock` (ดู admin handoff)

## Secrets

- Secrets ใน `sh` ต้องถูกขยายค่าโดย **shell**: `"$VAR"` — **ห้าม** ใช้ Groovy
  interpolation `"${VAR}"` เพราะจะรั่วค่าลง build log (ระวังเป็นพิเศษใน
  `sh """..."""` เพราะ Groovy interpolate ทุก `${}` ที่เจอ)
- ไฟล์ชั่วคราวที่เก็บ secret (เช่น `dc-nvd.properties`) ต้องลบใน `post { always }`
- `NOTIFY_EMAIL` / `SMTP_FROM` เป็น Jenkins Global env vars — ห้าม hardcode
- ชื่อ credential: `nvd` (global ต่อ server ไม่ผูกโปรเจค) · `env-<project>` ·
  `env-<project>-dev` — ไม่มี sentry credential ใน stack นี้

## Branch / ค่าตามสาขา

`main` = prod · `develop` = dev (ทุกอย่างต่อท้ายด้วย `-dev`)

ค่าที่ขึ้นกับ branch **ต้อง** resolve ใน `script {}` จาก
`env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last()` — ห้ามใส่ใน
`environment {}` ระดับ global (global = ค่าเดียวใช้ทุก branch)

## Docker

- Volume ที่ต้อง persist ข้าม deploy ต้องอยู่ใต้ `/srv/appdata/<project>/`
  เท่านั้น (dev = `/srv/appdata/<project>-dev/`) — ห้าม named volume, ห้าม
  เก็บ secret ใน volume
- ห้ามใส่ version หรือ commit hash ใน response ของ `/api/health` — endpoint นี้
  ใช้เฉพาะ health status (`healthy`/`degraded`) เท่านั้น
- Tag image ด้วย `BUILD_NUMBER` เสมอ ห้าม tag แค่ `latest` อย่างเดียว
  (ไม่งั้น rollback ไม่ได้)
- Healthcheck ยิงที่ `127.0.0.1` ห้ามใช้ `localhost` (สภาพแวดล้อม slim/alpine
  บาง image resolve `localhost` เป็น IPv6 แล้ว fail)
- Healthcheck ใช้ `curl -fsS -L` — **`-L` ห้ามตัดทิ้ง** (`/api/health` โดน 301
  คนละทิศแล้วแต่ shape: Laravel ตัด `/` ท้ายทิ้ง · shape ที่เป็นไฟล์เติม `/`
  เข้ามา — `curl -f` ที่ไม่มี `-L` นับ 301 ว่าสำเร็จ = เขียวหลอกทั้งที่ข้างใต้
  อาจ 503) · **ห้ามเปลี่ยนกลับไปใช้ `php -r file_get_contents`** — คืน `false`
  เสมอเมื่อ `allow_url_fopen = Off` ทำให้ container ไม่มีวัน healthy · และ
  **ห้าม purge `curl`** ทิ้งท้าย Dockerfile
- Deploy ด้วย `--no-build` (reuse image จากสเตจ Docker Build) — ปล่อยให้
  compose build เองจะได้ image คนละตัวกับที่ผ่าน Quality Gate มาแล้ว
- `pull_policy: never` ใน compose — image build ในเครื่องเอง ไม่ได้ดึงจาก registry
- **Migrate ก่อน `compose up` เสมอ** — migrate fail = ไม่ deploy (ถ้า WordPress
  ใช้ plugins/themes ที่ต้อง activate ให้ rerun activation ใน CLI ก่อน serve)

## WordPress

- **wp-content ต้องเป็น volume เสมอ** — plugin/theme uploads ต้อง persist ข้าม deploy
- **ห้ามสแกน wp-admin/wp-includes ใน Sonar** — core WordPress ไม่นับใน code quality metrics
  (ใส่ exclusions ใน sonar-project.properties แล้ว)

## SonarQube config

- ทุก path ใน `sonar.sources` / `sonar.tests` **ต้องมีอยู่จริง** — path หายจะทำให้
  sonar-scanner fail ทันที
- `sonar.php.coverage.reportPaths=clover.xml` — ถ้าไฟล์นี้ไม่ถูกสร้าง
  `new_coverage` จะอ่านได้ 0% แล้ว gate บล็อกโดยไม่มี error ชี้สาเหตุ
- ทุกรายการใน `sonar.cpd.exclusions` / `sonar.issue.ignore.multicriteria` และ
  ทุก `<suppress>` ใน `owasp-suppressions.xml` ต้องมี **comment/`<notes>`
  อธิบายเหตุผล** และเพิ่มได้ก็ต่อเมื่อรีวิว finding จริงแล้วเท่านั้น — ห้าม
  suppress ไว้ล่วงหน้า

## CI env

`CI=true` เท่านั้น — ไม่มี env var สำหรับ build-time inlining แบบ frontend
framework ใน stack นี้
