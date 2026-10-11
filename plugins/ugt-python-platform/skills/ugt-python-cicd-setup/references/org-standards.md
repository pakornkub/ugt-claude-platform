# Org Standards — contract ร่วมของ pipeline (Python)

ขยายความ SKILL.md §2: contract ที่ **ทุกโปรเจคทำเหมือนกันหมด** ไม่ว่าภาษาอะไร — อ่านก่อนแก้ Jenkinsfile / compose / Dockerfile

เนื้อหา: §1 Stages · §2 Toolchain ใน docker · §3 Branch model · §4 Quality Gate thresholds ·
§5 Credential naming · §6 Secret rules · §7 Build & deploy rules · §8 Health endpoint ·
§9 Persistent data · §10 CI env

## 1. Stages (all 10, in order)

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

## 2. Toolchain รันใน docker (มติ M8 — ไม่แตะ Jenkins Global Tools)

ทุก stage ที่ต้องใช้ Python (`Install` / `Lint` / `Format Check` / `Type Check`
/ `Unit Tests`) เปิด `docker.image('python:3.12-slim').inside { ... }` ของตัวเอง
— Jenkins server ไม่ต้องติดตั้ง Python เพิ่มเลย. `.venv` ถูกสร้างในสเตจ
`Install` แล้วอยู่ใน **workspace** (ไม่ใช่ในตัว container ที่ถูกทิ้งเมื่อ stage
จบ) จึงรอดข้ามไปสเตจถัดไปได้ เพราะ `docker.image().inside` mount workspace เดิม
ทุกครั้ง. เงื่อนไขฝั่ง server **สองข้อ** (อยู่ในเช็คลิสต์ + ภาคผนวกของ admin
handoff แล้วทั้งคู่):

1. **ปลั๊กอิน Docker Pipeline (`docker-workflow`)** — เป็นตัวที่ให้ global
   variable `docker` ขาดแล้ว pipeline ตายตั้งแต่ stage Install ด้วย
   `groovy.lang.MissingPropertyException: No such property: docker` ซึ่งอ่านไม่
   ออกว่าหมายถึงปลั๊กอินหาย · **คนละเรื่องกับการมี Docker CLI** — `sh 'docker …'`
   ไม่ต้องใช้ปลั๊กอินนี้ แต่ `docker.image().inside{}` ต้องใช้
2. **Jenkins user อยู่ใน `docker` group** ไม่งั้นทุก stage fail ด้วย permission
   denied ต่อ `/var/run/docker.sock`

## 3. Branch model

| Branch | Environment | Differs in |
| --- | --- | --- |
| `main` | prod | container name, host port, sonar projectKey, env credential |
| `develop` | dev | ทุกอย่างต่อท้าย `-dev` + คนละไฟล์ compose |

ค่าที่ขึ้นกับ branch resolve ใน `script {}` จาก
`def br = (env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last())` เสมอ —
ห้ามใส่ค่าเฉพาะ branch ใน `environment {}` ระดับ global

## 4. Quality Gate thresholds (org standard — วัดที่ New Code)

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

## 5. Credential naming convention

| Credential ID | Type | Purpose |
| --- | --- | --- |
| `nvd` | Secret text | NVD API key (ตัวเดียวทั้ง server ทุกโปรเจคใช้ร่วมกัน) |
| `env-<project>` | Secret file | prod `.env` → `cp` เข้า workspace ตอน Deploy |
| `env-<project>-dev` | Secret file | dev `.env` (คนละ DB คนละ secret กับ prod) |
| SonarQube token | — | ผูกที่ System → SonarQube servers (`withSonarQubeEnv`) — ห้าม bind มือใน Jenkinsfile |

stack นี้ **ไม่มี** `sentry-dsn-<project>` (ไม่มี client bundle ให้ inline DSN)

## 6. Secret rules

- Secrets ใน `sh` ต้องถูกขยายค่าโดย **shell** (`"$VAR"`) — ห้าม Groovy
  interpolation (`"${VAR}"`) เพราะรั่วลง build log (ระวังเป็นพิเศษใน
  `sh """..."""` ที่ Groovy interpolate ทุก `${}` ที่เจอ)
