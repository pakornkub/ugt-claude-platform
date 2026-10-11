# Per-shape adjust — Laravel / CodeIgniter / legacy / WordPress

ขั้นปรับไฟล์ตาม shape (interview ข้อ 4) — SKILL.md §5.3 สรุปเป็นตาราง ไฟล์นี้คือรายละเอียดเต็ม + โค้ด
(ข้อที่ไม่ขึ้นกับ shape — DB, volume, subpath, compose v1, config เดิม — อยู่ที่ SKILL.md §5.3)

เนื้อหา: §Laravel (DocumentRoot, health route, DB env) · §CodeIgniter · §legacy (+ PHPUnit 9 schema) ·
§WordPress (health path, `compose up` flags, โค้ดขึ้น container ทางไหน, `__ENTRY_FILE__`, composer)

## Laravel

**shape = laravel** → `Dockerfile.web` · **uncomment บล็อก `[LARAVEL]` 2
บรรทัด** (sed ย้าย DocumentRoot ไป `public/`) · **ไม่ copy
`health/index.php`** — ไฟล์ที่ root ไม่ถูกเสิร์ฟเมื่อ DocumentRoot = `public/`
ให้เพิ่ม route แทน (โค้ดชุดเดียวกับในไฟล์ health) **ใน `routes/api.php` ไม่ใช่
`routes/web.php`** — middleware group `web` รัน `StartSession`, ถ้า
`SESSION_DRIVER=database` แล้วยังไม่มีตาราง `sessions` (โปรเจคที่ยังไม่
migrate) endpoint จะ 500 แทน healthy/degraded ทำให้ container ไม่มีวันขึ้น
healthy; `routes/api.php` ไม่ผ่าน middleware `web` เลยไม่มีปัญหานี้
(`bootstrap/app.php` ของ Laravel 11 ต้องมี `api: __DIR__.'/../routes/api.php'`
ใน `->withRouting(...)` — ถ้ายังไม่มีให้เพิ่ม; `apiPrefix` ดีฟอลต์คือ `api`
อยู่แล้ว **ห้าม** ตั้งเป็น `''`):

```php
// routes/api.php — เสิร์ฟที่ /api/health (apiPrefix ดีฟอลต์), ไม่ผ่าน
// middleware "web" จึงไม่มี session/CSRF มายุ่ง (contract: ไม่ต้อง login)
Route::get('/health', function () {
    $ok = true; // [DB] เช็ค DB จริง (SELECT 1) แล้ว $ok = false เมื่อพัง
    return response()->json(['status' => $ok ? 'healthy' : 'degraded'], $ok ? 200 : 503);
});
```

**Laravel (ข้อ 5 = artisan migrate)** → คงบล็อก `[DB]` ไว้ตามที่ template ให้มา
(`php artisan migrate --force` ผ่าน `--env-file .env`) — ใช้ `--env-file` ทั้ง
ไฟล์ **ไม่ใช่** `-e DATABASE_URL` ตัวเดียว เพราะ `artisan` boot ทั้ง framework
ก่อนแตะ DB ขาด `APP_KEY` ก็ตายตั้งแต่ยังไม่ทัน migrate. ผลพลอยได้คือ **ไม่ต้อง
parse `.env` เองด้วย `grep`/`cut`** (docker อ่านไฟล์ให้ ไม่ต้องลุ้น quote/`\r`)
· **shape = laravel** → Laravel ไม่อ่าน `DATABASE_URL` (อ่าน `DB_URL` หรือ
`DB_CONNECTION`/`DB_HOST`/`DB_PORT`/`DB_DATABASE`/`DB_USERNAME`/`DB_PASSWORD`)
ให้ใช้บรรทัด `[DB][LARAVEL]` ที่อยู่ต่อจาก `DATABASE_URL:` ใน compose ทั้ง 2
ไฟล์แทน แล้วลบบรรทัด `DATABASE_URL:` ทิ้ง

## CodeIgniter

**shape = codeigniter** → `Dockerfile.web` · **CI4** (มี `public/`): uncomment
บล็อก `[LARAVEL]` แล้ววาง health ที่ `public/api/health/index.php` ·
**CI3** (index.php อยู่ที่ root): **ลบ** บล็อก `[LARAVEL]` ทิ้ง แล้ววาง health
ที่ `api/health/index.php`

## legacy

**shape = legacy** → `Dockerfile.web` · ลบบล็อก `[LARAVEL]` ทิ้ง (เว้นแต่
โปรเจคใช้ `public/` เป็น webroot จริง ๆ) · health ที่ `api/health/index.php`

