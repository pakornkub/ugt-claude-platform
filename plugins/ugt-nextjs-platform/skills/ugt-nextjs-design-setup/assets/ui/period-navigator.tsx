'use client';
// kit: ugt-nextjs-platform 4.83.0 · ugt-nextjs-design-setup/ui/period-navigator.tsx
// kit-hash: 303f19966584
// source: ugt-hrms components/ui/period-navigator.tsx (radix-mira era) — ported to base-mira + kit formatter by ugt-nextjs-design-setup
// มติ 2026-10-16 A6 (platform docs/backlog.md §14) · DESIGN.md §3 แถบ filter ระดับหน้า
// needs ui/responsive-popover · ui/year-select · ui/month-select · ui/date-picker · ui/icon-action

import * as React from 'react';
import { addDays, startOfDay, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { formatDate, formatLongDate, getMonthNames, toDateKey, type AppLocale } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { IconAction } from '@/components/ui/icon-action';
import { MonthSelect } from '@/components/ui/month-select';
import { ResponsivePopover } from '@/components/ui/responsive-popover';
import { YEAR_BACK, YEAR_FORWARD, YearSelect } from '@/components/ui/year-select';

/** เลื่อนเดือน (1–12) พร้อมข้ามปี — `stepMonth(2026, 12, 1)` → `{ year: 2027, month: 1 }` */
export function stepMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const zeroBased = month - 1 + delta;
  return { year: year + Math.floor(zeroBased / 12), month: (((zeroBased % 12) + 12) % 12) + 1 };
}

interface Common {
  /** ปุ่มขวาสุด "วันนี้"/"ปีนี้" — ไม่ส่ง = กลับช่วงปัจจุบันของโหมดนั้น */
  onToday?: () => void;
  className?: string;
}

type PeriodNavigatorProps = Common &
  (
    | {
        mode: 'day';
        date: Date | undefined;
        onChange: (date: Date) => void;
        disabled?: (date: Date) => boolean;
      }
    | {
        mode: 'week';
        /** วันใดก็ได้ในสัปดาห์ (Date จาก local เหมือนเซลล์ปฏิทิน) — `onChange` ส่งวันแรกของสัปดาห์กลับ */
        date: Date;
        onChange: (weekStart: Date) => void;
        /** 1 = จันทร์ (ค่าเริ่ม) · 0 = อาทิตย์ */
        weekStartsOn?: 0 | 1;
      }
    | {
        mode: 'month';
        year: number;
        month: number;
        onChange: (year: number, month: number) => void;
        yearBack?: number;
        yearForward?: number;
      }
    | {
        mode: 'year';
        year: number;
        onChange: (year: number) => void;
        yearBack?: number;
        yearForward?: number;
      }
  );

/** ป้ายกลางกว้างคงที่บนจอ ≥sm (รูปร่างไม่เปลี่ยนเมื่อสลับโหมด) · มือถือยืดเต็มแถว */
const LABEL_CLASS = 'min-w-0 flex-1 justify-center font-medium sm:min-w-44 sm:flex-none';

/**
 * ตัวเลื่อนช่วงเวลาตัวเดียวทั้งแอป — `‹ [ป้าย ▾] › วันนี้` · presentational ล้วน ผู้เรียกถือ state เอง
 * (ช่วงของหน้าเก็บใน URL — filter ที่เปลี่ยนแถวต้องอยู่ใน query key)
 *
 * - ป้ายกดได้ทุกโหมด: day/week = `DatePicker` · month = popover ปี + เดือน · year = popover ปี
 *   (ทุกโหมดเป็น bottom sheet บนมือถือผ่าน `ResponsivePopover` — DatePicker ก็ผ่านตัวนี้)
 * - **รูปร่างคงเดิมเมื่อสลับ granularity** (เดือน ⟷ ปี เปลี่ยนแค่ป้าย) — วางคู่ `ViewToggle` ที่รวม
 *   มุมมอง + granularity เป็นตัวเลือกเดียว เช่น [ปฏิทิน | รายการ | ทั้งปี]
 * - year: ‹ › จำกัดช่วงเท่า `YearSelect` (`YEAR_BACK`/`YEAR_FORWARD` หรือ `yearBack`/`yearForward`)
 *   ถึงขอบแล้วปุ่ม disabled
 * - ป้ายทุกโหมดผ่าน `lib/format` (ค.ศ. เสมอ) · ปุ่มทุกตัวขนาด `default` เท่าแถว toolbar
 * - วางเป็น**ตัวแรกของ `toolbarFilters`** (ช่วงเวลา = scope กว้างสุด) · มือถือ DataTable ยืดเต็มแถวให้
 *
 * ```tsx
 * {view === 'year' ? (
 *   <PeriodNavigator mode="year" year={year} onChange={setYear} />
 * ) : (
 *   <PeriodNavigator mode="month" year={year} month={month} onChange={(y, m) => setPeriod(y, m)} />
 * )}
 * ```
 */
