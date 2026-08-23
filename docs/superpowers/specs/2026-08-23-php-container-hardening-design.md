# Design — PHP container hardening (Tier 1 / Tier 2)

> **Status:** Approved-in-chat · **ตรวจด้วย Docker จริงแล้ว 2026-08-23** (แก้ 3 จุด
> ที่ร่างแรกเดาผิด) · รอ review ลายลักษณ์อักษร · **Date:** 2026-08-23
> **Applies-to:** ugt-php-platform 0.4.0
> **ที่มา:** pilot จริงตัวแรกของ `ugt-php-cicd-setup` (`ugt-mscpl-ana` — legacy
> PHP, `public/` เป็น webroot, SQL Server) ทำ hardening เองทั้งชุดแล้วทดสอบบน
> deploy host จริง ความรู้ที่ได้ (รวมถึงว่า flag ไหน **พัง** บน host ขององค์กร)
> ยังไม่มีที่อยู่ใน plugin — ถ้าไม่เก็บตอนนี้ โปรเจคถัดไปต้องไปเจ็บซ้ำเอง

## 1. เป้าหมายและขอบเขต

ให้ `ugt-php-cicd-setup` มีมาตรฐาน container hardening ที่ **เปิดใช้ได้ทันที
โดยไม่ต้องคิด** สำหรับส่วนที่ปลอดภัยกับทุกแอป และ **มีสูตรพร้อมใช้** สำหรับส่วน
ที่ต้องดูแอปก่อน

**ในขอบเขต:** `ugt-php-platform` เท่านั้น
**นอกขอบเขต:** `ugt-python-platform`, `ugt-nextjs-platform` (มติข้อ 2.3)

## 2. มติที่เคาะแล้ว

| # | มติ | เหตุผล |
| --- | --- | --- |
| 2.1 | **แบ่งสองชั้น** — Tier 1 เปิดให้ทุกโปรเจค · Tier 2 เป็นบล็อก `[HARDENING]` ที่ comment ไว้ | `read_only: true` พังโปรเจคส่วนใหญ่ถ้าเปิด default (§6) แต่ opt-in ทั้งหมดแปลว่าไม่มีใครเปิด |
| 2.2 | **สองบรรทัด ini ที่แตะพฤติกรรมแอปอยู่ Tier 2** (`allow_url_fopen`, `disable_functions`) | รักษาคำสัญญาของ Tier 1 ว่า "เปิดได้เลยไม่ต้องคิด" ไม่ให้มีข้อยกเว้น |
| 2.3 | **รอบนี้ทำแค่ PHP** บันทึกอีกสอง stack ไว้ใน backlog | หลักฐานทั้งหมดมาจาก pilot ฝั่ง PHP · การ ship config ที่ไม่เคยทดสอบให้อีกสอง stack คือความผิดแบบเดียวกับที่ทำให้เกิด blocker ชุด 0.4.0 |
| 2.4 | ~~tmpfs ขึ้น Tier 1~~ → **ถอนแล้ว: tmpfs อยู่ Tier 2 คู่ `read_only` ตามเดิม** | ร่างแรกเชื่อว่า `USER www-data` ต้องพึ่ง tmpfs — **ทดสอบแล้วไม่จริง** (§4.1) |
| 2.5 | **ไม่ ship `no-new-privileges`** และตั้ง verify ให้ FAIL ถ้ามี | ยืนยันบน `docker02` (deploy host จริง) ว่า flag นี้ทำ entrypoint ตายทุกครั้ง แม้รันเป็น non-root แล้ว — bisect ทีละ flag แล้ว ที่เหลือทำงานปกติหมด |
| 2.6 | **`setcap` + `cap_add: NET_BIND_SERVICE` ต้องมาคู่กันเสมอ** (มติใหม่จากการทดสอบ) | เป็นชุดเดียวที่ทำงานได้ทุก host โดยไม่ขึ้นกับ sysctl ของ daemon — และ setcap อย่างเดียวทำให้ **exec ตายทั้งคอนเทนเนอร์** (§4.2) |

## 3. ทำไม PHP ถึงเป็น stack เดียวที่ยังรัน root

ไม่ใช่ความหลงลืม แต่เป็นผลจากพอร์ต:

| Stack | EXPOSE | non-root ได้เลยไหม |
| --- | --- | --- |
| `ugt-python-platform` | 8000 | ✔ port > 1024 — `USER app` มาตั้งแต่ต้น |
| `ugt-nextjs-platform` | 3000 | ✔ port > 1024 — `USER nextjs` มาตั้งแต่ต้น |
| `ugt-php-platform` | **80** | ✘ ต้องจัดการเรื่อง privileged port (§4.2) |

