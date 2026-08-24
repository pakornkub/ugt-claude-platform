// kit: ugt-nextjs-platform 4.48.0 · ugt-nextjs-upload-setup/messages/upload.th.ts
// kit-hash: eecabc3949f6
// Thai catalog for ugt-nextjs-upload-setup. Keys must match upload.en.ts
// exactly — scripts/check-i18n.mjs fails the build when they drift.
export const uploadTh = {
  errors: {
    UNAUTHORIZED: 'ต้องเข้าสู่ระบบก่อน',
    FORBIDDEN_UPLOAD: 'ไม่มีสิทธิ์อัปโหลดไฟล์',
    FORBIDDEN_DOWNLOAD: 'ไม่มีสิทธิ์ดาวน์โหลดไฟล์',
    BAD_REQUEST: 'ข้อมูลไม่ครบ',
    FILE_TOO_LARGE: 'ไฟล์ใหญ่เกิน {max} MB',
    FILE_INFECTED: 'ไฟล์นี้ตรวจพบไวรัส จึงไม่ถูกอัปโหลด',
    SCANNER_UNAVAILABLE: 'ระบบตรวจไวรัสไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง',
    NOT_FOUND: 'ไม่พบไฟล์',
    FILE_NOT_AVAILABLE: 'ไฟล์นี้ไม่พร้อมใช้งาน',
    UPLOAD_FAILED: 'อัปโหลดไม่สำเร็จ',
  },
  fileUpload: {
    uploading: 'กำลังอัปโหลด…',
    attachButton: 'แนบไฟล์',
    removeLabel: 'ลบไฟล์แนบ',
    uploadedSuccess: 'อัปโหลดไฟล์แล้ว',
  },
} as const;
