'use client';
// kit: ugt-nextjs-platform 4.82.0 · ugt-nextjs-design-setup/ui/month-select.tsx
// kit-hash: cb6d4b6f8d01
// source: ugt-hrms components/ui/month-select.tsx (radix-mira era) — ported to the base-mira Select by ugt-nextjs-design-setup
// มติ 2026-10-16 A6 (platform docs/backlog.md §14) · ships with ui/period-navigator (its month popover)

import { useLocale, useTranslations } from 'next-intl';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getMonthNames, type AppLocale } from '@/lib/format';
import { cn } from '@/lib/utils';

interface MonthSelectProps {
  /** เดือน 1–12 (ไม่ใช่ index) · `0` = "ทุกเดือน" เมื่อเปิด `allOption` */
  value: number;
  onChange: (month: number) => void;
  /** เพิ่มตัวเลือก "ทุกเดือน" (ค่า `0`) ไว้บนสุด — สำหรับ filter ที่ไม่บังคับเลือกเดือน */
  allOption?: boolean;
  disabled?: boolean;
  /** ค่าเริ่ม `w-32` · ในฟอร์มส่ง `w-full` */
  className?: string;
  'aria-label'?: string;
  id?: string;
}

/**
 * Dropdown เลือกเดือน — วาง**ต่อจาก `YearSelect` เสมอ** (ปี → เดือน ทุกหน้า) · ชื่อเดือนมาจาก
 * `getMonthNames` ของ `lib/format` ตาม locale (แหล่งเดียว — ห้าม hardcode array เดือนไทย)
 * · presentational ล้วน ผู้เรียกถือ state เอง
 */
export function MonthSelect({
  value,
  onChange,
  allOption,
  disabled,
  className,
  'aria-label': ariaLabel,
  id,
}: Readonly<MonthSelectProps>) {
  const t = useTranslations('kit.period');
  const locale = useLocale() as AppLocale;
  const items = getMonthNames(locale).map((label, i) => ({ value: i + 1, label }));
  if (allOption) items.unshift({ value: 0, label: t('allMonths') });

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn('w-32', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
