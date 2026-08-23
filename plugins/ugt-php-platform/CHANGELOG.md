# Changelog — ugt-php-platform

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
