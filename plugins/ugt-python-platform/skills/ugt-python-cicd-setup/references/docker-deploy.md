# Docker Deploy — deep detail (Python)

## A. Branch → deploy target

Jenkins Deploy stage resolves ทุกค่านี้จาก `env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last()`
ใน `script {}` — ไม่มีทางลัด, ไม่มีค่า global เดียวใช้ทุก branch:

| Branch | Image | Compose file | Env credential (Secret File) | Container name |
| --- | --- | --- | --- | --- |
| `main` | `__PROJECT_NAME__:latest` + `:<BUILD_NUMBER>` | `docker-compose.yml` | `env-__PROJECT_NAME__` | `__PROJECT_NAME__` |
| `develop` | `__PROJECT_NAME__-dev:latest` + `:<BUILD_NUMBER>` | `docker-compose.dev.yml` | `env-__PROJECT_NAME__-dev` | `__PROJECT_NAME__-dev` |
| อื่น ๆ (feature branch) | — | — | — | Docker Build/Deploy stage ถูก `when { expression { br == 'main' \|\| br == 'develop' } }` ข้ามทั้งคู่ |

ทุก branch build image ของตัวเองเสมอ (tag `latest` + `BUILD_NUMBER` คู่กัน — ห้าม
tag แค่ `latest`, ไม่งั้น rollback ไม่ได้เพราะไม่มีเลขอ้างอิงย้อนกลับ). Deploy
ใช้ `docker-compose -f <file> up -d --no-build` เสมอ — flag นี้บังคับให้ compose
reuse image ที่เพิ่งผ่าน Quality Gate ในสเตจ Docker Build แทนที่จะ build ใหม่
จาก `build:` section (ซึ่งจะได้ image คนละตัวที่ไม่ผ่าน scan).

## B. สองรูปแบบ deploy: [WEB] vs [BATCH]

Shape จากข้อ 4 ของ interview (fastapi/flask/django = web, batch script = batch)
กำหนดว่า Deploy stage จบแบบไหน — สลับบล็อกใน Jenkinsfile ตามคอมเมนต์
`// [WEB]` / `// [BATCH]` ที่ท้ายสเตจ Deploy:

| | [WEB] | [BATCH] |
| --- | --- | --- |
| Container หลัง deploy | long-running (`restart: unless-stopped`) | ไม่มี — Jenkins ตรวจแล้วจบ, ไม่ทิ้ง container ค้าง |
| Deploy stage ทำอะไร | `docker-compose up -d --no-build` แล้ว poll `docker inspect` จน `healthy` (สูงสุด 24×10s = 4 นาที) | `docker run --rm ${imageName}:${buildNum} python -c 'import __APP_MODULE__'` — แค่ import โมดูลหลักสำเร็จ = ถือว่า image ใช้งานได้ |
| ใครสั่งรัน job จริง | request เข้า container ผ่าน reverse proxy | **host cron** เรียก `docker compose run --rm job` — Jenkins ไม่ยุ่งกับตาราง cron |
| Dockerfile | `docker/Dockerfile.web` มี `EXPOSE 8000` + `HEALTHCHECK` | `docker/Dockerfile.batch` **ไม่มี** port/healthcheck เลย (ดู §E) |
| Compose | service name `app`, มี `ports:`/`healthcheck:`/`restart: unless-stopped` | service name `job`, ตัด `ports:`/`healthcheck:` ทิ้ง, `restart: "no"` (container รันจบแล้วต้องหายไป ไม่ restart loop) |

Import-check ของ [BATCH] คือ smoke check เดียวกับที่ `tests/test_smoke.py` ทำใน
CI (`importlib.import_module("__APP_MODULE__")`) — แต่รันกับ **image จริง**
หลัง build เสร็จ เพื่อจับกรณี `requirements.txt` ขาด dependency ที่ทำให้ import
พังเฉพาะใน container (ต่างจาก dev machine ที่มี package เก่าติดอยู่).

## C. [BATCH] shape — host cron รัน job

Jenkins deploy image เสร็จแล้ว**จบหน้าที่** — ไม่มี process ไหนเรียก job ให้เอง
ต่อ. คนตั้ง cron คือ **host admin**, ไม่ใช่ Jenkins pipeline — เป็นรายการ
`[BATCH]` ใน `admin-handoff.template.md` (§ ภาพรวม 1 นาที + เช็คก่อนปิดงาน)
ที่ชี้กลับมาที่ตัวอย่าง crontab นี้:

