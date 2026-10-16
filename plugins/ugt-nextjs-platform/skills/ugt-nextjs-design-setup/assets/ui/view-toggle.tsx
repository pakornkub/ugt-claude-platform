'use client';
// kit: ugt-nextjs-platform 4.81.0 · ugt-nextjs-design-setup/ui/view-toggle.tsx
// kit-hash: 1dd120ca311b
// source: ugt-hrms components/ui/view-toggle.tsx (radix-mira era) — ported to the base-mira Button by ugt-nextjs-design-setup
// มติ 2026-10-16 B8 (platform docs/backlog.md §14) · DESIGN.md §4

import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ViewToggleOption<T extends string> {
  value: T;
  /** ข้อความบนปุ่ม — ผู้เรียกแปลเอง (kit ไม่ถือข้อความ) */
  label: string;
  /** ไอคอนนำหน้า (ละได้ เมื่อใช้เป็นตัวเลือกค่าเดียวในฟอร์ม) */
  icon?: LucideIcon;
}

interface ViewToggleProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  /** 2–4 ตัวเลือก — เกินนั้นใช้ `Select`/`Tabs` */
  options: ReadonlyArray<ViewToggleOption<T>>;
  /** ชื่อกลุ่มสำหรับ screen reader — ส่ง `aria-label` หรือ `aria-labelledby` อย่างใดอย่างหนึ่ง */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
}

/**
 * Segmented control 2–4 ตัวเลือก — สลับมุมมอง (ตาราง ⟷ ปฏิทิน · รายเดือน ⟷ ทั้งปี) หรือเป็น
 * ตัวเลือกค่าเดียวสั้น ๆ ในฟอร์ม · presentational ล้วน ผู้เรียกถือ state เอง (มุมมองหลักของหน้า
 * เก็บใน URL ตามกฎ Tabs)
 *
 * - สูงรวม 28px (ปุ่ม `sm` 24px + ขอบ + `p-px`) = เท่า control `default` จึงวางใน toolbar ได้โดยแถว
 *   ยังเป็นขนาดเดียว (มติ A3) และวางใน `action` ของ `CardHeading` ได้โดยแถบไม่สูงขึ้น
 * - ตัวที่เลือก: light = `secondary` · dark = พื้น `primary/25` (secondary สว่างกว่าการ์ดแค่ ~6 L
 *   มองไม่ออกว่าเลือกตัวไหน — primary คือสีของ "สถานะเลือก")
 * - ปุ่มแต่ละตัวเป็น toggle button (`aria-pressed`) ในกลุ่ม `role="group"`
 * - มือถือใน toolbar ให้เต็มแถวแบ่งเท่ากัน: `className="max-sm:w-full max-sm:*:flex-1"`
 *   (ในหัวการ์ดไม่ต้อง — พอดีตัวเสมอ)
 *
 * ```tsx
 * <ViewToggle
 *   value={view}
 *   onValueChange={setView}
 *   aria-label={t('viewLabel')}
 *   options={[
 *     { value: 'list', label: t('list'), icon: List },
 *     { value: 'calendar', label: t('calendar'), icon: CalendarDays },
 *   ]}
 * />
 * ```
 */
export function ViewToggle<T extends string>({
  value,
  onValueChange,
  options,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
}: Readonly<ViewToggleProps<T>>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      data-slot="view-toggle"
      className={cn('inline-flex w-fit items-center rounded-md border p-px', className)}
    >
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const selected = optionValue === value;
        return (
          <Button
            key={optionValue}
            type="button"
            size="sm"
            variant={selected ? 'secondary' : 'ghost'}
            className={cn(selected && 'dark:bg-primary/25 dark:hover:bg-primary/30')}
            aria-pressed={selected}
            onClick={() => onValueChange(optionValue)}
          >
            {Icon && <Icon aria-hidden="true" />}
            {label}
          </Button>
        );
      })}
    </div>
  );
}