export function PeriodNavigator(props: Readonly<PeriodNavigatorProps>) {
  const t = useTranslations('kit.period');
  const locale = useLocale() as AppLocale;

  // ponytail: นาฬิกาเครื่องตอน render — 00:00–07:00 วันที่ 1 ม.ค. server (UTC) กับเบราว์เซอร์ (+07) ได้คนละปี
  // (ปุ่ม ‹ › โหมดปีอาจ aria-disabled ไม่ตรงจนกว่าจะ render ใหม่) · ถ้าต้องแม่นช่วงนั้น ส่งปีจาก server เป็น prop
  const currentYear = new Date().getFullYear();
  const yearRange = props.mode === 'month' || props.mode === 'year' ? props : undefined;
  const yearBack = yearRange?.yearBack ?? YEAR_BACK;
  const yearForward = yearRange?.yearForward ?? YEAR_FORWARD;
  const atMin = props.mode === 'year' && props.year <= currentYear - yearBack;
  const atMax = props.mode === 'year' && props.year >= currentYear + yearForward;
  const weekStartsOn = props.mode === 'week' ? (props.weekStartsOn ?? 1) : 1;

  function step(delta: 1 | -1) {
    switch (props.mode) {
      case 'day':
        if (props.date) props.onChange(addDays(props.date, delta));
        break;
      case 'week':
        props.onChange(addDays(startOfWeek(props.date, { weekStartsOn }), delta * 7));
        break;
      case 'month': {
        const next = stepMonth(props.year, props.month, delta);
        props.onChange(next.year, next.month);
        break;
      }
      case 'year':
        props.onChange(props.year + delta);
        break;
    }
  }

  function goToday() {
    if (props.onToday) {
      props.onToday();
      return;
    }
    const now = new Date();
    switch (props.mode) {
      case 'day':
        props.onChange(startOfDay(now));
        break;
      case 'week':
        props.onChange(startOfWeek(now, { weekStartsOn }));
        break;
      case 'month':
        props.onChange(now.getFullYear(), now.getMonth() + 1);
        break;
      case 'year':
        props.onChange(now.getFullYear());
        break;
    }
  }

  return (
    <div data-slot="period-navigator" className={cn('flex items-center gap-2', props.className)}>
      <IconAction
        variant="outline"
        label={t('prev')}
        className="shrink-0"
        disabled={atMin}
        onClick={() => step(-1)}
      >
        <ChevronLeft aria-hidden="true" />
      </IconAction>

      <PeriodLabel
        {...props}
        locale={locale}
        yearBack={yearBack}
        yearForward={yearForward}
        weekStartsOn={weekStartsOn}
      />

      <IconAction
        variant="outline"
        label={t('next')}
        className="shrink-0"
        disabled={atMax}
        onClick={() => step(1)}
      >
        <ChevronRight aria-hidden="true" />
      </IconAction>
      <Button type="button" variant="outline" className="shrink-0" onClick={goToday}>
        {props.mode === 'year' ? t('thisYear') : t('today')}
      </Button>
    </div>
  );
}

function PeriodLabel(
  props: Readonly<
    PeriodNavigatorProps & {
      locale: AppLocale;
      yearBack: number;
      yearForward: number;
      weekStartsOn: 0 | 1;
    }
  >
) {
  const t = useTranslations('kit.period');
  const { locale, yearBack, yearForward } = props;

  if (props.mode === 'day') {
    return (
      <DatePicker
        value={props.date}
        onSelect={(d) => d && props.onChange(d)}
        disabled={props.disabled}
        formatLabel={(d) => formatLongDate(toDateKey(d), locale)}
        className={LABEL_CLASS}
      />
    );
  }

  if (props.mode === 'week') {
    const start = startOfWeek(props.date, { weekStartsOn: props.weekStartsOn });
    const startKey = toDateKey(start);
    const endKey = toDateKey(addDays(start, 6));
    return (
      <DatePicker
        value={start}
        weekStartsOn={props.weekStartsOn}
        onSelect={(d) => d && props.onChange(startOfWeek(d, { weekStartsOn: props.weekStartsOn }))}
        formatLabel={() => `${formatDate(startKey, locale)} – ${formatDate(endKey, locale)}`}
        // ทั้งสัปดาห์ที่เลือกเป็นแถบจาง ไม่ใช่แค่วันแรก
        modifiers={{ inWeek: (d) => toDateKey(d) >= startKey && toDateKey(d) <= endKey }}
        modifiersClassNames={{ inWeek: 'bg-primary/10' }}
        className={LABEL_CLASS}
      />
    );
  }

  const yearSelect = (onYear: (y: number) => void) => (
    <YearSelect
      aria-label={t('year')}
      className="w-full sm:w-24"
      value={props.year}
      back={yearBack}
      forward={yearForward}
      onChange={onYear}
    />
  );

  if (props.mode === 'year') {
    return (
      <ResponsivePopover
        title={t('select')}
        align="center"
        className="w-auto"
        trigger={
          <Button variant="field" className={cn(LABEL_CLASS, 'tabular-nums')}>
            {props.year}
          </Button>
        }
      >
        {yearSelect(props.onChange)}
      </ResponsivePopover>
    );
  }

  const { year, month, onChange } = props;
  return (
    <ResponsivePopover
      title={t('select')}
      align="center"
      className="w-auto"
      trigger={
        <Button variant="field" className={LABEL_CLASS}>
          {getMonthNames(locale)[month - 1]} {year}
        </Button>
      }
    >
      {/* ลำดับ ปี → เดือน ทุกหน้า */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
        {yearSelect((y) => onChange(y, month))}
        <MonthSelect
          aria-label={t('month')}
          className="w-full sm:w-32"
          value={month}
          onChange={(m) => onChange(year, m)}
        />
      </div>
    </ResponsivePopover>
  );
}
