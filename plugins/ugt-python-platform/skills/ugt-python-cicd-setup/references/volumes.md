# Volume — ownership (user `app`) และ bind mount จาก Jenkins (DooD)

ทำให้ bind mount ใต้ `/home/docker02/appdata/<project>/` **เขียนได้จริง** (กติกาสรุปอยู่ `references/org-standards.md` §9)
และกติกา bind mount ใน `docker run` จาก Jenkinsfile

## Ownership เป็นเรื่องคนละเรื่องกับ path

Path ของ persistent data ตาม contract กลาง (`ugt-core/contracts/cicd.md` §
Persistent data) คือ:

```
/home/docker02/appdata/<project>/<name>        # prod
/home/docker02/appdata/<project>-dev/<name>    # dev
```

แต่ path ถูกต้องไม่ได้แปลว่า container **เขียนได้**. Dockerfile ทั้งสอง shape
(`Dockerfile.web`, `Dockerfile.batch`) รันเป็น non-root system user `app`
(`RUN addgroup --system app && adduser --system --ingroup app app` แล้ว
`USER app`) — bind mount เข้ามาที่ path บน host ที่ owner เป็นคนละ UID จะทำให้
`app` เขียนไฟล์ไม่ได้ (`PermissionError: [Errno 13]`) แม้ compose ขึ้น healthy
ปกติทุกอย่าง (เพราะ error โผล่ตอนโค้ด **เขียน** volume จริง ไม่ใช่ตอน start).

### กลไกหลัก — Jenkinsfile mkdir+chown ให้อัตโนมัติทีละ subdir

บล็อก `[VOLUME]` ในสเตจ Deploy ของ Jenkinsfile ทำเรื่องนี้ให้เองแล้ว โดยวนเช็ค
**ทีละ subdir ที่ compose bind จริง** และทำเฉพาะตัวที่ยังไม่มี (idempotent —
subdir ที่มีอยู่แล้วถูกข้าม ไม่ chown ซ้ำทุกรอบ deploy):

```sh
APP_UID=$(docker run --rm ${imageName}:${buildNum} id -u)
# runs in a container ON THE DOCKER HOST (same path mounted) — never on the Jenkins
# agent's disk: Jenkins may be another machine that only mounts the docker socket
docker run --rm -e APP_UID="$APP_UID" -v /home/docker02/appdata:/home/docker02/appdata alpine sh -c '
  for p in /home/docker02/appdata/${containerName}/uploads /home/docker02/appdata/${containerName}/reports; do
    if [ ! -d "$p" ]; then mkdir -p "$p" && chown -R "$APP_UID" "$p"; fi
  done'
```

ตอนกรอกรายชื่อ volume จาก interview ข้อ 6 ให้แทน `uploads`/`reports` ในบรรทัด
`for p in …` ด้วยชื่อ subdir จริง**ทุกตัวที่ compose bind** — ไม่ใช่แค่ระดับ
โปรเจค: compose bind ที่ `/home/docker02/appdata/<project>/<name>` ถ้า `<name>` ยังไม่มี
ตอน `up -d` **dockerd จะสร้างให้เองเป็น `root:root`** (พฤติกรรมมาตรฐานของ
bind mount ที่ path ปลายทางหาย) แล้ว user `app` เขียนไม่ได้ทั้งที่ container
ขึ้น `healthy` ปกติทุกอย่าง.

**ห้ามย้อนกลับไปครอบทั้งบล็อกด้วย guard ระดับโปรเจค**
(`if [ ! -d /home/docker02/appdata/<project> ]`): guard แบบนั้น
กลายเป็น no-op ถาวรทันทีที่ deploy แรกสร้างโฟลเดอร์โปรเจคขึ้นมา — volume ที่
เพิ่มในรุ่นถัดไปจะไม่มีวันถูก mkdir/chown และไปโผล่เป็น `PermissionError`
ตอนแอปเขียนไฟล์จริง

จุดสำคัญที่ทำให้กลไกนี้ทำงานได้แม้ Jenkins agent เองไม่ใช่ root:

- **หา UID จริงจาก image ที่เพิ่ง build** (`docker run --rm ${imageName}:${buildNum} id -u`)
  ไม่เดาว่า 999/1000 — เลข UID ของ `adduser --system` ขึ้นกับลำดับที่ base
  image สร้าง system user ไว้ก่อนหน้า เปลี่ยนได้ทุกครั้งที่ `python:3.12-slim`
  bump เวอร์ชันหรือลำดับ `RUN` ใน Dockerfile ถูกแก้ — จึงต้องอ่านจาก image จริง
  ทุกครั้ง ไม่ hardcode
- **`chown` เองไม่ได้เพราะ Jenkins user ไม่ใช่ root บนโฮสต์** — แต่ Jenkins
  user อยู่ใน `docker` group (ตาม มติ M8 / เช็คลิสต์ admin-handoff) จึงสั่ง
  `docker run` ได้; รันเป็น container `alpine` แยกที่ mount `/home/docker02/appdata/<project>`
  bind เข้ามาที่ `/d` แล้ว `chown -R` ข้างในนั้น — container นี้เองรันเป็น
  root โดย default จึง chown ได้ แม้ Jenkins agent ข้างนอกจะไม่ใช่ root
