# Volume — ownership (`www-data`) และ bind mount จาก Jenkins (DooD)

ทำให้ bind mount ใต้ `/home/docker02/appdata/<project>/` **เขียนได้จริง** (กติกาสรุปอยู่ `references/org-standards.md` §9)
และกติกา bind mount ใน `docker run` จาก Jenkinsfile

เนื้อหา: path ถูกไม่ได้แปลว่าเขียนได้ · user ที่ต้อง chown ให้ = `www-data` ไม่ใช่ root ·
กลไก mkdir+chown อัตโนมัติทีละ subdir · `[WP]` wp-content ใช้กลไกเดียวกัน · chown มือ (สำรอง) ·
Docker-outside-of-Docker: bind-mount path ต้องเป็น host path จริงเท่านั้น

## Ownership เป็นเรื่องคนละเรื่องกับ path

Path ของ persistent data ตาม contract กลาง (`ugt-core/contracts/cicd.md` §
Persistent data) คือ:

```
/home/docker02/appdata/<project>/<name>        # prod
/home/docker02/appdata/<project>-dev/<name>    # dev
```

แต่ path ถูกต้องไม่ได้แปลว่า container **เขียนได้**. bind mount ที่ owner บน
host เป็นคนละ UID กับ user ที่เขียนไฟล์จริงในคอนเทนเนอร์ ทำให้แอปเขียนไม่ได้
(`permission denied` / `failed to open stream`) ทั้งที่ compose ขึ้น `healthy`
ปกติทุกอย่าง — เพราะ error โผล่ตอนโค้ด **เขียน** volume จริง ไม่ใช่ตอน start

### ใครคือ user ที่ต้อง chown ให้ — `www-data` ไม่ใช่ root

จุดที่ PHP ต่างจากฝั่ง python ชัดที่สุด: `Dockerfile.web` และ
`Dockerfile.wordpress` **ไม่มี `USER` directive** — apache ยัง start เป็น root
เพื่อ bind port 80 แล้ว **drop privilege เองตอน fork worker** ไปเป็น `www-data`
(`APACHE_RUN_USER` ใน `envvars` ของ base image) กระบวนการที่เขียนไฟล์จริงจึงเป็น
`www-data` เสมอ ไม่ใช่ root

ผลตามมาที่เป็นกับดัก: `docker run --rm <image> id -u` เปล่า ๆ (สูตรที่ฝั่ง
python ใช้ได้เพราะ image ฝั่งนั้นมี `USER app`) **คืน `0` สำหรับ image ของ PHP**
→ chown volume ให้ root → `www-data` เขียนไม่ได้ ซึ่งคือความพังที่บล็อก
`[VOLUME]` มีไว้กันพอดี. ต้องถาม UID ของ `www-data` เจาะจง:

```sh
docker run --rm <image> id -u www-data      # ปกติ 33 บน Debian — แต่อย่า hardcode
```

### กลไกหลัก — Jenkinsfile mkdir+chown ให้อัตโนมัติทีละ subdir

บล็อก `[VOLUME]` ในสเตจ Deploy ทำเรื่องนี้ให้เองแล้ว โดยวนเช็ค **ทีละ subdir ที่
compose bind จริง** และทำเฉพาะตัวที่ยังไม่มี (idempotent — subdir ที่มีอยู่แล้ว
ถูกข้าม ไม่ chown ซ้ำทุกรอบ deploy):

```sh
APP_UID=$(docker run --rm ${imageName}:${buildNum} id -u www-data)
for p in /home/docker02/appdata/${containerName}/uploads /home/docker02/appdata/${containerName}/reports; do
  if [ ! -d "$p" ]; then
    mkdir -p "$p"
    docker run --rm -v "$p":/d alpine chown -R "$APP_UID" /d
  fi
done
```

ตอนกรอกรายชื่อ volume จาก interview ข้อ 6 ให้แทน `uploads`/`reports` ด้วยชื่อ
subdir จริง **ทุกตัวที่ compose bind** — ไม่ใช่แค่ระดับโปรเจค: compose bind ที่
`/home/docker02/appdata/<project>/<name>` ถ้า `<name>` ยังไม่มีตอน `up -d` **dockerd จะ
สร้างให้เองเป็น `root:root`** (พฤติกรรมมาตรฐานของ bind mount ที่ path ปลายทางหาย)
แล้ว `www-data` เขียนไม่ได้

**ห้ามย้อนกลับไปครอบทั้งบล็อกด้วย guard ระดับโปรเจค**
(`if [ ! -d /home/docker02/appdata/<project> ]`): guard แบบนั้นกลายเป็น no-op ถาวรทันทีที่
deploy แรกสร้างโฟลเดอร์โปรเจคขึ้นมา — volume ที่เพิ่มในรุ่นถัดไปจะไม่มีวันถูก
mkdir/chown

