---
paths:
  - "lib/email.ts"
  - "lib/mail-templates.ts"
  - "lib/types/mail-templates.ts"
  - "lib/actions/**/*.ts"
---

# Sending email in this project

Every workflow email goes through **`sendTemplatedMail`** — never
`sendMail` directly, and never a fresh nodemailer transport.

| กฎ | เหตุผล |
| --- | --- |
| ส่งเมล**ห้ามทำให้การบันทึกข้อมูลล้ม** — เรียกหลัง transaction commit แล้ว `catch` + log ไว้ | ผู้ใช้กดอนุมัติแล้วต้องอนุมัติสำเร็จ แม้ SMTP ล่ม |
| ต้องส่ง `actor` (email + `hasDevMode`) ทุกครั้ง | ไม่ส่ง = dev mode ไม่ทำงาน เมลทดสอบวิ่งไปหาคนจริง |
| ค่าที่ผู้ใช้พิมพ์ (เหตุผล, หมายเหตุ) ใส่เป็น `{{token}}` ธรรมดาเท่านั้น | ระบบ escape ให้อัตโนมัติ |
| **ห้ามเพิ่ม token ที่มาจากผู้ใช้ลง `htmlVariables`** | นั่นคือช่องเดียวที่ข้าม escape — สำหรับ HTML ที่ server สร้างเองเท่านั้น (เช่นตารางที่ escape ราย cell แล้ว) |
| เพิ่ม template ใหม่: เติมทั้ง `MAIL_TEMPLATE_KEYS` + `MAIL_TEMPLATE_DEFINITIONS` + `DEFAULT_MAIL_TEMPLATES` | ขาดตัวใดตัวหนึ่ง TypeScript จะฟ้อง หรือ (แย่กว่า) เมลออกโดยไม่มีเนื้อหา |
| ลิงก์ในเมลใช้ URL เต็มจาก env (มี basePath) | เมลเปิดนอกแอป ลิงก์ relative ใช้ไม่ได้ |
| แก้ chrome (header/footer/banner/CTA) ที่ `lib/types/mail-templates.ts` เท่านั้น | admin แก้ได้แค่เนื้อหา — layout กับข้อความ disclaimer ต้องคงที่ทุกฉบับ |

```ts
// ✅ อนุมัติสำเร็จก่อน แล้วค่อยส่งเมล — เมลล้มไม่ย้อน transaction
await prisma.$transaction(/* ... */);
try {
  await sendTemplatedMail({
    templateKey: 'request.approved',
    to: requester.email,
    vars: { appName, recipientName: requester.name, itemName, status: 'อนุมัติแล้ว', detailUrl },
    actor: { email: session.user.email, hasDevMode: perms.has(PERMISSIONS.DEV_MODE) },
  });
} catch (error) {
  console.error('mail failed', { templateKey: 'request.approved', error });
}
```
