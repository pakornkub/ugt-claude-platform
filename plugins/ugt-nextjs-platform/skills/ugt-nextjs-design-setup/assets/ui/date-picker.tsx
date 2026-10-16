// kit: ugt-nextjs-platform 4.83.0 · ugt-nextjs-design-setup/ui/date-picker.tsx
// kit-hash: 9a8d5edd191f
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { th } from 'date-fns/locale';
import { formatDate, toDateKey } from '@/lib/format';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ResponsivePopover } from '@/components/ui/responsive-popover';

// i18n removed for the generic kit — Thai-first default. โปรเจกต์ที่ใช้ next-intl
// ค่อย wire `useLocale()` มาเลือก locale เอง (เดิม: locale === 'th' ? th : enUS)
const dateFnsLocale = th;

interface DatePickerProps {
  value: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
  /**
   * ป้ายบนปุ่ม override เฉพาะเมื่อจำเป็นจริง — default ผ่าน `lib/format.formatDate`
   * เพื่อให้ปุ่มกับตารางแสดงปีแบบเดียวกัน (โปรเจค พ.ศ. เคยได้คนละปี §0.6)
   */
  formatLabel?: (value: Date) => string;
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
  /** ชื่อปุ่มสำหรับ screen reader เมื่อไม่มี label ที่มองเห็น (เช่น DateRangePicker `hideLabels`) */
  ariaLabel?: string;
  /** วันแรกของสัปดาห์บนปฏิทิน — ค่าเริ่มตาม locale (`th` = อาทิตย์) · `PeriodNavigator` โหมด week ส่งค่าของมันมา */
  weekStartsOn?: 0 | 1;
}

export function DatePicker({
  value,
  onSelect,
  placeholder,
  disabled,
  className,
  // value เป็น Date สร้างจาก local (เซลล์ปฏิทิน) → ผ่าน toDateKey ก่อน; formatDate(Date) อ่าน UTC parts
  // ทำให้เบราว์เซอร์ +07:00 เห็นวันที่ถอยหลังหนึ่งวัน
  formatLabel = (d: Date) => formatDate(toDateKey(d)),
  modifiers,
  modifiersClassNames,
  footer,
  triggerSuffix,
  holidays,
  ariaLabel,
  weekStartsOn,
}: Readonly<DatePickerProps>) {
  // ปิด popover ทันทีที่เลือกวัน — ปล่อยค้างไว้จะบังช่องถัดไป (เจ็บจริงตอนใช้คู่ใน
  // DateRangePicker: เลือก "จาก" แล้วปฏิทินบังช่อง "ถึง")
  const [open, setOpen] = React.useState(false);
  const t = useTranslations('kit.datePicker');

  const holidaySet = React.useMemo(() => new Set(holidays ?? []), [holidays]);
  const hasHolidays = holidaySet.size > 0;

  // modifier/legend ของวันหยุดมาก่อน แล้วให้ของ consumer เขียนทับได้ถ้าชื่อชนกัน
  const allModifiers = hasHolidays
    ? { holiday: (d: Date) => holidaySet.has(toDateKey(d)), ...modifiers }
    : modifiers;
  const allModifierClasses = hasHolidays
    ? { holiday: 'text-status-red font-semibold', ...modifiersClassNames }
    : modifiersClassNames;

  // desktop = Popover · มือถือ (< 768px) = bottom sheet (ResponsivePopover, A12) · หัวข้อ sheet = ชื่อช่อง
  return (
    <ResponsivePopover
      flush
      open={open}
      onOpenChange={setOpen}
      title={ariaLabel ?? placeholder ?? t('placeholder')}
      trigger={
        <Button
          variant="field"
          aria-label={ariaLabel ? `${ariaLabel} ${value ? formatLabel(value) : ''}`.trim() : undefined}
          className={cn(
            'w-36 justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0" strokeWidth={2} />
          {value ? formatLabel(value) : (placeholder ?? t('placeholder'))}
          {triggerSuffix}
        </Button>
      }
    >
      <Calendar
        // ใน bottom sheet: ช่องวัน 40px (นิ้วกดได้) จัดกลาง · popover desktop คงขนาดเดิม
        className="mx-auto in-data-[slot=sheet-content]:bg-transparent in-data-[slot=sheet-content]:[--cell-size:--spacing(10)]"
        mode="single"
        selected={value}
        onSelect={(date) => {
          onSelect(date);
          setOpen(false);
        }}
        disabled={disabled}
        autoFocus
        // เปิดที่เดือนของค่าที่เลือก — ไม่งั้น react-day-picker เปิดที่เดือนนี้เสมอ
        defaultMonth={value}
        weekStartsOn={weekStartsOn}
        locale={dateFnsLocale}
        modifiers={allModifiers}
        modifiersClassNames={allModifierClasses}
      />
      {hasHolidays && (
        <div className="flex items-center gap-1.5 border-t px-3 py-2 text-[11px] text-muted-foreground">
          <span className="size-2 rounded-full bg-status-red" /> {t('holidayLegend')}
        </div>
      )}
      {footer}
    </ResponsivePopover>
  );
}
