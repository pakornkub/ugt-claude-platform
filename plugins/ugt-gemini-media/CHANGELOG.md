# Changelog — ugt-gemini-media

## 0.1.0 (2026-11-24)

- **plugin ใหม่ (ไม่บังคับ ใช้ได้ทุก stack)** — MCP 2 ตัวที่ใช้ Gemini API key เดียวกัน:
  - `gemini-tts` — tool `speak`: แปลงข้อความเป็นเสียง บันทึกเป็น `.wav` (ไทย/อังกฤษ · เลือกเสียงได้ เช่น Kore, Charon, Algieba · สั่งน้ำเสียงในข้อความได้) · ค่าเริ่มต้นบันทึกที่ `~/gemini-tts/` · server ไฟล์เดียว `mcp/gemini-tts.cjs` ไม่มี dependency (Node ≥ 18)
  - `gemini-image` — `generate_image` (สร้างรูปด้วย Gemini · เสียเงิน) และ `process_image` (แต่งรูปในเครื่องด้วย sharp · ฟรี) · ใช้แพ็กเกจ npm `@jimothy-snicket/gemini-image-mcp` **pin 0.6.2** ผ่าน `npx` (มี sharp ซึ่งเป็น native binary — bundle เข้า plugin แบบ `ugt-devops-mcp` ไม่ได้)
- แทนการติดตั้งเองด้วย `claude mcp add` / สคริปต์ `.ps1` — key เก็บใน `userConfig` แบบ `sensitive` ไม่อยู่ใน `~/.claude.json` แบบข้อความเปล่า
- ไม่มี `package.json` ใน plugin (บทเรียน `ugt-devops-mcp` 0.1.6 — `npm ci` ตอนติดตั้ง timeout 60 วินาทีบนเน็ตบริษัท)
- รอ pilot: ครั้งแรกที่เปิด `gemini-image` `npx` ต้องดาวน์โหลดแพ็กเกจ + sharp — บนเน็ตบริษัทอาจช้าจน `/mcp` ขึ้น failed รอบแรก (รอบถัดไปใช้ cache) · ยังไม่ tag จนกว่าจะผ่าน pilot (เหมือน `ugt-devops-mcp`)
