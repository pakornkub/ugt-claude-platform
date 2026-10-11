# Healthcheck — `curl -fsS -L http://127.0.0.1:80/api/health`

ทำไม healthcheck ของทั้ง `Dockerfile.web`/`Dockerfile.wordpress` และ compose หน้าตาแบบนี้ (กติกาสรุปอยู่ `references/org-standards.md` §8)

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
