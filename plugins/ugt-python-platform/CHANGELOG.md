# Changelog — ugt-python-platform

## 0.6.2 (2026-09-03)

**Path มาตรฐาน persistent data sync กับ ugt-core 2.10.1**: `/srv/appdata/<project>`
→ `/home/docker02/appdata/<project>` ทุกจุด (`SKILL.md`, `references/docker-deploy.md`,
`scripts/verify.mjs`, `assets/Jenkinsfile`, `assets/admin-handoff.template.md`,
`assets/rules/ugt-python-ci.md`, `evals/evals.json`) — ตัว host จริง (`docker02`)
ใช้ path นี้มาตลอด (เห็นจาก production จริงของ ugt-mscpl-ana/ugt-bd-forecast)
contract เขียนผิดค้างไว้เฉย ๆ ไม่ใช่การเปลี่ยน convention ใหม่ — ยืนยันด้วย
`node scripts/check-contract-drift.mjs`

## 0.6.1 (2026-09-03)

**Pitfall เพิ่มจากอินซิเดนต์จริง ugt-bd-forecast 2026-09-03 (deploy รอบแรก) —
ทั้งสองเจอบน docker02 จริง แม้เทส local ผ่านหมด (ฝั่ง python เจอผ่านโปรเจคที่มี
stage PHP lint ผสมอยู่ — สองข้อนี้เป็นเรื่องระดับ Jenkins/compose ไม่ผูกภาษา
จึงเข้าทั้งสองปลั๊กอิน)**:

- **Docker-outside-of-Docker (DooD) — bind-mount `$PWD`/`$WORKSPACE`**:
  Jenkins agent รันในคอนเทนเนอร์ตัวเอง `docker run -v` ที่ผูก path จาก
  workspace ไปหา host docker daemon (sibling ผ่าน `docker.sock`) ที่ไม่รู้จัก
  path นั้น → `mkdir` พังด้วย read-only filesystem → `references/docker-deploy.md`
  **§J** (`.inside{}` หรือ stdin pipe แทน) + `verify.mjs` check ใหม่ (warn)
- **`security_opt: no-new-privileges:true` ฆ่า entrypoint บน docker02**:
  kernel 6.8 + AppArmor ปฏิเสธ privilege transition ตอน entrypoint →
  `operation not permitted` → crash-loop ที่ `--wait` เห็นเป็น unhealthy
  เร็วกว่า `start_period` มาก (เจอซ้ำจาก ugt-mscpl-ana 2026-08-17 ที่ไม่เคยถูก
  บันทึกไว้ในปลั๊กอิน) → §K + diagnostic tip
  (`docker inspect --format '{{.State.Status}} {{.RestartCount}}'`)

## 0.6.0 (2026-08-25)

**Audit ปูพรม 7 มิติ 2026-08-25 — อุดรู runtime ที่ verify ไม่เคยจับ** —
ยังไม่ tag รอ pilot:

- **gunicorn ไม่การันตีว่ามีใน image**: `Dockerfile.web` CMD รัน gunicorn
  แต่ §5.4 เช็คแค่ `requirements.txt` มีอยู่ → build ผ่าน container ตาย
  `exec: "gunicorn": not found` — §5.4 บังคับ server อยู่ใน requirements
  (gunicorn/uvicorn ตาม framework) + `verify.mjs` check ใหม่อ่าน CMD เทียบ
  requirements
- **Django static gap**: ไม่มี `collectstatic`/WhiteNoise ที่ไหนเลย —
  `DEBUG=False` แล้ว admin/static 404 ทั้งที่ `FORCE_SCRIPT_NAME` เขียนถูก
  → `references/docker-deploy.md` **§I** (WhiteNoise + ตำแหน่ง collectstatic
  ใน Dockerfile + กับดัก settings ต้องบูตได้ตอน build) + ขั้นสั้นใน SKILL
- เงื่อนไข server "ข้อเดียว" จริง ๆ มี **2 ข้อ**: docker group + **Docker
  Pipeline plugin** (`docker-workflow`) — ไฟล์เดียวกันยอมรับเองที่ §ท้าย
  และฝั่ง php เขียนถูกอยู่แล้ว ปรับให้ตรงกัน
