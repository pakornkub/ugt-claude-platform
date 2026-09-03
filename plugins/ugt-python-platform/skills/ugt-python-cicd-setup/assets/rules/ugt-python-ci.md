---
paths:
  - "Jenkinsfile"
  - "Dockerfile*"
  - "docker-compose*"
  - "sonar-project.properties"
---

<!-- Owned by ugt-python-cicd-setup — may be overwritten wholesale on /plugin update. -->

# CI/CD rules (loads when touching Jenkinsfile / Docker / Sonar config)

## รายการ stage คือ contract — แก้คำสั่งข้างในได้ แต่ห้ามตัด stage

```
Checkout → Install → Code Quality (parallel: Lint / Format Check / Type Check)
  → Unit Tests (JUnit + coverage) → Build (no-op — Python มี artifact เดียวคือ image)
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

- ทุก stage (Install / Lint / Format Check / Type Check / Unit Tests) เปิด
  `docker.image('python:3.12-slim').inside { ... }` ของตัวเอง — Jenkins agent
  ไม่มี Python tool ติดตั้งไว้ล่วงหน้า
- `.venv` ถูกสร้างในสเตจ Install แล้วอยู่ในไฟล์ workspace (ไม่ใช่ในตัว
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

- Volume ที่ต้อง persist ข้าม deploy ต้องอยู่ใต้ `/home/docker02/appdata/<project>/`
  เท่านั้น (dev = `/home/docker02/appdata/<project>-dev/`) — ห้าม named volume, ห้าม
  เก็บ secret ใน volume
- ห้ามใส่ version หรือ commit hash ใน response ของ `/api/health` — endpoint นี้
  ใช้เฉพาะ health status (`healthy`/`degraded`) เท่านั้น
- Tag image ด้วย `BUILD_NUMBER` เสมอ ห้าม tag แค่ `latest` อย่างเดียว
  (ไม่งั้น rollback ไม่ได้)
- Healthcheck ยิงที่ `127.0.0.1` ห้ามใช้ `localhost` (สภาพแวดล้อม slim/alpine
  บาง image resolve `localhost` เป็น IPv6 แล้ว fail)
- Deploy ด้วย `--no-build` (reuse image จากสเตจ Docker Build) — ปล่อยให้
  compose build เองจะได้ image คนละตัวกับที่ผ่าน Quality Gate มาแล้ว
- `pull_policy: never` ใน compose — image build ในเครื่องเอง ไม่ได้ดึงจาก registry
- **Migrate ก่อน `compose up` เสมอ** — migrate fail = ไม่ deploy (ใช้ image ที่
  เพิ่ง build รัน `alembic upgrade head` หรือเทียบเท่าของ Django)
- shape `[BATCH]` (ไม่มี web server) ตัด `EXPOSE`/`HEALTHCHECK` และแทน
  compose up + health poll ด้วยการรัน image ตรวจว่า import โมดูลหลักได้แล้วจบ

## SonarQube config

- ทุก path ใน `sonar.sources` / `sonar.tests` **ต้องมีอยู่จริง** — path หายจะทำให้
  sonar-scanner fail ทันที
- `sonar.python.coverage.reportPaths=coverage.xml` — ถ้าไฟล์นี้ไม่ถูกสร้าง
  `new_coverage` จะอ่านได้ 0% แล้ว gate บล็อกโดยไม่มี error ชี้สาเหตุ
- ทุกรายการใน `sonar.cpd.exclusions` / `sonar.issue.ignore.multicriteria` และ
  ทุก `<suppress>` ใน `owasp-suppressions.xml` ต้องมี **comment/`<notes>`
  อธิบายเหตุผล** และเพิ่มได้ก็ต่อเมื่อรีวิว finding จริงแล้วเท่านั้น — ห้าม
  suppress ไว้ล่วงหน้า

## CI env

`CI=true` เท่านั้น — ไม่มี env var สำหรับ build-time inlining แบบ frontend
framework ใน stack นี้
