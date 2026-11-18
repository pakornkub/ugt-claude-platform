<!--
RENDER RULES (delete this comment block in the rendered file):
- Substitute every __...__ (table in SKILL.md §4.2). `grep __ docs/admin-handoff.md` must find nothing.
- A row/section tagged [X] exists only when the project has X — delete the whole
  row/section otherwise and renumber only the overview table's # column. Section
  letters and anchors stay FIXED (gaps are fine) — other skills and the overview links
  point at them by letter. Never leave an empty table or "N/A" rows.
  [DB] = Prisma/SQL Server · [LINKED] = reads over a linked server · [VOLUME] = compose has
  an /home/docker02/appdata bind · [UPLOAD] = ugt-nextjs-upload-setup installed ·
  [SSO] = Keycloak login · [SENTRY] = Sentry · [BASEPATH] = served under a basePath ·
  [CRON] = has scheduled jobs (they run in the project's own compose `cron` service — the admin sets up no cron; only the reverse-proxy cron bullet + the note under the overview) ·
  [AUTH] = ugt-nextjs-auth-setup installed · [FIRST] = first org project on this Jenkins/Docker host ·
  [SAME] / [SPLIT] = prod and dev on one SQL Server / on separate ones (interview Q4b — keep exactly one)
- [DB] → table A points at `docs/admin-db-setup*.sql`, rendered from `assets/admin-db-setup.template.sql`
  in the same step (SKILL.md §4.6) — never write the CREATE/GRANT steps into this file by hand.
- Tags live in HTML comments (invisible when rendered) — strip them after deciding.
- Section H is words only — never paste nginx (or any proxy) config into this file; the admin
  writes the entry the way every other project on that server is done.
-->
# คำขอตั้งค่าระบบ — __PROJECT_DISPLAY_NAME__ (`__PROJECT_NAME__`)

ผู้ขอ: __REQUESTER__ · __DATE__ · repo: `__REPO_URL__`
**ทำเสร็จแล้ว กรอกตาราง "ส่งกลับ" ท้ายไฟล์ แล้วส่งไฟล์นี้คืนทีมพัฒนา** · ชื่อทุกตัวต้องพิมพ์ตามนี้เป๊ะ

## ขั้นตอนรวม

| # | ใครทำ | ระบบ | ทำอะไร | ดูตาราง |
| --- | --- | --- | --- | --- |
| 1 | DBA | SQL Server | รัน script ในตาราง A — database 2 ตัว + login ของเจ้าของโปรเจค 1 ตัว (ใช้ทั้ง prod และ dev) | [A](#a-sql-server--database--login) <!-- [DB] --> |
| 2 | Admin | Server (Docker host) | เตรียม folder เก็บไฟล์ + ตั้ง backup | [B](#b-server--folder-เก็บไฟล์) <!-- [VOLUME] --> |
| 3 | Admin | Jenkins | สร้าง credential | [C](#c-jenkins--credentials) |
| 4 | Admin | Jenkins | สร้าง pipeline job 2 ตัว (prod / dev แยกกัน) | [D](#d-jenkins--pipeline-job-prod--dev) |
| 5 | Admin | GitHub | ตั้ง webhook ไป Jenkins | [E](#e-github--webhook) |
| 6 | Admin | SonarQube | สร้าง 2 project + Quality Gate + webhook | [F](#f-sonarqube) |
| 7 | Admin | Keycloak | สร้าง client SSO | [G](#g-keycloak--client-sso) <!-- [SSO] --> |
| 8 | Admin | Nginx | สร้าง reverse proxy ของโปรเจค | [H](#h-nginx--reverse-proxy) <!-- [BASEPATH] or [UPLOAD] or [CRON] --> |
| 9 | ทุกคน | — | ส่งค่ากลับทีมพัฒนา | [ส่งกลับ](#ส่งกลับ) |

> job ตั้งเวลา (__JOB_LIST__) รันใน container `__PROJECT_NAME__-cron` ซึ่ง deploy มาพร้อมแอป — **ไม่ต้องตั้ง cron บน server** <!-- [CRON] -->

---

<!-- [DB] -->
### A. SQL Server — Database + Login

**รัน script ครั้งเดียวจบ — ไม่ต้องสร้างอะไรด้วยมือ** · login ใช้ SQL authentication

| Server | รัน script |
| --- | --- |
| prod + dev (เครื่องเดียวกัน) <!-- [SAME] --> | [`admin-db-setup.sql`](admin-db-setup.sql) |
| prod <!-- [SPLIT] --> | [`admin-db-setup-prod.sql`](admin-db-setup-prod.sql) |
| dev <!-- [SPLIT] --> | [`admin-db-setup-dev.sql`](admin-db-setup-dev.sql) |

1. SSMS → เปิด script → เมนู **Query → SQLCMD Mode** (ต้องเปิด ไม่งั้น `:setvar` error)
2. กรอก 2 บรรทัดบนสุด: `LoginName` (__LOGIN_NAME_HINT__) · `LoginPassword` (ห้ามมี `'`) — กรอกตอนรันเท่านั้น ปิดไฟล์โดยไม่ save
3. F5 → ผลตรวจท้าย script ต้องเป็น `1` ทุกคอลัมน์ → แจ้งชื่อ login ในตารางส่งกลับ (รหัสส่งช่องทางปลอดภัย)

| script สร้าง | ชื่อ | สิทธิ์ |
| --- | --- | --- |
| Database prod · dev — collation `Thai_CI_AS` · Read Committed Snapshot `ON` · Recovery model `Full` · Compatibility level `__COMPAT_LEVEL__` · Containment `None` | `__DB_NAME_PROD__` · `__DB_NAME_DEV__` | — |
| Login ของเจ้าของโปรเจค (__PROJECT_OWNER__) — **ตัวเดียว ใช้ทั้ง prod และ dev** | ตาม `LoginName` | __DB_ROLES__ ใน database ทั้ง 2 ตัว · server role `dbcreator` **server dev เท่านั้น** |
| ไม่อยู่ใน script — ทำมือ: อ่านข้ามระบบ (linked server) <!-- [LINKED] --> | `__LINKED_SERVER__` → `__LINKED_OBJECTS__` | `SELECT` อย่างเดียว ให้ login ข้างบน (prod + dev) |

> 2 server: รันไฟล์ละ server ด้วย `LoginName` และรหัสผ่านเดียวกัน <!-- [SPLIT] -->
>
> `dbcreator`: ตอนสร้าง migration Prisma สร้าง database ชั่วคราวแล้วลบเอง (ไม่ต้องสร้าง shadow database ไว้)
>
> ⚠️ Recovery model `Full` → **ต้องตั้ง job backup transaction log ของทั้ง 2 database** ไม่งั้นไฟล์ log โตไม่หยุดจน disk เต็ม
>
> ตารางสร้างเองตอน deploy (pipeline รัน migration) — DBA ไม่ต้องสร้างตาราง

<!-- [VOLUME] -->
### B. Server — Folder เก็บไฟล์

ที่: **Docker host (prod และ dev)**

| Folder | ใครสร้าง | Admin ต้องทำ |
| --- | --- | --- |
| `/home/docker02/appdata` <!-- [FIRST] --> | Admin — **ครั้งเดียวต่อ server** | `sudo mkdir -p /home/docker02/appdata && sudo chown jenkins:jenkins /home/docker02/appdata` |
| `/home/docker02/appdata/__PROJECT_NAME__/__VOLUME__` | pipeline สร้างเองตอน deploy | **ตั้ง backup job** — ข้อมูลอยู่ที่นี่ที่เดียว ไม่อยู่ใน DB backup · ห้ามลบ folder นี้ |
| `/home/docker02/appdata/__PROJECT_NAME__-dev/__VOLUME__` | pipeline สร้างเองตอน deploy | ไม่ต้อง backup |

<!-- one prod/dev row pair per volume (uploads, storage, reports…) -->

### C. Jenkins — Credentials

ที่: **Manage Jenkins → Credentials → System → Global → Add Credentials**

| ID (พิมพ์ตามนี้) | Kind | ใส่อะไร |
| --- | --- | --- |
| `env-__PROJECT_NAME__` | Secret file | ไฟล์ `.env` ของ **prod** (ทีมพัฒนาส่งให้ทางช่องทางปลอดภัย) |
| `env-__PROJECT_NAME__-dev` | Secret file | ไฟล์ `.env` ของ **dev** — ห้ามใช้ไฟล์เดียวกับ prod |
| `sentry-dsn-__PROJECT_NAME__` <!-- [SENTRY] --> | Secret text | Sentry DSN |
| `nvd` <!-- [FIRST] --> | Secret text | NVD API key (ฟรีที่ nvd.nist.gov) — ใช้ร่วมทุกโปรเจคบน server |

### D. Jenkins — Pipeline job (prod / dev)

ที่: **Dashboard → New Item** · สร้าง **2 job แยกกัน** (ไม่ใช้ Multibranch)

| ช่อง | job prod | job dev |
| --- | --- | --- |
| Item name | `__PROJECT_NAME__` | `__PROJECT_NAME__-dev` |
| Type | Pipeline | Pipeline |
| Build Triggers | GitHub hook trigger for GITScm polling | 〃 |
| Pipeline → Definition | Pipeline script from SCM → Git | 〃 |
| Repository URL | `__REPO_URL__` | 〃 |
| Branch Specifier | `*/main` | `*/develop` |
| Script Path | `Jenkinsfile` | `Jenkinsfile` |
| Lightweight checkout | **ปิด** (เปิดไว้ stage แรกพัง) | **ปิด** |

> สร้างเสร็จกด **Build Now** ให้แต่ละ job 1 ครั้ง — GitHub hook trigger เริ่มทำงานหลัง job รันครั้งแรกเท่านั้น
>
> ย้ายจาก Multibranch job เดิม: ลบ container เดิมก่อน build ครั้งแรก `docker rm -f __PROJECT_NAME__ __PROJECT_NAME__-dev` (ไม่งั้นได้ "container name already in use") แล้วลบ Multibranch job · ข้อมูลใน `/home/docker02/appdata` ไม่หาย

### E. GitHub — Webhook

ที่: **repo → Settings → Webhooks → Add webhook**

| ช่อง | ใส่ค่า |
| --- | --- |
| Payload URL | `http://__JENKINS_HOST__:8080/github-webhook/` |
| Content type | `application/json` |
| Events | Just the push event |

### F. SonarQube

| ที่ | ช่อง | ใส่ค่า |
| --- | --- | --- |
| Administration → Projects → Create | Project key / Display name | `__PROJECT_NAME__` / __PROJECT_DISPLAY_NAME__ |
| 〃 | Project key / Display name | `__PROJECT_NAME__-dev` / __PROJECT_DISPLAY_NAME__ (Dev) |
| Project Settings → Quality Gate | Gate | มาตรฐานองค์กร — ผูก**ทั้ง 2 project** |
| Administration → Configuration → Webhooks → Create | URL | `http://__JENKINS_HOST__:8080/sonarqube-webhook/` (ไม่ตั้ง = pipeline ค้างตลอด) |

<!-- [SSO] -->
### G. Keycloak — Client (SSO)

ที่: **realm `__REALM__` → Clients → Create client** (1 client ต่อ 1 โปรเจค)

| ช่อง | ใส่ค่า |
| --- | --- |
| Client type | OpenID Connect |
| Client ID | `__PROJECT_NAME__` |
| Client authentication | On |
| Standard flow | On · ช่องอื่น (Direct access / Implicit / Service accounts) **Off** |
| Valid redirect URIs | `__APP_URL_DEV__/api/auth/callback/keycloak` |
| 〃 (บรรทัดที่ 2) | `__APP_URL_PROD__/api/auth/callback/keycloak` |
| Web origins | `+` |
| Advanced → PKCE Method | S256 |

<!-- [BASEPATH] or [UPLOAD] or [CRON] -->
### H. Nginx — Reverse proxy

Admin สร้าง reverse proxy ของโปรเจคตามรูปแบบที่ใช้กับโปรเจคอื่นบน server ให้ครอบคลุมข้อต่อไปนี้:

- path `__BASE_PATH_PROD__` → แอป prod (port `APP_PORT` prod) และ path `__BASE_PATH_DEV__` → แอป dev (port `APP_PORT` dev) <!-- [BASEPATH] -->
- ขนาด request ต้องรับไฟล์แนบได้ถึง **__UPLOAD_MAX_MB__ MB** (ถ้าไม่ตั้ง อัปโหลดไฟล์ใหญ่จะได้ 413) <!-- [UPLOAD] -->
- **ปิด** path `__BASE_PATH_PROD__/api/cron/` และ `__BASE_PATH_DEV__/api/cron/` จากภายนอก (job เรียกจากใน container เท่านั้น) <!-- [CRON] -->

> port ที่ทีมพัฒนาใช้ไว้ก่อนคือ prod `__PORT_PROD__` / dev `__PORT_DEV__` — ถ้าจัดสรร port อื่น แจ้งในตารางส่งกลับ

---

## ส่งกลับ

| ค่า | หาได้ที่ | ค่า |
| --- | --- | --- |
| SQL Server prod — host:port <!-- [DB] --> | ตาราง A | |
| SQL Server dev — host:port <!-- [DB] --> | ตาราง A | |
| ชื่อ login ของเจ้าของโปรเจค (ใช้ทั้ง prod และ dev) <!-- [DB] --> | ตาราง A | |
| รหัสผ่านของ login นั้น <!-- [DB] --> | ตาราง A | ⚠️ **ส่งช่องทางปลอดภัย ห้ามกรอกที่นี่** |
| `APP_PORT` prod | port ที่จัดสรรบน server prod (ทีมพัฒนาใช้ `__PORT_PROD__` ไว้ก่อน) | |
| `APP_PORT` dev | port ที่จัดสรรบน server dev (ทีมพัฒนาใช้ `__PORT_DEV__` ไว้ก่อน) | |
| `KEYCLOAK_ISSUER` <!-- [SSO] --> | `https://<keycloak-host>/realms/__REALM__` | |
| `KEYCLOAK_CLIENT_SECRET` <!-- [SSO] --> | Keycloak → Clients → `__PROJECT_NAME__` → Credentials | ⚠️ **ส่งช่องทางปลอดภัย ห้ามกรอกที่นี่** |
| ลิงก์ Jenkins job | หน้า job `__PROJECT_NAME__` และ `__PROJECT_NAME__-dev` | |

## หลังระบบขึ้นแล้ว

- คนแรกที่ login จะถูกพาไปหน้า `/admin/setup` → กดปุ่มเดียวเป็น Administrator (ไม่มีบัญชี admin ตั้งไว้ล่วงหน้า) — **ให้คนที่ควรเป็น admin login คนแรก** <!-- [AUTH] -->

<!-- [FIRST] -->
## ภาคผนวก — ครั้งแรกของ server (ข้ามถ้า server นี้มีโปรเจคมาตรฐานเดียวกันแล้ว)

| ที่ | ทำอะไร | ใส่ค่า (ชื่อต้องตรงเป๊ะ) |
| --- | --- | --- |
| Manage Jenkins → Plugins | ติดตั้ง plugin | NodeJS · SonarQube Scanner · OWASP Dependency-Check · JUnit · HTML Publisher · Email Extension · Pipeline · Git |
| Manage Jenkins → Tools | เพิ่ม tool | NodeJS `NodeJS-22` (22.x) · SonarQube Scanner `SonarQube-Scanner` · Dependency-Check `Dependency-Check` (Install automatically) |
| Manage Jenkins → System → SonarQube servers | เพิ่ม server | Name `SonarQube` + token |
| Manage Jenkins → System → Global properties | env var | `NOTIFY_EMAIL` · `SMTP_FROM` |
| SonarQube → Quality Gates → Create | เงื่อนไข (On New Code) | `new_violations` = 0 · `new_duplicated_lines_density` ≤ 3% · `new_coverage` ≥ 60% · `new_security_hotspots_reviewed` = 100% |
| Docker host | สร้าง network | `docker network create proxy-network` |
| Docker host (Jenkins) | ให้ Jenkins สั่ง docker ได้ | Jenkins มี Docker CLI · user `jenkins` อยู่ใน group `docker` ที่ GID ตรงกับ host (`getent group docker`) |
