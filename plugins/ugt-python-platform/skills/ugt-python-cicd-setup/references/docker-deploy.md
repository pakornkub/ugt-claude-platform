# Docker Deploy — ภาพรวม (Python)

ภาพรวมกลไก deploy: branch → deploy target, สอง shape `[WEB]` / `[BATCH]`, job ตามรอบผ่าน host cron —
รายละเอียดเชิงลึกแยกไฟล์ตามหัวข้อ (ตารางด้านล่าง)

## หัวข้อเชิงลึก — ไฟล์ไหน

| หัวข้อ | ไฟล์ | เดิมคือ |
| --- | --- | --- |
| Branch → deploy target · [WEB] vs [BATCH] · host cron | ไฟล์นี้ | §A, §B, §C |
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

### shape web ที่มี job ตามรอบ (มติ 2026-10-09: host cron เท่านั้น)

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
