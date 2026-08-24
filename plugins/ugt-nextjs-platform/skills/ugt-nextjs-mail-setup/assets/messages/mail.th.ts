// kit: ugt-nextjs-platform 4.48.0 · ugt-nextjs-mail-setup/messages/mail.th.ts
// kit-hash: 4e08c4809b4e
// Thai catalog for ugt-nextjs-mail-setup's admin UI. Keys must match
// mail.en.ts exactly — scripts/check-i18n.mjs fails the build when they drift.
// Email BODY content (GREETING, EMAIL_FOOTER, every `heading`, every
// `previewSample` value, DEFAULT_MAIL_TEMPLATES) is NOT here and never will
// be until a `locale` column exists on `user` — spec มติ 2.3.
export const mailTh = {
  errors: {
    UNAUTHORIZED: 'กรุณาเข้าสู่ระบบ',
    FORBIDDEN: 'คุณไม่มีสิทธิ์ทำรายการนี้',
    UNKNOWN_TEMPLATE: 'ไม่พบเทมเพลตนี้',
    VALIDATION_FAILED: 'ข้อมูลไม่ถูกต้อง',
    SUBJECT_REQUIRED: 'กรอกหัวข้ออีเมล',
    SUBJECT_TOO_LONG: 'หัวข้อยาวเกิน 300 ตัวอักษร',
    BODY_REQUIRED: 'กรอกเนื้อหาอีเมล',
    BODY_TOO_LONG: 'เนื้อหายาวเกิน 20,000 ตัวอักษร',
  },
  templates: {
    menuRequest: 'คำขอ/อนุมัติ',
    menuAccount: 'บัญชีผู้ใช้',
    requestSubmittedLabel: 'แจ้งผู้อนุมัติ: มีคำขอใหม่',
    requestSubmittedDescription: 'ส่งถึงผู้อนุมัติเมื่อมีคำขอใหม่เข้ามา',
    requestApprovedLabel: 'แจ้งผู้ขอ: คำขอได้รับอนุมัติ',
    requestApprovedDescription: 'ส่งกลับถึงผู้ยื่นคำขอเมื่อได้รับอนุมัติ',
    requestRejectedLabel: 'แจ้งผู้ขอ: คำขอถูกปฏิเสธ',
    requestRejectedDescription: 'ส่งกลับถึงผู้ยื่นคำขอเมื่อถูกปฏิเสธ',
    passwordResetLabel: 'ลิงก์ตั้งรหัสผ่านใหม่',
    passwordResetDescription:
      'ส่งเมื่อผู้ใช้กด "ลืมรหัสผ่าน" · ลิงก์ใช้ได้ครั้งเดียวและหมดอายุตาม resetPasswordTokenExpiresIn ใน lib/auth.ts',
  },
  page: {
    title: 'เทมเพลตอีเมล',
    description:
      'แก้หัวข้อและเนื้อหาอีเมลของระบบได้โดยไม่ต้อง deploy — โครงอีเมล (หัว/ปุ่ม/ท้าย) ล็อกไว้ แก้ได้เฉพาะข้อความ',
  },
  manager: {
    navLabel: 'รายการเทมเพลต',
    overriddenBadge: 'แก้แล้ว',
    subjectLabel: 'หัวข้ออีเมล',
    bodyLabel: 'เนื้อหา (HTML)',
    variablesHint: 'ตัวแปรที่ใช้ได้ (แทนค่าตอนส่งจริง · ค่าถูก escape เสมอ):',
    resetButton: 'กลับใช้ค่าเริ่มต้น',
    previewButton: 'ดูตัวอย่าง',
    saveButton: 'บันทึก',
    previewLabel: 'ตัวอย่างอีเมล',
    resetDialogTitle: 'กลับใช้ค่าเริ่มต้น — {label}',
    resetDialogDescription: 'ข้อความที่แก้ไว้จะถูกลบ และอีเมลฉบับถัดไปจะใช้ข้อความเริ่มต้นของระบบ',
    resetDialogSuccessMessage: 'กลับไปใช้ค่าเริ่มต้นแล้ว',
    saveFailedTitle: 'บันทึกไม่สำเร็จ',
    saveSuccessMessage: 'บันทึกเทมเพลตแล้ว — อีเมลฉบับถัดไปใช้ข้อความนี้',
    previewFailedTitle: 'สร้างตัวอย่างไม่สำเร็จ',
  },
} as const;
