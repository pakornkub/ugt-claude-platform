// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
'use client';

import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';

/** disable วันที่อยู่หลัง `to` (สำหรับ from picker) */
export function isAfterTo(to: Date | undefined) {
  return (date: Date) => !!(to && date > to);
}
/** disable วันที่อยู่ก่อน `from` (สำหรับ to picker) */
export function isBeforeFrom(from: Date | undefined) {
  return (date: Date) => !!(from && date < from);
}

interface DateRangePickerProps {
  from: Date | undefined;
  to: Date | undefined;
  onFromChange: (d: Date | undefined) => void;
  onToChange: (d: Date | undefined) => void;
  fromLabel?: string;
  toLabel?: string;
  /** เงื่อนไข disable เพิ่มเติมนอกจาก from≤to */
  disabled?: (date: Date) => boolean;
  className?: string;
  /** class ส่งต่อให้ trigger ของ `DatePicker` ทั้งสองตัว (เช่น `w-full` ให้เต็มความกว้าง) */
  pickerClassName?: string;
}

/**
 * ช่วงวันที่ from–to กลาง — DatePicker 2 ตัว + cross-disable (from ≤ to) รวมที่เดียว.
 * label เหนือแต่ละช่อง (optional). presentational — consumer ถือ state เอง.
 */
export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel,
  toLabel,
  disabled,
  className,
  pickerClassName,
}: Readonly<DateRangePickerProps>) {
  const afterTo = isAfterTo(to);
  const beforeFrom = isBeforeFrom(from);
  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      <div className="flex flex-col gap-1.5">
        {fromLabel && (
          <span className="text-xs font-medium text-muted-foreground">{fromLabel}</span>
        )}
        <DatePicker
          value={from}
          onSelect={onFromChange}
          placeholder={fromLabel}
          disabled={(d) => afterTo(d) || (disabled?.(d) ?? false)}
          className={pickerClassName}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        {toLabel && <span className="text-xs font-medium text-muted-foreground">{toLabel}</span>}
        <DatePicker
          value={to}
          onSelect={onToChange}
          placeholder={toLabel}
          disabled={(d) => beforeFrom(d) || (disabled?.(d) ?? false)}
          className={pickerClassName}
        />
      </div>
    </div>
  );
}
