# Changelog — ugt-python-platform

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
