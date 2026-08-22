# Changelog — ugt-php-platform

## 0.2.0 (2026-08-21)

จากผล audit ปูพรม 2026-08-21 (ยังไม่ tag — รอ pilot ตามเดิม):

- **คำถาม subpath (interview ข้อ 3) มี step รองรับแล้ว** — §5.3 เพิ่มวิธีตั้ง
  ต่อ shape (Laravel `APP_URL`/`ASSET_URL` · CI4 `app.baseURL` · WordPress
  `WP_HOME`/`WP_SITEURL`) ลง `.env`/`.env.dev` + แถว checklist "เปิดผ่าน URL
  เต็มหลัง proxy"
- checklist เลิกบอกว่า `[WEB]` "คงหรือถูกลบตามคำตอบ" — PHP มี shape เดียว
  (§2.8) `[WEB]` คงไว้เสมอ ป้ายมีไว้ชี้ก้อน health poll ไม่ใช่ให้เลือกลบ
- verify: เพิ่ม check "ทุก compose bind ใต้ /srv/appdata มี `mkdir -p` ใน
  Deploy stage" (เคส WordPress `wp-content` คือข้อมูลหายตั้งแต่ deploy แรก)
  และ scan placeholder ครอบ `docs/admin-handoff.md` ด้วย · check นี้อ่าน
  `jfActive` (ตัดคอมเมนต์แล้ว) ไม่ใช่ไฟล์ดิบ — Jenkinsfile ที่ ship มีคอมเมนต์
  ตัวอย่างที่ระบุ `/uploads` กับ `/reports` อยู่ ถ้าอ่านดิบคอมเมนต์นั้นจะทำให้
  volume สองชื่อนี้ผ่านการตรวจโดยไม่ต้องมี mkdir จริง

## 0.1.0 (2026-08-12)

เกิดครั้งแรก: skill ugt-php-cicd-setup (deploy-only ตาม spec 2026-08-11) — ยังไม่ tag จนกว่าผ่าน pilot 1 โปรเจคจริง
