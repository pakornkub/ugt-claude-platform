# Docker Build & Deploy — รายละเอียดเชิงลึก

## A. Two-Image Pattern (build 2 images ทุกครั้ง)

| Image                                | Target    | ใช้ทำอะไร                                                            |
| ------------------------------------ | --------- | -------------------------------------------------------------------- |
| `__PROJECT_NAME__:<BUILD_NUMBER>-builder` | `builder` | `docker run ... prisma migrate deploy` ตอน deploy (มี `node_modules/` + `prisma/migrations/`) |
| `__PROJECT_NAME__:latest` + `:<BUILD_NUMBER>` | runner    | image จริงที่ docker-compose deploy (standalone, เล็ก)               |

- Tag ด้วย `BUILD_NUMBER` เสมอ (ไม่ใช่ `latest` เดี่ยว ๆ) → rollback ได้
- `--network host` จำเป็น: `npm run build` ของ Next.js fetch ของจาก internet
  (เช่น Google Fonts) — ไม่มี network = build fail
- ถ้า project **ไม่มี database** → ตัด builder image build + migrate step ทิ้ง

## B. กฎเหล็ก: client-side vars = build args เท่านั้น

`NEXT_PUBLIC_*` ถูก **inline เข้า
JS bundle ตอน compile** — ใส่เป็น runtime `environment:` ใน compose =
ไม่มีผลใด ๆ (bundle มี `undefined` baked ไปแล้ว)

```yaml
# ❌ WRONG — ignored by Next.js
services:
  app:
    environment:
      NEXT_PUBLIC_BASE_PATH: /my-app
```

```groovy
// ✅ CORRECT — --build-arg ใน Docker Build stage
sh """docker build --build-arg NEXT_PUBLIC_BASE_PATH=${basePath} ..."""
```

ค่าที่ต่างกันตาม branch (basePath, appUrl) resolve ใน `script {}` ของ stage —
**ไม่ใช่** global `environment {}` (global = ค่าเดียวทุก branch → dev ได้ค่า prod)

ค่า secret ฝั่ง client (เช่น Sentry DSN) → Jenkins Secret Text credential +
`withCredentials` — ห้าม hardcode ใน Jenkinsfile (โผล่ใน SCM history)

## C. Deploy sequence: migrate → compose up → health poll

```
cp $ENV_FILE .env                        # Secret File credential → workspace
  ↓
[DB] docker run --rm ...-builder prisma migrate deploy   # migrate ก่อน deploy
  ↓                                      # migrate fail = ไม่ deploy (no partial deploy)
docker-compose -f <file> up -d --no-build
  ↓
poll: docker inspect .State.Health.Status  # จนกว่า healthy (max 24×10s = 4 นาที)
```

### DATABASE_URL extraction — ทำไมต้อง `tr -d '"\r'`

`.env` ที่แก้บน Windows มี CRLF และค่าอาจครอบด้วย quotes —
`docker --env-file` **ไม่** strip ทั้งสองอย่าง ผลคือ DATABASE_URL มี `"` กับ
`\r` ติดไป → Prisma connection error:

```sh
DB_URL=$(grep "^DATABASE_URL=" .env | cut -d= -f2- | tr -d '"\r')
```

### `--no-build` — ห้ามลืม

ไม่ใส่ = compose rebuild image เองจาก `build:` section **โดยไม่มี**
`NEXT_PUBLIC_*` build args → ได้ bundle พัง ๆ deploy ทับของดี

### Health poll — ใช้ `docker inspect` ไม่ใช่ wget จาก Jenkins

Poll `.State.Health.Status` ของ container → ผลตรงกับ HEALTHCHECK จริงของ
container เอง (wget จาก Jenkins อาจ false positive เรื่อง network/proxy)
`unhealthy` = exit 1 ทันที ไม่รอครบ 4 นาที

## D. Compose conventions

| Convention                        | เหตุผล                                                                  |
| --------------------------------- | ----------------------------------------------------------------------- |
| `pull_policy: never`              | image build local — ไม่งั้น compose พยายาม pull `latest` จาก Docker Hub |
| `ports: '${APP_PORT:-<port>}:3000'` | host port override ได้จาก `.env` — กัน port ชนบน host เดียวกัน          |
| แยก compose file prod/dev         | ชื่อ image/container/port/healthcheck path ต่างกัน                      |
| `restart: unless-stopped`         | container ฟื้นเองหลัง host reboot                                       |
| resource limits (cpu/memory)      | กัน container เดียวกิน host                                             |
| `proxy-network` external          | ทุก app แชร์ network เดียวกับ reverse proxy (สร้างครั้งเดียวบน host)    |
| logging json-file 10m×3           | กัน log โต unbounded                                                    |

## E. Healthcheck gotchas

- **`127.0.0.1` ไม่ใช่ `localhost`** — Alpine resolve `localhost` เป็น `::1`
  (IPv6) แต่ Node ฟัง IPv4 → "Connection refused" ทั้งที่ app ปกติ
- **port 3000 เสมอ** (container-internal) — ไม่ใช่ host port
- **path hardcode** ใน Dockerfile `HEALTHCHECK` — env var substitution ใช้ใน
  syntax นั้นไม่ได้; compose healthcheck ของแต่ละ env override Dockerfile อีกที
  (dev compose ใช้ dev basePath)
- `start_period: 60s` — ให้เวลา app boot ก่อนเริ่มนับ fail

## F. Dockerfile gotchas (ห้ามลบ)

| Directive                   | Stage   | เหตุผล                                                                                     |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `ENV HUSKY=0`               | deps    | `npm ci` รัน `prepare` → husky; ไม่มี `.git` ใน Docker → fail                             |
| `ENV CI=true`               | builder | next.config gate standalone output ด้วย `CI` — ไม่มี = `.next/standalone/` ไม่ถูกสร้าง → runner `COPY` fail |
| `ENV SKIP_ENV_VALIDATION=1` | builder | env schema validate ตอน import; runtime secrets ไม่มีตอน build                            |
| `RUN npx prisma generate`   | builder | [DB] Prisma client ต้อง generate ใหม่ใน image (.dockerignore ตัด generated client ออก)     |
| non-root user (`nextjs`)    | runner  | security baseline                                                                          |

> `SKIP_ENV_VALIDATION` อยู่ได้เฉพาะ **CI + build stage** — ห้ามตั้งใน
> production container (จะข้าม startup validation, พลาด secret หายไม่รู้ตัว)

## G. Reverse proxy + basePath (แบบ subpath ต่อ app)

```
https://<domain>__BASE_PATH_PROD__  ← nginx (TLS termination)
   ↓ proxy_pass
http://127.0.0.1:__PORT_PROD____BASE_PATH_PROD__
   ↓
container (port 3000, basePath = __BASE_PATH_PROD__)
```

ข้อควรระวังฝั่ง env vars:

- URL ของ auth library (cookie domain / OAuth callback) มักต้องเป็น
  **bare origin ไม่มี basePath** (`https://<domain>`) — ใส่ basePath แล้ว
  cookie/callback ผิด domain
- `NEXT_PUBLIC_APP_URL` = URL เต็มรวม basePath (ใช้ใน links/sitemap)
- ถ้า service ภายในใช้ internal CA cert ที่ Node ไม่ trust →
  `NODE_TLS_REJECT_UNAUTHORIZED: '0'` ใน compose ได้ **เฉพาะ intranet ปิด
  ทั้งหมด** — ห้ามใช้ถ้า app ออก internet ได้ (ปิด TLS verification ทั้งระบบ)
