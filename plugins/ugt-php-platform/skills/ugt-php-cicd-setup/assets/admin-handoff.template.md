<!--
RENDER RULES (delete this comment block in the rendered file):
- Substitute every __...__ (table in SKILL.md). `grep __ docs/admin-handoff.md` must find nothing.
- A row/section tagged [X] exists only when the project has X — delete the whole
  row/section otherwise, then renumber the overview table and the section letters
  so they stay A, B, C… with no gaps. Never leave an empty table or "N/A" rows.
  [DB] = has a database · [VOLUME] = compose has an /home/docker02/appdata bind ·
  [CRON] = has scheduled jobs (one cron-table row per job) · [FIRST] = first org project on this Jenkins/Docker host
- Tags live in HTML comments (invisible when rendered) — strip them after deciding.
-->
# คำขอตั้งค่าระบบ — __PROJECT_DISPLAY_NAME__ (`__PROJECT_NAME__`)

ผู้ขอ: __REQUESTER__ · __DATE__ · repo: `__REPO_URL__`
**ทำเสร็จแล้ว กรอกตาราง "ส่งกลับ" ท้ายไฟล์ แล้วส่งไฟล์นี้คืนทีมพัฒนา** · ชื่อทุกตัวต้องพิมพ์ตามนี้เป๊ะ

## ขั้นตอนรวม

