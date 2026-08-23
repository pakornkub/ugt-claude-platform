# Design — PHP container hardening

> **Status:** Approved-in-chat · **ตรวจด้วย Docker จริงแล้ว 2026-08-23** ·
> รอ review ลายลักษณ์อักษร · **Date:** 2026-08-23
> **Applies-to:** ugt-php-platform 0.4.0
> **ที่มา:** pilot จริงตัวแรกของ `ugt-php-cicd-setup` (`ugt-mscpl-ana` — legacy
> PHP, `public/` เป็น webroot, SQL Server) ทำ hardening เองทั้งชุดแล้วทดสอบบน
> deploy host จริง ความรู้ที่ได้ (รวมถึงว่า flag ไหน **พัง** บน host ขององค์กร)
> ยังไม่มีที่อยู่ใน plugin — ถ้าไม่เก็บตอนนี้ โปรเจคถัดไปต้องไปเจ็บซ้ำเอง

## 1. เป้าหมายและขอบเขต

ปิดช่องว่างที่ **PHP เป็น stack เดียวขององค์กรที่คอนเทนเนอร์ยังรันเป็น root**
และเก็บความรู้จาก pilot ที่หามาด้วยการทดลองบน host จริง ให้อยู่ในรูปที่โปรเจค
ถัดไปได้ฟรี

**ในขอบเขต:** `ugt-php-platform` — ทั้ง `Dockerfile.web` และ `Dockerfile.wordpress`
**นอกขอบเขต:** `ugt-python-platform`, `ugt-nextjs-platform` (มติ 2.2) · read-only
rootfs (มติ 2.5)

## 2. มติ

| # | มติ | เหตุผล |
| --- | --- | --- |
| 2.1 | **ไม่มีชั้น opt-in** — ทุกอย่างที่ ship เปิดใช้ทันทีทุกโปรเจค | ของที่ต้องให้คนไปเปิดเองคือของที่ไม่มีใครเปิด แต่ยังต้องดูแลเต็มราคา |
| 2.2 | **รอบนี้ทำแค่ PHP** บันทึกอีกสอง stack ไว้ใน backlog | หลักฐานทั้งหมดมาจาก pilot ฝั่ง PHP · ship config ที่ไม่เคยทดสอบให้ stack อื่นคือความผิดแบบเดียวกับที่ทำให้เกิด blocker ชุด 0.4.0 |
| 2.3 | **ไม่ ship `no-new-privileges`** และตั้ง verify ให้ FAIL ถ้ามี | ยืนยันบน `docker02` (deploy host จริง) ว่า flag นี้ทำ entrypoint ตายทุกครั้ง แม้รันเป็น non-root แล้ว — bisect ทีละ flag แล้ว ที่เหลือทำงานปกติหมด |
| 2.4 | **`setcap` + `cap_add: NET_BIND_SERVICE` ต้องมาคู่กันเสมอ** | ชุดเดียวที่ทำงานทุก host โดยไม่ขึ้นกับ sysctl ของ daemon — และ setcap อย่างเดียวทำให้ **exec ตายทั้งคอนเทนเนอร์** (§4.2) |
| 2.5 | **ไม่ทำ `read_only` / tmpfs / `disable_functions` / `allow_url_fopen` / CSP** | ทั้งหมดต้องรู้ว่าแอปเขียนที่ไหนและเรียกอะไรก่อน = ต้องมีสูตรต่อ shape ต่อโปรเจค · ยังไม่มีโปรเจคไหนขอ และ plugin นี้ยังไม่เคย tag · ถ้าวันหนึ่งมีคนขอ ค่อยออกแบบโดยมีของจริงให้ทดสอบ ดีกว่าเดาแบบที่ pilot เดา `AllowOverride None` ไว้แล้วมันพัง Laravel |

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

## 4. ผลทดสอบจริง (Docker 28.5.1 · `php:8.3-apache-bookworm`)