- Flask caveat: gunicorn อ่าน `SCRIPT_NAME` แต่ **werkzeug/`flask run`
  ไม่อ่าน** — dev เห็นพฤติกรรมต่างจาก production
- ซ่อม CHANGELOG: หัวข้อ `## 0.5.0 (2026-08-24)` ที่หายตอน prepend 0.5.1
  ใส่คืน (เนื้อหา 0.5.0 เดิมลอยอยู่ใต้ 0.5.1 ทั้งที่ 4 แหล่งอ้างถึง release นี้)
- plugin.json description เติม **mypy** ที่ pipeline รันจริง (เดิมเขียนแค่
  ruff/pytest) · placeholder table เติมแถว `env.example` ที่มี `__PORT_*__`
  · claim `localhost`→`::1` ลดระดับเป็น precautionary · §5.1 เลิก restate
  กฎ health ซ้ำ §2.8

## 0.5.3 (2026-08-25)

**`.dockerignore` mandatory list ไม่กัน `.env`** — เจอช่องเดียวกันฝั่ง php
(backlog §6 platform-level "มาตรฐานที่ยังขาด") ตรวจแล้วฝั่ง python มี gap
เดียวกัน: `references/docker-deploy.md` §F เตือนเรื่อง `COPY . .` ไว้แล้วแต่
mandatory list ไม่มี `.env` — ยังไม่ tag รอ pilot:

- SKILL.md (การสร้าง `.dockerignore`) / §6 Quick Rules / §7 Verification
  Checklist เพิ่ม `.env`/`.env.*`/`!.env.example` เข้า mandatory list (7
  บรรทัดจากเดิม 4)
- `references/docker-deploy.md` §F เพิ่มสามบรรทัดเดียวกันในตัวอย่าง code
  block พร้อมอธิบายว่าเป็นความเสี่ยง secret รั่วถาวรใน layer คนละแบบกับ 4
  บรรทัดเดิมที่กันแค่ context โต
- `scripts/verify.mjs` เพิ่ม check ใหม่แยกจาก artifact-guard check เดิม
  (`.dockerignore blocks real .env from the build context`)

## 0.5.2 (2026-08-25)

**กวาด cosmetic ค้างจาก pilot checklist** (backlog §6) — ยังไม่ tag รอ pilot:

- คอมเมนต์ `CI = 'true'` ใน `Jenkinsfile` เลิกอ้าง "JUnit reporter + standalone
  output" (คำอธิบายของ vitest/Next.js ที่หลงมาตอนแตก plugin) — เขียนใหม่เป็น
  generic CI flag ตามความหมายจริงในบริบท pytest/pip
- admin-handoff placeholder `APP_PORT` เปลี่ยน `3000`/`3001` (ของเหลือจาก
  Next.js) → `8000`/`8001` ให้ตรง convention พอร์ต 8000 ของ Dockerfile.web
  จริง (ตาราง + checklist ข้อยืนยัน)

มติ HEALTHCHECK retries 3 vs 5 = ไม่เปลี่ยน — เหตุผลเดียวกับ php 0.5.1
(compose override ตอน deploy จริง สองค่าอยู่คนละ context)

## 0.5.1 (2026-08-25)

**Doc-only: `references/docker-deploy.md` ยังสอนบล็อก `[VOLUME]` แบบเก่า**
— 0.5.0 แก้ asset Jenkinsfile เป็นลูป per-subdir แล้ว แต่ §D "กลไกหลัก" ยังโชว์
guard ระดับโปรเจค (`if [ ! -d /srv/appdata/<project> ]`) พร้อมคำสั่ง "เติม
`<name>` ต่อท้ายบรรทัด mkdir" — session ที่อ่าน reference ตอน customize จะพา
รูปแบบเก่ากลับเข้าโปรเจค · เขียน §D ใหม่ให้ตรง asset (ลูป `for p in …` + ห้าม
ย้อนกลับไป guard ระดับโปรเจค พร้อมเหตุผล) และแก้ bullet ที่อธิบายว่า guard
ประหยัด `docker run` สองรอบ (ตอนนี้หา UID ทุกรอบโดยตั้งใจ guard คุมแค่ chown) ·
§C cron แก้ประโยค "แม้ Jenkinsfile ใช้ `docker-compose` (v1)" ที่ค้างจากก่อน
0.5.0 — ตอนนี้สองฝั่งใช้ v2 ตรงกันแล้ว · ฝั่ง php ตรวจแล้วไม่มี drift นี้
(reference ไม่มี code block ของบล็อกเก่า) · ยังไม่ tag — รอ pilot ตามมติเดิม

