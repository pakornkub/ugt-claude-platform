# SQL Server จาก PHP — pdo_sqlsrv + msodbcsql18 และ DNS ของ DB host

ติดตั้ง driver SQL Server ใน `Dockerfile.web` (บล็อก `[DB]`) และไล่อาการต่อ DB จากในคอนเทนเนอร์ไม่ติด

เนื้อหา: สูตร `msodbcsql18` + `pecl install sqlsrv pdo_sqlsrv` · จุดที่พลาดบ่อย (`$PHPIZE_DEPS`, `unixodbc-dev`,
`ACCEPT_EULA`, keyring `signed-by`, codename bookworm, PHP ≥ 8.3, `pdo_mysql` ของ WordPress, `PDO::ATTR_TIMEOUT`) ·
DNS: ชื่อ host สั้นของ DB resolve ไม่ได้จากในคอนเทนเนอร์

`docker/Dockerfile.web` มีคอมเมนต์ตัวเลือก DB ที่ชี้กลับมาที่ไฟล์นี้:

```
# RUN pecl install sqlsrv pdo_sqlsrv && docker-php-ext-enable sqlsrv pdo_sqlsrv   # SQL Server (ต้องมี msodbcsql — ดู references/sqlserver.md)
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
- **`new PDO(...)` options array ของ pdo_sqlsrv — ใส่ `PDO::ATTR_TIMEOUT`
  แล้ว throw ไม่ใช่แค่เมิน** — คนละอาการกับที่ § "จุดที่พลาดบ่อย" อีกข้อพูดถึง
  (นั่นคือ pdo_sqlsrv *เมินเงียบ ๆ* ตอนเฟส connect ต้องใช้ `LoginTimeout` ใน DSN
  แทน) แต่บาง build ของ `pdo_sqlsrv` (PECL ไม่ pin เวอร์ชัน — ดูข้อด้านบน) ถือว่า
  `PDO::ATTR_TIMEOUT` เป็น attribute ที่ไม่รู้จักเลยและ **throw ตรง ๆ** ตอน
  connect: `SQLSTATE[IMSSP]: An unsupported attribute was designated on the PDO
  object` (ยืนยันจริง ugt-bd-forecast 2026-09-03 — โปรเจคมี `api/db.php` แยกจาก
  `health/index.php` ของ template ที่ `forecast.php`/`snapshot.php`/health เรียก
  ร่วมกัน แล้วใส่ `PDO::ATTR_TIMEOUT => 5` เพิ่มเข้าไปในนั้นเอง ไม่ได้มาจาก
  scaffold — asset `health/index.php` ของ skill นี้เองใส่แค่ `PDO::ATTR_ERRMODE`
  ตัวเดียวจึงไม่โดน) ผลคือ health check ที่ควรตอบ 503 (แบบ config ยังไม่ครบ)
  กลับ fatal error 500 แทน — **กติกา: connection helper ที่ health check พึ่งพา
  ใส่ได้แค่ `PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION`** ห้ามเติม
  `PDO::ATTR_TIMEOUT` เด็ดขาดถ้า DSN เป็น `sqlsrv:` (`PDO::ATTR_DEFAULT_FETCH_MODE`
  ใส่ในตัวเดียวกันได้ปกติ ไม่ชนแบบเดียวกัน — ยืนยันจากโปรเจคเดียวกันหลังตัดแค่
  `ATTR_TIMEOUT` ออก build ผ่าน)

## DNS: ชื่อ host สั้นของ DB มัก resolve ไม่ได้จากในคอนเทนเนอร์

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
