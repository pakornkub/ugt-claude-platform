# Docker Deploy — ภาพรวม (Python)

ภาพรวมกลไก deploy: branch → deploy target, สอง shape `[WEB]` / `[BATCH]`, job ตามรอบผ่าน host cron หรือ cron service ใน compose prod —
รายละเอียดเชิงลึกแยกไฟล์ตามหัวข้อ (ตารางด้านล่าง)

## หัวข้อเชิงลึก — ไฟล์ไหน

| หัวข้อ | ไฟล์ | เดิมคือ |
| --- | --- | --- |
| Branch → deploy target · [WEB] vs [BATCH] · host cron / cron service | ไฟล์นี้ | §A, §B, §C |
| Volume ownership (user `app`) + bind mount จาก Jenkins (DooD) | `references/volumes.md` | §D, §J |
| Healthcheck บน slim (`urllib.request`, `127.0.0.1:8000`) | `references/healthcheck.md` | §E |
| `.dockerignore` กัน `.venv` / artifact ของ CI / `.env` | `references/build-gotchas.md` | §F |
| DNS: ชื่อ host สั้นของ DB resolve ไม่ได้ในคอนเทนเนอร์ | `references/db-dns.md` | §G |
| Compose conventions + ห้าม `no-new-privileges` บน docker02 | `references/compose.md` | §H, §K |
| [DJANGO] static files — `collectstatic` + WhiteNoise | `references/django-static.md` | §I |

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
ใช้ `docker compose -f <file> up -d --no-build` เสมอ — flag นี้บังคับให้ compose
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
| Dockerfile | `docker/Dockerfile.web` มี `EXPOSE 8000` + `HEALTHCHECK` | `docker/Dockerfile.batch` **ไม่มี** port/healthcheck เลย (ดู `references/healthcheck.md`) |
| Compose | service name `app`, มี `ports:`/`healthcheck:`/`restart: unless-stopped` | service name `job`, ตัด `ports:`/`healthcheck:` ทิ้ง, `restart: "no"` (container รันจบแล้วต้องหายไป ไม่ restart loop) |

Import-check ของ [BATCH] คือ smoke check เดียวกับที่ `tests/test_smoke.py` ทำใน
CI (`importlib.import_module("__APP_MODULE__")`) — แต่รันกับ **image จริง**
หลัง build เสร็จ เพื่อจับกรณี `requirements.txt` ขาด dependency ที่ทำให้ import
พังเฉพาะใน container (ต่างจาก dev machine ที่มี package เก่าติดอยู่).

## C. [BATCH] shape — host cron รัน job

Jenkins deploy image เสร็จแล้ว**จบหน้าที่** — ไม่มี process ไหนเรียก job ให้เอง
ต่อ. คนตั้ง cron คือ **host admin**, ไม่ใช่ Jenkins pipeline — เป็นแถวในตาราง
cron `[CRON]` (ตาราง G) ของ `admin-handoff.template.md` ตามตัวอย่าง crontab นี้:

```
# sudo crontab -u jenkins -e   (user jenkins: owns /home/docker02/appdata, in group docker)
0 2 * * * cd /opt/apps/__PROJECT_NAME__ && docker compose run --rm job >> /home/docker02/appdata/__PROJECT_NAME__/logs/cron.log 2>&1
```

อ่านทีละส่วน:

- `cd /opt/apps/__PROJECT_NAME__` — ต้องรันจาก path ที่มี `docker-compose.yml`
  ของโปรเจคนั้นอยู่ (ไม่งั้น `docker compose` หาไฟล์ compose ไม่เจอ)
- `docker compose run --rm job` — สร้าง container ใหม่จาก service `job`, รันจบ
  แล้ว **ลบตัวเองทิ้ง** (`--rm`) ต่างจาก `up -d` ที่ปล่อยค้าง — ตรงกับธรรมชาติ
  ของ batch job ที่ไม่ควรมี container ค้างระหว่างรอบ
