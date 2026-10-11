# WordPress deploy — wp-content volume, core upgrade, anonymous webroot volume

กลไก deploy เฉพาะ shape = wordpress (`Dockerfile.wordpress`) — ขั้นตั้งค่าตอน setup อยู่ที่ `references/shapes.md` §WordPress

เนื้อหา: Dockerfile ของ shape นี้ · ทำไม wp-content ต้องเป็น volume เสมอ · โค้ดของโปรเจคขึ้น container ทางไหน ·
core upgrade ผ่าน image ใหม่ · health file กับ anonymous volume ของ webroot (`--renew-anon-volumes`) ·
merge `[VOLUME]` + `[WP]` เป็น `volumes:` ก้อนเดียว

`docker/Dockerfile.wordpress` (`FROM wordpress:php8.3-apache`) เป็น image
คนละ shape จาก `Dockerfile.web` — official `wordpress:*` image มี
`docker-entrypoint.sh` ของตัวเองที่ copy WordPress core (`/usr/src/wordpress`)
เข้า `/var/www/html` **ตอน container start** ไม่ใช่ตอน build เหมือน `COPY . .`
ของ `Dockerfile.web` — Dockerfile ของ skill นี้จึงไม่มี `COPY . .` เลย มีแค่
วาง health endpoint ไว้นอก `wp-content`:

```
FROM wordpress:php8.3-apache
COPY api/health/index.php /var/www/html/api/health/index.php
RUN chown -R www-data:www-data /var/www/html/api
```

## ทำไม wp-content ต้องเป็น volume เสมอ

Plugin/theme uploads (media, ปลั๊กอินที่ติดตั้งผ่าน wp-admin, custom theme)
เขียนลง `wp-content/` ทั้งหมด — ถ้าไม่ mount เป็น volume ตาม `[WP]` block ใน
compose (ดู `docker-compose.yml`/`docker-compose.dev.yml` บล็อก `# [WP]` —
หรือหัวข้อย่อย "ถ้าโปรเจคมีทั้ง `[VOLUME]` custom และ `[WP]`" ท้ายไฟล์นี้) ของ
ที่ upload ผ่าน wp-admin ตอน container รันจะหาย
ทุกครั้งที่ deploy รอบถัดไปสร้าง container ใหม่จาก image (entrypoint เขียน
core ทับ แต่ image เองไม่มี state ของ uploads เดิม) — เหมือนกับปัญหา volume
ทั่วไปตาม `[VOLUME]` block ของ Jenkinsfile แต่ WordPress มีจุดพิเศษคือ**บังคับ
เสมอ ไม่ใช่ optional ตาม interview** เพราะไม่มี WordPress project ไหนที่ไม่
เขียนอะไรลง wp-content เลย

## แล้วโค้ดของโปรเจคขึ้น container ทางไหน

คำถามที่ตามมาทันทีจากสองย่อหน้าบน: ถ้า image = base + ไฟล์ health เท่านั้น และ
`wp-content` เป็น bind mount เปล่า ๆ ที่ไม่มีอะไรเติมให้ — โค้ดของโปรเจคไปอยู่
ที่นั่นได้ยังไง ชุดนี้รองรับ 2 ทาง (`references/shapes.md` §WordPress สั่งให้บอกผู้ใช้
ตั้งแต่ตอน setup ว่าโปรเจคนี้ใช้ทางไหน):

1. **ทางหลัก — `wp-content` คือข้อมูล runtime ไม่ใช่ artifact ของ pipeline**
   theme/plugin/media ติดตั้งผ่าน **wp-admin ครั้งแรกหลัง deploy** แล้วอยู่ยาว
   ใน `/home/docker02/appdata/<project>/wp-content` ข้าม deploy ถัดไปเอง — pipeline
   เปลี่ยนเฉพาะสิ่งที่มากับ image (core + health) ไม่เคยแตะ `wp-content` เลย
   นี่คือเหตุผลที่ volume นี้บังคับ และคือสาเหตุที่ deploy รอบสองไม่ทำให้ของหาย
