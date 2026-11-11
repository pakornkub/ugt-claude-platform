// kit: ugt-nextjs-platform unreleased · ugt-nextjs-design-setup/ui/query-state.tsx
// kit-hash: b46c01def0f5
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
// RefreshCw = ลองใหม่/รีเฟรช · RotateCcw สงวนไว้กับ "กู้คืน" (icon mapping DESIGN.md §4)
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { SkeletonTableCard } from '@/components/ui/page-skeleton';

// page size อาจ 50–100 แถว — skeleton แค่พอให้เห็นโครง ไม่ต้องยาวเท่าจริง
const MAX_SKELETON_ROWS = 10;

/**
 * Placeholder ระหว่างโหลดรายการครั้งแรก — **skeleton ไม่ใช่ spinner**
 * (pattern ส่วน 7: spinner สงวนไว้ให้ปุ่มขณะ submit เท่านั้น) เพราะ skeleton
 * บอกโครงของสิ่งที่กำลังจะมา ทำให้หน้าไม่กระโดดตอนข้อมูลมาถึง.
 *
 * `label` ไม่แสดงเป็นข้อความอีกแล้ว แต่คงไว้เป็นชื่อให้ screen reader
 * (call site เดิมไม่ต้องแก้).
 *
 * หน้าตา = การ์ดตารางแบบเดียวกับ DataTable (`SkeletonTableCard` ของ `ui/page-skeleton`)
 * ไม่ใช่แถวเปล่าลอย ๆ — วางแทนตำแหน่ง DataTable ไม่ใช่ข้างในการ์ดอีกใบ.
 */
export function QueryLoading({ label, rows = 5 }: Readonly<{ label: string; rows?: number }>) {
  return (
    <output aria-busy="true" className="block">
      <span className="sr-only">{label}</span>
      <SkeletonTableCard rows={Math.min(rows, MAX_SKELETON_ROWS)} columns={4} toolbar={false} footer={false} />
    </output>
  );
}

/**
 * Error banner พร้อมปุ่มลองใหม่ — render **เหนือ** เนื้อหา (ไม่ใช่แทนที่)
 * เพื่อให้ตัวกรองใน toolbar ยังกดได้ ผู้ใช้กู้คืนเองได้โดยไม่ต้องรีโหลดทั้งหน้า.
 *
 * ทุกตารางที่โหลดผ่าน `useQuery` ต้องมีตัวนี้ — ไม่งั้น query ล้มเหลวจะเงียบ
 * และผู้ใช้อ่านตารางว่างเป็น "ไม่มีข้อมูล" ซึ่งเป็นคนละความหมาย.
 */
export function QueryErrorBanner({
  error,
  retryLabel,
  onRetry,
}: Readonly<{ error: unknown; retryLabel: string; onRetry: () => void }>) {
  return (
    <Callout
      tone="danger"
      action={
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onRetry}>
          <RefreshCw className="size-3.5" strokeWidth={2} />
          {retryLabel}
        </Button>
      }
    >
      {error instanceof Error ? error.message : String(error)}
    </Callout>
  );
}
