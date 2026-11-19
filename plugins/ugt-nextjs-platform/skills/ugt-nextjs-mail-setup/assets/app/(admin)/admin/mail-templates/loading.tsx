// kit: ugt-nextjs-platform 4.97.0 · ugt-nextjs-mail-setup/app/(admin)/admin/mail-templates/loading.tsx
// kit-hash: 836f29b18500
// app/(admin)/admin/mail-templates/loading.tsx — skeleton ตามโครงหน้า: หัว + รายการแม่แบบซ้าย 240px + การ์ดแก้ไขขวา
// ไม่ใช้ preset: preset ห่อ PageShell แต่หน้า admin ไม่ห่อเอง (layout ของ (admin) เป็นเจ้าของ padding) ·
// grid เดียวกับ mail-templates-manager.tsx (DESIGN.md §6 route loading)
import { SkeletonCard, SkeletonFields, SkeletonHeader } from '@/components/ui/page-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

const NAV_ROWS = ['nav-0', 'nav-1', 'nav-2', 'nav-3'];

export default function Loading() {
  return (
    <div aria-busy="true" className="space-y-4">
      <SkeletonHeader />
      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <div className="space-y-1">
          {NAV_ROWS.map((id) => (
            <Skeleton key={id} className="h-9 w-full" />
          ))}
        </div>
        <SkeletonCard heading={false}>
          <SkeletonFields count={3} />
        </SkeletonCard>
      </div>
    </div>
  );
}