2. **repo ที่ track theme/plugin ที่เขียนเอง** — โค้ดชุดนั้นต้องถูก copy ฝั่ง
   **โฮสต์** ลง bind mount ก่อน `up -d` (ทำได้เพราะเป็น bind mount ไม่ใช่ named
   volume — path เดียวกันมองเห็นได้ทั้งจาก Jenkins และจาก container):

   ```groovy
   // [WP] วางหลังบล็อก [VOLUME] (path + chown ต้องมาก่อน) และก่อน docker-compose up
   sh "cp -r wp-content/. /home/docker02/appdata/${containerName}/wp-content/"
   ```

   - `cp -r <dir>/.` (จุดต่อท้าย) คัดลอก *เนื้อใน* ไม่ใช่ตัวโฟลเดอร์ — ลืมจุด
     แล้วจะได้ `wp-content/wp-content` ซ้อนกันหนึ่งชั้น
   - ทับไฟล์ชื่อซ้ำแต่ **ไม่ลบ** ของที่ติดตั้งผ่าน wp-admin ไว้; อยากได้ mirror
     เป๊ะ ๆ ต้อง `rsync --delete` ซึ่ง **ห้ามเป็นค่า default** เพราะจะลบ
     `uploads/` ของผู้ใช้ทิ้งทุกรอบ deploy
   - **ยังไม่ผ่าน pilot** — ownership หลัง `cp` (jenkins vs `www-data`) ยังไม่
     เคยพิสูจน์กับโปรเจคจริง; `chown -R` ของบล็อก `[VOLUME]` รัน**ครั้งแรก
     ครั้งเดียว** (มี `if [ ! -d ... ]` ครอบ) จึงไม่ครอบไฟล์ที่ `cp` เข้ามาใน
     รอบถัดไป — โปรเจคแรกที่ใช้ทางนี้ต้องเช็ค permission จริงแล้วส่ง feedback
     กลับมาที่ plugin

ผลพลอยได้: ข้อนี้กำหนดว่า **SonarQube สแกนอะไร** — สิ่งที่ scanner เห็นคือโค้ด
ใน repo (theme/plugin ที่เขียนเอง) เท่านั้น ไม่ใช่ WordPress core ซึ่งไม่เคยอยู่
ใน repo อยู่แล้ว และถูก `sonar.exclusions` (`**/wp-admin/**`, `**/wp-includes/**`)
กันไว้ซ้ำอีกชั้นเผื่อโปรเจคที่เผลอ commit core เข้ามา

## Core upgrade ผ่าน image ใหม่ ไม่ auto-update ในคอนเทนเนอร์

WordPress core version ผูกกับ base image tag (`wordpress:php8.3-apache`
เป็น floating tag ที่ Docker Hub bump ตาม WP เวอร์ชันล่าสุด — ปักเวอร์ชันเจาะจง
เช่น `wordpress:6.6-php8.3-apache` ถ้าต้องการ core version คงที่ระหว่าง build)
เส้นทางอัปเดต core ที่ถูกต้องคือ **rebuild image แล้ว deploy ผ่าน Jenkins ตาม
ปกติ** (bump tag → push → pipeline ผ่าน Quality Gate → Docker Build → Deploy)
ไม่ใช่ปล่อยให้ WordPress core อัปเดตตัวเองระหว่าง container กำลังรัน — ปิด
auto-update ด้วยการเพิ่มบรรทัดนี้ใน `wp-config.php` ของโปรเจค:

```php
define('WP_AUTO_UPDATE_CORE', false);
```

เหตุผลที่ต้องปิด:

- container ถูกสร้างใหม่จาก image ทุกครั้งที่ deploy (`up -d --no-build` ใช้
  image ที่เพิ่งผ่าน Quality Gate) — core ที่ WordPress self-update เขียนลงไป
  ระหว่าง container รันอยู่จะ**หายเมื่อ container ถูกสร้างใหม่รอบถัดไป**
  (entrypoint ของ image เดิมเขียน core เวอร์ชันเก่าทับอีกที) กลายเป็น core
  เด้งขึ้นเด้งลงเวอร์ชันโดยไม่มีใครควบคุม
- self-update ข้าม pipeline ทั้งชุด (ไม่ผ่าน OWASP Dependency Check /
  SonarQube / Quality Gate) — ไม่มี record ว่า core เวอร์ชันที่รันจริงคือ
  เวอร์ชันไหน ต่างจากที่ Jenkins build ไว้

## Health file: รอดจาก wp-content mount — แต่ติดกับดัก anonymous volume ของ webroot

`api/health/index.php` ถูกวางไว้ที่ `/var/www/html/api/health/index.php` —
path นี้อยู่**นอก** `/var/www/html/wp-content` จึงไม่ถูก bind mount ของ
`wp-content` บัง (compose mount เจาะจงแค่ subdirectory `wp-content` ไม่ใช่ทั้ง
`/var/www/html`) endpoint นี้จึงตอบได้ปกติแม้ `wp-content` เป็น volume ว่าง
ตอน container แรกสุด — HEALTHCHECK ของ image ก็ยิงเข้าไฟล์นี้เหมือน
`Dockerfile.web` ทุกประการ (ดู `references/healthcheck.md`)