> **ทางเลือกที่พิจารณาแล้วไม่เอา:** ให้ apache ฟัง 8080 ในคอนเทนเนอร์แทน —
> ตกไปเพราะ "พอร์ตในคอนเทนเนอร์คือ 80 เสมอ" เป็นสัญญาที่เขียนไว้แล้วใน compose,
> SKILL และ admin-handoff และ pilot เองก็ย้าย**กลับ**มา 80 โดยตั้งใจ

## 4. ผลทดสอบจริง (Docker 28.5.1 · php:8.3-apache-bookworm)

### 4.1 `USER www-data` ไม่ต้องพึ่ง tmpfs — ร่างแรกเดาผิด

runtime dir ทุกตัวเป็นของ `www-data` และ mode `1777` **มาตั้งแต่ใน base image**:

```
drwxrwxrwt www-data www-data /var/run/apache2
drwxrwxrwt www-data www-data /var/lock/apache2
drwxrwxrwt www-data www-data /var/log/apache2
```

รัน Tier 1 ล้วน ๆ (ไม่มี tmpfs เลย) → `healthy` และ `ps -eo user,comm` ได้
`www-data` ทุก process ไม่มี root สักตัว · **tmpfs จึงจำเป็นเฉพาะเมื่อเปิด
`read_only: true`** ซึ่งเป็นที่ที่ pilot วางไว้ถูกแล้ว → ถอนมติ 2.4

### 4.2 privileged port — เมทริกซ์ที่ทดสอบจริง

`net.ipv4.ip_unprivileged_port_start` ในคอนเทนเนอร์ = **0** (Docker Engine ตั้งให้
เอง) แปลว่า non-root bind port 80 ได้โดยไม่ต้องมี capability — แต่ host ที่ตั้ง
ค่านี้ต่างไปจะพัง จึงทดสอบครบทุกทาง (7 จาก 8 ช่องรันจริง):

| `setcap` ที่ไบนารี | `cap_add` ใน compose | host ปกติ (sysctl=0) | host เข้ม (sysctl=1024) |
| --- | --- | --- | --- |
| ✘ | ✘ | ✔ healthy | ✘ *(อนุมาน — ไม่ได้รัน)* |
| ✘ | ✔ | ✔ healthy | ✘ `Permission denied: could not bind to 0.0.0.0:80` |
| ✔ | ✘ | ✘ **`/usr/sbin/apache2: Operation not permitted`** | ✘ เหมือนกัน |
| ✔ | ✔ | ✔ healthy | ✔ healthy |

**สองบทเรียนจากตารางนี้:**

1. **`cap_add` อย่างเดียวไม่ช่วยอะไร** — capability ไม่รอดข้ามการ exec เป็น
   non-root ถ้าไบนารีไม่มี file capability (`CapEff` = 0 ทั้งที่ให้ cap มา) ·
   ที่ pilot ทำงานได้ทุกวันนี้คือเพราะ sysctl ไม่ใช่เพราะ `cap_add`
2. **`setcap` อย่างเดียว "พังหนักกว่าไม่ทำ"** — kernel ปฏิเสธ `execve` ทั้งอัน
   ด้วย EPERM เมื่อไบนารีมี file capability ที่ไม่อยู่ใน bounding set ·
   คอนเทนเนอร์ตายทันทีด้วยข้อความที่อ่านไม่ออกว่าเกี่ยวกับ capability

→ **มติ 2.6: ต้องมาคู่กัน** ได้ชุดเดียวที่ไม่ขึ้นกับ host และทำให้
`cap_drop: ALL` มีความหมายจริง (ไม่ใช่พึ่ง sysctl ที่ admin เปลี่ยนได้)

### 4.3 `/var/log/apache2` ห้าม mount tmpfs — pilot มีบั๊กตรงนี้

log เป็น symlink: `access.log → /dev/stdout` · `error.log → /dev/stderr`
tmpfs ทับแล้ว symlink หาย apache เขียนไฟล์จริงลง RAM แทน:

| tmpfs set | health | `docker logs` |
| --- | --- | --- |
| ไม่รวม `/var/log/apache2` (สเปคนี้) | healthy | **4 บรรทัด** |
| รวม `/var/log/apache2` (แบบ pilot) | healthy | **0 บรรทัด** |

