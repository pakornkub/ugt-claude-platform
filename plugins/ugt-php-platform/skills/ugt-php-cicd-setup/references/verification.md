# Verification Checklist (PHP)

**ไม่มี shell = ไม่ได้รัน** — ถ้า session นี้รัน `verify.mjs` หรือ toolchain (composer/pip/pytest/
phpunit/docker) ไม่ได้ ให้รายงานเป็น **ยังไม่ได้รัน** พร้อมคำสั่งที่ผู้ใช้ต้องรันเอง · ห้ามเขียนว่า
"ผ่าน" จากการอ่านไฟล์ด้วยตา และห้ามเปิดสรุปว่า "ติดตั้งครบ" ถ้ามีไฟล์ที่เขียนไม่สำเร็จ (บอกชื่อไฟล์)

รายการตรวจเต็มหลัง setup เสร็จ — SKILL.md §7 ชี้มาที่นี่ (ฝั่ง repo · ฝั่ง server · รันจริง)

เนื้อหา: รัน `verify.mjs` · สิ่งที่ script ไม่ตรวจโดยตั้งใจ · ไฟล์ในโปรเจค · ฝั่ง server (admin ยืนยัน) · รันจริง

**รัน script ก่อน** (cwd = root ของโปรเจคปลายทาง):

```bash
node <skill-dir>/scripts/verify.mjs
```

ครอบฝั่ง repo ให้ทั้งหมด (placeholder ตกค้าง — ยกเว้น `__DIR__`, ครบ 10 stages +
`emailext` ×4, brace balance หลังลบบล็อก, บล็อก `[LARAVEL]` ตรงกับ framework,
`composer install` ใน `Dockerfile.web` ต้องมี `--no-scripts` (ไม่ใช่ `|| true`)
พร้อม `composer dump-autoload` หลัง `COPY . .`, `/api/health` อยู่ใต้ docroot
ที่เสิร์ฟจริง, `volumes:` ก้อนเดียวต่อ service, `mkdir -p` ↔ bind, composer +
require-dev 3 ตัว, schema `phpunit.xml` ตรงกับเวอร์ชันที่ composer resolve,
path ใน `sonar.sources` มีจริง, compose, tooling, health, ไฟล์ที่ SKILL.md §5.1 copy มาครบ)
— ฝั่ง server ยังต้องให้ admin ยืนยันเอง

> **ทุก check ที่อ่าน Jenkinsfile / Dockerfile / compose อ่านเฉพาะบรรทัดที่ยัง
> ทำงานจริง** (ตัดคอมเมนต์ออกก่อน) — ไฟล์ template พก legend, บล็อก `[LARAVEL]`
> และบล็อก `volumes:` ทั้ง `[VOLUME]`/`[WP]` ไว้เป็นคอมเมนต์ ถ้าอ่านดิบ ๆ ป้าย
> พวกนี้กับชื่อ volume ตัวอย่างจะทำให้ check ผ่านฟรีทั้งที่ยังไม่ได้เปิดใช้จริง

**ไม่ตรวจโดยตั้งใจ (out of scope ของ script — ต้องตรวจเอง):**

- **พฤติกรรมตอนรันจริงของ `/api/health`** — script พิสูจน์แค่ว่าไฟล์/route มีจริง
  **และอยู่ใต้ docroot ของ shape นั้น**; ส่วน "เข้าได้โดยไม่ต้อง login" กับ
  "200 healthy / 503 degraded" ต้องยิงจริงตามหัวข้อ **รันจริง** ท้ายหน้านี้
- **[subpath]** (`APP_URL`/`ASSET_URL` · `app.baseURL` · `WP_HOME`/`WP_SITEURL`)
  — ค่าเหล่านี้อยู่ใน `.env` ที่ gitignore ไว้ ตรวจแทนไม่ได้ ต้องเปิดผ่าน URL
  เต็มหลัง proxy เอง
- **SKILL.md §5.6 toolchain ในเครื่อง** (`php -l` / `php-cs-fixer` / `phpstan` /
  `phpunit`) — ต้องมี `vendor/` จริงถึงจะรู้ผล script ไม่รันแทนให้
- **[WP] โค้ดใน `wp-content` ขึ้น container ทางไหน** (`references/shapes.md` §WordPress ข้อ 1 หรือ 2) — เป็น
  มติที่ต้องคุยกับผู้ใช้ ไม่ใช่สิ่งที่อ่านจากไฟล์ได้ · script ตรวจแค่ว่า
  `wp-content` เป็น volume จริงและ `wp-config.php` ปิด auto-update แล้ว
- **ค่าใน `.env` / `.env.dev`** — เช็คแค่ว่ามีไฟล์และมี `APP_PORT` (เตือน ไม่
  fail เพราะ clone ใหม่ยังไม่มีทั้งคู่ตามปกติ) · **ไม่อ่านค่า secret ใด ๆ** ·
  คีย์ที่ framework ต้องใช้ (`APP_KEY`, `WORDPRESS_DB_*`) เป็นของ admin
