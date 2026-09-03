# Changelog — ugt-php-platform

## 0.6.2 (2026-09-03)

**Path มาตรฐาน persistent data sync กับ ugt-core 2.10.1**: `/srv/appdata/<project>`
→ `/home/docker02/appdata/<project>` ทุกจุด (`SKILL.md`, `references/docker-deploy.md`,
`scripts/verify.mjs`, `assets/Jenkinsfile`, `assets/admin-handoff.template.md`,
`assets/rules/ugt-php-ci.md`, `evals/evals.json`) — ตัว host จริง (`docker02`)
ใช้ path นี้มาตลอด (เห็นจาก production จริงของ ugt-mscpl-ana/ugt-bd-forecast)
contract เขียนผิดค้างไว้เฉย ๆ ไม่ใช่การเปลี่ยน convention ใหม่ — ยืนยันด้วย
`node scripts/check-contract-drift.mjs`

## 0.6.1 (2026-09-03)

**Pitfall เพิ่มจากอินซิเดนต์จริง ugt-bd-forecast 2026-09-03 (deploy รอบแรก) —
ทั้งหมดเจอบน docker02 จริง แม้เทส local ผ่านหมด**:

- **Docker-outside-of-Docker (DooD) — bind-mount `$PWD`/`$WORKSPACE`**:
  Jenkins agent รันในคอนเทนเนอร์ตัวเอง `docker run -v` ที่ผูก path จาก
  workspace ไปหา host docker daemon (sibling ผ่าน `docker.sock`) ที่ไม่รู้จัก
  path นั้น → `mkdir` พังด้วย read-only filesystem → `references/docker-deploy.md`
  **§I** (`.inside{}` หรือ stdin pipe แทน) + `verify.mjs` check ใหม่ (warn)
- **`security_opt: no-new-privileges:true` ฆ่า entrypoint บน docker02**:
  kernel 6.8 + AppArmor ปฏิเสธ privilege transition ของ
  `docker-php-entrypoint` → `operation not permitted` → crash-loop ที่
  `--wait` เห็นเป็น unhealthy เร็วกว่า `start_period` มาก (เจอซ้ำจาก
  ugt-mscpl-ana 2026-08-17 ที่ไม่เคยถูกบันทึกไว้ในปลั๊กอิน) → §J + diagnostic
  tip (`docker inspect --format '{{.State.Status}} {{.RestartCount}}'`)