- `>> .../cron.log 2>&1` — log ของ cron เอง (stdout+stderr ของการรัน job)
  ต้องอยู่ใต้ `/home/docker02/appdata/<project>/` เช่นเดียวกับข้อมูล persist อื่น
  (ดู `references/volumes.md`) เพื่อให้ backup ของ host คลุมถึงและรอดข้าม deploy รอบถัดไป
- ความถี่ (`0 2 * * *` = ทุกวันตี 2) เป็นตัวอย่าง — ปรับตาม requirement จริง
  ของแต่ละ job แล้วบันทึกไว้ใน admin handoff เพื่อให้ทีมอื่นเห็นว่ามี cron
  แอบรันอยู่

**ใช้ `docker compose` (v2 plugin syntax) ในบรรทัด cron ให้ตรงกับ
Jenkinsfile** — cron รันบน host เดียวกันแต่คนละ
context จาก Jenkins agent; เช็ค binary ที่มีจริงบน host ก่อนตั้ง cron
(`docker compose version`) แล้วใช้ตัวเดียวกับที่ Jenkinsfile ใช้จริง (host เก่า
ที่มีแต่ v1 และแก้ Jenkinsfile กลับไป `docker-compose` ก็ต้องใช้ v1 ใน cron
ด้วย) — สอง binary ไม่ compatible กัน 100% ในทุกกรณี (env-var interpolation
ต่างกันเล็กน้อย).

### shape web ที่มี job ตามรอบ (มติ 2026-10-09: host cron — หรือทางเลือกด้านล่าง)

ไม่ต้องแยก shape batch — code อยู่ใน container web อยู่แล้ว ให้ cron สั่งรันใน
container ที่ยืนอยู่:

```
0 2 * * * docker exec __PROJECT_NAME__ python -m app.jobs.cleanup >> /home/docker02/appdata/__PROJECT_NAME__/logs/cron.log 2>&1
```

- job หนึ่งตัว = module หนึ่งตัวที่รันจบแล้ว exit (`if __name__ == "__main__"`) ·
  idempotent · exit code ≠ 0 เมื่อพัง (cron log จะเห็น)
- **ห้าม** APScheduler / Celery beat / `schedule` / loop `sleep` ในแอป — container
  restart หรือรันสองตัวจะได้ job ซ้ำ และไม่มีใครเห็นใน handoff
- ตั้งเฉพาะ prod (dev รันมือด้วยบรรทัดเดียวกันกับ `__PROJECT_NAME__-dev`)

### ทางเลือก: cron service ใน compose ของ prod (ไม่ต้องตั้ง host cron)

ใช้แทน host cron ได้กับ shape web ที่มี job ตามรอบ — ตารางเวลาเดินทางไปกับ image,
Jenkins deploy ให้เอง admin ไม่ต้องแก้ crontab ของ host, เวลาเป็นเวลาไทยตาม `TZ` ของ
service (ตั้งใน compose ด้านล่าง — `Dockerfile.web` ไม่ได้ตั้ง ไม่ใส่ = รันตามเวลา UTC) และ retry
เขียนไว้ในบรรทัด crontab ได้ ไม่ใช่ in-app scheduler: เป็น container/process ของมันเอง
หนึ่งตัวต่อ environment

**Dockerfile** — supercronic (cron สำหรับ container: รัน non-root ได้ และส่ง env ของ
container ต่อให้ job — busybox `crond` ไม่ส่ง) pin version + ตรวจ SHA1 จาก release notes
ของ `supercronic-linux-amd64` · วาง **หลัง `pip install` ก่อน `COPY . .`** (ยังเป็น root และ cache
ไม่หลุดทุก commit — ไม่งั้นทุก build โหลดจาก GitHub ใหม่):

```dockerfile
ARG SUPERCRONIC_VERSION=v0.2.49
ARG SUPERCRONIC_SHA1SUM=e63c11a9726b775a6a11801e81af4f3fb926aa68
RUN python -c "import urllib.request as u; u.urlretrieve('https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64', '/usr/local/bin/supercronic')" \
 && echo "${SUPERCRONIC_SHA1SUM}  /usr/local/bin/supercronic" | sha1sum -c - \
 && chmod +x /usr/local/bin/supercronic
```

