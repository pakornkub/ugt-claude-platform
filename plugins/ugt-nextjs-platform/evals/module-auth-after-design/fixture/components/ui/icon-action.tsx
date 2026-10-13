'use client';
// kit: ugt-nextjs-platform 4.44.0 · ugt-nextjs-design-setup/ui/icon-action.tsx
// kit-hash: 97d3c07e89da
// source: gov-boi-smart (Base UI native) + ugt-hrms (the `tone` system) —
// installed by ugt-nextjs-design-setup (org UI kit)
// ปุ่มไอคอนล้วนสำหรับ action ในตาราง (ดู / แก้ไข / ลบ / กู้คืน) — ไอคอนอย่างเดียวอ่านไม่ออกว่าทำอะไร
// จึงบังคับให้ทุกที่ที่ใช้ต้องส่ง label แล้วผูกเป็นทั้ง aria-label (screen reader) และ tooltip (สายตา)
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * ความหมายของ action → สี ไม่ใช่ "action ตัวที่เท่าไร → สี"
 * (มติ 2026-08-23 · 4 โทนเท่านี้ ห้ามเพิ่ม)
 *
 * | โทน | ใช้กับ | เหตุผล |
 * | --- | --- | --- |
 * | `neutral` | ดู · ดาวน์โหลด · พิมพ์ | อ่านอย่างเดียว ไม่เปลี่ยนข้อมูล |
 * | `info` | แก้ไข · ตั้งค่า · ตั้งรหัสผ่าน | เปลี่ยนข้อมูล แต่ย้อนได้ |
 * | `danger` | ลบ · ยกเลิก · ปฏิเสธ | ย้อนยากหรือย้อนไม่ได้ |
 * | `success` | กู้คืน · อนุมัติ | คืนสภาพ / เดินหน้าเชิงบวก |
 */
export type IconActionTone = 'neutral' | 'info' | 'danger' | 'success';

/**
 * โทน → className · ใช้ token `--status-*` **ชุดเดียวกับ `StatusBadge`** เพื่อให้
 * ทั้งแอปมีระบบสีชุดเดียว (ไม่ใช่ปุ่มใช้ `--primary` แต่ป้ายสถานะใช้ `--status-*`)
 *
 * **มีพื้นตั้งแต่ตอนพัก** (10%) แล้วเข้มขึ้นตอน hover (20%) — มติ 2026-08-23
 * กลับมติ 4.33.0 ที่เคยให้ใสตอนพัก: บนพื้นการ์ดสีขาว ไอคอนเปล่าไม่มีอะไรบอกว่า
 * เป็นปุ่ม ต้องเอาเมาส์ไปจิ้มถึงรู้ และ **บนมือถือไม่มี hover จึงไม่มีทางรู้เลย**
 */
const TONE_REST: Record<IconActionTone, string> = {
  neutral: 'bg-status-gray/10 text-status-gray-foreground',
  info: 'bg-status-sky/10 text-status-sky-foreground',
  danger: 'bg-status-red/10 text-status-red-foreground',
  success: 'bg-status-emerald/10 text-status-emerald-foreground',
};

// แยก hover ออกมาเพราะปุ่มที่ disabled ต้อง **ไม่** เข้มขึ้นตอน hover
// (aria-disabled ยังรับ hover ได้จริง ถ้าเข้มขึ้นด้วยจะดูเหมือนกดได้)
const TONE_HOVER: Record<IconActionTone, string> = {
  neutral: 'hover:bg-status-gray/20',
  info: 'hover:bg-status-sky/20',
  danger: 'hover:bg-status-red/20',
  success: 'hover:bg-status-emerald/20',
};

export const ICON_TONE_STYLES: Record<IconActionTone, string> = {
  neutral: `${TONE_REST.neutral} ${TONE_HOVER.neutral}`,
  info: `${TONE_REST.info} ${TONE_HOVER.info}`,
  danger: `${TONE_REST.danger} ${TONE_HOVER.danger}`,
  success: `${TONE_REST.success} ${TONE_HOVER.success}`,
};

/**
 * ปุ่มไอคอนล้วนมาตรฐาน — โทนสี + Tooltip + label บังคับ
 *
 * - **ในแถวตาราง**: ส่ง `tone` เสมอ (ค่าเริ่มต้น `neutral`) — ปุ่มต้องเห็นว่ากดได้
 * - **ใน toolbar ที่ปุ่มเรียงติดกันเยอะ** (เช่น `ui/tiptap-editor`): ส่ง
 *   `variant="ghost"` หรือ `soft-*` แทน ไม่ต้องมีพื้นทุกปุ่ม — 8-10 กล่องสีติดกัน
 *   หนักกว่าที่ช่วย · ที่นั่นปุ่มอยู่รวมกันเป็นแถบ จึงเห็นอยู่แล้วว่าเป็นปุ่ม
 *
 * ส่ง `tone` กับ `variant` พร้อมกันไม่ได้ — เลือกอย่างใดอย่างหนึ่ง
 */
export function IconAction({
  label,
  tone,
  variant,
  children,
  disabled,
  onClick,
  className,
  ...props
}: ComponentProps<typeof Button> & { label: string; tone?: IconActionTone }) {
  // `disabled` ที่นี่ = aria-disabled ไม่ใช่ attribute `disabled` จริง:
  // ปุ่ม disabled จริงรับ pointer/focus ไม่ได้ → tooltip เงียบสนิททั้งที่ตอนนั้น
  // คือตอนที่ผู้ใช้อยากรู้เหตุผลที่สุด (มติ 2026-08-21: ห้ามด้วย business rule =
  // disabled + tooltip บอกเหตุผล ไม่ใช่ซ่อนปุ่ม) · aria-disabled ทำให้ยัง
  // โฟกัส/hover ได้ และ screen reader อ่านว่า "ปุ่ม, ปิดใช้งาน" พร้อม label
  // ที่เป็นเหตุผล เช่น "บทบาทระบบ — แก้ไขไม่ได้"
  // ห้ามใส่ pointer-events-none ตอน disabled — tooltip จะไม่ทำงานอีก
  const key = tone ?? 'neutral';
  const toned = variant ? undefined : cn(TONE_REST[key], !disabled && TONE_HOVER[key]);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon"
            variant={variant}
            aria-label={label}
            aria-disabled={disabled || undefined}
            onClick={disabled ? undefined : onClick}
            className={cn(
              toned,
              disabled && 'cursor-not-allowed opacity-50',
              // ปุ่มที่ไม่มีโทน (toolbar) เดิมพื้นใส — ตอน disabled ต้องไม่ขึ้นพื้น hover
              disabled && variant && 'hover:bg-transparent',
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