```
0 2 * * * cd /opt/apps/__PROJECT_NAME__ && docker compose run --rm job >> /srv/appdata/__PROJECT_NAME__/logs/cron.log 2>&1
```

อ่านทีละส่วน:

- `cd /opt/apps/__PROJECT_NAME__` — ต้องรันจาก path ที่มี `docker-compose.yml`
  ของโปรเจคนั้นอยู่ (ไม่งั้น `docker compose` หาไฟล์ compose ไม่เจอ)
- `docker compose run --rm job` — สร้าง container ใหม่จาก service `job`, รันจบ
  แล้ว **ลบตัวเองทิ้ง** (`--rm`) ต่างจาก `up -d` ที่ปล่อยค้าง — ตรงกับธรรมชาติ
  ของ batch job ที่ไม่ควรมี container ค้างระหว่างรอบ
- `>> .../cron.log 2>&1` — log ของ cron เอง (stdout+stderr ของการรัน job)
  ต้องอยู่ใต้ `/srv/appdata/<project>/` เช่นเดียวกับข้อมูล persist อื่น
  (ดู §D) เพื่อให้ backup ของ host คลุมถึงและรอดข้าม deploy รอบถัดไป
- ความถี่ (`0 2 * * *` = ทุกวันตี 2) เป็นตัวอย่าง — ปรับตาม requirement จริง
  ของแต่ละ job แล้วบันทึกไว้ใน admin handoff เพื่อให้ทีมอื่นเห็นว่ามี cron
  แอบรันอยู่

**ใช้ `docker compose` (v2 plugin syntax) ในบรรทัด cron แม้ Jenkinsfile ใช้
`docker-compose` (v1 binary, hyphen)** — เพราะ cron รันบน host เดียวกันแต่คนละ
context จาก Jenkins agent; เช็ค binary ที่มีจริงบน host ก่อนตั้ง cron
(`which docker-compose`, `docker compose version`) แล้วใช้ตัวที่มีให้ตรงกับที่
Jenkins ใช้ — สอง binary ไม่ compatible กัน 100% ในทุกกรณี (env-var
interpolation ต่างกันเล็กน้อย).

## D. Volume — ownership เป็นเรื่องคนละเรื่องกับ path

Path ของ persistent data ตาม contract กลาง (`ugt-core/contracts/cicd.md` §
Persistent data) คือ:

```
/srv/appdata/<project>/<name>        # prod
/srv/appdata/<project>-dev/<name>    # dev
```

แต่ path ถูกต้องไม่ได้แปลว่า container **เขียนได้**. Dockerfile ทั้งสอง shape
(`Dockerfile.web`, `Dockerfile.batch`) รันเป็น non-root system user `app`
(`RUN addgroup --system app && adduser --system --ingroup app app` แล้ว
`USER app`) — bind mount เข้ามาที่ path บน host ที่ owner เป็นคนละ UID จะทำให้
`app` เขียนไฟล์ไม่ได้ (`PermissionError: [Errno 13]`) แม้ compose ขึ้น healthy
ปกติทุกอย่าง (เพราะ error โผล่ตอนโค้ด **เขียน** volume จริง ไม่ใช่ตอน start).

### กลไกหลัก — Jenkinsfile chown ให้อัตโนมัติครั้งแรก

บล็อก `[VOLUME]` ในสเตจ Deploy ของ Jenkinsfile ทำเรื่องนี้ให้เองแล้ว โดยรันแค่
**ครั้งแรกที่ path ยังไม่มี** (idempotent — deploy รอบถัดไปเจอ path มีอยู่แล้ว
ก็ข้าม ไม่ chown ซ้ำทุกรอบ):

```sh
if [ ! -d /srv/appdata/${containerName} ]; then
  mkdir -p /srv/appdata/${containerName}
  APP_UID=$(docker run --rm ${imageName}:${buildNum} id -u)
  docker run --rm -v /srv/appdata/${containerName}:/d alpine chown -R "$APP_UID" /d
fi
```

จุดสำคัญที่ทำให้กลไกนี้ทำงานได้แม้ Jenkins agent เองไม่ใช่ root:

