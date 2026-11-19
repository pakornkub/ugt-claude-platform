// kit: ugt-nextjs-platform 4.97.0 · ugt-nextjs-auth-setup/app/(admin)/admin/roles/loading.tsx
// kit-hash: 80c8ccf59025
// app/(admin)/admin/roles/loading.tsx — skeleton ตามโครงหน้า: หัว + ปุ่มสร้างบทบาท + ตาราง 4 คอลัมน์
// ไม่ใช้ preset TablePageSkeleton: preset ห่อ PageShell แต่หน้า admin ไม่ห่อเอง (layout ของ (admin) เป็นเจ้าของ
// padding — <main className="p-6"> หรือ <PageShell> ของโปรเจค) · ประกอบจากชิ้นย่อยใน div space-y-4 แบบเดียวกับ page.tsx
// ตัวเลข (ปุ่ม/แท็บ/คอลัมน์) = ของหน้าจริง (DESIGN.md §6 route loading)
import { SkeletonHeader, SkeletonTableCard } from '@/components/ui/page-skeleton';

export default function Loading() {
  return (
    <div aria-busy="true" className="space-y-4">
      <SkeletonHeader actions={1} />
      <SkeletonTableCard columns={4} />
    </div>
  );
}
