# Changelog — ugt-python-platform

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
  และ scan placeholder ครอบ `docs/admin-handoff.md` ด้วย

## 0.1.0 (2026-08-11)

เกิดครั้งแรก: skill ugt-python-cicd-setup (deploy-only ตาม spec 2026-08-11) — ยังไม่ tag จนกว่าผ่าน pilot 1 โปรเจคจริง