คอนเทนเนอร์ยัง healthy ทั้งคู่ — log หายเงียบโดยไม่มีสัญญาณเตือน

### 4.4 ยืนยันการตัดสินใจ `-L` ของ 0.4.0

`GET /api/health` → **301** → `/api/health/` → 200 (mod_dir เติม slash) และเมื่อ
endpoint คืน **503**:

```
curl -fsS     (ไม่มี -L) → exit 0     ← เขียวหลอก แอปตายอยู่
curl -fsS -L  (มี -L)    → exit 22    ← ถูกต้อง
curl -fsS + trailing slash → exit 22  ← ถูกต้อง
```

## 5. Tier 1 ที่เหลือ — ยืนยันแล้วว่าทำงาน

`Server: Apache` (ไม่ใช่ `Apache/2.4.68 (Debian)`) · header ครบ 4 ตัว
(`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy`) · `.md` ถูก deny ได้ 403

## 6. ทำไม `read_only` ต้องเป็น opt-in

pilot รอดเพราะแอปเขาเป็น dashboard อ่านอย่างเดียว ซึ่งไม่ทั่วไป:

| Shape | ต้องเขียนที่ไหน | ถ้า `read_only: true` โดยไม่จัดการ |
| --- | --- | --- |
| Laravel | `storage/framework/{cache,sessions,views}` · `storage/logs` · `bootstrap/cache` | 500 ทุก request |
| WordPress | `wp-content` (volume อยู่แล้ว) · ติดตั้ง plugin/theme จาก wp-admin | หน้าเว็บทำงาน แต่ติดตั้ง plugin ไม่ได้ |
| CodeIgniter 4 | `writable/` (log, cache, session) | 500 ทุก request |
| legacy | แล้วแต่แอป | แล้วแต่แอป |

## 7. สิ่งที่จะ ship

### 7.1 Tier 1 — เปิดให้ทุกโปรเจค

**`assets/docker/Dockerfile.web` และ `Dockerfile.wordpress`**

- `COPY docker/apache-hardening.conf /etc/apache2/conf-available/` แล้ว
  `a2enconf apache-hardening` + `a2enmod headers` (`a2enconf` ต้องหลัง `COPY`)
- `sed` แก้ `/etc/apache2/conf-available/security.conf` ตรง ๆ:
  `ServerTokens Prod` · `ServerSignature Off` · `TraceEnable Off`
  — **ตั้งในไฟล์ conf ของเราเองไม่ได้** เพราะ Debian โหลด `security.conf`
  ทีหลังตามลำดับอักษร (`security` > `apache-hardening`) แล้วชนะเงียบ ๆ
- `ServerName localhost` ต่อท้าย `apache2.conf`
- `conf.d/hardening.ini` **เฉพาะครึ่งที่ไม่แตะแอป**: `expose_php=Off` ·
  `display_errors=Off` · `display_startup_errors=Off` · `log_errors=On` ·
  `allow_url_include=Off` · `session.cookie_httponly=1`
- `apt-get install libcap2-bin` + **`setcap cap_net_bind_service=+ep /usr/sbin/apache2`**
- **`USER www-data`** ปิดท้ายไฟล์ (หลัง `chown -R www-data:www-data`)

**`assets/docker-compose.yml` และ `docker-compose.dev.yml`**

```yaml
    cap_drop: [ALL]
    cap_add: [NET_BIND_SERVICE]   # ต้องมีคู่ setcap ใน Dockerfile — ดู §4.2
```

> **คอมเมนต์เตือนต้องอยู่ทั้งสองที่** (Dockerfile และ compose): ลบข้างใดข้างหนึ่ง
> ออกแล้วคอนเทนเนอร์ตายด้วย `Operation not permitted` ที่อ่านไม่ออกว่าเกี่ยวกับ
> capability — คนที่คิดว่า `cap_add` ซ้ำซ้อนแล้วลบทิ้งจะเจอเคสนี้พอดี

### 7.2 Tier 2 — บล็อก `[HARDENING]` ที่ comment ไว้

อยู่ใน compose ทั้งสองไฟล์ รูปแบบเดียวกับบล็อก `[VOLUME]` ที่มีอยู่แล้ว:

```yaml
    # [HARDENING] read-only rootfs — เปิดเมื่อรู้ว่าแอปเขียนที่ไหนบ้าง (§6)
    # read_only: true
    # tmpfs:
    #   - /tmp
    #   - /var/run/apache2
    #   - /var/lock/apache2
    #   ห้ามใส่ /var/log/apache2 — จะทับ symlink แล้ว docker logs เงียบ (§4.3)
```