### PHPUnit 9 บนโปรเจคที่ปัก PHP เก่า

> **`phpunit.xml` ที่ให้มาเป็น schema ของ PHPUnit ≥ 10** (ใช้ `<source>` +
> `<logging><junit>`). โปรเจค legacy ที่ `composer.json` ปักเวอร์ชัน PHP เก่า
> (`require.php` หรือ `config.platform.php`) จะถูก composer resolve ไปได้แค่
> PHPUnit 9 ซึ่ง **ไม่รู้จัก `<source>`** (element นี้เข้ามาใน schema 10 —
> 9.x ใช้ `<coverage><include>`) ผลที่ตามมา **ต่างกันตาม 9.x minor**: บางรุ่น
> เตือนแล้วรันต่อโดยไม่ config coverage, บางรุ่นปฏิเสธไฟล์ทั้งไฟล์ —
> ปลายทางที่เจอบ่อยคือ `clover.xml` ว่างหรือไม่ถูกสร้าง แล้ว `new_coverage`
> อ่านเป็น 0% ซึ่ง gate บล็อกโดยไม่มี error ชี้สาเหตุ. **ตรวจในเครื่องก่อน**
> (`vendor/bin/phpunit --version` + ดูว่ามี `clover.xml` ออกมาจริงไหม ตาม SKILL.md §5.6)
> อย่าเดาจากเลขเวอร์ชันอย่างเดียว แล้วเลือกทางใดทางหนึ่ง **ก่อน push แรก**:
> (ก) ปลด/bump ข้อจำกัดให้ composer ลง PHPUnit ≥ 10 ได้ (CI image เป็น PHP 8.3
> อยู่แล้ว) หรือ (ข) แปลง `phpunit.xml` เป็น schema 9 (`<coverage><include>
> <directory>` แทน `<source>`) — ทั้งสองทาง **ผลลัพธ์ต้องคงเดิม**: ได้
> `test-results/junit.xml` + `clover.xml` ครบทั้งคู่

## WordPress

**shape = wordpress** → `Dockerfile.wordpress` · health **ต้อง** อยู่ที่
`api/health/index.php` เป๊ะ ๆ (Dockerfile hardcode path นี้ใน `COPY` และ image
นี้ **ไม่มี `COPY . .`** — วางที่อื่นแล้วจะไม่มีอะไรเข้า image เลย) · บล็อก
`[WP]` ในทั้ง 2 compose **ห้ามลบ** · เพิ่ม `define('WP_AUTO_UPDATE_CORE', false);`
ใน `wp-config.php` (เหตุผล → `references/wordpress-deploy.md`) ·
**แก้บรรทัด `compose up` ในสเตจ Deploy ตามคอมเมนต์ `[WP]`** เป็น
`up -d --no-build --force-recreate --renew-anon-volumes` — image นี้ประกาศ
`VOLUME /var/www/html` เอง ไม่ใส่ flag แล้วไฟล์ที่แก้ใน image ใหม่ (รวมไฟล์
health) จะไม่ขึ้นถึง container เลยตั้งแต่ deploy รอบที่ 2
(→ `references/wordpress-deploy.md`)

**โค้ดของโปรเจค WordPress ขึ้น container ทางไหน — ต้องบอกผู้ใช้ให้ชัดตั้งแต่
ตอน setup** เพราะ `Dockerfile.wordpress` = base image + ไฟล์ health เท่านั้น
ไม่มีอะไรจาก repo เข้า image อีกเลย และ `wp-content` เป็น bind mount ที่**ไม่มี
อะไรเติมให้อัตโนมัติ**:

1. **โมเดลหลัก (default) — `wp-content` เป็นข้อมูล runtime** อยู่ที่
   `/home/docker02/appdata/<project>/wp-content` บนโฮสต์ ไม่ใช่ของที่ pipeline ส่งขึ้นไป:
   theme/plugin/media ติดตั้งผ่าน **wp-admin ครั้งแรกหลัง deploy** แล้วอยู่ยาว
   ข้าม deploy ถัดไปเอง (นี่คือเหตุผลที่ volume นี้บังคับ) — deploy รอบถัดไป
   เปลี่ยนแค่ core/health ที่มากับ image ไม่แตะ `wp-content`
