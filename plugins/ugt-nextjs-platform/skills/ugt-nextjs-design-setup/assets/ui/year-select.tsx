'use client';
// kit: ugt-nextjs-platform 4.82.0 · ugt-nextjs-design-setup/ui/year-select.tsx
// kit-hash: 4bb08adc5364
// source: ugt-hrms components/ui/year-select.tsx (radix-mira era) — ported to the base-mira Select by ugt-nextjs-design-setup
// มติ 2026-10-16 A6 (platform docs/backlog.md §14) · DESIGN.md §4 เลือก control (filter ปี)

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/** ช่วงปีมาตรฐาน: ย้อนหลัง 2 · ล่วงหน้า 1 จากปีปัจจุบัน — `PeriodNavigator mode="year"` จำกัด ‹ › ด้วยค่าเดียวกัน */
export const YEAR_BACK = 2;
export const YEAR_FORWARD = 1;

interface YearSelectProps {
  /** ปี ค.ศ. (ตัวเลข 4 หลัก) — จอแสดง ค.ศ. เสมอตามสัญญา formatter (ไม่มี พ.ศ.) */
  value: number;
  onChange: (year: number) => void;
  /** จำนวนปีย้อนหลังจากปีปัจจุบัน (ค่าเริ่ม `YEAR_BACK`) */
  back?: number;
  /** จำนวนปีล่วงหน้าจากปีปัจจุบัน (ค่าเริ่ม `YEAR_FORWARD`) */
  forward?: number;
  disabled?: boolean;
  /** ใน toolbar ส่งความกว้างคงที่ได้ (ค่าเริ่ม `w-24`) · ในฟอร์มส่ง `w-full` */
  className?: string;
  'aria-label'?: string;
  id?: string;
}

/** ปีเรียงใหม่ → เก่า · แทรก `value` ที่อยู่นอกช่วงด้วย ไม่งั้น Select จะแสดงค่าว่าง */
export function buildYearOptions(
  current: number,
  back: number,
  forward: number,
  value: number
): number[] {
  const years: number[] = [];
  for (let y = current + forward; y >= current - back; y--) years.push(y);
  if (!years.includes(value)) {
    years.push(value);
    years.sort((a, b) => b - a);
  }
  return years;
}

/**
 * Dropdown เลือกปีตัวเดียวทั้งแอป — หน้าที่กรอง**แค่ปี** (วันหยุด, โควต้าประจำปี) และใน popover ของ
 * `PeriodNavigator` · หน้าที่เลื่อนช่วงเดือน/ปีใช้ `PeriodNavigator` แทน Select ปี + Select เดือน ·
 * presentational ล้วน ผู้เรียกถือ state เอง
 */
export function YearSelect({
  value,
  onChange,
  back = YEAR_BACK,
  forward = YEAR_FORWARD,
  disabled,
  className,
  'aria-label': ariaLabel,
  id,
}: Readonly<YearSelectProps>) {
  const years = buildYearOptions(new Date().getFullYear(), back, forward, value);

  return (
    <Select
      // items: ให้ SelectValue แสดงป้ายของค่า (Base UI ไม่อ่านป้ายจาก SelectItem ก่อน popup เปิด)
      items={years.map((y) => ({ value: y, label: String(y) }))}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn('w-24 tabular-nums', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y} value={y} className="tabular-nums">
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
