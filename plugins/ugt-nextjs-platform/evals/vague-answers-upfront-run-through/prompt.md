---
runs: 1
max_turns: 200
timeout_seconds: 3600
model: opus
tags: ["behavior","baseline","long"]
allowed_tools: ["Read","Glob","Grep","Write","Edit","Skill"]
---
โปรเจคนี้ผมทำเองกับ ai จนใช้งานได้ในเครื่องแล้ว แต่ยังเอาขึ้น server จริงไม่ได้ ต้องทำอะไรบ้างครับ ถ้าจะให้ทีมใช้งานจริง

ผมรู้ว่าต้องมีคำถาม ตอบไว้ให้เลยทั้งหมด ทำต่อรวดเดียวไม่ต้องหยุดถาม: ลงครบทั้ง database / test-lint / design / auth / CI · ไม่ต้องส่งอีเมล ไม่ต้องแนบไฟล์ · login ใช้ SSO ของบริษัทอย่างเดียว · ชื่อโปรเจค leave-request ชื่อแสดง "ระบบคำขอลา" · basePath prod /leave-request dev /leave-request-dev · port 3000 / 3001 · URL https://apps.ugt.local/leave-request และ https://apps.ugt.local/leave-request-dev · database: SQL Server SQLDEV01 สร้าง database ใหม่ชื่อ LeaveRequest ไม่ใช้ stored procedure · design: ไม่มี prototype/brand ให้ตาม ใช้ค่ามาตรฐานองค์กร shell แบบ sidebar ไม่เอา dark mode UI ภาษาไทย · auth: Keycloak client ยังไม่มี · CI: ไม่ใช้ Sentry deploy ที่ docker02 · โปรเจคนี้ไม่ได้ใช้ bundle pipeline ใด ๆ (ไม่มี superpowers / mattpocock)