- **ฝั่ง server ทั้งหมด** (Jenkins tools/credentials/global env, docker group,
  SonarQube projects + gate, webhook, `proxy-network` บน host) — อยู่นอก repo

**ไฟล์ในโปรเจค:**

- [ ] `Jenkinsfile` ครบ 10 stages + post (emailext ×4 + `cleanWs`) — ไม่มี
      `__*__` ค้าง
- [ ] บล็อก `[DB]` / `[VOLUME]` / `[WP]` / `[LARAVEL]` คงหรือถูกลบตรงตามคำตอบ
      interview — และ Groovy ยัง parse ผ่านหลังลบ (brace ครบ) · **`[WEB]` คงไว้
      เสมอ** (PHP มี shape เดียว — `references/org-standards.md` §8; ป้ายนี้มีไว้บอกว่าก้อนไหนคือ health
      poll ไม่ใช่ให้เลือกลบ)
- [ ] `Dockerfile` มาจาก shape ที่ถูก (`Dockerfile.web` สำหรับ laravel/
      codeigniter/legacy · `Dockerfile.wordpress` สำหรับ wordpress) ·
      `Dockerfile.ci` อยู่ที่ **root** ด้วยอีกไฟล์
- [ ] Laravel/CI4: บล็อก `[LARAVEL]` (sed DocumentRoot → `public/`) ถูก
      uncomment แล้ว · shape อื่น: ถูกลบทิ้งแล้ว
- [ ] [subpath] เปิดแอป**ผ่าน URL เต็มหลัง reverse proxy** ได้จริง (ตั้ง
      `APP_URL`/`ASSET_URL` · `app.baseURL` · `WP_HOME`/`WP_SITEURL` ตาม `references/subpath.md`
      แล้ว) — ทดสอบแค่ `localhost:port` ผ่านเสมอแม้ config ผิด
- [ ] health endpoint: `/api/health` เข้าถึงได้จริงตาม docroot ของ shape นั้น
      (Laravel = route ใน `routes/api.php` (ไม่ใช่ `routes/web.php` — เลี่ยง
      session middleware ที่ทำ 500 ตอนยังไม่ migrate) · CI4 =
      `public/api/health/index.php` · CI3/legacy/WordPress =
      `api/health/index.php`) · ไม่ต้อง login · 200 healthy / 503 degraded ·
      ไม่มี version/commit ใน response
- [ ] `sonar-project.properties`: `sonar.projectKey`/`projectName` แทนค่าแล้ว ·
      **ทุก path ใน `sonar.sources`/`sonar.tests` มีอยู่จริงในโปรเจค** ·
      `sonar.php.coverage.reportPaths=clover.xml`
- [ ] `owasp-suppressions.xml` (skeleton ว่าง) อยู่ที่ root
- [ ] compose ทั้ง 2 ไฟล์: `pull_policy: never` · `APP_PORT` override ได้ ·
      healthcheck ยิง `127.0.0.1:80` · volume (ถ้ามี) อยู่ใต้ `/home/docker02/appdata/` ·
      มี `volumes:` **ก้อนเดียว** ต่อ service
- [ ] shape = wordpress: `wp-content` อยู่ใน `volumes:` ทั้ง 2 ไฟล์ ·
      `wp-config.php` มี `define('WP_AUTO_UPDATE_CORE', false);` ·
      `__ENTRY_FILE__` = `api/health/index.php` (**ไม่ใช่** `index.php` ที่ไม่มี
      ใน repo) · **บรรทัด `compose up` ในสเตจ Deploy มี `--force-recreate
      --renew-anon-volumes`** (webroot ของ image เป็น anonymous volume — ไม่มี
      flag นี้ไฟล์ health เวอร์ชันใหม่ไม่ขึ้นถึง container ตั้งแต่ deploy รอบ 2) ·
      บล็อกเช็ค DB ในไฟล์ health ใช้ `mysqli` ไม่ใช่ PDO (image ไม่มี
      `pdo_mysql`) หรือเติม `docker-php-ext-install pdo_mysql` แล้ว ·
      มี `composer.json` + `require-dev` ครบ 3 ตัวเหมือน shape อื่น ·
      บอกผู้ใช้แล้วว่าโค้ดใน `wp-content` ขึ้น container ทางไหน (`references/shapes.md` §WordPress ข้อ 1 หรือ 2)
- [ ] มี volume → ทุก `<name>` ที่ compose bind **ปรากฏในบรรทัด `for p in` ของ
      บล็อก `[VOLUME]`** ในสเตจ Deploy ด้วย (ไม่ใช่แค่ระดับ `<project>`)
