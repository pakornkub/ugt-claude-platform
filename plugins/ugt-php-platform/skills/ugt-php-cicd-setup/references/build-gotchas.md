# Build & lint gotchas — `.dockerignore`, `php -l`, Laravel `config:cache`

กับดักตอน build image และตอนรัน lint ในเครื่อง: `.dockerignore` กัน artifact ของ CI + secret ·
`php -l` ก่อน `phpstan` · ห้าม `php artisan config:cache` ใน Dockerfile

## `.dockerignore` ต้องกัน artifact ของ CI stage ก่อนหน้า

สเตจ Install/Unit Tests ของ Jenkinsfile สร้าง `vendor/`, `coverage/`,
`test-results/` ไว้ใน workspace เดียวกับที่ Docker Build stage ใช้เป็น build
context (`docker build ... .`) — สเตจ OWASP Dependency Check สร้าง
`dc-report/` เพิ่มอีก ถ้าไม่กันไว้ ไฟล์เหล่านี้จะถูกส่งเข้า build context
(ช้าลง และเสี่ยงหลุดเข้า layer ของ image เพราะ `Dockerfile.web` มี `COPY . .`
— `Dockerfile.wordpress` ไม่มี แต่ build context ยังถูกส่งไปทั้งก้อน) ต้องมี `.dockerignore` ที่ root โปรเจค:

```
vendor
coverage
dc-report
test-results
.env
.env.*
!.env.example
```

หมายเหตุ: `Dockerfile.web` มี `COPY --from=composer:2` + `composer install`
ของตัวเองอยู่แล้ว (สร้าง `vendor/` ใหม่ในเลเยอร์ image) การกัน `vendor` ใน
`.dockerignore` จึงไม่กระทบผลลัพธ์ image — แค่กัน `vendor/` เวอร์ชัน CI (ที่มี
`--dev` dependencies ติดมาด้วย) ไม่ให้หลุดเข้า build context โดยไม่จำเป็น

**`.env`/`.env.*`/`!.env.example` กันคนละความเสี่ยงจาก 4 บรรทัดบน** — ไม่ใช่
เรื่องขนาด context แต่เป็นเรื่อง secret รั่ว: `.env` จริงที่อยู่ในเครื่อง dev
(หรือหลงเหลือใน workspace ของ Jenkins agent จาก build ครั้งก่อน) ถ้าไม่ถูกกัน
จะถูก `COPY . .` ฝังลง image layer แบบถาวร — `docker history`/`docker save`
ดึง secret กลับมาได้แม้ไฟล์จะถูกลบใน layer ถัดไป (layer เป็น append-only)
**โปรเจค CI3/legacy ที่ยังไม่ได้ migrate มาใช้ `.env`** (DB credential ฝังใน
ไฟล์ config ของ framework เอง เช่น `application/config/database.php`) ต้อง
เพิ่มชื่อไฟล์นั้นเข้า `.dockerignore` เองแยกต่างหาก — plugin นี้เดาโครงสร้าง
ของ legacy app แต่ละโปรเจคไม่ได้

## `php -l` ก่อน `phpstan` เสมอ — เร็วกว่า

สเตจ `Code Quality` รัน `Lint` (`php -l` ไล่ทุกไฟล์) กับ `Static Analysis`
(`phpstan analyse`) แบบ parallel ใน Jenkinsfile ก็จริง แต่เวลาแก้ปัญหาบนเครื่อง
ตัวเอง (นอก pipeline) ควรรัน `php -l` ก่อน `phpstan` เสมอ — `php -l` เช็คแค่
syntax error (parse ได้/ไม่ได้) ใช้เวลาระดับ millisecond ต่อไฟล์ ขณะที่
`phpstan` ต้อง resolve type ทั้ง dependency graph ก่อนเริ่มวิเคราะห์ ถ้าไฟล์มี
syntax error อยู่ `phpstan` จะ fail ด้วย parse error ที่อ่านยากกว่าและช้ากว่า
`php -l` มาก — ไล่ syntax ให้ผ่านก่อนเสมอค่อยรัน static analysis รอบถัดไป

## Laravel: ห้าม `php artisan config:cache` ตอน build image

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

ทางเลือกที่ปลอดภัยกว่าถ้าต้องการ config cache จริง ๆ ในอนาคต (ชุดนี้ยัง
ไม่รองรับ) คือรัน `php artisan config:cache` เป็นส่วนหนึ่งของ Deploy stage
**หลัง** `.env` ถูกวางแล้ว ไม่ใช่ใน Dockerfile — แต่ต้องแลกกับความซับซ้อนของ
cache invalidation เมื่อ deploy ซ้ำโดยไม่ rebuild image ซึ่งชุดนี้ยังไม่ทำ
