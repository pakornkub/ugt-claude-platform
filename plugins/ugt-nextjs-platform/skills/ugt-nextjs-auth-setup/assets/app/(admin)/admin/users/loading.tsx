// kit: ugt-nextjs-platform 4.97.0 · ugt-nextjs-auth-setup/app/(admin)/admin/users/loading.tsx
// kit-hash: 8bc76084f4d1
// app/(admin)/admin/users/loading.tsx — skeleton ตามโครงหน้า: หัว + ปุ่มเพิ่มผู้ใช้ + แท็บ 3 อัน + ตาราง 5 คอลัมน์
// ไม่ใช้ preset TablePageSkeleton: preset ห่อ PageShell แต่หน้า admin ไม่ห่อเอง (layout ของ (admin) เป็นเจ้าของ
// padding — <main className="p-6"> หรือ <PageShell> ของโปรเจค) · ประกอบจากชิ้นย่อยใน div space-y-4 แบบเดียวกับ page.tsx
// ตัวเลข (ปุ่ม/แท็บ/คอลัมน์) = ของหน้าจริง (DESIGN.md §6 route loading)
import { SkeletonHeader, SkeletonTableCard, SkeletonTabs } from '@/components/ui/page-skeleton';

export default function Loading() {
  return (
    <div aria-busy="true" className="space-y-4">
      <SkeletonHeader actions={1} />
      <SkeletonTabs count={3} />
      <SkeletonTableCard columns={5} />
    </div>
  );
}