พร้อมสองบรรทัด ini ของ Tier 2 (`allow_url_fopen=Off`,
`disable_functions=exec,shell_exec,system,passthru,proc_open,popen,pcntl_exec`)
และคำเตือนว่า **`proc_open` คือตัวที่ Symfony Process ของ Laravel ใช้** (queue
worker, `Artisan::call`, package ที่เรียก ImageMagick/wkhtmltopdf)

### 7.3 Asset ใหม่ — `assets/docker/apache-hardening.conf`

**เปิดใช้ (Tier 1) — ปลอดภัยกับทุก shape:** `Options -Indexes` บน docroot ·
deny `.md`/`.sample.php`/`.log`/`.ini` · security headers 4 ตัว +
`Header unset X-Powered-By` · `Cache-Control: no-cache, must-revalidate` บน
`.js`/`.css` (บั๊ก "แก้แล้วยังเห็นของเก่า" ที่ pilot เจอจริง)

**comment ไว้ (Tier 2) — สามอย่างที่ pilot ใช้ได้แต่ไม่ generalize:**

| ตั้งค่า | พังอะไร |
| --- | --- |
| `AllowOverride None` | **ปิด `.htaccess` ทั้งหมด** → Laravel front controller ไม่ทำงาน (ทุก route 404 ยกเว้น `/`) · WordPress permalink พังทั้งไซต์ |
| `Options -FollowSymLinks` | `php artisan storage:link` สร้าง `public/storage` เป็น **symlink** → ไฟล์อัปโหลด 403 |
| `Content-Security-Policy` | แอปที่มี inline script/style, CDN, Google Fonts พังหมด — pilot เองต้องคำนวณ `sha256-` ใหม่ทุกครั้งที่แก้ inline script แม้แต่อักขระเดียว |

**คอมเมนต์หัวไฟล์ต้องบอก** ว่าทำไม `ServerTokens`/`ServerSignature` ไม่ได้อยู่
ในไฟล์นี้ (§7.1) ไม่งั้นคนถัดไปจะย้ายกลับเข้ามาแล้วงงว่าทำไมไม่มีผล

### 7.4 `scripts/verify.mjs`

| Check | ระดับ |
| --- | --- |
| Dockerfile มี `USER` และไม่ใช่ `root` | FAIL |
| **มี `setcap` ใน Dockerfile แล้วต้องมี `cap_add: NET_BIND_SERVICE` ในทั้งสอง compose (และกลับกัน)** | FAIL — §4.2 คอนเทนเนอร์ตายถ้าขาดข้างใดข้างหนึ่ง |
| มี `no-new-privileges` = FAIL พร้อมชี้ว่า docker02 พังกับ flag นี้ | FAIL — มติ 2.5 |
| **tmpfs ต้องไม่ครอบ `/var/log/apache2`** | FAIL — §4.3 |
| มี `read_only: true` แล้วต้องมี tmpfs/volume ครอบ writable path ของ shape นั้น (shape ตรวจจาก `artisan`/`FROM wordpress`/`spark` ที่ script มีอยู่แล้ว) | FAIL — §6 |
| `AllowOverride None` / `Options -FollowSymLinks` ต้องไม่ active เมื่อ shape เป็น Laravel/WordPress | FAIL — §7.3 |
| `apache-hardening.conf` มีอยู่จริงและถูก `a2enconf` | FAIL |

### 7.5 เอกสาร

- `references/docker-deploy.md` **§G ใหม่** — เมทริกซ์ §4.2 เต็ม ๆ, ตาราง §4.3,
  ตาราง §6, และบันทึกว่า `no-new-privileges` พังบน docker02 พร้อมวิธี bisect
- `SKILL.md` — หัวข้อใหม่ใต้ §2 ชี้ไป §G + Quick Rules 2 แถว
- `assets/rules/ugt-php-ci.md` — กฎ `setcap` ↔ `cap_add` ต้องมาคู่กัน และห้าม
  `no-new-privileges` (ไฟล์นี้ copy เข้าทุกโปรเจค จึงเป็นที่เดียวที่ session
  ถัดไปในโปรเจคลูกค้าจะเห็น)

## 8. ลำดับงาน

