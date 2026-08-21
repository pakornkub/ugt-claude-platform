'use client';
// kit: ugt-nextjs-platform 4.26.0 · ugt-nextjs-design-setup/ui/icon-action.tsx
// kit-hash: 85f56c8fca10

// source: gov-boi-smart (Base UI native) — installed by ugt-nextjs-design-setup (org UI kit)
// ปุ่มไอคอนล้วนสำหรับ action ในตาราง (แก้ไข / ลบ / กู้คืน) — ไอคอนอย่างเดียวอ่านไม่ออกว่าทำอะไร
// จึงบังคับให้ทุกที่ที่ใช้ต้องส่ง label แล้วผูกเป็นทั้ง aria-label (screen reader) และ tooltip (สายตา)
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function IconAction({
  label,
  children,
  disabled,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  // ปุ่ม disabled ไม่ยิง pointer event → tooltip เงียบทั้งที่นี่คือตอนที่ผู้ใช้
  // อยากรู้เหตุผลที่สุด (มติ 2026-08-21: แถวที่ห้ามแก้ด้วย business rule ใช้
  // disabled+tooltip ไม่ใช่ซ่อนปุ่ม) — ห่อ span รับ hover/focus แทน แล้วให้
  // label เป็นตัวบอกเหตุผล เช่น "บทบาทระบบ — แก้ไขไม่ได้"
  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span tabIndex={0} className="inline-flex" aria-label={label} />}>
          <Button size="icon" aria-label={label} disabled {...props}>
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger render={<Button size="icon" aria-label={label} {...props} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