- **หา UID จริงจาก image ที่เพิ่ง build** (`docker run --rm ${imageName}:${buildNum} id -u`)
  ไม่เดาว่า 999/1000 — เลข UID ของ `adduser --system` ขึ้นกับลำดับที่ base
  image สร้าง system user ไว้ก่อนหน้า เปลี่ยนได้ทุกครั้งที่ `python:3.12-slim`
  bump เวอร์ชันหรือลำดับ `RUN` ใน Dockerfile ถูกแก้ — จึงต้องอ่านจาก image จริง
  ทุกครั้ง ไม่ hardcode
- **`chown` เองไม่ได้เพราะ Jenkins user ไม่ใช่ root บนโฮสต์** — แต่ Jenkins
  user อยู่ใน `docker` group (ตาม มติ M8 / เช็คลิสต์ admin-handoff) จึงสั่ง
  `docker run` ได้; รันเป็น container `alpine` แยกที่ mount `/srv/appdata/<project>`
  bind เข้ามาที่ `/d` แล้ว `chown -R` ข้างในนั้น — container นี้เองรันเป็น
  root โดย default จึง chown ได้ แม้ Jenkins agent ข้างนอกจะไม่ใช่ root
- ครอบด้วย `if [ ! -d ... ]` เพื่อไม่ต้องรัน `docker run` สองรอบ (หา UID +
  chown) ทุก deploy โดยไม่จำเป็น — เกิดขึ้นแค่ตอน path ยังไม่เคยมี

### ทางเลือกสำรอง — chown มือ (path ที่มีอยู่ก่อนกลไกนี้ หรือ debug)

สำหรับ path ที่ถูกสร้างไว้ก่อนบล็อก `[VOLUME]` เวอร์ชันนี้ (เช่น อัปเดต skill
บนโปรเจคเก่า) หรือเวลา debug ปัญหา permission เอง ใช้คำสั่งเดียวกันแบบรันมือ
ได้:

```sh
docker run --rm __PROJECT_NAME__:latest id -u
# หรือระบุ group ด้วย:
chown -R $(docker run --rm __PROJECT_NAME__:latest id -u):$(docker run --rm __PROJECT_NAME__:latest id -g) /srv/appdata/__PROJECT_NAME__/<name>
```

ทั้งสองทางใช้ตรรกะเดียวกัน (อ่าน UID จาก image จริง แล้ว chown path ให้ตรง) —
ต่างกันแค่ทางแรกรันอัตโนมัติผ่าน Jenkinsfile ตอน deploy ครั้งแรก ทางที่สองไว้
แก้ปัญหากรณีพิเศษที่กลไกอัตโนมัติไม่ครอบ (path เก่า, หรือ mount เพิ่มทีหลัง
โดยไม่ได้ผ่าน deploy รอบใหม่).

## E. Healthcheck — slim ไม่มี wget

`python:3.12-slim` เป็น image ขั้นต่ำมาก — ไม่มี `wget`/`curl` ติดมาให้ (ต่างจาก
`python:3.12` เต็ม) ดังนั้น healthcheck ทั้งใน Dockerfile (`Dockerfile.web`)
และ compose (`docker-compose.yml`/`docker-compose.dev.yml`) ต้องยิงด้วย Python
เอง — `urllib.request` เป็น standard library ไม่ต้องติดตั้งอะไรเพิ่ม:

```sh
python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status==200 else 1)"
```

จุดที่พลาดบ่อย:

- **`127.0.0.1` เท่านั้น ห้าม `localhost`** — `python:3.12-slim` (base จาก
  Debian) มักมี `/etc/hosts`/resolver ที่ resolve `localhost` เป็น IPv6 `::1`
  ก่อน ขณะที่ uvicorn/gunicorn ผูก IPv4 เท่านั้น (`--host 0.0.0.0`) → healthcheck
  fail ด้วย "Connection refused" ทั้งที่แอปรันปกติทุกอย่าง
- **Port ในสตริงต้องเป็น 8000 (container-internal) เสมอ** — ไม่ใช่ host port
  จาก `${APP_PORT:-__PORT_PROD__}` ที่แค่ map เข้ามา healthcheck รันข้างใน
  container จึงเห็นแต่ port ภายใน