- [ ] `.env` + `.env.dev` มีในเครื่อง ตั้ง `APP_PORT` แล้ว และถูก gitignore จริง
      (`git check-ignore .env .env.dev` → exit 0) · `.env.example` commit แล้ว
      และ **ไม่** ถูก ignore
- [ ] `php -l` ทุกไฟล์ · `vendor/bin/php-cs-fixer fix --dry-run` ·
      `vendor/bin/phpstan analyse` · `vendor/bin/phpunit` ผ่านครบในเครื่องก่อน
      push แรก (SKILL.md §5.6) — baseline ที่มีระบุ path+เหตุผล ไม่ใช่ปิดยกโปรเจค
- [ ] `phpunit.xml` ตรงกับเวอร์ชัน PHPUnit ที่ composer resolve จริง (schema ≥10
      ตาม asset หรือแปลงเป็น 9 แล้ว) และออก `test-results/junit.xml` +
      `clover.xml` ครบทั้งคู่
- [ ] `composer.json` + `composer.lock` อยู่ที่ root และ commit แล้ว ·
      dev tooling ทั้ง 3 ตัวอยู่ใน `require-dev` (ไม่ใช่ `require`)
- [ ] `tests/` มีอย่างน้อย 1 ไฟล์ `*Test.php` และ `tests/SmokeTest.php` ชี้
      `__ENTRY_FILE__` ที่มีอยู่จริง (`vendor/bin/phpunit` ผ่านในเครื่อง)
- [ ] `.dockerignore` มี `vendor`, `coverage`, `dc-report`, `test-results`,
      `.env`, `.env.*` (+ `!.env.example`) — CI3/legacy เพิ่มไฟล์ config DB
      ของโปรเจคเองถ้าไม่ใช้ `.env`
- [ ] `.claude/rules/ugt-php-ci.md` อยู่ในที่ของมัน **และไม่มี `__PROJECT_NAME__`
      ค้าง** (ชื่อ CI image 2 จุดในไฟล์นั้นต้องถูกแทนค่าแล้ว)
- [ ] `docs/admin-handoff.md` ถูก render แล้ว (ไม่มี `__*__` ค้าง, หัวข้อที่ไม่
      ใช้ถูกลบ)

**ฝั่ง server (admin ยืนยัน) — `docs/admin-handoff.md` ที่ส่งไปครอบรายการนี้
ด้วยชื่อจริงของโปรเจคแล้ว:**

- [ ] Jenkins tool ชื่อตรงเป๊ะ: `SonarQube-Scanner`, `Dependency-Check` ·
      SonarQube server entry ชื่อ `SonarQube` — **ไม่ต้องขอ Global Tool ของ
      PHP/composer/NodeJS** (มติ M8: toolchain รันใน docker ทั้งหมด)
- [ ] **Jenkins user อยู่ใน `docker` group** (มติ M8 — ไม่มีข้อนี้ทุก stage พัง
      ตั้งแต่ Install ที่ `docker build -f Dockerfile.ci`)
- [ ] Credentials ครบ: `nvd`, `env-<project>`, `env-<project>-dev`
- [ ] Global env vars: `NOTIFY_EMAIL`, `SMTP_FROM`
- [ ] webhook ทั้งคู่: GitHub → Jenkins (`/github-webhook/`) และ
      SonarQube → Jenkins (`/sonarqube-webhook/`)
- [ ] SonarQube projects prod+dev สร้างแล้ว + assign Quality Gate ตาม `references/org-standards.md` §4
      ให้ทั้งสอง
- [ ] ปิด Lightweight checkout ใน job config
- [ ] `/home/docker02/appdata` มีอยู่และ Jenkins user เขียนได้ (ครั้งเดียวต่อ server) —
      บังคับสำหรับ WordPress ทุกโปรเจค (wp-content) และทุกโปรเจคที่ตอบข้อ 6
- [ ] network `proxy-network` มีอยู่บน host (`external: true` ในทั้ง 2 compose)
- [ ] ได้ `APP_PORT` prod/dev ตัวจริงกลับมาแล้ว (ไม่ใช่ค่า placeholder)

**รันจริง:**

- [ ] push `develop` → pipeline เขียวครบ 10 stages · coverage report + DC report
      ขึ้นบนหน้า build
- [ ] container `healthy` ภายใน 4 นาที · เข้าแอปผ่าน reverse proxy ได้
- [ ] shape = wordpress: อัปโหลดไฟล์/ติดตั้ง plugin 1 ตัว → deploy ซ้ำ → ของยัง
      อยู่ (พิสูจน์ว่า `wp-content` bind mount ทำงานจริง)
- [ ] อีเมลผลลัพธ์ถึง `NOTIFY_EMAIL`
- [ ] พิสูจน์ว่า gate บล็อกจริง: ใส่ violation เข้าไป 1 จุด → pipeline ต้อง abort
      ที่สเตจ Quality Gate