### 4.1 `USER www-data` ไม่ต้องพึ่ง tmpfs

runtime dir ทุกตัวเป็นของ `www-data` และ mode `1777` **มาตั้งแต่ใน base image**
(`/var/run/apache2`, `/var/lock/apache2`, `/var/log/apache2`) · รันโดยไม่มี tmpfs
เลย → `healthy` และ `ps -eo user,comm` ได้ `www-data` ทุก process ไม่มี root สักตัว

นี่คือเหตุผลที่ตัด tmpfs ทิ้งได้ทั้งชุด (ร่างแรกเชื่อว่าจำเป็น — ทดสอบแล้วไม่จริง)

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

**สองบทเรียน:**

1. **`cap_add` อย่างเดียวไม่ช่วยอะไร** — capability ไม่รอดข้ามการ exec เป็น
   non-root ถ้าไบนารีไม่มี file capability (`CapEff` = 0 ทั้งที่ให้ cap มา) ·
   ที่ pilot ทำงานได้ทุกวันนี้คือเพราะ sysctl ไม่ใช่เพราะ `cap_add`
2. **`setcap` อย่างเดียว "พังหนักกว่าไม่ทำ"** — kernel ปฏิเสธ `execve` ทั้งอัน
   ด้วย EPERM เมื่อไบนารีมี file capability ที่ไม่อยู่ใน bounding set ·
   คอนเทนเนอร์ตายทันทีด้วยข้อความที่อ่านไม่ออกว่าเกี่ยวกับ capability

→ **มติ 2.4** ได้ชุดเดียวที่ไม่ขึ้นกับ host และทำให้ `cap_drop: ALL` มีความหมาย
จริง (ไม่ใช่พึ่ง sysctl ที่ admin เปลี่ยนได้)

### 4.3 ยืนยันการตัดสินใจ `-L` ของ 0.4.0

`GET /api/health` → **301** → `/api/health/` → 200 (mod_dir เติม slash) และเมื่อ
endpoint คืน **503**:

```
curl -fsS     (ไม่มี -L) → exit 0     ← เขียวหลอก แอปตายอยู่
curl -fsS -L  (มี -L)    → exit 22    ← ถูกต้อง
```

### 4.4 ส่วนที่เหลือ — ยืนยันแล้วว่าทำงาน

`Server: Apache` (ไม่ใช่ `Apache/2.4.68 (Debian)`) · header ครบ 4 ตัว ·
`.md` ถูก deny ได้ 403

## 5. สิ่งที่จะ ship

### 5.1 `Dockerfile.web` และ `Dockerfile.wordpress`

- `COPY docker/apache-hardening.conf /etc/apache2/conf-available/` แล้ว
  `a2enconf apache-hardening` + `a2enmod headers` (`a2enconf` ต้องหลัง `COPY`)
- `sed` แก้ `/etc/apache2/conf-available/security.conf` ตรง ๆ:
  `ServerTokens Prod` · `ServerSignature Off` · `TraceEnable Off`
  — **ตั้งในไฟล์ conf ของเราเองไม่ได้** เพราะ Debian โหลด `security.conf`
  ทีหลังตามลำดับอักษร (`security` > `apache-hardening`) แล้วชนะเงียบ ๆ
- `ServerName localhost` ต่อท้าย `apache2.conf`
- `conf.d/hardening.ini`: `expose_php=Off` · `display_errors=Off` ·
  `display_startup_errors=Off` · `log_errors=On` · `allow_url_include=Off` ·
  `session.cookie_httponly=1`
- `apt-get install libcap2-bin` + `setcap cap_net_bind_service=+ep /usr/sbin/apache2`
- **`USER www-data`** ปิดท้ายไฟล์ (หลัง `chown -R www-data:www-data`)

### 5.2 `docker-compose.yml` และ `docker-compose.dev.yml`

