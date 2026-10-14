---
runs: 1
max_turns: 120
timeout_seconds: 2400
model: opus
tags: ["behavior","module","mail"]
allowed_tools: ["Read","Glob","Grep","Write","Edit","Skill"]
---
ลงระบบส่งอีเมลให้โปรเจคนี้ครับ (database / test-lint / design / login ลงไว้แล้ว — login มี SSO + AD + Local, CI/CD ลงแล้ว)

ตอบไว้ให้ครบแล้ว ทำต่อรวดเดียวไม่ต้องหยุดถาม:
- SMTP relay ภายใน: smtp.ube.co.th port 25 ไม่ต้อง login
- ผู้ส่ง: noreply-leave@ube.co.th (relay อนุญาตแล้ว)
- ติดต่อในท้ายเมล: ทีม IT Application โทร 1234
- สีหัวเมล: ใช้สีหลักตาม docs/DESIGN.md
- workflow ที่ส่งเมล: ทุกครั้งที่มีคำขอลาใหม่ (createLeaveRequestAction ใน lib/actions/leave-requests.ts) ให้แจ้ง HR ที่ hr-leave@ube.co.th พร้อมลิงก์ไปหน้าใบลา · ยังไม่มี workflow อนุมัติ — template ตัวอย่างที่ไม่ได้ใช้ลบออกได้เลย
- อยากให้ทีมทดสอบ flow บน dev ได้โดยไม่ส่งเมลถึง HR จริง
