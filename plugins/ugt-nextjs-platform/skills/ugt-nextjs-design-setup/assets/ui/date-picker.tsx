// kit: ugt-nextjs-platform 4.25.0 · ugt-nextjs-design-setup/ui/date-picker.tsx
// kit-hash: c02046f30fdc
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// i18n removed for the generic kit — Thai-first default. โปรเจกต์ที่ใช้ next-intl
// ค่อย wire `useLocale()` มาเลือก locale เอง (เดิม: locale === 'th' ? th : enUS)
const dateFnsLocale = th;

interface DatePickerProps {
  value: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
  /** date-fns format for the trigger label. Defaults to `dd/MM/yyyy`. */
  dateFormat?: string;
  /** react-day-picker modifiers — predicate per named modifier (e.g. holidays). */
  modifiers?: Record<string, (date: Date) => boolean>;
  /** Tailwind classes applied to days matching each modifier. */
  modifiersClassNames?: Record<string, string>;
  /** node ใต้ปฏิทินใน popover (เช่น legend วันหยุด) */
  footer?: React.ReactNode;
  /** node ชิดขวาในปุ่ม trigger (เช่น spinner กำลังโหลด) */
  triggerSuffix?: React.ReactNode;
  /**
   * วันหยุดประเพณี (`yyyy-MM-dd`) — ทำเครื่องหมายแดงบนปฏิทิน + ใส่ legend ให้เอง.
   * ทางเดียวในการโชว์วันหยุดใน date picker; อย่า hand-wire modifiers เอง.
   */
  holidays?: string[];
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function DatePicker({
  value,
  onSelect,
  placeholder,
  disabled,
  className,
  dateFormat = 'dd/MM/yyyy',
  modifiers,
  modifiersClassNames,
  footer,
  triggerSuffix,
  holidays,
}: Readonly<DatePickerProps>) {
  // ปิด popover ทันทีที่เลือกวัน — ปล่อยค้างไว้จะบังช่องถัดไป (เจ็บจริงตอนใช้คู่ใน
  // DateRangePicker: เลือก "จาก" แล้วปฏิทินบังช่อง "ถึง")
  const [open, setOpen] = React.useState(false);

  const holidaySet = React.useMemo(() => new Set(holidays ?? []), [holidays]);
  const hasHolidays = holidaySet.size > 0;

  // modifier/legend ของวันหยุดมาก่อน แล้วให้ของ consumer เขียนทับได้ถ้าชื่อชนกัน
  const allModifiers = hasHolidays
    ? { holiday: (d: Date) => holidaySet.has(toDateKey(d)), ...modifiers }
    : modifiers;
  const allModifierClasses = hasHolidays
    ? { holiday: 'text-status-red font-semibold', ...modifiersClassNames }
    : modifiersClassNames;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="field"
            className={cn(
              'w-36 justify-start text-left font-normal',
              !value && 'text-muted-foreground',
              className
            )}
          />
        }
      >
        <CalendarIcon className="size-4 shrink-0" strokeWidth={2} />
        {value
          ? format(value, dateFormat, { locale: dateFnsLocale })
          : (placeholder ?? 'เลือกวันที่')}
        {triggerSuffix}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onSelect(date);
            setOpen(false);
          }}
          disabled={disabled}
          autoFocus
          locale={dateFnsLocale}
          modifiers={allModifiers}
          modifiersClassNames={allModifierClasses}
        />
        {hasHolidays && (
          <div className="flex items-center gap-1.5 border-t px-3 py-2 text-[11px] text-muted-foreground">
            <span className="size-2 rounded-full bg-status-red" /> วันหยุดประเพณี
          </div>
        )}
        {footer}
      </PopoverContent>
    </Popover>
  );
}
