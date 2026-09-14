---
runs: 1
max_turns: 120
timeout_seconds: 3600
model: opus
tags: ["behavior","baseline"]
allowed_tools: ["Read","Glob","Grep","Write","Edit","Skill"]
---
โปรเจค FastAPI มี requirements.txt อยู่แล้ว แต่ไม่มี test เลย ขอ deploy ตามมาตรฐานบริษัทหน่อย

ตอบคำถามไว้ให้เลย จะได้ไม่ต้องรอผม: ชื่อโปรเจค leave-request · port prod 8000 / dev 8001 · ไม่ได้อยู่หลัง reverse-proxy subpath · ไม่มี database · โฟลเดอร์ uploads/ ต้องอยู่รอดข้าม deploy · deploy ที่ docker02 (Jenkins คนละเครื่อง mount socket) ใช้ docker compose v2 · ไม่ต้องสร้าง test ครอบโค้ดเดิม เอาแค่ให้ pipeline รันผ่าน