1. `apache-hardening.conf` (asset ใหม่ — ตัวอื่นอ้างถึงมัน)
2. `Dockerfile.web` + `Dockerfile.wordpress` (Tier 1)
3. compose ทั้งสองไฟล์ (Tier 1 + บล็อก Tier 2)
4. `verify.mjs` — เขียน check พร้อม fixture ก่อน แล้วรันกับโปรเจค pilot
5. เอกสาร (§G, SKILL, rules)
6. bump 0.5.0 + CHANGELOG

## 9. ความเสี่ยงที่ยังเหลือ

ร่างแรกมี 3 ข้อ — **ปิดไปแล้ว 2 ข้อด้วยการทดสอบจริง** (§4.1, §4.3) เหลือ:

1. **`no-new-privileges` บน `docker02`** — เป็นอาการเฉพาะ host/kernel ทดสอบซ้ำ
   บนเครื่องพัฒนาไม่ได้ · ยึดตามที่ pilot bisect มา และตั้ง verify ให้ FAIL ไว้
2. **`Dockerfile.wordpress` + `USER www-data`** — ทดสอบด้วย base image
   `php:8.3-apache-bookworm` เท่านั้น ยังไม่ได้ลอง `wordpress:php8.3-apache` ซึ่ง
   คนละ image และ WordPress เขียน `wp-content` เป็นปกติ · ต้องยืนยันว่าเขียน
   volume ที่ chown แล้วได้จริง
3. **สภาพแวดล้อมที่ทดสอบคือ Docker Desktop/WSL2** ไม่ใช่ deploy host จริง — ดู
   §10 ว่าข้อไหนพกพาได้และข้อไหนไม่

**เงื่อนไขปิด:** ทั้งสามต้องถูกยืนยันบนโปรเจคจริงก่อน tag — สอดคล้องกับนโยบายเดิม

## 10. ผลทดสอบนี้พกพาไป Linux server จริงได้แค่ไหน

| ข้อค้นพบ | ที่มาของพฤติกรรม | พกพาได้ไหม |
| --- | --- | --- |
| runtime dir เป็น `1777` www-data (§4.1) | **ไฟล์ใน image** — `php:8.3-apache-bookworm` | ✔ เหมือนกันทุก host ที่ใช้ image เดียวกัน |
| log เป็น symlink → `/dev/stdout` (§4.3) | **ไฟล์ใน image** | ✔ เหมือนกันทุก host |
| tmpfs ทับ symlink แล้ว log หาย | **kernel mount semantics** | ✔ สากล |
| 301 + exit code ของ `curl -f` (§4.4) | **mod_dir ใน image + curl** | ✔ สากล |
| capability ไม่รอดข้าม exec เป็น non-root · file cap นอก bounding set ทำ exec ตาย EPERM (§4.2) | **kernel capability semantics** (WSL2 = kernel Linux จริง) | ✔ สากล |
| `ip_unprivileged_port_start=0` | **Docker Engine ตั้งให้** (ตั้งแต่ 20.10) | ⚠️ ขึ้นกับรุ่น/คอนฟิกของ daemon บน host นั้น |
| `no-new-privileges` พัง | **kernel/LSM/storage driver ของ host** | ✘ ทดสอบแทนไม่ได้ |

**ข้อสำคัญ:** สเปคนี้เลือก `setcap` + `cap_add` (มติ 2.6) ก็เพื่อ **ตัดการพึ่งพา
แถวสีเหลือง** ออกไป — แถวนั้นเป็นแถวเดียวที่ต่างกันได้ระหว่างเครื่องพัฒนากับ
server จริง และเมื่อเลือกชุดที่ผ่านทั้งสองคอลัมน์ของเมทริกซ์ §4.2 แล้ว ผลลัพธ์
จะเหมือนกันไม่ว่า host จะตั้ง sysctl ไว้อย่างไร

สิ่งที่ WSL2 **ไม่**ครอบคลุมและต้องเจอของจริงเท่านั้น: เวอร์ชัน kernel ของ host,
นโยบาย AppArmor/SELinux, storage driver — ซึ่งเป็นตรงที่อาการ `no-new-privileges`
ของ docker02 อาศัยอยู่พอดี

## 11. นอกขอบเขต (ประกาศชัด)

- `ugt-python-platform` / `ugt-nextjs-platform` — มติ 2.3, ขึ้น backlog
- Trivy / image CVE scanning — อยู่ในรายการ pilot feedback แยก
- `.dockerignore` กันไฟล์ secret — อยู่ในรายการ pilot feedback แยก
- rate limiting / WAF / security headers ฝั่ง reverse proxy — เป็นของ infra