**แต่มีอีกชั้นที่ต้องรู้**: `Dockerfile` ของ image ทางการ `wordpress:*` ประกาศ
`VOLUME /var/www/html` ไว้เอง แปลว่า **ทั้ง webroot** เป็น anonymous volume
เสมอ ไม่ใช่ไฟล์ใน image layer และ `docker compose up -d` ตอน deploy รอบถัดไป
**ยกของเดิมจากคอนเทนเนอร์ก่อนหน้ามาใช้ต่อ** (พฤติกรรมมาตรฐานของ compose กับ
anonymous volume — `-V` / `--renew-anon-volumes` คือ flag ที่สั่งไม่ให้ทำแบบนั้น)
ผลสองข้อ:

1. **ไฟล์ที่เปลี่ยนใน image ใหม่ไม่ขึ้นถึงคอนเทนเนอร์** — รวมถึง
   `/var/www/html/api/health/index.php` ที่ `Dockerfile.wordpress` เป็นคน `COPY`
   เข้ามา: deploy รอบแรกได้ไฟล์จาก image (volume ถูก initialize จาก image ตอน
   สร้างครั้งแรก) แต่รอบที่ 2 เป็นต้นไปได้ไฟล์ **เวอร์ชันเดิมจาก volume เก่า**
   แก้ health แล้ว push ไปกี่รอบก็ไม่มีผล
2. **anonymous volume กองสะสม** — ทุกครั้งที่มีการสร้าง volume ใหม่ ของเก่าค้าง
   อยู่บน host โดยไม่มีชื่อให้ตามเก็บ (`docker volume prune` เท่านั้นที่เก็บได้)

> **ทำไม core อัปเดตได้ทั้งที่มีข้อ 1** — ไม่ใช่เพราะ volume ถูกรีเฟรช แต่เพราะ
> `docker-entrypoint.sh` ของ image **แตก core จาก `/usr/src/wordpress` ทับ
> `/var/www/html` ให้ใหม่ทุกครั้งที่ container start** (มันเทียบเวอร์ชันแล้ว
> copy ทับ) — กลไกนี้ครอบเฉพาะไฟล์ของ WordPress core ไม่ครอบ `api/health/` ที่
> เป็นของเราเอง

**ทางแก้ที่ชุดนี้เลือก — `--renew-anon-volumes` เฉพาะ shape = wordpress**:

```groovy
// [WP] shape = wordpress เท่านั้น — webroot ของ image นี้เป็น anonymous volume
sh "docker compose -f ${composeFile} up -d --no-build --force-recreate --renew-anon-volumes"
```

- ปลอดภัยกับข้อมูลผู้ใช้: flag นี้แตะเฉพาะ **anonymous** volume — `wp-content`
  เป็น **bind mount** ที่ประกาศชื่อไว้ในทั้ง 2 compose (`/home/docker02/appdata/...`)
  จึงไม่โดนแตะเลย ซึ่งเป็นเหตุผลอีกข้อที่ `wp-content` เป็น volume **บังคับ**:
  ทุกอย่างที่ต้องรอดต้องอยู่ในนั้น ไม่ใช่ที่อื่นใน webroot
- ราคาที่จ่าย: container start ช้าขึ้นเล็กน้อยเพราะ entrypoint แตก core ใหม่
  ทุก deploy (หลักสิบวินาที — `start_period: 60s` ครอบอยู่แล้ว)
- ทางเลือกที่ **ไม่** เลือก: bind-mount ไฟล์ health จากโฮสต์ทับเข้าไป — ได้ผล
  เหมือนกันแต่ต้องมีขั้น copy ไฟล์ลง `/home/docker02/appdata` ก่อน `up -d` เพิ่มอีกจุดที่
  ลืมได้ และทำให้ image ไม่ใช่แหล่งความจริงเดียวของ endpoint นี้อีกต่อไป
- `Dockerfile.web` (Laravel/CI/legacy) **ไม่มีปัญหานี้** — `php:*-apache` ไม่ได้
  ประกาศ `VOLUME` ไว้ ทุกไฟล์อยู่ใน image layer ตรง ๆ จึงใช้
  `up -d --no-build` เปล่า ๆ ตามปกติ

## ถ้าโปรเจคมีทั้ง `[VOLUME]` custom และ `[WP]` — ต้อง merge บล็อกเอง

`docker-compose.yml`/`docker-compose.dev.yml` มี**สอง** `# volumes:` comment
block แยกกัน (บล็อกทั่วไปสำหรับ `[VOLUME]` จาก interview ข้อ 6 กับบล็อก `[WP]`
สำหรับ `wp-content`) — YAML อนุญาต key `volumes:` ได้แค่หนึ่งอันต่อ service
ถ้าโปรเจค WordPress มี custom volume เพิ่มเติมนอกจาก `wp-content` (เช่น
uploads directory แยก) ต้อง**รวมรายการเข้า `volumes:` เดียวกันเอง** ไม่ใช่
ปล่อยสอง block ไว้แยกกัน (จะ parse ไม่ผ่านหรือ block หลังทับ block แรก
ขึ้นกับ YAML parser)
