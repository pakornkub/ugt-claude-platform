// kit: ugt-nextjs-platform 4.39.0 · ugt-nextjs-design-setup/ui/bulk-action-bar.tsx
// kit-hash: fc66eb403512
// source: ugt-hrms components/ui/bulk-action-bar.tsx (radix-mira era) — ported
// to Base UI + the org radius scale by ugt-nextjs-design-setup
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface BulkActionBarProps {
  /** จำนวนแถวที่เลือก — 0 แล้วไม่ render อะไรเลย */
  count: number;
  /** ข้อความสรุปจำนวน เช่น `เลือก 12 รายการ` (คนเรียกเป็นคนประกอบ เพราะ i18n) */
  label: string;
  /** ข้อความปุ่มล้างการเลือก เช่น `ล้างการเลือก` */
  clearLabel: string;
  onClear: () => void;
  /** ปุ่ม action ชิดขวา — ปุ่มธรรมดาของ kit (ไม่ใช่ IconAction: แถบนี้ไม่ใช่แถวตาราง) */
  children: React.ReactNode;
}

/**
 * แถบสั่งงานหลายรายการ — โผล่เหนือตารางเมื่อผู้ใช้ติ๊กหลายแถว
 * (ซ้าย: ติ๊กถูก + จำนวน + ล้างการเลือก · ขวา: ปุ่มสั่งงานผ่าน `children`)
 *
 * ไม่มี state ของตัวเอง — หน้าเป็นคนถือ `selectedRows` จาก `onSelectionChange`
 * ของ `DataTable` แล้วสั่งล้างด้วย `resetSelectionKey` ของตารางตัวเดียวกัน:
 *
 * ```tsx
 * const [selected, setSelected] = React.useState<Row[]>([]);
 * const [clearKey, setClearKey] = React.useState(0);
 *
 * <BulkActionBar
 *   count={selected.length > 1 ? selected.length : 0}
 *   label={`เลือก ${formatNumber(selected.length)} รายการ`}
 *   clearLabel="ล้างการเลือก"
 *   onClear={() => setClearKey((k) => k + 1)}
 * >
 *   <Button variant="success" onClick={approveAll}>อนุมัติทั้งหมด</Button>
 *   <Button variant="destructive" onClick={rejectAll}>ไม่อนุมัติทั้งหมด</Button>
 * </BulkActionBar>
 * <DataTable … enableRowSelection onSelectionChange={setSelected} resetSelectionKey={clearKey} />
 * ```
 *
 * กติกาสองข้อที่มากับแพตเทิร์นนี้ (DESIGN.md §3):
 * - โผล่เมื่อเลือก **มากกว่า 1 แถว** — เลือกแถวเดียวใช้ปุ่มในแถวตามปกติ
 * - ระหว่างที่แถบขึ้น **ซ่อนปุ่มสั่งงานรายแถว** ไม่ให้มีสองทางสั่งงานพร้อมกัน
 */
export function BulkActionBar({
  count,
  label,
  clearLabel,
  onClear,
  children,
}: Readonly<BulkActionBarProps>) {
  if (count === 0) return null;
  return (
    <div
      data-slot="bulk-action-bar"
      className="flex animate-in items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 duration-200 fade-in-0 slide-in-from-top-1"
    >
      <div className="flex min-w-0 items-center gap-2">
        {/* ติ๊กถูกค้างไว้เสมอ — กดแล้วคือล้างการเลือก (Base UI ส่ง (checked, details)) */}
        <Checkbox checked onCheckedChange={() => onClear()} aria-label={clearLabel} />
        <span className="truncate text-xs/relaxed font-medium">{label}</span>
        <Button variant="link" className="h-auto p-0 text-xs/relaxed" onClick={onClear}>
          {clearLabel}
        </Button>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}
