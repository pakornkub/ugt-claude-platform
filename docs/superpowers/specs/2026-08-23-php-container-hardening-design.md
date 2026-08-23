# Design — PHP container hardening (Tier 1 / Tier 2)

> **Status:** Approved-in-chat, รอ review ลายลักษณ์อักษร · **Date:** 2026-08-23
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

## 2. มติที่เคาะแล้ว (จาก interview 2026-08-23)

| # | มติ | เหตุผล |
| --- | --- | --- |
| 2.1 | **แบ่งสองชั้น** — Tier 1 เปิดให้ทุกโปรเจค · Tier 2 เป็นบล็อก `[HARDENING]` ที่ comment ไว้ | `read_only: true` พังโปรเจคส่วนใหญ่ถ้าเปิด default (ดู §5) แต่ opt-in ทั้งหมดแปลว่าไม่มีใครเปิด |
| 2.2 | **สองบรรทัด ini ที่แตะพฤติกรรมแอปอยู่ Tier 2** (`allow_url_fopen`, `disable_functions`) | รักษาคำสัญญาของ Tier 1 ว่า "เปิดได้เลยไม่ต้องคิด" ไม่ให้มีข้อยกเว้น |
| 2.3 | **รอบนี้ทำแค่ PHP** บันทึกอีกสอง stack ไว้ใน backlog | หลักฐานทั้งหมดมาจาก pilot ฝั่ง PHP บน host จริง · การ ship config ที่ไม่เคยทดสอบให้อีกสอง stack คือความผิดแบบเดียวกับที่ทำให้เกิด blocker ชุด 0.4.0 |
| 2.4 | **tmpfs อยู่ Tier 1 ไม่ใช่ Tier 2** | ข้อค้นพบระหว่างออกแบบ — `USER www-data` ทำงานไม่ได้ถ้าไม่มี tmpfs (§4) · tmpfs บน runtime dir ไม่อันตรายกับ shape ไหนเลย ตัวที่อันตรายคือ `read_only` ตัวเดียว |
| 2.5 | **ไม่ ship `no-new-privileges`** และตั้ง verify ให้ FAIL ถ้ามี | ยืนยันบน `docker02` (deploy host จริง) ว่า flag นี้ทำ entrypoint ตายทุกครั้ง แม้รันเป็น non-root แล้ว — bisect ทีละ flag แล้ว ที่เหลือทำงานปกติหมด |

## 3. ทำไม PHP ถึงเป็น stack เดียวที่ยังรัน root

ไม่ใช่ความหลงลืม แต่เป็นผลจากพอร์ต:

| Stack | EXPOSE | non-root ได้เลยไหม |
| --- | --- | --- |
| `ugt-python-platform` | 8000 | ✔ port > 1024 — `USER app` มาตั้งแต่ต้น |
| `ugt-nextjs-platform` | 3000 | ✔ port > 1024 — `USER nextjs` มาตั้งแต่ต้น |
| `ugt-php-platform` | **80** | ✘ ต้องมี `CAP_NET_BIND_SERVICE` |

การให้ `cap_add: [NET_BIND_SERVICE]` จึงไม่ใช่การผ่อนปรน แต่เป็นสิ่งที่ทำให้
ทิ้ง root ได้ · และอธิบายว่าทำไม `cap_drop: ALL` เฉย ๆ ถึงพัง: มันเอา
`CAP_SETUID`/`CAP_SETGID` ที่ apache ใช้ drop privilege ไปด้วย

> **ทางเลือกที่พิจารณาแล้วไม่เอา:** ให้ apache ฟัง 8080 ในคอนเทนเนอร์แทน แล้ว
> non-root ทำงานได้โดยไม่ต้องมี capability เลย — ตกไปเพราะ "พอร์ตในคอนเทนเนอร์
> คือ 80 เสมอ" เป็นสัญญาที่เขียนไว้แล้วใน compose, SKILL และ admin-handoff และ
> pilot เองก็ย้าย**กลับ**มา 80 โดยตั้งใจ

