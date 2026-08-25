# Docker Deploy — deep detail (PHP)

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

**PHP มี deploy shape เดียวคือ `[WEB]`** — ไม่มี `[BATCH]` เหมือนฝั่ง python
(ดู comment หัว Jenkinsfile: "Sections marked [WEB] apply to the long-running
web-service deploy shape ... the only deploy shape PHP projects use") ทุก
โปรเจค (Laravel / CodeIgniter / legacy / WordPress) จบที่ apache container
ที่ยืนรอ request ผ่าน reverse proxy เสมอ — ไม่มีตาราง cron ให้ตั้งฝั่ง host,
ไม่มี `docker/Dockerfile.batch`, ไม่มีรายการ `[BATCH]` ใน admin handoff

## B. WordPress — wp-content เป็น volume บังคับ + core upgrade path

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

### ทำไม wp-content ต้องเป็น volume เสมอ

Plugin/theme uploads (media, ปลั๊กอินที่ติดตั้งผ่าน wp-admin, custom theme)
เขียนลง `wp-content/` ทั้งหมด — ถ้าไม่ mount เป็น volume ตาม `[WP]` block ใน
compose (ดู `docker-compose.yml`/`docker-compose.dev.yml` บล็อก `# [WP]` —
หรือหัวข้อย่อย "ถ้าโปรเจคมีทั้ง `[VOLUME]` custom และ `[WP]`" ท้าย §B นี้) ของ
ที่ upload ผ่าน wp-admin ตอน container รันจะหาย
ทุกครั้งที่ deploy รอบถัดไปสร้าง container ใหม่จาก image (entrypoint เขียน
core ทับ แต่ image เองไม่มี state ของ uploads เดิม) — เหมือนกับปัญหา volume
ทั่วไปตาม `[VOLUME]` block ของ Jenkinsfile แต่ WordPress มีจุดพิเศษคือ**บังคับ
เสมอ ไม่ใช่ optional ตาม interview** เพราะไม่มี WordPress project ไหนที่ไม่
เขียนอะไรลง wp-content เลย

### แล้วโค้ดของโปรเจคขึ้น container ทางไหน

คำถามที่ตามมาทันทีจากสองย่อหน้าบน: ถ้า image = base + ไฟล์ health เท่านั้น และ
`wp-content` เป็น bind mount เปล่า ๆ ที่ไม่มีอะไรเติมให้ — โค้ดของโปรเจคไปอยู่
ที่นั่นได้ยังไง ชุดนี้รองรับ 2 ทาง (SKILL.md §5.3 บล็อก `[WP]` สั่งให้บอกผู้ใช้
ตั้งแต่ตอน setup ว่าโปรเจคนี้ใช้ทางไหน):

1. **ทางหลัก — `wp-content` คือข้อมูล runtime ไม่ใช่ artifact ของ pipeline**
   theme/plugin/media ติดตั้งผ่าน **wp-admin ครั้งแรกหลัง deploy** แล้วอยู่ยาว
   ใน `/srv/appdata/<project>/wp-content` ข้าม deploy ถัดไปเอง — pipeline
   เปลี่ยนเฉพาะสิ่งที่มากับ image (core + health) ไม่เคยแตะ `wp-content` เลย
   นี่คือเหตุผลที่ volume นี้บังคับ และคือสาเหตุที่ deploy รอบสองไม่ทำให้ของหาย
2. **repo ที่ track theme/plugin ที่เขียนเอง** — โค้ดชุดนั้นต้องถูก copy ฝั่ง
   **โฮสต์** ลง bind mount ก่อน `up -d` (ทำได้เพราะเป็น bind mount ไม่ใช่ named
   volume — path เดียวกันมองเห็นได้ทั้งจาก Jenkins และจาก container):

   ```groovy
   // [WP] วางหลังบล็อก [VOLUME] (path + chown ต้องมาก่อน) และก่อน docker-compose up
   sh "cp -r wp-content/. /srv/appdata/${containerName}/wp-content/"
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

### Core upgrade ผ่าน image ใหม่ ไม่ auto-update ในคอนเทนเนอร์

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

### Health file: รอดจาก wp-content mount — แต่ติดกับดัก anonymous volume ของ webroot

`api/health/index.php` ถูกวางไว้ที่ `/var/www/html/api/health/index.php` —
path นี้อยู่**นอก** `/var/www/html/wp-content` จึงไม่ถูก bind mount ของ
`wp-content` บัง (compose mount เจาะจงแค่ subdirectory `wp-content` ไม่ใช่ทั้ง
`/var/www/html`) endpoint นี้จึงตอบได้ปกติแม้ `wp-content` เป็น volume ว่าง
ตอน container แรกสุด — HEALTHCHECK ของ image ก็ยิงเข้าไฟล์นี้เหมือน
`Dockerfile.web` ทุกประการ (ดู §D)

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
  เป็น **bind mount** ที่ประกาศชื่อไว้ในทั้ง 2 compose (`/srv/appdata/...`)
  จึงไม่โดนแตะเลย ซึ่งเป็นเหตุผลอีกข้อที่ `wp-content` เป็น volume **บังคับ**:
  ทุกอย่างที่ต้องรอดต้องอยู่ในนั้น ไม่ใช่ที่อื่นใน webroot
- ราคาที่จ่าย: container start ช้าขึ้นเล็กน้อยเพราะ entrypoint แตก core ใหม่
  ทุก deploy (หลักสิบวินาที — `start_period: 60s` ครอบอยู่แล้ว)
- ทางเลือกที่ **ไม่** เลือก: bind-mount ไฟล์ health จากโฮสต์ทับเข้าไป — ได้ผล
  เหมือนกันแต่ต้องมีขั้น copy ไฟล์ลง `/srv/appdata` ก่อน `up -d` เพิ่มอีกจุดที่
  ลืมได้ และทำให้ image ไม่ใช่แหล่งความจริงเดียวของ endpoint นี้อีกต่อไป
- `Dockerfile.web` (Laravel/CI/legacy) **ไม่มีปัญหานี้** — `php:*-apache` ไม่ได้
  ประกาศ `VOLUME` ไว้ ทุกไฟล์อยู่ใน image layer ตรง ๆ จึงใช้
  `up -d --no-build` เปล่า ๆ ตามปกติ

### ถ้าโปรเจคมีทั้ง `[VOLUME]` custom และ `[WP]` — ต้อง merge บล็อกเอง

`docker-compose.yml`/`docker-compose.dev.yml` มี**สอง** `# volumes:` comment
block แยกกัน (บล็อกทั่วไปสำหรับ `[VOLUME]` จาก interview ข้อ 6 กับบล็อก `[WP]`
สำหรับ `wp-content`) — YAML อนุญาต key `volumes:` ได้แค่หนึ่งอันต่อ service
ถ้าโปรเจค WordPress มี custom volume เพิ่มเติมนอกจาก `wp-content` (เช่น
uploads directory แยก) ต้อง**รวมรายการเข้า `volumes:` เดียวกันเอง** ไม่ใช่
ปล่อยสอง block ไว้แยกกัน (จะ parse ไม่ผ่านหรือ block หลังทับ block แรก
ขึ้นกับ YAML parser)

## C. SQL Server จาก PHP — pdo_sqlsrv ต้องมี msodbcsql18

`docker/Dockerfile.web` มีคอมเมนต์ตัวเลือก DB ที่ชี้กลับมาที่ไฟล์นี้:

```
# RUN pecl install sqlsrv pdo_sqlsrv && docker-php-ext-enable sqlsrv pdo_sqlsrv   # SQL Server (ต้องมี msodbcsql — ดู references/docker-deploy.md)
```

`pecl install sqlsrv pdo_sqlsrv` เพียงบรรทัดเดียว**ไม่พอ** — ทั้งสอง
extension ต้องคอมไพล์กับ Microsoft ODBC Driver (`msodbcsql18`) ที่ไม่ได้มา
กับ `php:8.3-apache` (Debian base) ต้องเพิ่ม Microsoft apt repo ก่อน แล้วค่อย
`pecl install`:

```dockerfile
# [DB] SQL Server — วางก่อนบรรทัด pecl install sqlsrv ที่ comment ไว้ด้านบน
# ต้องคู่กับ `FROM php:8.3-apache-bookworm` (pin codename) ใน Dockerfile.web
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
      curl gnupg2 apt-transport-https ca-certificates unixodbc-dev && \
    curl -sSL https://packages.microsoft.com/keys/microsoft.asc \
      | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg && \
    curl -sSL https://packages.microsoft.com/config/debian/12/prod.list \
      > /etc/apt/sources.list.d/mssql-release.list && \
    apt-get update && \
    ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 && \
    pecl install sqlsrv pdo_sqlsrv && \
    docker-php-ext-enable sqlsrv pdo_sqlsrv && \
    apt-get purge -y --auto-remove gnupg2 apt-transport-https && \
    rm -rf /var/lib/apt/lists/*
```

จุดที่พลาดบ่อย:

- **ไม่ต้องลง `$PHPIZE_DEPS` เอง และ ⚠️ ห้าม purge ทิ้ง** — `pecl` คอมไพล์จาก
  source จริงจึงต้องมี toolchain (`autoconf` `gcc` `make` `re2c` ฯลฯ) แต่ image
  ทางการฝั่ง **Debian** (`php:8.3-apache-bookworm` และทุก variant ที่ไม่ใช่
  alpine) **ลง `$PHPIZE_DEPS` มาให้แล้วเป็น persistent dep** ตั้งแต่ layer แรก
  ของ base image (ดู `Dockerfile-debian.template` ของ docker-library/php:
  `apt-get install -y --no-install-recommends $PHPIZE_DEPS ca-certificates curl
  xz-utils`) — ตัวแปร `$PHPIZE_DEPS` จึงไม่ได้เป็นแค่ชื่อรายการ แต่ของจริงติด
  มาด้วย. สูตรเดิมที่ปิดท้ายด้วย `apt-get purge -y --auto-remove … $PHPIZE_DEPS`
  จึง**ถอนเครื่องมือของ base image ทิ้ง** ทำให้ `pecl install` /
  `docker-php-ext-install` ที่เพิ่มทีหลัง (หรือใน Dockerfile ของโปรเจคเอง)
  fail ตามมาโดยไม่มีใครโยงเหตุถูก — ตัดคำว่า `$PHPIZE_DEPS` ออกจากทั้งบรรทัด
  install และบรรทัด purge (purge เฉพาะสิ่งที่ **สูตรนี้เป็นคนลง** คือ `gnupg2`
  / `apt-transport-https`)
  · หมายเหตุ: **alpine variant ไม่เหมือนกัน** — `php:*-alpine` ประกาศ
  `$PHPIZE_DEPS` ไว้เป็น ENV แต่ไม่ได้ลงให้ ต้อง `apk add --virtual` เอง
  (ชุดนี้ไม่ได้ใช้ alpine ฝั่ง PHP)
- **`unixodbc-dev` ต้องมาก่อน `pecl install`** — `pecl` ต้องการ ODBC header
  files ไม่ใช่แค่ตัว runtime driver ขาดบรรทัดนี้ `pecl install sqlsrv` จะ fail
  ตอน `configure` ด้วย error หา `sql.h`/`sqlext.h` ไม่เจอ
- **`ACCEPT_EULA=Y` เขียนนำหน้า `apt-get install` บรรทัดเดียวกัน** —
  `msodbcsql18` มี postinst script ที่อ่าน EULA acceptance จาก environment
  ตอน `apt-get install` รันจริง. `ENV ACCEPT_EULA=Y` แยกบรรทัดก่อนหน้า
  **ก็ทำงานได้เหมือนกัน** (ENV มีผลกับทุก `RUN` ที่ตามมา ไม่ใช่แค่บรรทัดถัดไป
  — ต่างจาก `ARG` ที่หมดอายุตาม build stage) แต่ที่นี่เลือกแบบ inline เพราะ
  `ENV` **ติดค้างไปถึง environment ของคอนเทนเนอร์ตอนรันจริงด้วย** ซึ่งไม่มี
  เหตุผลให้ค้าง — inline จำกัดขอบเขตไว้แค่คำสั่งที่ต้องใช้จริง
- **dearmor ลง `/usr/share/keyrings/` + `signed-by` คือแบบที่ควรใช้** —
  ไม่ใช่ `tee` ลง `trusted.gpg.d`. เหตุผล**ไม่ใช่**ว่า apt ไม่รับ key แบบ
  ASCII-armored (รับมาตั้งแต่ apt 1.4 ขอแค่ตั้งนามสกุลให้ตรง: armored = `.asc`,
  binary = `.gpg` — ตั้งผิดนามสกุลต่างหากที่ทำให้ key ถูกเมิน) สิ่งที่หายไปจริง
  ใน trixie คือคำสั่ง **`apt-key`** ที่ถูกถอดออกจาก package แล้ว. เหตุผลที่ใช้
  `signed-by` คือ **ขอบเขตความไว้ใจ**: key ที่วางใน `trusted.gpg.d` เซ็นรับรอง
  ได้ **ทุก** repo ในเครื่อง (repo ของ Microsoft เซ็นแทน debian.org ได้) ส่วน
  `signed-by` ผูก key กับ repo เดียวที่ประกาศไว้เท่านั้น
- **codename ของ apt repo (`debian/12`) ต้องตรงกับ base image จริง** —
  ⚠️ `php:8.3-apache` **เปล่า ๆ ตอนนี้ resolve เป็น trixie (13) แล้ว** ไม่ใช่
  bookworm อีกต่อไป (ยืนยันจาก build ที่ fail จริง โปรเจค pilot 2026-08) จึงต้อง
  pin `php:8.3-apache-bookworm` ใน `Dockerfile.web` เสมอ ไม่ใช่แค่ "เช็คก่อน" ·
  ผิด codename แล้ว `apt-get update` จะหา package ไม่เจอเงียบ ๆ (404 ทีละบรรทัด
  ไม่ fail ทั้ง build จนกว่าจะถึง `apt-get install`)
- **SQL Server = PHP ≥ 8.3 เป็นเพดานแข็ง** — PECL `sqlsrv`/`pdo_sqlsrv` รุ่น
  ปัจจุบันตัด 8.2 ทิ้งแล้ว (`pecl/sqlsrv requires PHP >= 8.3.0`) โปรเจค legacy
  ที่อยากถอย base image ลงไปต่ำกว่านี้ต้องยอมสละ SQL Server ไปด้วย
- **`apt-get upgrade -y` ไม่ใช่ของฟุ่มเฟือย** — base image ถูก rebuild ห่างกว่า
  รอบออก security patch ของ Debian ถ้าโปรเจคเปิดสแกน image (Trivy) จะโดนบล็อก
  ด้วย CVE ที่ **แก้ได้แล้ว** ใน apt แต่ image ยังไม่ได้รับ
- **`Dockerfile.wordpress` ไม่มีบล็อก `[DB]` นี้** — WordPress ใช้ **`mysqli`**
  ที่มากับ base image `wordpress:*` อยู่แล้ว (image รัน `docker-php-ext-install
  … mysqli …` ให้) SQL Server ไม่ใช่ทางเลือกมาตรฐานของ WordPress ในชุดนี้
  · ⚠️ **`pdo_mysql` ไม่ได้ติดมากับ `wordpress:*`** (คนละ extension กับ
  `mysqli` — WordPress core ใช้ `mysqli` ล้วน) ดังนั้นถ้าจะเปิดใช้บล็อก `[DB]`
  ใน `api/health/index.php` ของ shape นี้ ต้องเลือกทางใดทางหนึ่ง:
  1. **ใช้ `mysqli` ในไฟล์ health แทน PDO** (ทางที่แนะนำ — ไม่เพิ่ม layer,
     ใช้ของที่ image มีอยู่แล้ว) — snippet อยู่ในคอมเมนต์ของไฟล์ health
  2. หรือเติมบรรทัดนี้ใน `Dockerfile.wordpress` ก่อน `COPY api/health/...`:
     ```dockerfile
     # [DB] เปิด pdo_mysql — base image wordpress:* ให้มาแต่ mysqli
     RUN docker-php-ext-install pdo_mysql
     ```
  ถ้าไม่ทำทั้งสองทางแล้วปลด comment บล็อก PDO ทิ้งไว้ ไฟล์ health จะ fatal
  (`Class "PDO" not found` / driver ไม่มี) = 500 ไม่ใช่ 503 → container ไม่มีวัน
  ขึ้น `healthy`

### DNS: ชื่อ host สั้นของ DB มัก resolve ไม่ได้จากในคอนเทนเนอร์

อาการ: `Login timeout expired` (หรือ connect ค้างจนครบ timeout) ทั้งที่ค่า
`DB_SERVER`/`DATABASE_URL` ถูกต้อง และ **เปิดจากเครื่อง host เดียวกันได้ปกติ**

สาเหตุ: คอนเทนเนอร์ใช้ DNS resolver ของ Docker ไม่ใช่ของเครื่อง host — ชื่อสั้น
อย่าง `SQLSRV01` หรือ `tcl_ryg2` ที่ resolve ได้บน Windows/โดเมนองค์กร (ผ่าน DNS
suffix search list ของเครื่อง) มักไม่มีความหมายในเน็ตเวิร์กของคอนเทนเนอร์
(ยืนยันจากโปรเจค pilot 2026-08 — เสียเวลาไล่หาเพราะ error ชี้ไปที่ credential
มากกว่า network)

ทางแก้ เรียงตามลำดับที่ควรลอง:

1. **ใช้ FQDN** (`SQLSRV01.corp.example.co.th`) แทนชื่อสั้น — สะอาดสุด ไม่ผูก IP
2. **ใช้ IP ตรง ๆ** — ได้ผลแน่นอน แต่ต้องตามแก้เมื่อ DB ย้ายเครื่อง
3. **ชี้ DNS ขององค์กรให้คอนเทนเนอร์** ใน compose ทั้งสองไฟล์:
   ```yaml
   dns:
     - 10.x.x.x   # DNS ขององค์กร
   ```

ตรวจก่อนสรุปว่าเป็นเรื่อง credential — ยิงจากในคอนเทนเนอร์จริง:

```bash
docker exec <container> getent hosts <ชื่อที่ตั้งใน DB_SERVER>
```

ไม่มีผลลัพธ์ = ปัญหา DNS ไม่ใช่รหัสผ่าน

## D. Healthcheck — `curl -fsS -L`

`php:8.3-apache` (และ `wordpress:php8.3-apache` ที่สืบทอดมา) **มี `curl` ติดมา
ให้อยู่แล้ว** — image ทางการฝั่ง Debian ลง `$PHPIZE_DEPS ca-certificates curl
xz-utils` เป็น *persistent* dep ตั้งแต่ layer แรก (และ Dockerfile ของ
`wordpress:*` ก็ไม่ได้ purge ทิ้ง มันใช้ curl ดึง core tarball เองด้วยซ้ำ)
ทั้งสอง Dockerfile ของชุดนี้จึง **ไม่มี layer `apt-get install curl`** —
สิ่งที่ต้องระวังคือ **ห้าม purge `curl` ทิ้ง** ในบล็อกที่เพิ่มมาทีหลัง
· `wget` ต่างหากที่ **ไม่มีจริง** — อย่าเปลี่ยน healthcheck ไปใช้ตัวนั้น:

```sh
curl -fsS -L http://127.0.0.1:80/api/health || exit 1
```

**ทำไมไม่ใช้ `php -r 'file_get_contents(...)'` เหมือนเดิม** —
`file_get_contents("http://…")` **คืน `false` เสมอ**เมื่อ
`allow_url_fopen = Off` ซึ่งเป็นค่า hardening มาตรฐานของ OWASP (กัน RFI) ที่
โปรเจคตั้งกันเป็นปกติ ผลคือ container **ไม่มีวันขึ้น healthy** และสเตจ Deploy
ตายที่ poll โดยไม่มี error บอกสาเหตุสักบรรทัด (ยืนยันจากโปรเจค pilot 2026-08)
ตอนตัดสินใจครั้งแรกคิดว่าต้องแลกด้วย apt layer เพิ่มหนึ่งชั้น — ปรากฏว่า
ไม่ต้องแลกอะไรเลย เพราะ curl มากับ image อยู่แล้ว

**`-L` ห้ามตัดทิ้งเด็ดขาด** — `/api/health` โดน 301 ได้**สองทิศตรงข้ามกัน**
แล้วแต่ shape:

| Shape | health คือ | Apache/framework ทำอะไร | `curl -f` ไม่มี `-L` |
| --- | --- | --- | --- |
| Laravel | route (`Route::get('/api/health')`) | `.htaccess` มาตรฐาน 301 **ตัด** `/` ท้ายทิ้ง | ยิง `/api/health/` → 301 → **เขียวหลอก** |
| CI4 / legacy / WordPress | ไฟล์ `api/health/index.php` | mod_dir 301 **เติม** `/` ท้ายเข้ามา | ยิง `/api/health` → 301 → **เขียวหลอก** |

`curl -f` นับ 3xx ว่า "สำเร็จ" ถ้าไม่มี `-L` → healthcheck เขียวทั้งที่ endpoint
ข้างใต้อาจคืน 503 อยู่ ซึ่งเป็น false-green ที่แย่ที่สุดแบบหนึ่ง (deploy ผ่าน
ทั้งที่แอปตาย) · ใส่ `-L` แล้ว curl ตาม redirect ไปจนสุดแล้ว `-f` ตัดสินจาก
status **สุดท้าย** — ได้ semantics เดียวกับ `file_get_contents` เดิมเป๊ะ ๆ
(ตัวนั้นตาม redirect ให้เองอยู่แล้วโดย default จึงไม่เคยมีปัญหาข้อนี้) และใช้
บรรทัดเดียวถูกต้องทั้ง 4 shape ไม่ต้องแยกตาม shape

> `-L` ปลอดภัยที่นี่เพราะ `/api/health` เป็น endpoint สาธารณะตาม contract
> (เข้าได้โดยไม่ต้อง login) จึงไม่มีเคส redirect ไปหน้า login ที่คืน 200 —
> ถ้าโปรเจคไหนเอา health ไปไว้หลัง auth **นั่นผิด contract ตั้งแต่แรก** ไม่ใช่
> เหตุผลให้ถอด `-L`

จุดที่พลาดบ่อย:

- **`127.0.0.1` เท่านั้น ไม่ใช้ `localhost`** — ข้อนี้เป็น**กติกาเชิงป้องกัน
  ไม่ใช่บั๊กที่ยืนยันแล้วกับ image ชุดนี้**: `localhost` ต้องผ่าน resolver ซึ่ง
  ปกติคืนทั้ง `127.0.0.1` และ `::1` แล้ว client ที่ทำ Happy Eyeballs (curl ทำ)
  จะไล่ลองทีละ address จนติด ส่วน apache ของ `php:*-apache` ก็ผูก dual-stack
  ตาม default อยู่แล้ว — สองอย่างนี้รวมกันแปลว่า `localhost` **มักใช้ได้** ไม่
  ควรบอกว่ามันพังแน่นอน. เหตุผลที่ยังบังคับ `127.0.0.1` คือมัน **deterministic**:
  ไม่ขึ้นกับ `/etc/hosts` ของ base image, resolver order, หรือ stack ที่แอปผูก
  ซึ่งทั้งสามอย่างเปลี่ยนได้เงียบ ๆ เมื่อ bump image — ราคาของกติกานี้เป็นศูนย์
  จึงไม่มีเหตุผลให้เสี่ยง (ฝั่ง python ใช้กติกาเดียวกันด้วยเหตุผลเดียวกัน)
- **Port ในสตริงต้องเป็น 80 (container-internal) เสมอ** — ไม่ใช่ host port
  จาก `${APP_PORT:-__PORT_PROD__}` ที่แค่ map เข้ามา healthcheck รันข้างใน
  container จึงเห็นแต่ port ภายใน (apache ฟัง 80 เสมอในทั้งสอง Dockerfile)
- `start_period: 60s` ในทั้งสอง compose ให้เวลาแอป boot ก่อนเริ่มนับ retry —
  ลดค่านี้จะทำให้ deploy ล้มเพราะ "unhealthy" ระหว่างที่แอปแค่ยังไม่ทันบูตเสร็จ
  (ต่างจาก unhealthy จริง)
- **`-fsS` ครบทั้งสามตัว** — `-f` ทำให้ status ≥ 400 เป็น exit code ไม่ใช่
  หน้า error ที่ curl พิมพ์ออกมาแล้ว exit 0 · `-s` ปิด progress meter ที่จะไป
  รกใน `docker inspect` health log · `-S` ดึง error message กลับมาเมื่อ `-s`
  ปิดเสียงไปแล้ว (ไม่มีตัวนี้เวลา fail จะไม่รู้เลยว่าเพราะอะไร) · ตัว exit code
  คือสิ่งที่ Docker ใช้ตัดสิน ไม่ใช่ output
- **ห้าม purge `curl` ทิ้งท้าย Dockerfile** — curl มากับ base image ไม่ต้องลง
  เอง แต่บล็อกที่ลง package อื่นแล้ว `apt-get purge --auto-remove` ปิดท้ายเพื่อ
  ลดขนาด image (เช่นบล็อก `[DB]` ที่ดึง key ของ Microsoft repo) ต้องระบุชื่อ
  package ที่ตัวเองลงเท่านั้น อย่ากวาด `curl` ไปด้วย — healthcheck จะตายทุกครั้ง
  ด้วย `curl: not found` ซึ่งใน health log อ่านเหมือนแอปพังมากกว่า tool หาย

## E. Gotchas เร็ว ๆ — build & lint

### `.dockerignore` ต้องกัน artifact ของ CI stage ก่อนหน้า

สเตจ Install/Unit Tests ของ Jenkinsfile สร้าง `vendor/`, `coverage/`,
`test-results/` ไว้ใน workspace เดียวกับที่ Docker Build stage ใช้เป็น build
context (`docker build ... .`) — สเตจ OWASP Dependency Check สร้าง
`dc-report/` เพิ่มอีก ถ้าไม่กันไว้ ไฟล์เหล่านี้จะถูกส่งเข้า build context
(ช้าลง และเสี่ยงหลุดเข้า layer ของ image เพราะทั้ง `Dockerfile.web` และ
`Dockerfile.wordpress` มี `COPY . .`) ต้องมี `.dockerignore` ที่ root โปรเจค:

```
vendor
coverage
dc-report
test-results
.env
.env.*
!.env.example
```

หมายเหตุ: `Dockerfile.web` มี `COPY --from=composer:2` + `composer install`
ของตัวเองอยู่แล้ว (สร้าง `vendor/` ใหม่ในเลเยอร์ image) การกัน `vendor` ใน
`.dockerignore` จึงไม่กระทบผลลัพธ์ image — แค่กัน `vendor/` เวอร์ชัน CI (ที่มี
`--dev` dependencies ติดมาด้วย) ไม่ให้หลุดเข้า build context โดยไม่จำเป็น

**`.env`/`.env.*`/`!.env.example` กันคนละความเสี่ยงจาก 4 บรรทัดบน** — ไม่ใช่
เรื่องขนาด context แต่เป็นเรื่อง secret รั่ว: `.env` จริงที่อยู่ในเครื่อง dev
(หรือหลงเหลือใน workspace ของ Jenkins agent จาก build ครั้งก่อน) ถ้าไม่ถูกกัน
จะถูก `COPY . .` ฝังลง image layer แบบถาวร — `docker history`/`docker save`
ดึง secret กลับมาได้แม้ไฟล์จะถูกลบใน layer ถัดไป (layer เป็น append-only)
**โปรเจค CI3/legacy ที่ยังไม่ได้ migrate มาใช้ `.env`** (DB credential ฝังใน
ไฟล์ config ของ framework เอง เช่น `application/config/database.php`) ต้อง
เพิ่มชื่อไฟล์นั้นเข้า `.dockerignore` เองแยกต่างหาก — plugin นี้เดาโครงสร้าง
ของ legacy app แต่ละโปรเจคไม่ได้

### `php -l` ก่อน `phpstan` เสมอ — เร็วกว่า

สเตจ `Code Quality` รัน `Lint` (`php -l` ไล่ทุกไฟล์) กับ `Static Analysis`
(`phpstan analyse`) แบบ parallel ใน Jenkinsfile ก็จริง แต่เวลาแก้ปัญหาบนเครื่อง
ตัวเอง (นอก pipeline) ควรรัน `php -l` ก่อน `phpstan` เสมอ — `php -l` เช็คแค่
syntax error (parse ได้/ไม่ได้) ใช้เวลาระดับ millisecond ต่อไฟล์ ขณะที่
`phpstan` ต้อง resolve type ทั้ง dependency graph ก่อนเริ่มวิเคราะห์ ถ้าไฟล์มี
syntax error อยู่ `phpstan` จะ fail ด้วย parse error ที่อ่านยากกว่าและช้ากว่า
`php -l` มาก — ไล่ syntax ให้ผ่านก่อนเสมอค่อยรัน static analysis รอบถัดไป

### Laravel: ห้าม `php artisan config:cache` ตอน build image (v0.1)

`Dockerfile.web` ของชุดนี้**ไม่มี** `RUN php artisan config:cache` — ตั้งใจ
ไม่ใส่ เหตุผล: ค่า config ของ Laravel (`DATABASE_URL`, `APP_KEY`, secret อื่น)
มาจาก **runtime `.env`** ที่ Jenkins คัดลอกจาก Secret File credential
(`env-__PROJECT_NAME__` / `-dev`) เข้ามาตอน Deploy stage — ไฟล์นี้ยังไม่มีอยู่
เลยตอน `docker build` รัน (Docker Build stage มาก่อน Deploy stage) ถ้า
`config:cache` รันตอน build จะได้ config ที่ resolve จาก env ว่างเปล่าหรือ
`.env` เก่าที่หลงเหลือใน build context ผลคือ:

- config ผิดฝัง (baked) ลง image layer อย่างถาวร — เปลี่ยน `.env` ตอน deploy
  แล้วแอปยังอ่านค่าเก่าจาก cache ที่ build ไว้ (Laravel priority: cached
  config มาก่อน env จริงเสมอเมื่อ `config:cache` ทำงานแล้ว)
- ถ้า build context มี `.env` ของเครื่อง dev หลุดเข้ามา (ลืมใส่ `.dockerignore`)
  secret จะถูกฝังลง image layer ถาวร — ดึง image ออกมา diff layer ก็เห็น
  secret ได้แม้ลบไฟล์ทิ้งใน layer ถัดไป (Docker layer เป็น append-only)

ทางเลือกที่ปลอดภัยกว่าถ้าต้องการ config cache จริง ๆ ในอนาคต (นอก scope
v0.1) คือรัน `php artisan config:cache` เป็นส่วนหนึ่งของ Deploy stage
**หลัง** `.env` ถูกวางแล้ว ไม่ใช่ใน Dockerfile — แต่ต้องแลกกับความซับซ้อนของ
cache invalidation เมื่อ deploy ซ้ำโดยไม่ rebuild image ซึ่งชุดนี้ยังไม่ทำ

## F. Compose conventions (เหมือนกันทั้ง prod/dev)

| Convention | ทำไม |
| --- | --- |
| `pull_policy: never` | image build ในเครื่อง Jenkins เอง ไม่งั้น compose พยายาม pull `latest` จาก Docker Hub แล้วได้ image คนละตัว (หรือ fail ถ้าไม่มี registry) |
| `ports: '${APP_PORT:-<port>}:80'` | host port override ได้จาก `.env` — กัน port ชนกันบน host ที่รันหลายโปรเจค; container-internal คงที่ 80 (apache) เสมอ |
| แยกไฟล์ compose prod/dev คนละไฟล์ | ชื่อ image/container/host port ต่างกัน — รวมไฟล์เดียวแล้ว parametrize เสี่ยง deploy ผิด environment มากกว่าแยกไฟล์ให้เห็นชัด |
| `restart: unless-stopped` | shape เดียวของ PHP คือ `[WEB]` — ต้องรอด host reboot อัตโนมัติเสมอ (ไม่มี `[BATCH]` ที่ต้องการ `restart: "no"` เหมือนฝั่ง python) |
| resource limits (`deploy.resources`) | container เดียวไม่ควร starve ทรัพยากร host ที่มีหลายโปรเจครันร่วมกัน |
| `logging` json-file 10m×3 | log โตไม่จำกัดจะเต็มดิสก์ host ได้ในระยะยาว |
| `proxy-network` (`external: true`) | ทุกแอป [WEB] แชร์ network เดียวกับ reverse proxy ที่สร้างไว้ครั้งเดียวบน host |
| `DATABASE_URL: ${DATABASE_URL}` ทำเครื่องหมาย `[DB]` | ลบทิ้งได้ถ้าโปรเจคไม่มี database (legacy/static content ล้วน) |

## G. Subpath หลัง reverse proxy — แอปที่อ้าง asset แบบ relative (CI3/legacy)

Framework ที่มี config กลางแก้ตาม SKILL §5.3 (Laravel `APP_URL`, CI4
`app.baseURL`, WordPress `WP_HOME`/`WP_SITEURL`, CI3 `base_url`) — หัวข้อนี้
สำหรับแอป legacy ที่อ้าง asset แบบ **relative** (`href="style.css"`,
`src="assets/x.png"`) ซึ่งไม่มี config ให้แก้

**อาการ**: เปิดผ่าน proxy ที่ `https://host/app` (ไม่มี `/` ท้าย) แล้ว
CSS/JS/รูป 404 ทั้งหน้า แต่เปิด `https://host/app/` (มี `/`) ปกติ — browser
resolve URL relative จาก path โดยตัด segment สุดท้ายทิ้ง: ที่ `/app` ตัด `app`
ได้ `/style.css` (หลุด subpath) · ที่ `/app/` ได้ `/app/style.css` ถูกต้อง

**ทำไมแก้ฝั่ง server ไม่ได้**: หลัง proxy ที่ strip prefix คอนเทนเนอร์เห็น path
เป็น `/` ไปแล้ว — redirect ฝั่ง Apache (DirectorySlash) ชี้ไปยัง path ที่ตัวเอง
เห็น จึงพา browser หลุด prefix ไปเลย · ฝ่ายเดียวที่เห็น URL เต็มจริงคือ browser

**สูตร (พิสูจน์กับ pilot `ugt-mscpl-ana` แล้ว)** — inline script บรรทัดเดียว
วางเป็น**สิ่งแรกใน `<head>` ก่อน `<link>`/`<script>` ทุกตัว** ของ entry/header
ที่ทุกหน้า include ร่วมกัน:

```html
<script>var p=location.pathname;if(!p.endsWith("/")&&p.split("/").pop().indexOf(".")<0)location.replace(p+"/"+location.search+location.hash)</script>
```

- เติม `/` เฉพาะเมื่อ segment สุดท้าย**ไม่มีนามสกุลไฟล์** — URL อย่าง
  `…/page.php` ไม่โดนแตะ (relative ของมัน resolve ถูกอยู่แล้ว เพราะ browser
  ตัดแค่ชื่อไฟล์)
- ต้องอยู่ก่อน asset ทุกตัว เพื่อ redirect ก่อนเสีย request ไปโหลดของผิด path
- `<base href>` ใช้แทนได้แต่ต้อง hardcode prefix ซึ่งต่างกันระหว่าง dev
  (ไม่มี proxy) กับ prod — สูตร script ไม่ผูกกับ prefix จึงใช้ไฟล์เดียวกันได้
  ทุก environment

## H. Volume — ownership เป็นเรื่องคนละเรื่องกับ path

Path ของ persistent data ตาม contract กลาง (`ugt-core/contracts/cicd.md` §
Persistent data) คือ:

```
/srv/appdata/<project>/<name>        # prod
/srv/appdata/<project>-dev/<name>    # dev
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
for p in /srv/appdata/${containerName}/uploads /srv/appdata/${containerName}/reports; do
  if [ ! -d "$p" ]; then
    mkdir -p "$p"
    docker run --rm -v "$p":/d alpine chown -R "$APP_UID" /d
  fi
done
```

ตอนกรอกรายชื่อ volume จาก interview ข้อ 6 ให้แทน `uploads`/`reports` ด้วยชื่อ
subdir จริง **ทุกตัวที่ compose bind** — ไม่ใช่แค่ระดับโปรเจค: compose bind ที่
`/srv/appdata/<project>/<name>` ถ้า `<name>` ยังไม่มีตอน `up -d` **dockerd จะ
สร้างให้เองเป็น `root:root`** (พฤติกรรมมาตรฐานของ bind mount ที่ path ปลายทางหาย)
แล้ว `www-data` เขียนไม่ได้

**ห้ามย้อนกลับไปครอบทั้งบล็อกด้วย guard ระดับโปรเจค**
(`if [ ! -d /srv/appdata/<project> ]`): guard แบบนั้นกลายเป็น no-op ถาวรทันทีที่
deploy แรกสร้างโฟลเดอร์โปรเจคขึ้นมา — volume ที่เพิ่มในรุ่นถัดไปจะไม่มีวันถูก
mkdir/chown

จุดสำคัญที่ทำให้กลไกนี้ทำงานได้แม้ Jenkins agent เองไม่ใช่ root:

- **หา UID จริงจาก image ที่เพิ่ง build ทุกครั้ง ไม่ hardcode `33`** — เลข UID
  ของ `www-data` ตรงกันแทบทุก Debian base ก็จริง แต่โปรเจคที่เปลี่ยน
  `APACHE_RUN_USER` หรือเพิ่ม user เองใน Dockerfile จะเลื่อน อ่านจาก image
  ถูกเสมอและไม่แพงกว่า
- **`chown` เองไม่ได้เพราะ Jenkins user ไม่ใช่ root บนโฮสต์** — แต่อยู่ใน
  `docker` group (มติ M8 / เช็คลิสต์ admin handoff) จึงสั่ง `docker run` ได้:
  รัน container `alpine` แยกที่ bind `/srv/appdata/<project>/<name>` เข้ามาที่
  `/d` แล้ว `chown -R` ข้างในนั้น — container นั้นรันเป็น root โดย default
- guard `if [ ! -d "$p" ]` **ต่อ subdir** ทำให้ container chown รันเฉพาะตอนมี
  subdir ใหม่ (ส่วนการหา UID รันทุกรอบโดยตั้งใจ — ถูกมาก)

### `[WP]` `wp-content` ใช้กลไกเดียวกัน

`wp-content` เป็น volume บังคับ (§B) จึงต้องอยู่ในบรรทัด `for p in …` เหมือน
volume อื่นทุกประการ — WordPress เขียน `wp-content/uploads/` ในนามของ `www-data`
ตอนอัปโหลดผ่าน wp-admin ถ้า subdir นี้เป็น `root:root` ผู้ใช้จะเจอ "ไม่สามารถ
สร้างไดเรกทอรีได้" ในหน้า Media ทั้งที่เว็บขึ้นปกติ

### ทางเลือกสำรอง — chown มือ (path ที่มีอยู่ก่อนกลไกนี้ หรือ debug)

```sh
docker run --rm __PROJECT_NAME__:latest id -u www-data
# หรือระบุ group ด้วย:
chown -R $(docker run --rm __PROJECT_NAME__:latest id -u www-data):$(docker run --rm __PROJECT_NAME__:latest id -g www-data) /srv/appdata/__PROJECT_NAME__/<name>
```

ตรรกะเดียวกับกลไกอัตโนมัติ — ต่างกันแค่ไว้แก้กรณีพิเศษที่ deploy รอบใหม่ไม่ครอบ
(path เก่า, หรือ mount เพิ่มทีหลังโดยไม่ได้ deploy ใหม่)