2. **ถ้า repo track theme/plugin ที่เขียนเอง** (มี `wp-content/themes/<custom>`
   หรือ `wp-content/plugins/<custom>` อยู่ใน git) โค้ดชุดนั้น**ยังไม่มีทางขึ้น
   ไปเอง** — ต้องเติมขั้น copy ฝั่งโฮสต์ลง bind mount **ก่อน** `compose up`
   ในสเตจ Deploy (ทำได้เพราะเป็น bind mount ไม่ใช่ named volume):

   ```groovy
   // [WP] เฉพาะโปรเจคที่ track theme/plugin ของตัวเองใน repo —
   // ⚠️ ยังไม่ผ่าน pilot: ต้องพิสูจน์ ownership/permission กับโปรเจคจริงก่อนใช้ยาว
   sh "cp -r wp-content/. /home/docker02/appdata/${containerName}/wp-content/"
   ```

   วางไว้**หลัง**บล็อก `[VOLUME]` (path + chown ต้องมีก่อน) และ **ก่อน**
   `docker-compose ... up -d`. `cp -r <dir>/.` (มีจุดต่อท้าย) = คัดลอก
   *เนื้อใน* ไม่ใช่ตัวโฟลเดอร์ — ไม่งั้นจะได้ `wp-content/wp-content`.
   ข้อนี้ทับไฟล์ชื่อซ้ำแต่**ไม่ลบ**ของที่ผู้ใช้ติดตั้งผ่าน wp-admin ไว้ ถ้า
   ต้องการ mirror เป๊ะ ๆ ค่อยพิจารณา `rsync --delete` เป็นกรณีไป (เสี่ยงลบ
   uploads — ห้ามใส่เป็นค่า default)
3. **ข้อนี้กำหนดว่า Sonar สแกนอะไรด้วย** — สิ่งที่ scanner เห็นคือโค้ดใน repo
   (theme/plugin ที่เขียนเอง) ไม่ใช่ WordPress core ซึ่งไม่เคยอยู่ใน repo อยู่
   แล้ว และถูก `sonar.exclusions` กัน `wp-admin`/`wp-includes` ไว้ซ้ำอีกชั้น —
   ถ้าโปรเจคไม่มีโค้ดของตัวเองใน repo เลย ให้บอกผู้ใช้ตรง ๆ ว่า Quality Gate
   จะวัดแทบไม่มีอะไร (นั่นเป็นเรื่องปกติของ WP ที่ใช้แต่ปลั๊กอินสำเร็จรูป
   ไม่ใช่สัญญาณว่าตั้งค่าผิด)

### `__ENTRY_FILE__` = `api/health/index.php`

> **WordPress ใช้ `api/health/index.php` ไม่ใช่ `index.php`** — repo ของโปรเจค
> WordPress ไม่ได้ commit core ไว้ (core มากับ base image `wordpress:*` และ
> `Dockerfile.wordpress` ไม่มี `COPY . .`) ดังนั้น `index.php` ที่ root **ไม่มี
> อยู่ใน repo** ที่ CI checkout มา — `assertFileExists` จะ fail แล้วสเตจ Unit
> Tests แดงตั้งแต่ build แรก. `api/health/index.php` เป็นไฟล์ที่ **การันตีว่า
> commit อยู่จริง** เพราะ `Dockerfile.wordpress` `COPY` มันจาก build context
> (ไม่มีไฟล์นี้ = image build ไม่ผ่านตั้งแต่แรกอยู่แล้ว) จึงเป็น smoke check ที่
> ตรงกับความจริงของ shape นี้ที่สุด

### composer (SKILL.md §5.4)

> **[WP] WordPress เดินเส้นเดียวกับ legacy ในขั้น composer (SKILL.md §5.4)** — repo ของโปรเจค WordPress
> แทบไม่เคยมี `composer.json` (core มากับ base image, ปลั๊กอินติดตั้งผ่าน
> wp-admin) แต่ **ไม่ได้แปลว่าข้ามขั้นนี้ได้** เพราะ Jenkinsfile ยังรัน
> `composer install` + `vendor/bin/*` ให้ shape นี้เหมือนกันเป๊ะ ๆ →
> `composer init --no-interaction --name org/<project>` แล้ว
> `composer require --dev ...` ทั้ง 3 ตัวตามปกติ. `composer.json` ที่ได้จะมีแต่
> `require-dev` (ไม่มี runtime dependency สักตัว) — **ถูกต้องแล้ว** ไม่ใช่ความ
> ผิดพลาด: `Dockerfile.wordpress` ไม่รัน composer เลย ไฟล์ชุดนี้มีไว้ให้ CI
> ใช้อย่างเดียว (`Dockerfile.web` ก็รองรับเคสนี้ด้วย — `composer install
> --no-dev` บน composer.json ที่ไม่มี runtime dependency แค่ไม่ติดตั้งอะไร
> แล้วจบแบบสำเร็จเฉย ๆ ไม่ต้องมี `|| true` มากลืน error)
