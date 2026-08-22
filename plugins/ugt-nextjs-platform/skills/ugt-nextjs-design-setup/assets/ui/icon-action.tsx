'use client';
// kit: ugt-nextjs-platform 4.29.0 · ugt-nextjs-design-setup/ui/icon-action.tsx
// kit-hash: 034ff1c36511

// source: gov-boi-smart (Base UI native) — installed by ugt-nextjs-design-setup (org UI kit)
// ปุ่มไอคอนล้วนสำหรับ action ในตาราง (แก้ไข / ลบ / กู้คืน) — ไอคอนอย่างเดียวอ่านไม่ออกว่าทำอะไร
// จึงบังคับให้ทุกที่ที่ใช้ต้องส่ง label แล้วผูกเป็นทั้ง aria-label (screen reader) และ tooltip (สายตา)
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function IconAction({
  label,
  children,
  disabled,
  onClick,
  className,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  // `disabled` ที่นี่ = aria-disabled ไม่ใช่ attribute `disabled` จริง:
  // ปุ่ม disabled จริงรับ pointer/focus ไม่ได้ → tooltip เงียบสนิททั้งที่ตอนนั้น
  // คือตอนที่ผู้ใช้อยากรู้เหตุผลที่สุด (มติ 2026-08-21: ห้ามด้วย business rule =
  // disabled + tooltip บอกเหตุผล ไม่ใช่ซ่อนปุ่ม) · aria-disabled ทำให้ยัง
  // โฟกัส/hover ได้ และ screen reader อ่านว่า "ปุ่ม, ปิดใช้งาน" พร้อม label
  // ที่เป็นเหตุผล เช่น "บทบาทระบบ — แก้ไขไม่ได้"
  // ห้ามใส่ pointer-events-none ตอน disabled — tooltip จะไม่ทำงานอีก
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon"
            aria-label={label}
            aria-disabled={disabled || undefined}
            onClick={disabled ? undefined : onClick}
            className={cn(
              disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
              className
            )}
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
