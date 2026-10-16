'use client';
// kit: ugt-nextjs-platform 4.82.0 · ugt-nextjs-design-setup/ui/filter-popover.tsx
// kit-hash: 1a4dc3d378c8
// source: ugt-hrms components/ui/filter-popover.tsx (radix-mira era) — ported to base-mira by ugt-nextjs-design-setup
// มติ 2026-10-16 B4 (platform docs/backlog.md §14) · DESIGN.md §3 แถบ filter ระดับหน้า · needs ui/responsive-popover

import * as React from 'react';
import { Filter, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResponsivePopover } from '@/components/ui/responsive-popover';

interface FilterPopoverProps {
  /** จำนวน filter ที่ใช้อยู่ — > 0 แล้วโชว์ badge บนปุ่ม + ปุ่มล้าง */
  activeCount?: number;
  /** ล้าง filter ทุกตัวในกลุ่มนี้ — ไม่ส่ง = ไม่มีปุ่มล้าง */
  onClear?: () => void;
  /** ป้ายปุ่ม — ค่าเริ่ม `kit.filterPopover.trigger` ("ตัวกรอง") · หัวข้อ panel ใช้ค่าเดียวกัน */
  label?: string;
  className?: string;
  /** ช่อง filter แนวตั้ง — แต่ละช่องห่อ `Field` + `FieldLabel` ของตัวเอง (control เต็มกว้าง) */
  children: React.ReactNode;
}

/**
 * ปุ่ม "ตัวกรอง" ที่ยุบ filter **รอง** ของหน้าที่มี filter ≥ 3–4 ตัว — desktop เปิด Popover, มือถือ
 * bottom Sheet (ผ่าน `ResponsivePopover`) · filter หลัก (ช่วงเวลา) คงอยู่บน toolbar
 *
 * - วางเป็น**ตัวสุดท้ายของ `toolbarFilters`** ของ `DataTable` (ลำดับกว้าง→แคบ: ช่วงเวลา → … → ตัวกรอง)
 *   — ไม่ใช่ `toolbarExtra` (นั่นของเครื่องมือ เช่น export) · มือถือ DataTable ยืดตัวนี้เต็มแถวให้เอง
 * - ปุ่มขนาด `default` เท่าทุกปุ่มในแถว toolbar (มติ A3) · badge นับ = `bg-primary` วงกลม
 * - ปุ่มล้างอยู่ 2 ที่ (เมื่อ `activeCount > 0`): ข้างปุ่มบน toolbar (ล้างได้โดยไม่ต้องเปิด) และใน panel
 *   (กดแล้วปิด panel)
 * - **ไม่มีปุ่ม "กรอง"/apply**: แต่ละช่องมีผลทันทีที่เปลี่ยน (เขียน URL/query key เหมือน filter บน
 *   toolbar) — filter สองที่จึงทำงานแบบเดียวกัน ไม่มีสถานะ "เลือกแล้วแต่ยังไม่กด"
 *
 * ```tsx
 * <DataTable
 *   id="requests"
 *   toolbarFilters={
 *     <>
 *       <PeriodNavigator mode="month" year={year} month={month} onChange={setPeriod} />
 *       <FilterPopover activeCount={(orgUnit ? 1 : 0) + (status ? 1 : 0)} onClear={clearFilters}>
 *         <Field>
 *           <FieldLabel htmlFor="filter-status">{t('status')}</FieldLabel>
 *           <Select …><SelectTrigger id="filter-status">…</SelectTrigger>…</Select>
 *         </Field>
 *       </FilterPopover>
 *     </>
 *   }
 *   …
 * />
 * ```
 */
export function FilterPopover({
  activeCount = 0,
  onClear,
  label,
  className,
  children,
}: Readonly<FilterPopoverProps>) {
  const t = useTranslations('kit.filterPopover');
  const [open, setOpen] = React.useState(false);
  const text = label ?? t('trigger');
  // const จึง narrow ได้ใน closure ด้านล่าง
  const clear = activeCount > 0 ? onClear : undefined;

  const trigger = (
    <Button variant="outline" className="max-sm:flex-1">
      <Filter aria-hidden="true" />
      {text}
      {activeCount > 0 && (
        <>
          <Badge aria-hidden="true" className="min-w-5 px-1 tabular-nums">
            {activeCount}
          </Badge>
          <span className="sr-only">{t('activeCount', { count: activeCount })}</span>
        </>
      )}
    </Button>
  );

  return (
    <div data-slot="filter-popover" className={cn('flex items-center gap-1', className)}>
      <ResponsivePopover
        trigger={trigger}
        title={text}
        open={open}
        onOpenChange={setOpen}
        className="w-[min(92vw,20rem)]"
      >
        <div className="flex flex-col gap-4">
          {children}
          {clear && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => {
                clear();
                setOpen(false);
              }}
            >
              {t('clear')}
            </Button>
          )}
        </div>
      </ResponsivePopover>
      {clear && (
        <Button variant="ghost" className="text-muted-foreground" onClick={clear}>
          <X aria-hidden="true" />
          {t('clear')}
        </Button>
      )}
    </div>
  );
}