## 4. ข้อต่อสำคัญ — `USER www-data` ต้องมาคู่ tmpfs

apache ต้องเขียน pid/lock ที่ `/var/run/apache2` และ `/var/lock/apache2` ซึ่ง
เป็นของ root · pilot รอดเพราะ **tmpfs mount ทับให้เขียนได้** (tmpfs mount
world-writable โดย default) ไม่ใช่เพราะ `USER` อย่างเดียว

ดังนั้น `USER www-data` (Tier 1) + tmpfs (ถ้าอยู่ Tier 2) = พังทันทีเมื่อไม่เปิด
Tier 2 → มติ 2.4 ย้าย tmpfs ขึ้น Tier 1

**`/var/log/apache2` ตั้งใจไม่ mount tmpfs** (ต่างจาก pilot) — image ทางการ
symlink log ไป `/dev/stdout`/`/dev/stderr` ไว้ ถ้า tmpfs ทับ symlink จะหายและ
`docker logs` เงียบ · ข้อนี้ **ยังไม่ได้พิสูจน์** ดู §8

## 5. ทำไม `read_only` ต้องเป็น opt-in

pilot รอดเพราะแอปเขาเป็น dashboard อ่านอย่างเดียว ไม่เขียนดิสก์เลย ซึ่งไม่ทั่วไป:

| Shape | ต้องเขียนที่ไหน | ถ้า `read_only: true` โดยไม่จัดการ |
| --- | --- | --- |
| Laravel | `storage/framework/{cache,sessions,views}` · `storage/logs` · `bootstrap/cache` | 500 ทุก request |
| WordPress | `wp-content` (volume อยู่แล้ว) · ติดตั้ง plugin/theme จาก wp-admin | หน้าเว็บทำงาน แต่ติดตั้ง plugin ไม่ได้ |
| CodeIgniter 4 | `writable/` (log, cache, session) | 500 ทุก request |
| legacy | แล้วแต่แอป | แล้วแต่แอป |

Tier 2 จึงต้องมาพร้อมตารางนี้ ไม่ใช่แค่บรรทัด `read_only: true`

## 6. สิ่งที่จะ ship

### 6.1 Tier 1 — เปิดให้ทุกโปรเจค

**`assets/docker/Dockerfile.web` และ `Dockerfile.wordpress`**

- `COPY docker/apache-hardening.conf /etc/apache2/conf-available/` แล้ว
  `a2enconf apache-hardening` + `a2enmod headers` (ลำดับสำคัญ — `a2enconf` ต้อง
  หลัง `COPY`)
- `sed` แก้ `/etc/apache2/conf-available/security.conf` ตรง ๆ:
  `ServerTokens Prod` · `ServerSignature Off` · `TraceEnable Off`
  — **ตั้งในไฟล์ conf ของเราเองไม่ได้** เพราะ Debian โหลด `security.conf`
  ทีหลังตามลำดับอักษร (`security` > `apache-hardening`) แล้วชนะเงียบ ๆ
  (ยืนยันจาก pilot: header ยังเป็น `Apache/2.4.68 (Debian)` จนกว่าจะ patch ที่ต้นทาง)
- `ServerName localhost` ต่อท้าย `apache2.conf` (กัน warning ตอน start)
- `conf.d/hardening.ini` **เฉพาะครึ่งที่ไม่แตะแอป**:
  `expose_php=Off` · `display_errors=Off` · `display_startup_errors=Off` ·
  `log_errors=On` · `allow_url_include=Off` · `session.cookie_httponly=1`
- **`USER www-data`** ปิดท้ายไฟล์ (หลัง `chown -R www-data:www-data`)

**`assets/docker-compose.yml` และ `docker-compose.dev.yml`**

```yaml
    cap_drop: [ALL]
    cap_add: [NET_BIND_SERVICE]      # ตัวเดียวที่ non-root ต้องใช้ bind 80
    tmpfs:
      - /tmp
      - /var/run/apache2
      - /var/lock/apache2
```

### 6.2 Tier 2 — บล็อก `[HARDENING]` ที่ comment ไว้

