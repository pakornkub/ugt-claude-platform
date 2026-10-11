# Docker Deploy — ภาพรวม (PHP)

ภาพรวมกลไก deploy: branch → deploy target, shape เดียว `[WEB]`, job ตามรอบผ่าน host cron —
รายละเอียดเชิงลึกแยกไฟล์ตามหัวข้อ (ตารางด้านล่าง)

## หัวข้อเชิงลึก — ไฟล์ไหน

| หัวข้อ | ไฟล์ | เดิมคือ |
| --- | --- | --- |
| WordPress: wp-content volume บังคับ, core upgrade, `--renew-anon-volumes` | `references/wordpress-deploy.md` | §B |
| SQL Server: `pdo_sqlsrv` + `msodbcsql18`, DNS ของ DB host | `references/sqlserver.md` | §C |
| Healthcheck `curl -fsS -L` (ทำไมไม่ใช่ `php -r`/`wget`/`localhost`) | `references/healthcheck.md` | §D |
| Build & lint: `.dockerignore`, `php -l` ก่อน `phpstan`, ห้าม `config:cache` ตอน build | `references/build-gotchas.md` | §E |
| Compose conventions + ห้าม `no-new-privileges` บน docker02 | `references/compose.md` | §F, §J |
| Subpath หลัง reverse proxy (ต่อ shape + แอป legacy ที่อ้าง asset แบบ relative) | `references/subpath.md` | §G |
| Volume ownership (`www-data`) + bind mount จาก Jenkins (DooD) | `references/volumes.md` | §H, §I |

## Branch → deploy target

Jenkins Deploy stage resolves ทุกค่านี้จาก `env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last()`
ใน `script {}` — ไม่มีทางลัด, ไม่มีค่า global เดียวใช้ทุก branch:

| Branch | Image | Compose file | Env credential (Secret File) | Container name |
| --- | --- | --- | --- | --- |
| `main` | `__PROJECT_NAME__:latest` + `:<BUILD_NUMBER>` | `docker-compose.yml` | `env-__PROJECT_NAME__` | `__PROJECT_NAME__` |
| `develop` | `__PROJECT_NAME__-dev:latest` + `:<BUILD_NUMBER>` | `docker-compose.dev.yml` | `env-__PROJECT_NAME__-dev` | `__PROJECT_NAME__-dev` |
| อื่น ๆ (feature branch) | — | — | — | Docker Build/Deploy stage ถูก `when { expression { br == 'main' \|\| br == 'develop' } }` ข้ามทั้งคู่ |

ทุก branch build image ของตัวเองเสมอ (tag `latest` + `BUILD_NUMBER` คู่กัน — ห้าม
tag แค่ `latest`, ไม่งั้น rollback ไม่ได้เพราะไม่มีเลขอ้างอิงย้อนกลับ). Deploy
ใช้ `docker compose -f <file> up -d --no-build` เสมอ — flag นี้บังคับให้ compose
reuse image ที่เพิ่งผ่าน Quality Gate ในสเตจ Docker Build แทนที่จะ build ใหม่
จาก `build:` section (ซึ่งจะได้ image คนละตัวที่ไม่ผ่าน scan).

**PHP มี deploy shape เดียวคือ `[WEB]`** — ไม่มี `[BATCH]` เหมือนฝั่ง python
(ดู comment หัว Jenkinsfile: "Sections marked [WEB] apply to the long-running
web-service deploy shape ... the only deploy shape PHP projects use") ทุก
โปรเจค (Laravel / CodeIgniter / legacy / WordPress) จบที่ apache container
ที่ยืนรอ request ผ่าน reverse proxy เสมอ — ไม่มี `docker/Dockerfile.batch`,
ไม่มีรายการ `[BATCH]` ใน admin handoff

## Job ตามรอบ = host cron เท่านั้น

มติ 2026-10-09 — cron สั่งรันใน container
web ที่ยืนอยู่ หนึ่งบรรทัดต่อ job (ตาราง cron `[CRON]` ใน admin handoff):

```
0 2 * * * docker exec -u www-data __PROJECT_NAME__ php artisan reports:daily >> /home/docker02/appdata/__PROJECT_NAME__/logs/cron.log 2>&1
```

- Laravel: เขียน job เป็น artisan command แล้วตั้ง cron ทีละ command — **ไม่ใช้**
  `Schedule::` + `schedule:run` ทุกนาที (ตารางเวลาไปซ่อนในโค้ด admin ไม่เห็น)
- CodeIgniter/legacy: `docker exec -u www-data <container> php jobs/<name>.php` (หรือ `php index.php <controller> <method>`)
- **`-u www-data` ห้ามตัด**: image ไม่มี `USER` → `docker exec` รันเป็น root → log/ไฟล์ที่ job สร้างเป็นของ root แล้ว apache (www-data) เขียนต่อไม่ได้ = 500
- WordPress: **ตาราง cron มีเสมอ** — compose ตั้ง `WORDPRESS_CONFIG_EXTRA: define('DISABLE_WP_CRON', true);` แล้ว cron `*/10 * * * * docker exec -u www-data <container> php /var/www/html/wp-cron.php`
- job ต้อง idempotent · ตั้งเฉพาะ prod (dev รันมือ)
