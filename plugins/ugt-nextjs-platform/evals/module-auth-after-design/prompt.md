---
runs: 1
max_turns: 150
timeout_seconds: 2700
model: opus
tags: ["behavior","run-through","module"]
allowed_tools: ["Read","Glob","Grep","Write","Edit","Skill"]
---
ใส่ระบบ login ให้โปรเจคนี้หน่อยครับ (database / test-lint / design ลงไว้แล้วจาก session ก่อน — ข้อตกลงอยู่ที่ docs/DESIGN.md)

ตอบไว้ให้เลยทั้งหมด ทำต่อรวดเดียวไม่ต้องหยุดถาม: login ใช้ SSO ของบริษัท (Keycloak) อย่างเดียว · Keycloak client ยังไม่มี · ชื่อโปรเจค leave-request ชื่อแสดง "ระบบคำขอลา" · basePath prod /leave-request dev /leave-request-dev · URL https://apps.ugt.local/leave-request และ https://apps.ugt.local/leave-request-dev · ไม่มี view พนักงานกลางให้อ่าน · ทุกคนเห็นคำขอทั้งหมด ยังไม่ทำ workflow อนุมัติ · เมนูใบลาให้ทุกคนที่ login เห็น · ไม่ส่งอีเมล · โปรเจคนี้ไม่ได้ใช้ bundle pipeline ใด ๆ (ไม่มี superpowers / mattpocock)