จุดสำคัญที่ทำให้กลไกนี้ทำงานได้แม้ Jenkins agent เองไม่ใช่ root:

- **หา UID จริงจาก image ที่เพิ่ง build ทุกครั้ง ไม่ hardcode `33`** — เลข UID
  ของ `www-data` ตรงกันแทบทุก Debian base ก็จริง แต่โปรเจคที่เปลี่ยน
  `APACHE_RUN_USER` หรือเพิ่ม user เองใน Dockerfile จะเลื่อน อ่านจาก image
  ถูกเสมอและไม่แพงกว่า
- **`chown` เองไม่ได้เพราะ Jenkins user ไม่ใช่ root บนโฮสต์** — แต่อยู่ใน
  `docker` group (มติ M8 / เช็คลิสต์ admin handoff) จึงสั่ง `docker run` ได้:
  รัน container `alpine` แยกที่ bind `/home/docker02/appdata/<project>/<name>` เข้ามาที่
  `/d` แล้ว `chown -R` ข้างในนั้น — container นั้นรันเป็น root โดย default
- guard `if [ ! -d "$p" ]` **ต่อ subdir** ทำให้ container chown รันเฉพาะตอนมี
  subdir ใหม่ (ส่วนการหา UID รันทุกรอบโดยตั้งใจ — ถูกมาก)

### `[WP]` `wp-content` ใช้กลไกเดียวกัน

`wp-content` เป็น volume บังคับ (`references/wordpress-deploy.md`) จึงต้องอยู่ในบรรทัด `for p in …` เหมือน
volume อื่นทุกประการ — WordPress เขียน `wp-content/uploads/` ในนามของ `www-data`
ตอนอัปโหลดผ่าน wp-admin ถ้า subdir นี้เป็น `root:root` ผู้ใช้จะเจอ "ไม่สามารถ
สร้างไดเรกทอรีได้" ในหน้า Media ทั้งที่เว็บขึ้นปกติ

### ทางเลือกสำรอง — chown มือ (path ที่มีอยู่ก่อนกลไกนี้ หรือ debug)

```sh
docker run --rm __PROJECT_NAME__:latest id -u www-data
# หรือระบุ group ด้วย:
chown -R $(docker run --rm __PROJECT_NAME__:latest id -u www-data):$(docker run --rm __PROJECT_NAME__:latest id -g www-data) /home/docker02/appdata/__PROJECT_NAME__/<name>
```

ตรรกะเดียวกับกลไกอัตโนมัติ — ต่างกันแค่ไว้แก้กรณีพิเศษที่ deploy รอบใหม่ไม่ครอบ
(path เก่า, หรือ mount เพิ่มทีหลังโดยไม่ได้ deploy ใหม่)

## Docker-outside-of-Docker (DooD) — bind-mount path ต้องเป็น host path จริงเท่านั้น

**อาการ**: stage ที่เรียก `docker run -v "$PWD/<dir>":/src ...` (เช่น lint
php files ด้วย container แยกจาก image หลัก) พังบน Jenkins host จริงด้วย:

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
    docker.image('php:8.2-cli').inside {
        sh "find public -name '*.php' -print0 | xargs -0 -n1 php -l"
    }
}
```

**ทางแก้ที่ 2 — one-shot ไฟล์เดียว ไม่ต้องคง state**: เลี่ยง bind-mount ไปเลย
ใช้ stdin pipe แทน (มีอยู่แล้วจริงใน `ugt-mscpl-ana/Jenkinsfile` stage
"Lint Dockerfile" ที่ deploy ผ่านจริง):

```sh
docker run --rm -i hadolint/hadolint < Dockerfile
```

**ทำไม pattern `[VOLUME]` เดิม (หัวข้อ Ownership ด้านบน) ไม่พังแบบนี้**: บล็อก chown ด้วย
`alpine` ใน `[VOLUME]` ก็เรียก `docker run -v` เหมือนกัน แต่ path ที่ mount
(`/home/docker02/appdata/<project>/...`) เป็น **host path จริง** ที่ตั้งไว้
ในสัญญากลางอยู่แล้ว ไม่ได้มาจาก `$PWD`/`$WORKSPACE`/git checkout — host
docker daemon จึงรู้จัก path นั้นและ mount ได้ปกติ. กติกาที่ตามมา: bind-mount
ใน `docker run` จาก Jenkinsfile ใช้ได้ปลอดภัยเฉพาะตอน path เป็น host path
จริงเท่านั้น (เช่น `/home/docker02/appdata/...`) — path ที่มาจาก
`$PWD`/`$WORKSPACE`/git checkout ห้าม bind-mount ตรง ๆ เด็ดขาด ให้ใช้
`.inside{}` หรือ stdin pipe แทนเสมอ
