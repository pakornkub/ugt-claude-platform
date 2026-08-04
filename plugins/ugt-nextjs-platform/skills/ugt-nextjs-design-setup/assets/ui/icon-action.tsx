'use client';

// source: gov-boi-smart (Base UI native) — installed by ugt-nextjs-design-setup (org UI kit)
// ปุ่มไอคอนล้วนสำหรับ action ในตาราง (แก้ไข / ลบ / กู้คืน) — ไอคอนอย่างเดียวอ่านไม่ออกว่าทำอะไร
// จึงบังคับให้ทุกที่ที่ใช้ต้องส่ง label แล้วผูกเป็นทั้ง aria-label (screen reader) และ tooltip (สายตา)
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function IconAction({
  label,
  children,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button size="icon" aria-label={label} {...props} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