## 0.5.0 (2026-08-24)

สามข้อจาก pilot ฝั่ง PHP ที่กลไกเหมือนกันทุกภาษา — ทำพร้อมกันทั้ง 3 stack
(nextjs 4.45.0, php 0.5.0) · ยังไม่ tag — **ฝั่ง python ยังไม่มี pilot ของตัวเอง**

**`[VOLUME]` guard เช็คแค่ dir ระดับโปรเจค — volume ที่เพิ่มทีหลังไม่มีวันถูกสร้าง.**
บล็อกเดิมห่อทุกอย่างไว้ใน `if [ ! -d /srv/appdata/<project> ]` ซึ่งกลายเป็น
no-op ถาวรทันทีที่ deploy แรกสร้างโฟลเดอร์นั้น · volume ที่เพิ่มในรุ่นถัดไปจึง
ถูก dockerd สร้างเองเป็น `root:root` ตอน `up -d` แล้ว user `app` เขียนไม่ได้
**ทั้งที่ container ขึ้น healthy ปกติ** — และ **[BATCH] เจอยากกว่า** เพราะ job
รันแล้วจบ ไม่มี healthcheck คอยส่งสัญญาณ · เปลี่ยนเป็นวนเช็คทีละ subdir
(`for p in …`) พร้อมแก้ `verify.mjs` คู่กัน (check เดิมอ่านชื่อจากบรรทัด
`mkdir -p` ซึ่งพอเป็นลูปแล้วเหลือ `"$p"` — ไม่แก้พร้อมกันจะ false-fail ทุก
โปรเจคที่ตั้ง volume ถูกต้อง)

**`docker compose` (v2) เป็นค่าตั้งต้นแทน `docker-compose` (v1).** v1 EOL ตั้งแต่
กลางปี 2023 ไม่มีใน Docker Engine ปัจจุบัน · §4.7 (interview), §5.3 และ
checklist ของ admin กลับทิศคำอธิบายแล้ว · cron ของ shape `[BATCH]` ใช้ v2 อยู่
ก่อนแล้ว — ตอนนี้ Jenkinsfile ตรงกับมันเสียที

**DNS: ชื่อ host สั้นของ DB มัก resolve ไม่ได้จากในคอนเทนเนอร์** —
`references/docker-deploy.md` §G หัวข้อใหม่ (Compose conventions เลื่อนเป็น §H) ·
คอนเทนเนอร์ใช้ DNS ของ Docker ไม่ใช่ suffix search list ของเครื่อง ทางแก้เรียง
ลำดับ FQDN → IP → `dns:` ใน compose พร้อมคำสั่งวินิจฉัยชี้ขาด และเพิ่มคำถามใน
admin-handoff ให้ยืนยัน connectivity จาก**คอนเทนเนอร์** ไม่ใช่จาก host

## 0.4.0 (2026-08-23)

**Blocker สองข้อที่พบจาก pilot ฝั่ง PHP แต่ใช้กลไกเดียวกันเป๊ะ ๆ** —
`ugt-php-platform` 0.4.0 เจอจากโปรเจคจริง ตรวจแล้วฝั่ง python เป็นเหมือนกันทั้งคู่
(Jenkinsfile ใช้ `docker.image().inside{}` 5 จุดเหมือนกัน) จึงแก้พร้อมกัน ·
ยังไม่ tag — **ฝั่ง python ยังไม่มี pilot ของตัวเอง**

