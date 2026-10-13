---
runs: 1
max_turns: 150
timeout_seconds: 2700
model: opus
tags: ["behavior","run-through"]
allowed_tools: ["Read","Glob","Grep","Write","Edit","Skill"]
---
โปรเจคนี้ผมทำเองกับ ai จนใช้งานได้ในเครื่องแล้ว แต่ยังเอาขึ้น server จริงไม่ได้ ต้องทำอะไรบ้างครับ ถ้าจะให้ทีมใช้งานจริง

ผมรู้ว่าต้องมีคำถาม ตอบไว้ให้เลยทั้งหมด ทำต่อรวดเดียวไม่ต้องหยุดถาม: รอบนี้ลงแค่ database / test-lint / CI — design กับ login ยังไม่เอา (ทีมจะทำหน้าจอกับ login เองทีหลัง) · ไม่ต้องส่งอีเมล ไม่ต้องแนบไฟล์ · ชื่อโปรเจค leave-request ชื่อแสดง "ระบบคำขอลา" · basePath prod /leave-request dev /leave-request-dev · port 3000 / 3001 · URL https://apps.ugt.local/leave-request และ https://apps.ugt.local/leave-request-dev · database: SQL Server SQLDEV01 สร้าง database ใหม่ prod ชื่อ LeaveRequest dev ชื่อ LeaveRequest_Dev ไม่ใช้ stored procedure ไม่มี linked server · ข้อมูลตัวอย่างในหน้าแรกย้ายเข้า database จริงเลย · CI: repo https://github.com/ugt/leave-request · Jenkins อยู่ที่ jenkins.ugt.local · ไม่ใช้ Sentry deploy ที่ docker02 ไม่มี scheduled job · โปรเจคนี้ไม่ได้ใช้ bundle pipeline ใด ๆ (ไม่มี superpowers / mattpocock)
