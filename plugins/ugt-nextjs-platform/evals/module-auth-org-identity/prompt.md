---
runs: 1
max_turns: 200
timeout_seconds: 3000
model: opus
tags: ["behavior","module","auth","org-identity"]
allowed_tools: ["Read","Glob","Grep","Write","Edit","Skill"]
---
ใส่ระบบ login ให้โปรเจคนี้หน่อยครับ (database / test-lint / design ลงไว้แล้วจาก session ก่อน — ข้อตกลงอยู่ที่ docs/DESIGN.md)

ตอบไว้ให้ครบแล้ว ทำต่อรวดเดียวไม่ต้องหยุดถาม:
- login 3 แบบ: SSO ของบริษัท (Keycloak) เป็นหลัก · AD/LDAP ไว้สำรองตอน Keycloak ล่ม · Local เฉพาะผู้รับเหมาภายนอกที่ไม่มีบัญชี AD
- Keycloak client มีแล้ว — ค่า KEYCLOAK_* ผมใส่ .env.local เอง
- LDAP: ldaps://ad.ube.co.th:636 · base DN DC=ube,DC=co,DC=th · domain UBE
- โดเมนอีเมลบริษัท: ube.co.th (หลัก) กับ ube.com (โดเมนเก่า ยังมีคนใช้อยู่)
- มี view พนักงานกลางผ่าน linked server: HRLINK.HRMS.dbo.vw_EmployeeAll — ชื่อคอลัมน์ตรงกับที่ kit ใช้ทุกตัว
- อยากให้แอดมินตั้งบทบาทให้พนักงานไว้ล่วงหน้าได้ก่อนเขาเข้าระบบครั้งแรก และเห็นว่าใครเข้ามาแล้วแต่ยังไม่มีบทบาท
- ชื่อโปรเจค leave-request ชื่อแสดง "ระบบคำขอลา" · basePath prod /leave-request dev /leave-request-dev · URL https://apps.ugt.local/leave-request และ https://apps.ugt.local/leave-request-dev
- ทุกคนเห็นคำขอทั้งหมด ยังไม่ทำ workflow อนุมัติ · เมนูใบลาให้ทุกคนที่ login เห็น
- ยังไม่ได้ลงระบบอีเมล — จะลง ugt-nextjs-mail-setup ใน session ถัดไป
- โปรเจคนี้ไม่ได้ใช้ bundle pipeline ใด ๆ (ไม่มี superpowers / mattpocock)