- **ปลั๊กอิน Docker Pipeline (`docker-workflow`) ไม่เคยถูกบอกให้ admin ติดตั้ง**
  — มติ M8 ให้ทุก stage รันใน `docker.image().inside{}` ซึ่งเป็น syntax ของ
  ปลั๊กอินตัวนี้ ขาดแล้ว pipeline ตายตั้งแต่ stage Install ด้วย
  `groovy.lang.MissingPropertyException: No such property: docker` ที่อ่านไม่ออก
  ว่าหมายถึงปลั๊กอินหาย · **คนละเรื่องกับการมี Docker CLI บนเครื่อง** — `sh
  'docker …'` ทำงานได้อยู่แล้วโดยไม่ต้องมีปลั๊กอินนี้ · เพิ่มเข้า checklist,
  ภาคผนวก, §7 และตัวสรุปท้าย `verify.mjs`
- **ภาคผนวก server setup ใน `admin-handoff.template.md` เป็น HTML comment ที่
  อ้าง `jenkins-one-time-setup.md` + `sonarqube-setup.md`** — สองไฟล์นั้นไม่มีใน
  skill นี้ (มีแต่ใน `ugt-nextjs-cicd-setup` — ตอนแตก plugin ก๊อป template กับ
  คอมเมนต์มาแต่ไม่ได้ก๊อป reference ตาม) ทุกโปรเจคจึงต้องเขียนภาคผนวกเอง ซึ่งเป็น
  สาเหตุโดยตรงที่ข้อบนหลุด · เขียนจริงแล้วครบ 9 หัวข้อ (ปลั๊กอิน · tools ·
  credential · global env · docker group · `proxy-network` · `/srv/appdata` ·
  NVD data strategy · org Quality Gate) และลบการอ้างไฟล์ผีใน `Jenkinsfile` ทิ้ง
- checklist ของ admin เพิ่ม `proxy-network` (compose ทั้งสองไฟล์ประกาศ
  `external: true` แต่ handoff ไม่เคยบอก admin ให้สร้าง) และคำถาม compose v1/v2

## 0.3.0 (2026-08-23)

ปิด backlog §5 "verify checks ที่ประกาศแต่ไม่ implement — ฝั่ง php/python"
(ฝั่ง nextjs ปิดไปแล้วใน 4.27.0) — ยังไม่ tag รอ pilot ตามเดิม:

- **ทุก check ที่อ่าน Jenkinsfile / Dockerfile / compose อ่านเฉพาะบรรทัดที่ยัง
  ทำงานจริง** — เดิม 10 stages / Quality Gate / post / secrets อ่านไฟล์ดิบ
  (`jf`) ทำให้สเตจที่ถูก comment ทิ้งยังนับว่ามีอยู่ · เพิ่ม `dockerfileActive`
  + `composeActive` คู่กับ `jfActive` เดิม: compose ที่ ship มาพก `volumes:`
  กับชื่อ `<name>` ตัวอย่างไว้เป็นคอมเมนต์ การสแกนดิบจึงรายงาน bind ที่ไม่มีจริง
  (check `mkdir -p` ↔ bind เคย FAIL ทุกโปรเจคที่ไม่มี volume) และ batch shape
  ที่ตัด healthcheck ออกแล้วเคยโดนบังคับให้มี `127.0.0.1`
