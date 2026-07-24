# UGT Setup Skills

ชุด **Claude Code skills ขององค์กร** สำหรับ retrofit ระบบมาตรฐานเข้าโปรเจคเว็บที่มีอยู่แล้ว
(เช่น โปรเจคที่ user สร้างเองด้วย AI แล้วต้องการ deploy จริง) — สกัด pattern มาจากโปรเจค
ugt-hrms ที่ผ่านการใช้งาน production แล้ว

## มีอะไรบ้าง

| Skill | ทำอะไร |
| --- | --- |
| `ugt-setup` | ตัวแม่ — ถามก่อนว่าจะติดตั้งอะไรบ้าง แล้วเรียก skill ลูกตามลำดับที่ถูกต้อง |
| `ugt-database-setup` | SQL Server ผ่าน Prisma + naming convention (ตาราง/คอลัมน์/stored procedure/function) |
| `ugt-auth-setup` | ระบบ login: SSO (Keycloak องค์กร) / AD-LDAP / Local + RBAC + first-admin bootstrap |
| `ugt-cicd-setup` | Jenkins pipeline + SonarQube Quality Gate + OWASP DC + Docker deploy |

## วิธีติดตั้ง

Copy โฟลเดอร์ skill ที่ต้องการจาก `skills/` ไปไว้ในโปรเจคปลายทาง:

```
<โปรเจคของคุณ>/.claude/skills/ugt-setup/
<โปรเจคของคุณ>/.claude/skills/ugt-database-setup/
<โปรเจคของคุณ>/.claude/skills/ugt-auth-setup/
<โปรเจคของคุณ>/.claude/skills/ugt-cicd-setup/
```

หรือถ้าต้องการใช้ได้ทุกโปรเจคบนเครื่อง ให้วางที่ `~/.claude/skills/` แทน

## วิธีใช้

เปิด Claude Code ในโปรเจคปลายทาง แล้วสั่ง:

```
/ugt-setup
```

Claude จะถามว่าต้องการติดตั้งส่วนไหนบ้าง (auth แบบไหน, ต่อ database ไหม, ทำ CI ไหม)
แล้วติดตั้งตามลำดับ **Database → Auth → CI** พร้อมสรุปสิ่งที่แก้และ smoke-test checklist ตอนจบ

เรียกทีละส่วนก็ได้ เช่น `/ugt-database-setup` อย่างเดียว

## หลักการออกแบบ

- แต่ละ skill แยก **Org Contract** (มาตรฐานที่ใช้กับทุก framework) ออกจาก
  **Reference Implementation** (โค้ดตัวอย่าง Next.js จาก ugt-hrms ใน `templates/`)
- โปรเจคปลายทางไม่ใช่ Next.js ก็ใช้ได้ — Claude จะยึด contract แล้ว adapt โค้ดตาม stack นั้น
- ไฟล์ template ทุกไฟล์ผ่านการ sanitize แล้ว (ไม่มีชื่อโปรเจค/hostname/secret จริง)
  จุดที่ต้องแทนค่ามี placeholder กำกับและมีตารางรายการใน SKILL.md ของแต่ละตัว

## การดูแล

พบ gotcha ใหม่ระหว่างใช้งานจริง → แก้ที่ skill ใน repo นี้ (ไม่ใช่ copy ในโปรเจคปลายทาง)
แล้วให้โปรเจคต่าง ๆ ดึงเวอร์ชันใหม่ไปทับ