```yaml
    cap_drop: [ALL]
    cap_add: [NET_BIND_SERVICE]   # ต้องมีคู่ setcap ใน Dockerfile — ดู §4.2
```

> **คอมเมนต์เตือนต้องอยู่ทั้งสองที่** (Dockerfile และ compose): ลบข้างใดข้างหนึ่ง
> ออกแล้วคอนเทนเนอร์ตายด้วย `Operation not permitted` ที่อ่านไม่ออกว่าเกี่ยวกับ
> capability — คนที่คิดว่า `cap_add` ซ้ำซ้อนแล้วลบทิ้งจะเจอเคสนี้พอดี

### 5.3 Asset ใหม่ — `assets/docker/apache-hardening.conf`

`Options -Indexes` บน docroot · deny `.md`/`.sample.php`/`.log`/`.ini` ·
security headers 4 ตัว (`X-Content-Type-Options`, `X-Frame-Options: DENY`,
`Referrer-Policy`, `Permissions-Policy`) + `Header unset X-Powered-By` ·
`Cache-Control: no-cache, must-revalidate` บน `.js`/`.css` (บั๊ก "แก้แล้วยังเห็น
ของเก่า" ที่ pilot เจอจริง)

**คอมเมนต์หัวไฟล์ต้องอธิบายสองเรื่อง** เพราะทั้งคู่คือกับดักที่คนถัดไปจะเดินซ้ำ:

1. ทำไม `ServerTokens`/`ServerSignature` ไม่ได้อยู่ในไฟล์นี้ (§5.1)
2. **ทำไมจงใจไม่ใส่ `AllowOverride None`, `Options -FollowSymLinks`, `CSP`** ทั้งที่
   คู่มือ hardening ทั่วไปแนะนำ — `AllowOverride None` ปิด `.htaccess` ทั้งหมด
   (Laravel front controller ตาย ทุก route 404 · WordPress permalink พังทั้งไซต์) ·
   `-FollowSymLinks` ทำ `php artisan storage:link` เสิร์ฟไฟล์อัปโหลดไม่ได้ 403 ·
   CSP baseline พังทุกแอปที่มี inline script/CDN (pilot เองต้องคำนวณ `sha256-`
   ใหม่ทุกครั้งที่แก้ inline script แม้แต่อักขระเดียว)

### 5.4 `scripts/verify.mjs`

| Check | ระดับ |
| --- | --- |
| Dockerfile มี `USER` และไม่ใช่ `root` | FAIL |
| มี `setcap` แล้วต้องมี `cap_add: NET_BIND_SERVICE` ในทั้งสอง compose (และกลับกัน) | FAIL — §4.2 |
| มี `no-new-privileges` | FAIL — มติ 2.3 พร้อมชี้ว่า docker02 พังกับ flag นี้ |
| `apache-hardening.conf` มีอยู่จริงและถูก `a2enconf` | FAIL |

### 5.5 เอกสาร

- `references/docker-deploy.md` **§G ใหม่** — เมทริกซ์ §4.2, เหตุผลที่ไม่ทำ
  `read_only`/CSP/`AllowOverride` (มติ 2.5 + §5.3), และบันทึก `no-new-privileges`
  พังบน docker02 พร้อมวิธี bisect
- `SKILL.md` — หัวข้อสั้นใต้ §2 ชี้ไป §G + Quick Rules 2 แถว
- `assets/rules/ugt-php-ci.md` — กฎ `setcap` ↔ `cap_add` ต้องมาคู่กัน และห้าม
  `no-new-privileges` (ไฟล์นี้ copy เข้าทุกโปรเจค จึงเป็นที่เดียวที่ session
  ถัดไปในโปรเจคลูกค้าจะเห็น)

## 6. ลำดับงาน

1. `apache-hardening.conf` (asset ใหม่ — ตัวอื่นอ้างถึงมัน)
2. `Dockerfile.web` + `Dockerfile.wordpress`
3. compose ทั้งสองไฟล์
4. `verify.mjs` — เขียน check พร้อม fixture ก่อน แล้วรันกับโปรเจค pilot
5. เอกสาร (§G, SKILL, rules)
6. bump 0.5.0 + CHANGELOG

## 7. ความเสี่ยงที่ยังเหลือ

1. **`no-new-privileges` บน `docker02`** — อาการเฉพาะ host/kernel ทดสอบซ้ำบน
   เครื่องพัฒนาไม่ได้ · ยึดตามที่ pilot bisect มา และตั้ง verify ให้ FAIL ไว้
2. **`Dockerfile.wordpress` + `USER www-data`** — ทดสอบด้วย
   `php:8.3-apache-bookworm` เท่านั้น ยังไม่ได้ลอง `wordpress:php8.3-apache` ซึ่ง
   คนละ image และ WordPress เขียน `wp-content` เป็นปกติ · ต้องยืนยันว่าเขียน
   volume ที่ chown แล้วได้จริง

**เงื่อนไขปิด:** ทั้งสองต้องถูกยืนยันบนโปรเจคจริงก่อน tag — สอดคล้องกับนโยบายเดิม

## 8. ผลทดสอบนี้พกพาไป Linux server จริงได้แค่ไหน

| ข้อค้นพบ | ที่มาของพฤติกรรม | พกพาได้ไหม |
| --- | --- | --- |
| runtime dir เป็น `1777` www-data (§4.1) | **ไฟล์ใน image** | ✔ เหมือนกันทุก host ที่ใช้ image เดียวกัน |
| 301 + exit code ของ `curl -f` (§4.3) | **mod_dir ใน image + curl** | ✔ สากล |
| capability ไม่รอดข้าม exec เป็น non-root · file cap นอก bounding set ทำ exec ตาย EPERM (§4.2) | **kernel capability semantics** (WSL2 = kernel Linux จริง) | ✔ สากล |
| `ip_unprivileged_port_start=0` | **Docker Engine ตั้งให้** (ตั้งแต่ 20.10) | ⚠️ ขึ้นกับรุ่น/คอนฟิกของ daemon บน host นั้น |
| `no-new-privileges` พัง | **kernel/LSM/storage driver ของ host** | ✘ ทดสอบแทนไม่ได้ |

**ข้อสำคัญ:** สเปคเลือก `setcap` + `cap_add` (มติ 2.4) ก็เพื่อ **ตัดการพึ่งพา
แถวสีเหลือง** ออกไป — แถวนั้นเป็นแถวเดียวที่ต่างกันได้ระหว่างเครื่องพัฒนากับ
server จริง และเมื่อเลือกชุดที่ผ่านทั้งสองคอลัมน์ของเมทริกซ์ §4.2 แล้ว ผลลัพธ์
จะเหมือนกันไม่ว่า host จะตั้ง sysctl ไว้อย่างไร

สิ่งที่ WSL2 **ไม่**ครอบคลุมและต้องเจอของจริงเท่านั้น: เวอร์ชัน kernel ของ host,
นโยบาย AppArmor/SELinux, storage driver — ซึ่งเป็นตรงที่อาการ `no-new-privileges`
ของ docker02 อาศัยอยู่พอดี

## 9. นอกขอบเขต (ประกาศชัด)

- `ugt-python-platform` / `ugt-nextjs-platform` — มติ 2.2, ขึ้น backlog
- read-only rootfs + tmpfs · `disable_functions` · `allow_url_fopen` · CSP —
  มติ 2.5, ขึ้น backlog พร้อมเงื่อนไข "รอโปรเจคที่ต้องการจริง"
- Trivy / image CVE scanning · `.dockerignore` กันไฟล์ secret — อยู่ในรายการ
  pilot feedback แยก
- rate limiting / WAF / security headers ฝั่ง reverse proxy — เป็นของ infra
