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
ใช้ `docker-compose -f <file> up -d --no-build` เสมอ — flag นี้บังคับให้ compose
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

### Health file รอดจาก wp-content mount

`api/health/index.php` ถูกวางไว้ที่ `/var/www/html/api/health/index.php` —
path นี้อยู่**นอก** `/var/www/html/wp-content` จึงไม่ถูก bind mount ของ
`wp-content` บัง (compose mount เจาะจงแค่ subdirectory `wp-content` ไม่ใช่ทั้ง
`/var/www/html`) endpoint นี้จึงตอบได้ปกติแม้ `wp-content` เป็น volume ว่าง
ตอน container แรกสุด — HEALTHCHECK ของ image ก็ยิงเข้าไฟล์นี้เหมือน
`Dockerfile.web` ทุกประการ (ดู §D)

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
RUN apt-get update && apt-get install -y curl gnupg2 apt-transport-https unixodbc-dev && \
    curl -sSL https://packages.microsoft.com/keys/microsoft.asc | tee /etc/apt/trusted.gpg.d/microsoft.asc && \
    curl -sSL https://packages.microsoft.com/config/debian/12/prod.list | tee /etc/apt/sources.list.d/mssql-release.list && \
    apt-get update && \
    ACCEPT_EULA=Y apt-get install -y msodbcsql18 && \
    pecl install sqlsrv pdo_sqlsrv && \
    docker-php-ext-enable sqlsrv pdo_sqlsrv
```

จุดที่พลาดบ่อย:

- **`unixodbc-dev` ต้องมาก่อน `pecl install`** — `pecl` คอมไพล์ extension จาก
  source ต้องการ ODBC header files ไม่ใช่แค่ตัว runtime driver ขาดบรรทัดนี้
  `pecl install sqlsrv` จะ fail ตอน `configure` ด้วย error หา `sql.h`/
  `sqlext.h` ไม่เจอ
- **`ACCEPT_EULA=Y` ต้องเป็น env ของบรรทัด `apt-get install` เดียวกัน**
  (ไม่ใช่ `ENV ACCEPT_EULA=Y` แยกบรรทัดก่อนหน้า) — `msodbcsql18` เป็น
  interactive postinst script ที่เช็ค EULA acceptance จาก env ตอนรันจริง
  ไม่ใช่ตอน build-arg resolve
- **codename ของ apt repo (`debian/12`) ต้องตรงกับ base image จริง** —
  `php:8.3-apache` ปัจจุบันอิง Debian bookworm (12) เช็คด้วย `cat
  /etc/os-release` ในคอนเทนเนอร์ก่อนถ้าจะ pin เวอร์ชันอื่น ผิด codename แล้ว
  `apt-get update` จะหา package ไม่เจอเงียบ ๆ (404 ทีละบรรทัด ไม่ fail ทั้ง
  build จนกว่าจะถึง `apt-get install`)
- **`Dockerfile.wordpress` ไม่มีบล็อก `[DB]` นี้** — WordPress ใช้ `mysqli`/
  `pdo_mysql` ที่มากับ base image `wordpress:*` อยู่แล้ว SQL Server ไม่ใช่
  ทางเลือกมาตรฐานของ WordPress ในชุดนี้

## D. Healthcheck — apache image ไม่มี wget/curl

`php:8.3-apache` และ `wordpress:php8.3-apache` ไม่มี `curl`/`wget` ติดมาให้
เหมือน distro ทั่วไปที่ตัด tool ที่ไม่จำเป็นออกเพื่อลดขนาด image — healthcheck
ทั้งใน Dockerfile และ compose จึงยิงด้วย `php -r` ตรง ๆ (standard library
`file_get_contents` ไม่ต้องติดตั้งอะไรเพิ่ม):

```sh
php -r 'exit(@file_get_contents("http://127.0.0.1:80/api/health") !== false ? 0 : 1);' || exit 1
```

จุดที่พลาดบ่อย:

- **`127.0.0.1` เท่านั้น ห้าม `localhost`** — resolver บางระบบ resolve
  `localhost` เป็น IPv6 `::1` ก่อนเสมอ ถ้า apache ในคอนเทนเนอร์ไม่ได้ฟังฝั่ง
  IPv6 ไว้ (ทั่วไปสำหรับ container ที่ไม่ตั้งค่าเพิ่มเติม) healthcheck จะ fail
  ด้วย "Connection refused" ทั้งที่แอปรันปกติทุกอย่าง — ระบุ IP ตรง ๆ ตัดปัญหา
  resolver ทิ้งไปเลย ไม่ต้องเดาว่า container ฟัง stack ไหน (พฤติกรรมกลุ่ม
  เดียวกับที่ทำให้ต้องใช้ `127.0.0.1` ในฝั่ง python — ดู `ugt-python-cicd-setup`
  references)
- **Port ในสตริงต้องเป็น 80 (container-internal) เสมอ** — ไม่ใช่ host port
  จาก `${APP_PORT:-__PORT_PROD__}` ที่แค่ map เข้ามา healthcheck รันข้างใน
  container จึงเห็นแต่ port ภายใน (apache ฟัง 80 เสมอในทั้งสอง Dockerfile)
- `start_period: 60s` ในทั้งสอง compose ให้เวลาแอป boot ก่อนเริ่มนับ retry —
  ลดค่านี้จะทำให้ deploy ล้มเพราะ "unhealthy" ระหว่างที่แอปแค่ยังไม่ทันบูตเสร็จ
  (ต่างจาก unhealthy จริง)
- `@` หน้า `file_get_contents` จำเป็น — กัน PHP warning (connection refused,
  timeout) หลุดไปโผล่ใน `docker inspect` health log จนอ่านผลยาก ตัว exit code
  (0/1) คือสิ่งที่ Docker ใช้ตัดสิน ไม่ใช่ output

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
```

หมายเหตุ: `Dockerfile.web` มี `COPY --from=composer:2` + `composer install`
ของตัวเองอยู่แล้ว (สร้าง `vendor/` ใหม่ในเลเยอร์ image) การกัน `vendor` ใน
`.dockerignore` จึงไม่กระทบผลลัพธ์ image — แค่กัน `vendor/` เวอร์ชัน CI (ที่มี
`--dev` dependencies ติดมาด้วย) ไม่ให้หลุดเข้า build context โดยไม่จำเป็น

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