| # | ใครทำ | ระบบ | ทำอะไร | ดูตาราง |
| --- | --- | --- | --- | --- |
| 1 | DBA | Database server | สร้าง database 2 ตัว + login 2 ตัว | [A](#a-database--login) <!-- [DB] --> |
| 2 | Admin | Server (Docker host) | เตรียม folder เก็บไฟล์ + ตั้ง backup | [B](#b-server--folder-เก็บไฟล์) <!-- [VOLUME] --> |
| 3 | Admin | Jenkins | สร้าง credential | [C](#c-jenkins--credentials) |
| 4 | Admin | Jenkins | สร้าง pipeline job | [D](#d-jenkins--pipeline-job) |
| 5 | Admin | GitHub | ตั้ง webhook ไป Jenkins | [E](#e-github--webhook) |
| 6 | Admin | SonarQube | สร้าง 2 project + Quality Gate + webhook | [F](#f-sonarqube) |
| 7 | Admin | Server prod (Docker host) | ตั้ง cron รัน job | [G](#g-server--cron) <!-- [CRON] --> |
| 8 | ทุกคน | — | ส่งค่ากลับทีมพัฒนา | [ส่งกลับ](#ส่งกลับ) |

---

<!-- [DB] -->
### A. Database + Login

ที่: **database server ตามคอลัมน์ "Server"**

| สร้าง | Server | ชื่อ (พิมพ์ตามนี้) | สิทธิ์ที่ต้องให้ |
| --- | --- | --- | --- |
| Database prod | prod | `__DB_NAME_PROD__` | — |
| Database dev | dev | `__DB_NAME_DEV__` | — |
| Login prod | prod | `__DB_LOGIN_PROD__` | ใน `__DB_NAME_PROD__`: อ่าน/เขียนข้อมูล + สร้าง/แก้ตาราง (migration รันด้วย login นี้) |
| Login dev | dev | `__DB_LOGIN_DEV__` | ใน `__DB_NAME_DEV__`: เหมือน login prod |

> ตารางสร้างเองตอน deploy (pipeline รัน migration) — DBA ไม่ต้องสร้างตาราง

<!-- [VOLUME] -->
### B. Server — Folder เก็บไฟล์

ที่: **Docker host (prod และ dev)**

| Folder | ใครสร้าง | Admin ต้องทำ |
| --- | --- | --- |
| `/home/docker02/appdata` <!-- [FIRST] --> | Admin — **ครั้งเดียวต่อ server** | `sudo mkdir -p /home/docker02/appdata && sudo chown jenkins:jenkins /home/docker02/appdata` |
| `/home/docker02/appdata/__PROJECT_NAME__/__VOLUME__` | pipeline สร้างเองตอน deploy | **ตั้ง backup job** — ข้อมูลอยู่ที่นี่ที่เดียว ไม่อยู่ใน DB backup · ห้ามลบ folder นี้ |
| `/home/docker02/appdata/__PROJECT_NAME__-dev/__VOLUME__` | pipeline สร้างเองตอน deploy | ไม่ต้อง backup |

<!-- one prod/dev row pair per volume -->

### C. Jenkins — Credentials

ที่: **Manage Jenkins → Credentials → System → Global → Add Credentials**

| ID (พิมพ์ตามนี้) | Kind | ใส่อะไร |
| --- | --- | --- |
| `env-__PROJECT_NAME__` | Secret file | ไฟล์ `.env` ของ **prod** (ทีมพัฒนาส่งให้ทางช่องทางปลอดภัย) |
| `env-__PROJECT_NAME__-dev` | Secret file | ไฟล์ `.env` ของ **dev** — ห้ามใช้ไฟล์เดียวกับ prod |
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

<!-- [CRON] -->
### G. Server — Cron

ที่: **Docker host prod → `crontab -e`** (job ทุกตัวของระบบตั้งที่นี่ที่เดียว — dev ไม่ต้องตั้ง)

| Job | รอบเวลา | บรรทัดที่เพิ่มใน crontab |
| --- | --- | --- |
| (ครั้งแรก) สร้าง folder log | — | `mkdir -p /home/docker02/appdata/__PROJECT_NAME__/logs` (รันมือ 1 ครั้ง) |
| `__JOB_NAME__` | __JOB_WHEN__ | `__CRON_SCHEDULE__ __JOB_CMD__ >> /home/docker02/appdata/__PROJECT_NAME__/logs/cron.log 2>&1` |

<!-- one row per job · __JOB_CMD__: docker exec __PROJECT_NAME__ php artisan <command> · php <script>.php · WordPress: php /var/www/html/wp-cron.php · after adding: run the command once by hand -->

---

## ส่งกลับ

| ค่า | หาได้ที่ | ค่า |
| --- | --- | --- |
| DB prod — host:port <!-- [DB] --> | ตาราง A — ใช้ **FQDN หรือ IP** (container resolve ชื่อสั้นอย่าง `SQLSRV01` ไม่ได้) | |
| DB dev — host:port <!-- [DB] --> | ตาราง A — FQDN หรือ IP | |
| รหัสผ่าน `__DB_LOGIN_PROD__` / `__DB_LOGIN_DEV__` <!-- [DB] --> | ตาราง A | ⚠️ **ส่งช่องทางปลอดภัย ห้ามกรอกที่นี่** |
| `APP_PORT` prod | port ที่จัดสรรบน server prod (ทีมพัฒนาใช้ `8081` ไว้ก่อน) | |
| `APP_PORT` dev | port ที่จัดสรรบน server dev (ทีมพัฒนาใช้ `8082` ไว้ก่อน) | |
| ลิงก์ Jenkins job | หน้า job `__PROJECT_NAME__` | |

<!-- [FIRST] -->
## ภาคผนวก — ครั้งแรกของ server (ข้ามถ้า server นี้มีโปรเจคมาตรฐานเดียวกันแล้ว)

| ที่ | ทำอะไร | ใส่ค่า (ชื่อต้องตรงเป๊ะ) |
| --- | --- | --- |
| Manage Jenkins → Plugins | ติดตั้ง plugin | **Docker Pipeline** (`docker-workflow` — ขาดตัวนี้ pipeline ตายที่ stage แรกด้วย `No such property: docker`) · SonarQube Scanner · OWASP Dependency-Check · JUnit · HTML Publisher · Email Extension · Pipeline · Git |
| Manage Jenkins → Tools | เพิ่ม tool | SonarQube Scanner `SonarQube-Scanner` · Dependency-Check `Dependency-Check` (Install automatically) — ไม่ต้องตั้ง PHP/composer (รันใน CI image) |
| Manage Jenkins → System → SonarQube servers | เพิ่ม server | Name `SonarQube` + token |
| Manage Jenkins → System → Global properties | env var | `NOTIFY_EMAIL` · `SMTP_FROM` |
| Jenkins → New Item (Pipeline, cron `H 2 * * *`) | job อัปเดตข้อมูล NVD | `dependency-check --updateonly --nvdApiKey <nvd>` (pipeline หลักรัน `--noupdate` — ไม่มีข้อมูล NVD = สแกนผ่านแบบหลอก) |
| SonarQube → Quality Gates → Create | เงื่อนไข (On New Code) | `new_violations` = 0 · `new_duplicated_lines_density` ≤ 3% · `new_coverage` ≥ 60% · `new_security_hotspots_reviewed` = 100% |
| Docker host | ให้ Jenkins สั่ง docker ได้ | `sudo usermod -aG docker jenkins` แล้ว restart Jenkins |
| Docker host | สร้าง network | `docker network create proxy-network` |
| Docker host | เช็ค compose v2 | `docker compose version` ต้องได้ — มีแต่ `docker-compose` (v1) ให้แจ้งทีมพัฒนา |