อยู่ใน compose ทั้งสองไฟล์ ในรูปแบบเดียวกับบล็อก `[VOLUME]` ที่มีอยู่แล้ว:

- `read_only: true` + คอมเมนต์ชี้ตาราง §5 ว่า shape นี้ต้องเพิ่ม tmpfs/volume ที่ไหน
- `allow_url_fopen = Off` + `disable_functions=exec,shell_exec,system,passthru,proc_open,popen,pcntl_exec`
  พร้อมรายการที่ต้องเช็คก่อนเปิด — โดยเฉพาะ **`proc_open` คือตัวที่ Symfony
  Process ของ Laravel ใช้** (queue worker, `Artisan::call`, package ที่เรียก
  ImageMagick/wkhtmltopdf)

### 6.3 Asset ใหม่ — `assets/docker/apache-hardening.conf`

**เปิดใช้ (Tier 1) — ปลอดภัยกับทุก shape:**

- `Options -Indexes` บน docroot (ปิด directory listing)
- deny `.md` / `.sample.php` / `.log` / `.ini`
- security headers 4 ตัว: `X-Content-Type-Options` · `X-Frame-Options: DENY` ·
  `Referrer-Policy` · `Permissions-Policy` · และ `Header unset X-Powered-By`
- `Cache-Control: no-cache, must-revalidate` บน `.js`/`.css` — บั๊ก "แก้แล้วยัง
  เห็นของเก่า" ที่ pilot เจอจริง (browser เสิร์ฟ `app.js` เก่าจาก disk cache
  หลัง image rebuild เพราะ Apache ไม่ส่งสัญญาณ freshness)

**comment ไว้ (Tier 2) — สามอย่างที่ pilot ใช้ได้แต่ไม่ generalize:**

pilot เป็น dashboard ที่ไม่มี rewrite และไม่มี inline script จึงใช้สามข้อนี้ได้
ซึ่ง **ไม่จริงกับ shape อื่น** — เป็นความผิดพลาดแบบเดียวกับ `read_only` (§5):

| ตั้งค่า | พังอะไร |
| --- | --- |
| `AllowOverride None` | **ปิด `.htaccess` ทั้งหมด** → Laravel front controller ไม่ทำงาน (ทุก route 404 ยกเว้น `/`) · WordPress permalink พังทั้งไซต์ |
| `Options -FollowSymLinks` | `php artisan storage:link` สร้าง `public/storage` เป็น **symlink** → ไฟล์ที่อัปโหลดเสิร์ฟไม่ได้ 403 |
| `Content-Security-Policy` | แอปที่มี inline script/style, CDN, Google Fonts พังหมด — pilot เองต้องคำนวณ `sha256-` ของ inline script หนึ่งตัวและคำนวณใหม่ทุกครั้งที่แก้แม้แต่อักขระเดียว · WordPress ที่มีปลั๊กอินแทบไม่มีทางผ่าน baseline `default-src 'self'` |

ทั้งสามอยู่ในไฟล์แบบ comment พร้อมคำอธิบายว่าต้องเช็คอะไรก่อนเปิด

**คอมเมนต์หัวไฟล์ต้องบอกว่า** ทำไม `ServerTokens`/`ServerSignature` ไม่ได้อยู่
ในไฟล์นี้ (ดู §6.1) ไม่งั้นคนถัดไปจะย้ายมันกลับเข้ามาแล้วงงว่าทำไมไม่มีผล

### 6.4 `scripts/verify.mjs`

