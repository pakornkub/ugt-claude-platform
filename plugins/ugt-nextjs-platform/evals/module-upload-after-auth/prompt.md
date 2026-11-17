---
runs: 1
max_turns: 120
timeout_seconds: 2400
model: opus
tags: ["behavior","module","upload"]
allowed_tools: ["Read","Glob","Grep","Write","Edit","Skill"]
---
ลงระบบแนบไฟล์ให้โปรเจคนี้ครับ (database / test-lint / design / login ลงไว้แล้ว — login มี SSO + AD + Local, CI/CD ลงแล้ว)

ตอบไว้ให้ครบแล้ว ทำต่อรวดเดียวไม่ต้องหยุดถาม:
- ไฟล์ใหญ่สุด 30 MB · มี nginx ของ admin อยู่หน้าแอป
- แนบกับใบลา (leaveRequest) อย่างเดียว ใบละหลายไฟล์ ใช้แบบ entityType + entityId ที่ kit มีให้
- สิทธิ์: ทุก role ที่มีอยู่อัปโหลดและดาวน์โหลดได้ · ดาวน์โหลดได้เฉพาะคนที่สร้างใบลานั้น (createdBy) กับคนที่มีสิทธิ์ users:read (HR)
- ไฟล์ที่ลบแล้วเก็บตลอด ไม่ต้องลบจริง
- ไม่เอา virus scan