- guard `if [ ! -d "$p" ]` **ต่อ subdir** ทำให้ container chown รันเฉพาะตอนมี
  subdir ใหม่ ไม่ chown ซ้ำทุก deploy (ส่วนการหา UID รันทุกรอบโดยตั้งใจ —
  ถูกมาก และกัน base image ที่ bump แล้ว UID ของ `adduser --system` เลื่อน)

### ทางเลือกสำรอง — chown มือ (path ที่มีอยู่ก่อนกลไกนี้ หรือ debug)

สำหรับ path ที่ถูกสร้างไว้ก่อนบล็อก `[VOLUME]` เวอร์ชันนี้ (เช่น อัปเดต skill
บนโปรเจคเก่า) หรือเวลา debug ปัญหา permission เอง ใช้คำสั่งเดียวกันแบบรันมือ
ได้:

```sh
docker run --rm __PROJECT_NAME__:latest id -u
# หรือระบุ group ด้วย:
chown -R $(docker run --rm __PROJECT_NAME__:latest id -u):$(docker run --rm __PROJECT_NAME__:latest id -g) /home/docker02/appdata/__PROJECT_NAME__/<name>
```

ทั้งสองทางใช้ตรรกะเดียวกัน (อ่าน UID จาก image จริง แล้ว chown path ให้ตรง) —
ต่างกันแค่ทางแรกรันอัตโนมัติผ่าน Jenkinsfile ตอน deploy ครั้งแรก ทางที่สองไว้
แก้ปัญหากรณีพิเศษที่กลไกอัตโนมัติไม่ครอบ (path เก่า, หรือ mount เพิ่มทีหลัง
โดยไม่ได้ผ่าน deploy รอบใหม่).

## Docker-outside-of-Docker (DooD) — bind-mount path ต้องเป็น host path จริงเท่านั้น

**อาการ**: stage ที่เรียก `docker run -v "$PWD/<dir>":/src ...` (เช่นรัน tool
ด้วย container แยกจาก image หลัก) พังบน Jenkins host จริงด้วย:

```
docker: Error response from daemon: error while creating mount source path
'/var/jenkins_home/workspace/<job>/<dir>': mkdir /var/jenkins_home:
read-only file system.
```

ทั้งที่ path เดียวกันรันผ่านปกติตอนทดสอบบนเครื่อง dev เอง

**สาเหตุ**: Jenkins agent รันอยู่ใน container ของตัวเอง โดย mount
`docker.sock` มาจาก host (Docker-outside-of-Docker / DooD topology) —
`$PWD`/`$WORKSPACE` ที่ agent เห็นเป็น path **ข้างในคอนเทนเนอร์ของ agent
เท่านั้น** ไม่ใช่ path บน host จริง เมื่อสั่ง `docker run -v` คำสั่งนี้ยิงไปหา
host docker daemon โดยตรง (ผ่าน `docker.sock` — เป็น sibling container ไม่ใช่
nested) daemon ตัวนั้นไม่รู้จัก path ข้างในของ agent container เลย พยายาม
`mkdir` path นั้นเองบน host แล้วชน read-only filesystem (ยืนยันจากอินซิเดนต์
จริงโปรเจค ugt-bd-forecast 2026-09-03)

**ทางแก้ที่ 1 — ต้องคง state ข้าม step ในไฟล์เดียวกัน**: ใช้ Docker Pipeline
plugin's `docker.image().inside{}` แทน `docker run -v` ตรง ๆ — pattern เดียวกับ
ทุก stage อื่นในไฟล์ template นี้เอง (Install/Lint/Unit Tests) `.inside{}` ให้
plugin resolve mount ที่ถูกต้องเองโดย inspect running agent container แทนที่
จะเดา path เอง:

```groovy
script {
    docker.image('python:3.12-slim').inside {
        sh '.venv/bin/ruff check .'
    }
}
```

**ทางแก้ที่ 2 — one-shot ไฟล์เดียว ไม่ต้องคง state**: เลี่ยง bind-mount ไปเลย
ใช้ stdin pipe แทน (มีอยู่แล้วจริงใน `ugt-mscpl-ana/Jenkinsfile` stage
"Lint Dockerfile" ที่ deploy ผ่านจริง):

```sh
docker run --rm -i hadolint/hadolint < Dockerfile
```

**ทำไม pattern `[VOLUME]` เดิม (ส่วน Ownership ด้านบน) ไม่พังแบบนี้**: บล็อก chown ด้วย
`alpine` ใน `[VOLUME]` ก็เรียก `docker run -v` เหมือนกัน แต่ path ที่ mount
(`/home/docker02/appdata/<project>/...`) เป็น **host path จริง** ที่ตั้งไว้
ในสัญญากลางอยู่แล้ว ไม่ได้มาจาก `$PWD`/`$WORKSPACE`/git checkout — host
docker daemon จึงรู้จัก path นั้นและ mount ได้ปกติ. กติกาที่ตามมา: bind-mount
ใน `docker run` จาก Jenkinsfile ใช้ได้ปลอดภัยเฉพาะตอน path เป็น host path
จริงเท่านั้น (เช่น `/home/docker02/appdata/...`) — path ที่มาจาก
`$PWD`/`$WORKSPACE`/git checkout ห้าม bind-mount ตรง ๆ เด็ดขาด ให้ใช้
`.inside{}` หรือ stdin pipe แทนเสมอ