- ไฟล์ชั่วคราวที่เก็บ secret (`dc-nvd.properties`) ลบใน `post { always }`
- `NOTIFY_EMAIL` / `SMTP_FROM` = Jenkins Global env vars — ห้าม hardcode

## 7. Build & deploy rules

- Tag image ด้วย `BUILD_NUMBER` คู่กับ `latest` เสมอ — `latest` เปล่า ๆ =
  rollback ไม่ได้
- **Migrate ก่อน deploy** — migration fail = ไม่ deploy
- Deploy ด้วย `--no-build` (reuse image ที่เพิ่งผ่าน Quality Gate) — ปล่อยให้
  compose build เองจะได้ image คนละตัวกับที่ scan ผ่าน
- Compose: `pull_policy: never` · host port override ได้จาก `.env`
  (`${APP_PORT:-...}`) · log rotation จำกัดขนาด

## 8. Health endpoint

`/api/health` — ไม่ต้อง login · 200 `healthy` / 503 `degraded` · **ห้ามใส่
version หรือ commit hash ใน response**. Container healthcheck ยิง `127.0.0.1`
เท่านั้น **ไม่ใช้ `localhost`** — เป็นกติกาเชิงป้องกัน ไม่ใช่บั๊กที่ยืนยันแล้ว:
`localhost` ต้องผ่าน resolver ซึ่งอาจให้ `::1` มาก่อน ขณะที่ uvicorn/gunicorn
ผูก IPv4 (`--host 0.0.0.0`) — ระบุ IP ตรง ๆ ตัดตัวแปรนั้นทิ้ง ไม่ต้องลุ้น
`/etc/hosts`/resolver order ของ base image ที่เปลี่ยนได้เงียบ ๆ ตอน bump.
ยิง **port 8000 ภายใน container** เสมอ ไม่ใช่
host port. `python:3.12-slim` ไม่มี `wget`/`curl` → healthcheck ใช้
`python -c "import urllib.request,sys; ..."` (stdlib ล้วน) ทั้งใน Dockerfile และ
compose. Shape `[BATCH]` ไม่มี health endpoint เลย (ไม่มี long-running process
ให้ poll) — ดู `references/healthcheck.md`

## 9. Persistent data

ข้อมูลที่ต้องรอดข้าม deploy ใช้ bind mount ใต้ `/home/docker02/appdata/<project>/<name>`
(dev = `/home/docker02/appdata/<project>-dev/<name>`) เท่านั้น — ห้าม named volume,
ห้ามเก็บ secret ใน volume, ห้าม bind โค้ดทับ image. บล็อก `[VOLUME]` ในสเตจ
Deploy สร้าง path + `chown` ให้ตรง UID ของ user `app` ใน container ให้เอง โดย
อ่าน UID จาก image จริง ไม่ hardcode — **มันวนเช็คทีละ subdir** (`for p in …`)
จึงสร้าง volume ที่เพิ่มทีหลัง release แรกให้ด้วย และข้ามตัวที่มีอยู่แล้วโดยไม่
chown ซ้ำ — แต่ **session ที่กรอก volume ต้องแทน `uploads`/`reports` ในบรรทัด
`for p in` ด้วยชื่อจริงทุกตัว** subdir ที่ไม่อยู่ในลิสต์จะถูก dockerd สร้างเป็น
`root:root` ตอน `up -d` แล้ว container เขียนไม่ได้ (`verify.mjs` จับข้อนี้ให้).
admin เตรียม `/home/docker02/appdata` ให้เขียนได้ครั้งเดียวต่อ server (ดู admin handoff).
รายละเอียดกลไก chown → `references/volumes.md`

## 10. CI env

`CI=true` อย่างเดียว. **ไม่มีกติกา build-arg สำหรับ client-side env vars**
แบบที่ Next.js ต้องมี (`NEXT_PUBLIC_*` ต้องเป็น `--build-arg`) เพราะ stack นี้
ไม่มี compile-time client bundle — secret ทุกตัวเป็น runtime env จาก `.env`
ล้วน ๆ นี่คือความง่ายที่ได้มา ไม่ใช่ของที่หายไป