(slim ไม่มี `curl` จึงโหลดด้วย python ที่มีอยู่แล้ว · ห้ามเขียน comment ท้ายบรรทัด `ARG` —
Dockerfile ไม่มี inline comment · ต้องเปิด `github.com` + `release-assets.githubusercontent.com` (ปลายทาง redirect ของ release) ให้ docker host ตอน build)

แล้ว **หลัง `COPY . .`** เพิ่ม `RUN supercronic -test /app/jobs.crontab` — crontab ผิดหรือ
ลืมขั้นติดตั้ง = build แดง (ถ้าไม่มีบรรทัดนี้ container cron จะ restart วน แต่ pipeline ยังเขียว
เพราะ health poll ดูแค่เว็บ แล้ว job ไม่เคยรันโดยไม่มีใครรู้)

**crontab ใน repo** (เช่น `jobs.crontab`) — supercronic รันแต่ละบรรทัดผ่าน
`/bin/sh -c` ที่ `WORKDIR` ของ image:

```
# Monday 08:00 (the service TZ); retried every 10 minutes up to 2 more times
0 8 * * 1 python -m app.jobs.export || (sleep 600; python -m app.jobs.export) || (sleep 600; python -m app.jobs.export)
```

**`docker-compose.yml` เท่านั้น** — ห้ามใส่ใน `docker-compose.dev.yml` (dev จะรัน job ซ้ำกับ prod):

```yaml
  cron:
    image: __PROJECT_NAME__:latest
    pull_policy: never
    container_name: __PROJECT_NAME__-cron
    restart: unless-stopped
    command: ['supercronic', '/app/jobs.crontab']
    stop_grace_period: 15m        # supercronic รอ job ที่รันอยู่จบก่อนออก — deploy ระหว่าง job ไม่ฆ่าทิ้ง
    volumes:                      # เฉพาะที่ job ใช้ — path เดียวกับ service app
      - /home/docker02/appdata/__PROJECT_NAME__/logs:/app/logs
    environment:                  # key เดียวกับ service app ที่ job ต้องใช้ (มาจาก .env)
      TZ: Asia/Bangkok            # เวลาใน crontab — python slim มี tzdata อยู่แล้ว
      DATABASE_URL: ${DATABASE_URL}
    healthcheck:
      disable: true               # HEALTHCHECK ของ image ยิงเว็บที่ service นี้ไม่ได้รัน
    logging:                      # เหมือน service app
      driver: json-file
      options:
        max-size: '10m'
        max-file: '3'
```

- ไม่มีแถวในตาราง cron `[CRON]` ของ handoff · Jenkinsfile ไม่ต้องแก้ (`up -d` เปิดทั้งสอง
  service, health poll ดูแค่ container ของเว็บ) · bind ใหม่ต้องอยู่ในบรรทัด `for p in` ของ `[VOLUME]`
  (โปรเจคที่ลบบล็อก `[VOLUME]` ทิ้งตอน setup → ใส่กลับจาก `assets/Jenkinsfile`)
- job เรียกเว็บผ่าน `proxy-network` หรือกินแรมมาก (Chromium) → copy `networks:` / `deploy.resources`
  จาก service app · ใส่ `TZ: Asia/Bangkok` ให้ service app ด้วย ไม่งั้น `datetime.now()` ของ job กับเว็บคนละโซน
- deploy ระหว่าง job รัน: `up -d` รอได้ถึง `stop_grace_period` แล้วฆ่า และ supercronic ไม่รันรอบที่พลาดซ้ำ —
  retry ใน crontab ให้สั้น (รวมไม่เกิน grace) และอย่า push `main` ช่วงเวลา job
- ดู log ด้วย `docker logs __PROJECT_NAME__-cron`
- Origin: mtn-work-planning (export รายสัปดาห์ + Chromium) · แบบเดียวกับ service `cron` ของ ugt-hrms · 2026-10-25
