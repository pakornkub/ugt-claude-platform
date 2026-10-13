import { redirect } from 'next/navigation';

/**
 * `/` ไม่มีหน้าของตัวเอง — ส่งต่อไปหน้าหลัก (รายการคำขอลา)
 *
 * ทำไมไม่ให้ `/` เป็นหน้ารายการเลย: shell ของแอปอยู่ที่ route group `(app)` ซึ่ง
 * `app/(app)/page.tsx` จะชนกับไฟล์นี้บน path เดียวกัน · redirect() รู้จัก basePath
 * เองจึงทำงานถูกทั้ง prod (/leave-request) และ dev (/leave-request-dev)
 * (มติ 2026-10-13 — DESIGN.md §10)
 */
export default function RootPage() {
  redirect('/leave');
}
