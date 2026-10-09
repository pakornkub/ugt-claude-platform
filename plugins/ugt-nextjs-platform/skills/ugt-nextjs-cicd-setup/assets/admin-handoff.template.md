<!--
RENDER RULES (delete this comment block in the rendered file):
- Substitute every __...__ (table in SKILL.md §4.2). `grep __ docs/admin-handoff.md` must find nothing.
- A row/section tagged [X] exists only when the project has X — delete the whole
  row/section otherwise, then renumber the overview table and the section letters
  so they stay A, B, C… with no gaps. Never leave an empty table or "N/A" rows.
  [DB] = Prisma/SQL Server · [LINKED] = reads over a linked server · [VOLUME] = compose has
  an /home/docker02/appdata bind · [UPLOAD] = ugt-nextjs-upload-setup installed ·
  [SSO] = Keycloak login · [SENTRY] = Sentry · [BASEPATH] = served under a basePath ·
  [FIRST] = first org project on this Jenkins/Docker host
- Tags live in HTML comments (invisible when rendered) — strip them after deciding.
-->
# คำขอตั้งค่าระบบ — __PROJECT_DISPLAY_NAME__ (`__PROJECT_NAME__`)

ผู้ขอ: __REQUESTER__ · __DATE__ · repo: `__REPO_URL__`
**ทำเสร็จแล้ว กรอกตาราง "ส่งกลับ" ท้ายไฟล์ แล้วส่งไฟล์นี้คืนทีมพัฒนา** · ชื่อทุกตัวต้องพิมพ์ตามนี้เป๊ะ

## ขั้นตอนรวม

| # | ใครทำ | ระบบ | ทำอะไร | ดูตาราง |
| --- | --- | --- | --- | --- |
| 1 | DBA | SQL Server | สร้าง database 3 ตัว + login 2 ตัว | [A](#a-sql-server--database--login) <!-- [DB] --> |
| 2 | Admin | Server (Docker host) | เตรียม folder เก็บไฟล์ + ตั้ง backup | [B](#b-server--folder-เก็บไฟล์) <!-- [VOLUME] --> |
| 3 | Admin | Jenkins | สร้าง credential | [C](#c-jenkins--credentials) |
| 4 | Admin | Jenkins | สร้าง pipeline job | [D](#d-jenkins--pipeline-job) |
| 5 | Admin | GitHub | ตั้ง webhook ไป Jenkins | [E](#e-github--webhook) |
| 6 | Admin | SonarQube | สร้าง 2 project + Quality Gate + webhook | [F](#f-sonarqube) |
| 7 | Admin | Keycloak | สร้าง client SSO | [G](#g-keycloak--client-sso) <!-- [SSO] --> |
| 8 | Admin | Nginx | เพิ่ม reverse proxy | [H](#h-nginx--reverse-proxy) <!-- [BASEPATH] or [UPLOAD] --> |
| 9 | ทุกคน | — | ส่งค่ากลับทีมพัฒนา | [ส่งกลับ](#ส่งกลับ) |

---

<!-- [DB] -->
### A. SQL Server — Database + Login

ที่: **SSMS → server ตามคอลัมน์ "Server"** · login ใช้ SQL authentication

| สร้าง | Server | ชื่อ (พิมพ์ตามนี้) | สิทธิ์ที่ต้องให้ |
| --- | --- | --- | --- |
| Database prod | prod | `__DB_NAME_PROD__` | — |
| Database dev | dev | `__DB_NAME_DEV__` | — |
| Database shadow (ว่างไว้ ห้ามใส่ข้อมูล) | dev | `__DB_NAME_DEV___shadow` | — |
| Login prod | prod | `__DB_LOGIN_PROD__` | ใน `__DB_NAME_PROD__`: `db_datareader` · `db_datawriter` · `db_ddladmin` · `GRANT EXECUTE` |
| Login dev | dev | `__DB_LOGIN_DEV__` | ใน `__DB_NAME_DEV__`: เหมือน login prod · ใน `__DB_NAME_DEV___shadow`: `db_owner` |
| อ่านข้ามระบบ (linked server) <!-- [LINKED] --> | prod + dev | `__LINKED_SERVER__` → `__LINKED_OBJECTS__` | `SELECT` อย่างเดียว ให้ทั้ง 2 login |

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

### D. Jenkins — Pipeline job

ที่: **Dashboard → New Item**

| ช่อง | ใส่ค่า |
| --- | --- |
| Item name | `__PROJECT_NAME__` |
| Type | Multibranch Pipeline |
| Branch Sources → GitHub → Repository URL | `__REPO_URL__` |
| Discover branches | `main`, `develop` |
| Lightweight checkout | **ปิด** (เปิดไว้ stage แรกพัง) |

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

<!-- [BASEPATH] or [UPLOAD] -->
### H. Nginx — Reverse proxy

ที่: **ไฟล์ nginx ของ server** (เพิ่มแล้ว `nginx -s reload`)

| Server | เพิ่ม |
| --- | --- |
| dev <!-- [BASEPATH] --> | `location __BASE_PATH_DEV__ { proxy_pass http://127.0.0.1:__PORT_DEV__; proxy_set_header Host $host; }` |
| prod + dev <!-- [UPLOAD] --> | `client_max_body_size __UPLOAD_MAX_MB__m;` ใน location ของโปรเจค (ไม่ตั้ง = อัปโหลดไฟล์ใหญ่ได้ 413) |

> port `__PORT_DEV__` เป็นค่าเสนอ — ถ้าจัดสรร port อื่น ใช้ port นั้นแทนแล้วแจ้งในตารางส่งกลับ

---

## ส่งกลับ

| ค่า | หาได้ที่ | ค่า |
| --- | --- | --- |
| SQL Server prod — host:port <!-- [DB] --> | ตาราง A | |
| SQL Server dev — host:port <!-- [DB] --> | ตาราง A | |
| รหัสผ่าน `__DB_LOGIN_PROD__` / `__DB_LOGIN_DEV__` <!-- [DB] --> | ตาราง A | ⚠️ **ส่งช่องทางปลอดภัย ห้ามกรอกที่นี่** |
| `APP_PORT` prod | port ที่จัดสรรบน server prod (ทีมพัฒนาใช้ `__PORT_PROD__` ไว้ก่อน) | |
| `APP_PORT` dev | port ที่จัดสรรบน server dev (ทีมพัฒนาใช้ `__PORT_DEV__` ไว้ก่อน) | |
| `KEYCLOAK_ISSUER` <!-- [SSO] --> | `https://<keycloak-host>/realms/__REALM__` | |
| `KEYCLOAK_CLIENT_SECRET` <!-- [SSO] --> | Keycloak → Clients → `__PROJECT_NAME__` → Credentials | ⚠️ **ส่งช่องทางปลอดภัย ห้ามกรอกที่นี่** |
| ลิงก์ Jenkins job | หน้า job `__PROJECT_NAME__` | |

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