| Check | ระดับ |
| --- | --- |
| Dockerfile มี `USER` และไม่ใช่ `root` | FAIL |
| มี `cap_drop` แล้วต้องมี `cap_add: NET_BIND_SERVICE` คู่กัน | FAIL — ไม่งั้น apache ตายเงียบหรือรันเป็น root ทั้งที่คิดว่า drop แล้ว |
| มี `USER` non-root แล้วต้องมี tmpfs ครอบ `/var/run/apache2` + `/var/lock/apache2` | FAIL — §4 |
| **มี `no-new-privileges` = FAIL** พร้อมชี้ว่า docker02 พังกับ flag นี้ | FAIL — มติ 2.5 |
| มี `read_only: true` แล้วต้องมี tmpfs/volume ครอบ writable path ของ shape นั้น | FAIL — §5 · shape ตรวจจากไฟล์ที่มีอยู่แล้วใน script (`isLaravel` = มี `artisan` · `isWordPress` = `FROM wordpress` · `isCI4` = มี `spark`) แล้วเทียบกับตาราง §5 ตายตัว |
| `AllowOverride None` / `Options -FollowSymLinks` ต้องไม่ active เมื่อ shape เป็น Laravel/WordPress | FAIL — §6.3 |
| `apache-hardening.conf` มีอยู่จริงและถูก `a2enconf` | FAIL |

### 6.5 เอกสาร

- `references/docker-deploy.md` **§G ใหม่** — container hardening เต็มชุด:
  ตาราง §3 (ทำไม PHP ต่าง), ข้อต่อ §4, ตาราง §5, และ **บันทึกว่า
  `no-new-privileges` พังบน docker02** พร้อมวิธี bisect ที่ใช้พิสูจน์
- `SKILL.md` — หัวข้อใหม่ใต้ §2 ชี้ไป §G + Quick Rules 2 แถว
- `assets/rules/ugt-php-ci.md` — กฎ `cap_add` คู่ `cap_drop` และห้าม
  `no-new-privileges` (ไฟล์นี้ copy เข้าทุกโปรเจค จึงเป็นที่เดียวที่ session
  ถัดไปในโปรเจคลูกค้าจะเห็น)

## 7. ลำดับงาน

1. `apache-hardening.conf` (asset ใหม่ — ตัวอื่นอ้างถึงมัน)
2. `Dockerfile.web` + `Dockerfile.wordpress` (Tier 1)
3. compose ทั้งสองไฟล์ (Tier 1 + บล็อก Tier 2)
4. `verify.mjs` — เขียน check พร้อม fixture ก่อน แล้วรันกับโปรเจค pilot
5. เอกสาร (§G, SKILL, rules)
6. bump 0.5.0 + CHANGELOG

## 8. ความเสี่ยงที่ยืนยันเองไม่ได้ในรอบนี้

ประกาศตรง ๆ แทนที่จะเงียบ — เครื่องที่พัฒนาไม่มี Docker:

1. **`/var/log/apache2` ไม่ mount tmpfs** (§4) เป็นการตัดสินใจที่ต่างจาก pilot
   บนสมมติฐานว่า image symlink log ไป `/dev/stdout` ไว้ — **ต้องเช็คด้วย
   `docker logs` จริงตอนติดตั้งครั้งแรก** ถ้า log เงียบแปลว่าสมมติฐานผิด
2. Tier 1 ทั้งชุดพิสูจน์ได้แค่ระดับ config ตามที่ pilot รันจริง (ลบ `read_only`
   ออก) — ไม่ได้ build ทดสอบเอง
3. `Dockerfile.wordpress` ไม่เคยมี `USER` มาก่อนและ base image คนละตัว
   (`wordpress:php8.3-apache`) — WordPress เขียน `wp-content` เป็นปกติ ต้อง
   ยืนยันว่า `USER www-data` + volume ที่ chown แล้วยังเขียนได้

**เงื่อนไขปิดความเสี่ยง:** ทั้งสามข้อต้องถูกยืนยันบนโปรเจคจริงก่อน tag —
สอดคล้องกับนโยบายเดิมที่ php/python ยังไม่ tag จนกว่าผ่าน pilot

## 9. นอกขอบเขต (ประกาศชัด)

- `ugt-python-platform` / `ugt-nextjs-platform` — มติ 2.3, ขึ้น backlog
- Trivy / image CVE scanning — คนละเรื่อง อยู่ในรายการ pilot feedback แยก
- `.dockerignore` กันไฟล์ secret — อยู่ในรายการ pilot feedback แยก
- rate limiting / WAF / security headers ฝั่ง reverse proxy — เป็นของ infra
  ไม่ใช่ของ image