- **`PDO::ATTR_TIMEOUT` คู่กับ DSN `sqlsrv:` — pdo_sqlsrv บาง build throw ไม่
  ใช่แค่เมิน**: `SQLSTATE[IMSSP]: An unsupported attribute was designated on
  the PDO object` ตั้งแต่ `new PDO()` (เปลี่ยนจากที่เข้าใจเดิมว่าแค่ "เมินเงียบ ๆ
  ตอน connect") → §C เพิ่มบูลเล็ต + `verify.mjs` check ใหม่ (hard fail) +
  แก้คอมเมนต์ `assets/health/index.php` ให้ครอบทั้งสองอาการ

## 0.6.0 (2026-08-25)

**Audit ปูพรม 7 มิติ 2026-08-25 — แก้บั๊กกลไก volume + ข้อเท็จจริง Docker
ที่ตรวจกับ official image จริง** — ยังไม่ tag รอ pilot:

- **บั๊กจริง — chown อ่าน UID ผิดตัว**: `Jenkinsfile` `[VOLUME]` block ใช้
  `docker run … id -u` แต่ Dockerfile ฝั่ง PHP ไม่มี `USER` directive →
  ได้ 0 (root) แล้ว chown bind mount ทั้งก้อนเป็น root — `www-data` เขียน
  ไม่ได้ คือความพังที่ block นี้มีไว้กันพอดี → `id -u www-data` (คอมเมนต์
  "user `app`" ที่ก๊อบจาก python ตามแก้ด้วย) + `references/docker-deploy.md`
  ได้ **§H Volume ownership** ที่ SKILL ชี้ถึงแต่ไม่เคยมีอยู่จริง
- **WordPress anonymous volume**: `wordpress:*` ประกาศ `VOLUME /var/www/html`
  → webroot เป็น anonymous volume ที่ `compose up` สืบทอดจาก container เดิม
  ไฟล์ใหม่ใน image (รวม health endpoint) ไม่มีวันถึง — §B อธิบายกลไกจริง
  (core อัปเดตได้เพราะ entrypoint แตกไฟล์ ไม่ใช่เพราะ volume ถูกแทน) +
  `[WP]` ใช้ `--force-recreate --renew-anon-volumes` · health snippet เปลี่ยน
  เป็น `mysqli` (image มี mysqli ไม่มี pdo_mysql — บล็อก PDO เดิม fatal)
- ข้อเท็จจริง Docker ที่ตรวจแล้วผิด: php Debian image **มี curl** เป็น
  persistent dep (ตัด layer `apt-get install curl` ทิ้งทั้งสอง Dockerfile —
  ที่ไม่มีคือ wget) · `$PHPIZE_DEPS` ติดมากับ image อยู่แล้ว และ recipe เดิม
  `apt-get purge $PHPIZE_DEPS` **ถอน toolchain ของ base image ทิ้ง** ทำ
  pecl ที่ตามมาพัง — เอา purge ออก · `ENV ACCEPT_EULA=Y` แยกบรรทัดใช้ได้
  (เดิมสับสนกับ ARG) · apt รับ armored `.asc` ได้ตั้งแต่ 1.4 (ที่ trixie ถอด
  คือ `apt-key`)
- ความสอดคล้อง: host port placeholder ตรงกันแล้วทุกจุด **8081/8082**
  (เดิม 3 ที่ 3 ค่า — handoff เคยบอก 80 ซึ่งชน privileged) · ship
  `assets/env.example` + แถว copy ใน §5.1 (เดิม `verify.mjs` hard-fail หา
  ไฟล์ที่ setup ไม่เคยสร้างสำหรับ CI3/legacy/WP) · rule file ตัด `/health`
  ที่ไม่มีอยู่จริง · claim `localhost`→`::1` ลดระดับเป็น precautionary
  (curl ทำ Happy Eyeballs) · PHPUnit 9 `<source>` → "ตรวจในเครื่องก่อน" ·
  §5.1 เลิก restate กฎ health ซ้ำ §2.8

## 0.5.3 (2026-08-25)

**`.dockerignore` mandatory list ไม่กัน `.env`** (backlog §6 "มาตรฐานที่ยังขาด")
— `references/docker-deploy.md` §E เตือนเรื่อง `.env` จริงหลุดเข้า image layer
ผ่าน `COPY . .` ไว้เองแล้ว (ทั้งสอง Dockerfile ใช้ `COPY . .` แบบกว้าง) แต่
mandatory-4-บรรทัดจริงที่ SKILL.md/`verify.mjs` บังคับกลับไม่มี `.env` เลย —
ยังไม่ tag รอ pilot:

- SKILL.md §5.7 (การสร้าง `.dockerignore`) / §6 Quick Rules / §7 Verification
  Checklist เพิ่ม `.env`/`.env.*`/`!.env.example` เข้า mandatory list (7 บรรทัด
  จากเดิม 4) พร้อมโน้ตว่า CI3/legacy ที่ยังไม่ migrate มาใช้ `.env` ต้องเพิ่ม
  ไฟล์ config DB ของตัวเอง (เช่น `application/config/database.php`) เองแยก
  ต่างหาก — plugin เดาโครงสร้าง legacy app แต่ละโปรเจคไม่ได้
- `references/docker-deploy.md` §E เพิ่มสามบรรทัดเดียวกันในตัวอย่าง code block
  พร้อมอธิบายว่าเป็นความเสี่ยงคนละแบบกับ 4 บรรทัดเดิม (secret รั่วถาวรใน layer
  ไม่ใช่ context โต — Docker layer เป็น append-only)
- `scripts/verify.mjs` เพิ่ม check ใหม่แยกจาก artifact-guard check เดิม
  (`.dockerignore blocks real .env from the build context`)

## 0.5.2 (2026-08-25)

**สูตร subpath สำหรับแอป relative path (ข้อสุดท้ายของ pilot feedback ที่ยังกัด
"deploy ได้")** — §5.3 เดิมทิ้ง CI3/legacy ไว้ที่ "`base_url` ใน config ของ
โปรเจคเอง" ซึ่งช่วยไม่ได้กับแอป legacy ที่อ้าง asset แบบ relative
(`href="style.css"`) — เปิดผ่าน proxy ที่ `…/app` ไม่มี `/` ท้าย browser จะ
resolve หลุด subpath 404 ทั้งหน้า และแก้ฝั่ง server ไม่ได้เพราะหลัง proxy ที่
strip prefix คอนเทนเนอร์ไม่เห็น URL จริง · เพิ่ม `references/docker-deploy.md`
§G: inline redirect เติม trailing slash บนสุดของ `<head>` — **สกัดจากตัวแก้
ที่รันจริงใน pilot `ugt-mscpl-ana`** (`public/index.html`) ไม่ใช่สูตรคิดใหม่ ·
เงื่อนไข (เติมเฉพาะ segment ท้ายที่ไม่มีนามสกุลไฟล์) พิสูจน์ด้วย 6 เคสก่อน
commit · SKILL §5.3 ชี้ไป §G จาก bullet CI3/legacy · ยังไม่ tag — รอ pilot

## 0.5.1 (2026-08-25)

**กวาด cosmetic ค้างจาก pilot checklist** (backlog §6) — ยังไม่ tag รอ pilot:

- คอมเมนต์ `CI = 'true'` ใน `Jenkinsfile` เลิกอ้าง "JUnit reporter + standalone
  output" (คำอธิบายของ vitest/Next.js ที่หลงมาตอนแตก plugin) — เขียนใหม่เป็น
  generic CI flag ตามความหมายจริงในบริบท PHPUnit/composer
- ตัวอย่าง host port เลิกใช้ `8080` ทุกจุด (ชนกับ Jenkins เองบน host เดียวกัน
  — คนตามตัวอย่างจะ deploy ทับพอร์ต Jenkins): admin-handoff placeholder dev →
  `8081` พร้อมวงเล็บเหตุผล · SKILL §4 ตัวอย่าง prod/dev → `8081/8082` ·
  ตาราง placeholder `__PORT_PROD__` → `8081`

**มติ 2026-08-25 (บันทึก ไม่แก้โค้ด):**

- **HEALTHCHECK retries 3 (Dockerfile) vs 5 (compose) — ไม่เปลี่ยน**: compose
  ประกาศ healthcheck เต็มชุดและ override ของ image ตอน deploy จริงเสมอ ค่า 3
  ใน Dockerfile มีผลเฉพาะ bare `docker run` (fail เร็วกว่า เหมาะกับตอน debug
  มือ) — สองค่าอยู่คนละ context ไม่ใช่ความขัดแย้ง
- **[WP] deploy `cp` block คงเป็น instruction ใน reference ไม่ย้ายเป็น
  commented block ใน Jenkinsfile** — WP ยังไม่เคยผ่าน pilot (ownership หลัง
  `cp` ยังไม่เคยพิสูจน์ — docker-deploy.md §B บอกไว้เอง) ไม่ scaffold เผื่อ
  ของที่ยังไม่มีโปรเจคจริง ทบทวนเมื่อ WP pilot เกิดขึ้น

## 0.5.0 (2026-08-24)

รอบที่สองของ pilot feedback (`ugt-mscpl-ana`) — คราวนี้เป็นของที่ทำให้ **ผลลัพธ์
ต่างกันระหว่างโปรเจค** ไม่ใช่ blocker แบบ 0.4.0 · ยังไม่ tag รอ pilot ตามเดิม ·
สองข้อแรกเป็นบั๊กเดียวกันในทั้ง 3 stack จึงแก้พร้อมกัน (nextjs 4.45.0, python 0.5.0)

**`[VOLUME]` guard เช็คแค่ dir ระดับโปรเจค — volume ที่เพิ่มทีหลังไม่มีวันถูกสร้าง.**
บล็อกเดิมห่อทุกอย่างไว้ใน `if [ ! -d /srv/appdata/<project> ]` ซึ่งกลายเป็น
no-op ถาวรทันทีที่ deploy แรกสร้างโฟลเดอร์นั้น · โปรเจคที่เพิ่ม volume ในรุ่น
ถัดไปจึงได้ subdir ที่ dockerd สร้างเองเป็น `root:root` ตอน `up -d` แล้ว user
`app` เขียนไม่ได้ **ทั้งที่ container ขึ้น healthy ปกติ** · เปลี่ยนเป็นวนเช็ค
ทีละ subdir (`for p in …`) ซึ่งสร้าง volume ที่เพิ่มทีหลังให้ และยังข้ามตัวที่
มีอยู่แล้วโดยไม่ `chown -R` ซ้ำทุก deploy · พิสูจน์ด้วยการรัน shell จริงเทียบ
สองแบบ: guard เดิมข้ามทั้งบล็อกจน `exports` ไม่ถูกสร้าง ส่วนของใหม่สร้างให้

> `verify.mjs` แก้คู่กัน: check เดิมอ่านชื่อจากบรรทัด `mkdir -p` ซึ่งพอเป็นลูป
> แล้วเหลือแค่ `"$p"` — ไม่แก้พร้อมกันจะ **false-fail ทุกโปรเจคที่ตั้ง volume
> ถูกต้อง** · ตอนนี้สแกนทั้ง Jenkinsfile ที่ตัดคอมเมนต์แล้ว ไม่ผูกกับรูปคำสั่ง

**`docker compose` (v2) เป็นค่าตั้งต้นแทน `docker-compose` (v1).** v1 EOL ตั้งแต่
กลางปี 2023 ไม่มีใน Docker Engine ปัจจุบัน — ทุกโปรเจคต้องแก้บรรทัดเดียวกันซ้ำ ๆ
ไม่งั้น Deploy stage ตาย · §4.7 (interview) และ §5.3 กลับทิศคำอธิบายแล้ว ·
checklist ของ admin เปลี่ยนจาก "ตอบว่ามีตัวไหน" เป็น "ยืนยันว่ามี v2 — ถ้ามี
แต่ v1 กรุณาแจ้ง"

**DNS: ชื่อ host สั้นของ DB มัก resolve ไม่ได้จากในคอนเทนเนอร์** — `references/docker-deploy.md`
§C หัวข้อใหม่ · อาการคือ `Login timeout expired` ทั้งที่ credential ถูกและเปิด
จากเครื่อง host ได้ปกติ เพราะคอนเทนเนอร์ใช้ DNS ของ Docker ไม่ใช่ suffix search
list ของเครื่อง (pilot เสียเวลาไล่หาเพราะ error ชี้ไปทาง credential) · ทางแก้
เรียงลำดับ FQDN → IP → `dns:` ใน compose พร้อมคำสั่งวินิจฉัยชี้ขาด
(`docker exec <c> getent hosts <db>`) และเพิ่มคำถามใน admin-handoff ให้ admin
ยืนยัน connectivity จาก**คอนเทนเนอร์** ไม่ใช่จาก host

## 0.4.0 (2026-08-23)

**pilot จริงตัวแรกเกิดขึ้นแล้ว** — `ugt-mscpl-ana` (legacy PHP · `public/` เป็น
webroot · SQL Server ผ่าน pdo_sqlsrv) เอา skill นี้ไปใช้จนขึ้น server จริง
รุ่นนี้คือ feedback ที่ได้กลับมา · ยังไม่ tag — ของที่แก้ยังไม่ได้พิสูจน์ซ้ำบน
โปรเจค pilot

### Blocker — โปรเจคใหม่ที่ติดตั้งวันนี้เจอ build/pipeline พังทันที

- **ปลั๊กอิน Docker Pipeline (`docker-workflow`) ไม่เคยถูกบอกให้ admin ติดตั้ง**
  — grep ทั้ง plugin เดิมได้ 0 hit ทั้งที่มติ M8 ใช้ `docker.image().inside{}`
  ใน 5 stage · ขาดแล้ว pipeline ตายตั้งแต่ stage Install ด้วย
  `groovy.lang.MissingPropertyException: No such property: docker` ซึ่งอ่านไม่ออก
  เลยว่าแปลว่าปลั๊กอินหาย · **คนละเรื่องกับการมี Docker CLI** — `sh 'docker …'`
  ทำงานได้อยู่แล้วโดยไม่ต้องมีปลั๊กอินนี้ · ตอนนี้อยู่ใน checklist, ภาคผนวก,
  SKILL §2.2 และตัวสรุปท้าย `verify.mjs`
- **ภาคผนวก server setup ใน `admin-handoff.template.md` เป็น HTML comment ที่
  บอกให้ไปสรุปจาก `jenkins-one-time-setup.md` + `sonarqube-setup.md`** — สองไฟล์
  นั้น**ไม่มีอยู่ใน skill นี้** (มีแต่ใน `ugt-nextjs-cicd-setup`; ตอนแตก plugin
  ก๊อป template กับคอมเมนต์มาแต่ไม่ได้ก๊อป reference ตาม) ผลคือทุกโปรเจคต้องเขียน
  ภาคผนวกเอง ซึ่งเป็นสาเหตุโดยตรงที่ข้อบนหลุด · เขียนจริงแล้วครบ 9 หัวข้อ
  (ปลั๊กอิน · tools · credential · global env · docker group · `proxy-network` ·
  `/srv/appdata` · NVD data strategy · org Quality Gate) และลบการอ้างไฟล์ผีใน
  `Jenkinsfile` ทิ้ง
- **`FROM php:8.3-apache` ไม่ pin codename** — tag นั้นเลื่อนไป Debian trixie (13)
  แล้ว ทำให้ Microsoft ODBC apt repo (`debian/12`) พังสองชั้น: codename ไม่ตรง
  และ apt ของ trixie ไม่รับ ASCII-armored key ใน `trusted.gpg.d` · pin
  `php:8.3-apache-bookworm` แล้ว · `references/docker-deploy.md` §C เคยยืนยันไว้
  เองว่า "`php:8.3-apache` ปัจจุบันอิง bookworm" ซึ่งกลายเป็นเท็จ — แก้แล้ว
- **snippet ติดตั้ง `pdo_sqlsrv` ใน §C ขาด `$PHPIZE_DEPS`** — `pecl` คอมไพล์จาก
  source จริง ไม่มี toolchain แล้ว configure ไม่ผ่าน · เขียนบล็อกใหม่ทั้งก้อน
  พร้อม `gpg --dearmor` (apt ใหม่ไม่รับ key แบบเดิม), `apt-get upgrade -y`
  (ไม่งั้น image ตกรุ่น security patch) และ purge toolchain ใน RUN เดียวกัน
- **`Dockerfile.ci` ไม่มี `unzip`** — `php:8.3-cli` ไม่มีทั้ง zip extension และ
  binary `unzip` → `composer install` ตายทันทีด้วย "zip extension and unzip/7z
  commands are both missing"

### เขียวทั้งที่ควรแดง — healthcheck ที่รายงานว่าปกติขณะแอปตาย

- **`php -r file_get_contents` พังเงียบเมื่อ `allow_url_fopen = Off`** (hardening
  มาตรฐาน OWASP กัน RFI) — คืน `false` เสมอ container จึงไม่มีวันขึ้น healthy และ
  สเตจ Deploy ตายที่ poll โดยไม่มี error บอกสาเหตุ · เปลี่ยนเป็น
  `curl -fsS -L` ทั้ง 6 ที่ (Dockerfile ×2, compose ×2, references §D, SKILL §2.8)
  และ Dockerfile ลง `curl` เอง **ห้าม purge**
- **`-L` ไม่ใช่ของเลือกได้** — `/api/health` โดน 301 **คนละทิศแล้วแต่ shape**:
  Laravel (route + `.htaccess` มาตรฐาน) 301 ตัด `/` ท้ายทิ้ง · CI4/legacy/WordPress
  (ไฟล์ `index.php`) mod_dir 301 เติม `/` เข้ามา · `curl -f` ที่ไม่มี `-L` นับ 3xx
  ว่าสำเร็จ = เขียวหลอกทั้งที่ข้างใต้ 503 · มี `-L` แล้ว `-f` ตัดสินจาก status
  สุดท้าย = semantics เดียวกับ `file_get_contents` เดิม (ตัวนั้นตาม redirect ให้
  เองอยู่แล้ว จึงไม่เคยมีปัญหาข้อนี้ — ปัญหาเกิดตอนสลับไป curl ต่างหาก) และใช้
  บรรทัดเดียวถูกทั้ง 4 shape
- **`assets/health/index.php` เคยเป็น stub** (`// [DB] เช็ค DB แบบถูก`) ไม่มี
  ตัวอย่างจริง · ตอนนี้มีบล็อก `[DB]` แบบ comment ที่ใช้ได้จริง พร้อมกฎที่
  pilot จ่ายค่าเรียนมาแล้ว: **`LoginTimeout` เป็น DSN parameter ห้ามใช้
  `PDO::ATTR_TIMEOUT`** (pdo_sqlsrv เมินค่านั้นในเฟส connect แล้วค้างยาวเกิน
  `--timeout=10s` ของ HEALTHCHECK → container ค้าง `starting` แทนที่จะ fail เร็ว)
  และห้าม `echo $e->getMessage()` (ชื่อ server/database/user รั่วทาง endpoint สาธารณะ)

### `verify.mjs`

- check ใหม่ **`healthcheck survives redirects and PHP hardening`** — FAIL เมื่อ
  ยังใช้ `file_get_contents` หรือใช้ curl โดยไม่มีทั้ง `-L` และ trailing slash
- **เลิกเตือนผิดใส่ shape legacy ที่ใช้ `public/` เป็น webroot จริง** — `isCI4`
  ดูที่ `public/index.php` โปรเจคที่ entry เป็น `public/index.html` (JS app คู่กับ
  PHP API) จึงอ่านว่า "ไม่ใช่ CI4" แล้วถูกสั่งให้ลบบล็อก `[LARAVEL]` ที่ใช้อยู่
  ถูกต้อง ทั้งที่ §5.3 รองรับเคสนี้ไว้แล้ว · `publicDocroot` + มี `public/` จริง
  = สถานะที่ตั้งค่าถูกแล้ว
- check `Dockerfile composer ordering` (ใหม่ในรุ่นนี้ ดูข้างล่าง) เคยทิ้ง finding
  ที่สะสมไว้เพราะ `return` ในเส้นทาง warn — แยก `problems`/`warnings` แล้ว

### Laravel: `composer install` ก่อน `COPY . .` ทำ `package:discover` fail เงียบ

`Dockerfile.web` รัน `composer install … || true` ก่อน `COPY . .` — Laravel ผูก
post-autoload-dump ไว้กับ `php artisan package:discover` ซึ่งต้องการ `artisan`
ที่ยังไม่ถูก copy เข้ามา จึง fail ทุกครั้งแล้วถูก `|| true` กลืน (ซึ่งกลืน error
จริงของ composer เช่น dependency resolve พัง ไปด้วยพร้อมกัน) · แก้เป็น
`--no-scripts --no-autoloader` ตอน install แล้ว `composer dump-autoload
--optimize --no-dev` หลัง `COPY . .` โดย **`chown` ปิดท้ายเสมอ** (ถ้า chown ก่อน
dump-autoload ไฟล์ `vendor/composer/autoload_*.php` และ
`bootstrap/cache/{packages,services}.php` ที่เขียนใหม่จะเป็นของ root แล้ว
www-data เขียน `bootstrap/cache` ไม่ได้ตอนรัน) · มี verify check คุมทั้ง flag
และลำดับ

### อื่น ๆ

- checklist ของ admin เพิ่ม `proxy-network` (compose ทั้งสองไฟล์ประกาศ
  `external: true` แต่ handoff ไม่เคยบอก admin ให้สร้าง) และคำถาม compose v1/v2
- `rules/ugt-php-ci.md` (copy เข้าทุกโปรเจค) ได้กฎ healthcheck ชุดใหม่ และแก้
  คำอธิบาย CI image เป็น "unzip + pcov + composer"

## 0.3.0 (2026-08-23)

ปิด backlog §5 "verify checks ที่ประกาศแต่ไม่ implement — ฝั่ง php/python"
(ฝั่ง nextjs ปิดไปแล้วใน 4.27.0) — ยังไม่ tag รอ pilot ตามเดิม:

- **ทุก check ที่อ่าน Jenkinsfile / Dockerfile / compose อ่านเฉพาะบรรทัดที่ยัง
  ทำงานจริง** — เดิม 10 stages / Quality Gate / post / secrets อ่านไฟล์ดิบ
  (`jf`) ทำให้สเตจที่ถูก comment ทิ้งยังนับว่ามีอยู่ · เพิ่ม `dockerfileActive`
  + `composeActive` คู่กับ `jfActive` เดิม: compose ที่ ship มาพกบล็อก
  `volumes:` ทั้ง `[VOLUME]` และ `[WP]` ไว้เป็นคอมเมนต์ การสแกนดิบจึงรายงาน
  bind ชื่อ `<name>` ที่ไม่มีจริง (check `mkdir -p` ↔ bind เคย FAIL ทุกโปรเจค
  ที่ไม่มี volume) และ `[LARAVEL]` ที่ยัง comment อยู่เคยนับว่าเปิดใช้แล้ว
- verify ใหม่ตามที่ §7 ประกาศไว้แต่ไม่เคยตรวจ:
  - `post` ต้องมี `emailext` ครบ 4 outcome (เดิมเช็คแค่ว่ามีคำว่า emailext)
  - บล็อก `[LARAVEL]` ต้องตรงกับ framework — Laravel/CI4 ต้อง uncomment แล้ว
    (ไม่งั้น apache เสิร์ฟ repo root แล้วไม่มีวันถึง front controller) · shape
    อื่นที่เปิดไว้ต้องมี `public/` จริง · ที่ไม่ได้ใช้ควรลบทิ้ง (เตือน)
  - `/api/health` ต้องอยู่ใต้ docroot ที่เสิร์ฟจริงของ shape นั้น — เดิมรับ
    ตำแหน่งไหนก็ได้ใน 3 ที่ ทั้งที่ไฟล์ที่ root ไม่มีวันถูกเสิร์ฟเมื่อ
    DocumentRoot = `public/` และ WordPress ต้องเป็น `api/health/index.php`
    เป๊ะ ๆ (Dockerfile.wordpress hardcode path นี้ใน `COPY` — ผิดที่ = build พัง)
  - `volumes:` ได้ **ก้อนเดียวต่อ service** — uncomment ทั้ง `[VOLUME]` และ
    `[WP]` = YAML เก็บก้อนหลังก้อนเดียว แล้ว `wp-content` หายเงียบ
  - `[WP]`: `wp-config.php` ต้องปิด `WP_AUTO_UPDATE_CORE`
  - `composer.json` + `composer.lock` commit แล้ว และ dev tooling ทั้ง 3 ตัว
    อยู่ใน `require-dev` (ไม่ใช่ `require` ที่จะติดเข้า production image)
  - schema ของ `phpunit.xml` ต้องตรงกับเวอร์ชัน PHPUnit ที่ `composer.lock`
    resolve จริง — `<source>` ของ schema 10 บน PHPUnit 9 = `clover.xml` ว่าง →
    `new_coverage` 0% → gate บล็อกโดยไม่มี error ชี้สาเหตุ (§5.4)
  - ต้องมีอะไรสร้าง `clover.xml` จริง (ใน `phpunit.xml` หรือ
    `--coverage-clover` ในสเตจ Unit Tests)
  - `tests/SmokeTest.php` ต้องมีจริง และ path ที่มันยืนยันต้องมีอยู่จริง (เดิม
    เช็คแค่ว่า `__ENTRY_FILE__` ถูกแทนค่าแล้ว — แทนด้วย `index.php` ที่ไม่มีใน
    repo ของ WordPress ก็ผ่าน)
  - `.claude/rules/ugt-php-ci.md` · `docs/admin-handoff.md` (เตือน) ต้องมีจริง —
    เดิมสแกน placeholder ในไฟล์พวกนี้แต่ข้ามเงียบเมื่อไฟล์หายไปทั้งไฟล์
  - `.env` / `.env.dev` มีจริงและตั้ง `APP_PORT` แล้ว (เตือน — clone ใหม่ยังไม่มี
    ทั้งคู่ตามปกติ เพราะ gitignore)
- SKILL §7 ประกาศ **ไม่ตรวจโดยตั้งใจ** ตรง ๆ: พฤติกรรมตอนรันของ `/api/health`,
  subpath (`APP_URL`/`app.baseURL`/`WP_HOME` อยู่ใน `.env` ที่ gitignore),
  toolchain ในเครื่อง (§5.6), มติว่าโค้ดใน `wp-content` ขึ้น container ทางไหน,
  และฝั่ง server ทั้งหมด — ของที่เหลือถือว่า script ครอบให้แล้ว

## 0.2.0 (2026-08-21)

จากผล audit ปูพรม 2026-08-21 (ยังไม่ tag — รอ pilot ตามเดิม):

- **คำถาม subpath (interview ข้อ 3) มี step รองรับแล้ว** — §5.3 เพิ่มวิธีตั้ง
  ต่อ shape (Laravel `APP_URL`/`ASSET_URL` · CI4 `app.baseURL` · WordPress
  `WP_HOME`/`WP_SITEURL`) ลง `.env`/`.env.dev` + แถว checklist "เปิดผ่าน URL
  เต็มหลัง proxy"
- checklist เลิกบอกว่า `[WEB]` "คงหรือถูกลบตามคำตอบ" — PHP มี shape เดียว
  (§2.8) `[WEB]` คงไว้เสมอ ป้ายมีไว้ชี้ก้อน health poll ไม่ใช่ให้เลือกลบ
- verify: เพิ่ม check "ทุก compose bind ใต้ /srv/appdata มี `mkdir -p` ใน
  Deploy stage" (เคส WordPress `wp-content` คือข้อมูลหายตั้งแต่ deploy แรก)
  และ scan placeholder ครอบ `docs/admin-handoff.md` ด้วย · check นี้อ่าน
  `jfActive` (ตัดคอมเมนต์แล้ว) ไม่ใช่ไฟล์ดิบ — Jenkinsfile ที่ ship มีคอมเมนต์
  ตัวอย่างที่ระบุ `/uploads` กับ `/reports` อยู่ ถ้าอ่านดิบคอมเมนต์นั้นจะทำให้
  volume สองชื่อนี้ผ่านการตรวจโดยไม่ต้องมี mkdir จริง

## 0.1.0 (2026-08-12)

เกิดครั้งแรก: skill ugt-php-cicd-setup (deploy-only ตาม spec 2026-08-11) — ยังไม่ tag จนกว่าผ่าน pilot 1 โปรเจคจริง