- `[BATCH]` shape (`Dockerfile.batch`) **ไม่มี** `EXPOSE`/`HEALTHCHECK` เลย —
  ไม่มี long-running process ให้ poll (ดู §B) ตัดสองบรรทัดนี้ทิ้งทั้งคู่ ไม่ใช่
  แค่ comment out
- `start_period: 60s` ในทั้งสอง compose ให้เวลาแอป boot ก่อนเริ่มนับ retry —
  ลดค่านี้จะทำให้ deploy ล้มเพราะ "unhealthy" ระหว่างที่แอปแค่ยังไม่ทัน boot
  เสร็จ (ต่างจาก unhealthy จริง)

## F. `.dockerignore` — `.venv` ต้องไม่เข้า build context

สเตจ Install ของ Jenkinsfile สร้าง `.venv` ไว้ใน workspace (`python -m venv
.venv` แล้ว pip install ข้างใน — ดู มติ M8 ใน `assets/rules/ugt-python-ci.md`)
เพื่อให้ toolchain รันข้าม stage ได้โดยไม่ต้อง install ซ้ำทุกครั้ง ผลข้างเคียง
คือ `.venv/` **อยู่ใน workspace เดียวกับที่ Docker Build stage ใช้เป็น build
context** (`docker build ... .`) — ถ้าไม่กันไว้ `.venv` (มักเกิน 100 MB, มี
ไบนารีเฉพาะ platform ของ Jenkins agent) จะถูกส่งเข้า build context ทำให้
`docker build` ช้าลงมาก และเสี่ยงหลุดเข้า layer ของ image โดยไม่ตั้งใจถ้า
Dockerfile มี `COPY . .` แบบกว้าง (ทั้งสอง Dockerfile ในชุดนี้ใช้ `COPY . .`
จริง)

ต้องมี `.dockerignore` ที่ root โปรเจค กันไฟล์ที่เกิดจาก CI stage ก่อนหน้า
ไม่ให้หลุดเข้า image:

```
.venv
coverage
dc-report
test-results
```

สี่รายการนี้ตรงกับ artifact ที่สเตจ Install/Unit Tests/OWASP สร้างไว้ในสเตจ
ก่อน Docker Build ตามลำดับ (`.venv` จาก Install, `coverage`/`test-results` จาก
Unit Tests — path มาจาก `[tool.pytest.ini_options]` ใน `pyproject.toml`,
`dc-report` จาก OWASP Dependency Check) — ไม่มีชิ้นไหนควรอยู่ใน production
image เลย.

## G. Compose conventions (เหมือนกันทั้ง prod/dev)

| Convention | ทำไม |
| --- | --- |
| `pull_policy: never` | image build ในเครื่อง Jenkins เอง ไม่งั้น compose พยายาม pull `latest` จาก Docker Hub แล้วได้ image คนละตัว (หรือ fail ถ้าไม่มี registry) |
| `ports: '${APP_PORT:-<port>}:8000'` | host port override ได้จาก `.env` — กัน port ชนกันบน host ที่รันหลายโปรเจค; container-internal คงที่ 8000 เสมอ |
| แยกไฟล์ compose prod/dev คนละไฟล์ | ชื่อ image/container/host port ต่างกัน — รวมไฟล์เดียวแล้ว parametrize เสี่ยง deploy ผิด environment มากกว่าแยกไฟล์ให้เห็นชัด |
| `restart: unless-stopped` ([WEB]) / `restart: "no"` ([BATCH]) | web ต้องรอด host reboot อัตโนมัติ; batch job รันจบแล้วต้องหายไป — restart loop จะกลายเป็นรัน job ซ้ำไม่หยุด |
| resource limits (`deploy.resources`) | container เดียวไม่ควร starve ทรัพยากร host ที่มีหลายโปรเจครันร่วมกัน |
| `logging` json-file 10m×3 | log โตไม่จำกัดจะเต็มดิสก์ host ได้ในระยะยาว โดยเฉพาะ batch job ที่รันทุกวัน |
| `proxy-network` (`external: true`) | ทุกแอป [WEB] แชร์ network เดียวกับ reverse proxy ที่สร้างไว้ครั้งเดียวบน host — `[BATCH]` ไม่ต้องมี network นี้เพราะไม่มีใครยิง request เข้าหา job โดยตรง |
