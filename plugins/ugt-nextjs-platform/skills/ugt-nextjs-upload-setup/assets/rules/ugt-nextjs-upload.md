---
paths:
  - "lib/storage.ts"
  - "lib/virus-scan.ts"
  - "lib/attachment-access.ts"
  - "app/api/files/**/*.ts"
  - "components/file-upload.tsx"
---

# Uploading and serving files in this project

| กฎ | เหตุผล |
| --- | --- |
| **สแกนก่อนเขียนลง volume เสมอ** — ไฟล์ติดไวรัสต้องไม่เคยอยู่บนดิสก์แม้ชั่วครู่ | ถ้าเขียนก่อนสแกน มีช่วงที่ไฟล์อันตรายอยู่บนเครื่องจริง |
| **fail closed** — สแกนเนอร์ล่ม/timeout = ปฏิเสธ (503) ห้ามปล่อยผ่าน | สแกนเนอร์ที่ล่มแล้วยอมให้ผ่าน แย่กว่าไม่มีสแกนเนอร์ เพราะทุกคนเชื่อว่ามีการตรวจ |
| **path มาจาก id ที่ระบบสร้าง ห้ามมาจากชื่อไฟล์ผู้ใช้** | กัน path traversal — ชื่อเดิมเก็บใน DB ไว้แสดงผลเท่านั้น |
| **ห้ามเก็บไฟล์ใน `public/`** | ทุกอย่างใน `public/` เสิร์ฟโดยไม่ผ่าน auth |
| **ดาวน์โหลดผ่าน route ที่ guard เท่านั้น** — session → permission → ขอบเขตของ record → เช็ค `scanStatus === 'clean'` | ไฟล์อยู่บน volume ก็เพื่อให้ไม่มีทางลัดข้าม guard |
| **ส่งกลับเป็น `application/octet-stream` + `Content-Disposition: attachment` เสมอ** | ไฟล์ `.svg`/`.html` ที่ไม่มีไวรัสก็ยังเป็น stored XSS ได้ถ้าเปิด inline บนโดเมนเรา |
| ไม่เจอไฟล์ กับ ไม่มีสิทธิ์ ตอบ **404 เหมือนกัน** | 403 เป็นการยืนยันว่า id นั้นมีอยู่จริง |
| ลบ = `IsDeleted = 1` ไม่ลบไฟล์ทันที | กู้คืนได้ · ไบต์จริงลบด้วย retention job |
| อัปโหลดใช้ **Route Handler ไม่ใช่ Server Action** | Server Action จำกัด body ที่ `bodySizeLimit` (ค่าเริ่มต้น 1 MB) แล้ว error กำกวม |
| `canReadAttachment` ต้องเขียนจากตัวตน session | `!canSeeAll` คือ bug ที่ให้สิทธิ์กว้างกับ role แคบ |

```ts
// ✅ ลำดับที่ถูก
const scan = await scanBuffer(bytes);
if (scan.status !== 'clean') return refuse(scan);   // fail closed
await writeStoredFile(key, bytes);                   // ค่อยเขียน
await prisma.attachment.create({ data: { /* … */ } });
await writeAuditLog({ action: 'file.upload', /* … */ });
```