- verify ใหม่ตามที่ §7 ประกาศไว้แต่ไม่เคยตรวจ:
  - `post` ต้องมี `emailext` ครบ 4 outcome (เดิมเช็คแค่ว่ามีคำว่า emailext)
  - shape `[WEB]`/`[BATCH]` ต้องตรงกันทั้ง Dockerfile / Jenkinsfile / compose
    (Dockerfile.batch + health poll ที่ลืมลบ = Deploy หา container ไม่เจอทุกครั้ง)
    + batch ต้องเป็น `restart: "no"`
  - `Dockerfile.web` ต้องมี `EXPOSE 8000` (เดิมเช็คแค่ HEALTHCHECK) ·
    `Dockerfile.batch` ต้อง**ตัด** EXPOSE/HEALTHCHECK ไม่ใช่ comment ทิ้งไว้
  - `CMD` ต้องเป็น JSON array จริง (`__START_CMD_JSON__` ที่เติมเป็น shell form
    ทำให้ PID 1 เป็น shell แล้วกลืน SIGTERM)
  - `[SUBPATH]`: `ROOT_PATH`/`SCRIPT_NAME`/`FORCE_SCRIPT_NAME` ต้องตั้งครบทั้ง 2
    compose หรือไม่ตั้งเลย (ตั้งแต่ prod อย่างเดียว = dev 404 หลัง proxy)
  - `[tool.pytest.ini_options]` ต้องออก `coverage.xml` ด้วย ไม่ใช่แค่ junit
  - ไฟล์ที่ §5.1 copy ทุกโปรเจคต้องมีจริง: `tests/test_smoke.py` ·
    `.claude/rules/ugt-python-ci.md` · `docs/admin-handoff.md` (เตือน) —
    เดิมสแกน placeholder ในไฟล์พวกนี้แต่ข้ามเงียบเมื่อไฟล์หายไปทั้งไฟล์
  - `.env` / `.env.dev` มีจริงและตั้ง `APP_PORT` แล้ว (เตือน — clone ใหม่ยังไม่มี
    ทั้งคู่ตามปกติ เพราะ gitignore)
- SKILL §7 ประกาศ **ไม่ตรวจโดยตั้งใจ** ตรง ๆ: พฤติกรรมตอนรันของ `/api/health`,
  การเปิดผ่าน URL เต็มหลัง proxy, toolchain ในเครื่อง (§5.6), ค่าใน `.env`,
  และฝั่ง server ทั้งหมด — ของที่เหลือถือว่า script ครอบให้แล้ว

## 0.2.0 (2026-08-21)

จากผล audit ปูพรม 2026-08-21 (ยังไม่ tag — รอ pilot ตามเดิม):

- **คำถาม subpath (interview ข้อ 3) มี step รองรับแล้ว** — §5.3 เพิ่มวิธีตั้ง
  ต่อ framework (FastAPI `root_path` · Flask `SCRIPT_NAME`/ProxyFix · Django
  `FORCE_SCRIPT_NAME`+`STATIC_URL`) ผ่าน env ใน compose ทั้ง 2 ไฟล์ + แถว
  checklist "เปิดผ่าน URL เต็มหลัง proxy" (เดิมคำตอบถูกเก็บแล้วไม่มีอะไรใช้ —
  แอป 404 หลัง proxy โดยไม่มีตัวจับ)
- ใหม่ `assets/env.example` + แถว §5.1 — verify เคย FAIL เมื่อไม่มีไฟล์นี้
  ทั้งที่ไม่มี asset ให้ copy
- `docker-compose.dev.yml` ได้ marker `[BATCH]` เหมือนไฟล์ prod (เดิมคนแปลง
  ตาม marker จะปล่อย dev เป็น web service ที่ healthcheck ไม่มีวันผ่าน)
- verify: เพิ่ม check "ทุก compose bind ใต้ /srv/appdata มี `mkdir -p` ใน
  Deploy stage" (root:root case ที่เอกสารเรียกว่า "ห้ามลืม" แต่ไม่เคยมีตัวเช็ค)
  และ scan placeholder ครอบ `docs/admin-handoff.md` ด้วย · check นี้อ่าน
  `jfActive` (ตัดคอมเมนต์แล้ว) ไม่ใช่ไฟล์ดิบ — Jenkinsfile ที่ ship มีคอมเมนต์
  ตัวอย่างที่ระบุ `/uploads` กับ `/reports` อยู่ ถ้าอ่านดิบคอมเมนต์นั้นจะทำให้
  volume สองชื่อนี้ผ่านการตรวจโดยไม่ต้องมี mkdir จริง

## 0.1.0 (2026-08-11)

เกิดครั้งแรก: skill ugt-python-cicd-setup (deploy-only ตาม spec 2026-08-11) — ยังไม่ tag จนกว่าผ่าน pilot 1 โปรเจคจริง
