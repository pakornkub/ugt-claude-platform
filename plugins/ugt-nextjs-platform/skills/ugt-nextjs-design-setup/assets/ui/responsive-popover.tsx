'use client';
// kit: ugt-nextjs-platform 4.82.0 · ugt-nextjs-design-setup/ui/responsive-popover.tsx
// kit-hash: 2ad46fbe459c
// source: ugt-hrms components/ui/responsive-popover.tsx (radix-mira era) — ported to base-mira Popover/Sheet by ugt-nextjs-design-setup
// มติ 2026-10-16 A12 (platform docs/backlog.md §14) · DESIGN.md §3 Mobile — popover บนมือถือ = bottom sheet

import * as React from 'react';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface ResponsivePopoverProps {
  /** ปุ่มเปิด — ส่ง element (`<Button …/>`) ไม่ใช่ node: กลายเป็น `render` ของ trigger (Base UI ไม่มี `asChild`) */
  trigger: React.ReactElement;
  /** หัวข้อ — `SheetTitle` บนมือถือ · ป้ายเล็ก muted บน desktop (ทั้งสองเป็นชื่อของ popup สำหรับ screen reader) · ผู้เรียกแปลเอง */
  title: string;
  /** ส่งคู่กันเมื่อผู้เรียกต้องคุมการเปิดเอง (เช่น ปิดหลังกดล้าง) — ไม่ส่ง = component ถือ state เอง */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'center' | 'end';
  /** ความกว้าง/สไตล์ของ popover บน desktop — ค่าเริ่ม `w-[min(92vw,28rem)]` · ไม่มีผลกับ bottom sheet */
  className?: string;
  children: React.ReactNode;
}

/**
 * เนื้อหาลอยที่ปรับตามจอ: **desktop = Popover · มือถือ (< 768px) = bottom Sheet** — ตัวเปิด overlay
 * เลือกค่าทุกตัวของ kit (`FilterPopover`, `PeriodNavigator`) ผ่านตัวนี้ จึงทำตัวเหมือนกันทั้งแอป
 * · ห้ามเปิด `Popover` ดิบสำหรับเลือกค่าในหน้าที่ใช้บนมือถือ
 *
 * - จุดตัด = `useIsMobile` (`hooks/use-mobile`, 768px) — hook ของ registry ตอบ `false` ใน render แรกทั้ง
 *   server และ client แล้วค่อยอ่านจอใน effect → paint แรกเป็น Popover เสมอ HTML จึงตรงกัน (ไม่เกิด
 *   React #418) · **ห้ามแก้ hook ให้อ่าน `window.innerWidth` ตอน render** — จอแคบจะ hydrate ไม่ตรง
 *   server ทุกหน้า (hrms RT-045) · ใช้ `useSyncExternalStore` ที่ server snapshot = `false` ได้
 * - state การเปิดอยู่ที่ตัวนี้ (หรือผู้เรียก) ไม่ใช่ใน Popover/Sheet — หมุนจอข้ามจุดตัดแล้วยังเปิดอยู่
 * - พื้นของ bottom sheet = พื้นของ `sheet.tsx` (popover surface) ไม่ตั้งใหม่ที่นี่
 *
 * ```tsx
 * <ResponsivePopover
 *   title={t('selectPeriod')}
 *   trigger={<Button variant="field">{label}</Button>}
 * >
 *   <YearSelect value={year} onChange={setYear} />
 * </ResponsivePopover>
 * ```
 */
export function ResponsivePopover({
  trigger,
  title,
  open: openProp,
  onOpenChange,
  align = 'start',
  className,
  children,
}: Readonly<ResponsivePopoverProps>) {
  const isMobile = useIsMobile();
  const [openState, setOpenState] = React.useState(false);
  const open = openProp ?? openState;

  function setOpen(next: boolean) {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  }

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={trigger} />
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="p-6 pt-4">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align={align} className={cn('w-[min(92vw,28rem)] gap-2', className)}>
        <PopoverTitle className="text-xs font-medium text-muted-foreground">{title}</PopoverTitle>
        {children}
      </PopoverContent>
    </Popover>
  );
}
