'use client';
// kit: ugt-nextjs-platform 4.82.0 · ugt-nextjs-design-setup/ui/time-input.tsx
// kit-hash: 4378d8164c92
// source: ugt-hrms components/ui/time-input.tsx (radix-mira era) — on the base-mira Input by ugt-nextjs-design-setup
// มติ 2026-10-16 B7 (platform docs/backlog.md §14) · DESIGN.md §4

import * as React from 'react';

import { Input } from '@/components/ui/input';

// ช่องกรอกเวลา "HH:MM" 24 ชม. — ใช้แทน <input type="time"> ทุกที่. ไม่ใช้ native เพราะ picker ของ
// เบราว์เซอร์แสดงตามภาษาเครื่อง (AM/PM บนเครื่อง en-US) มี spinner ของตัวเอง และบางเบราว์เซอร์/บางค่า
// โชว์ช่องวินาทีที่ไม่มีใครขอ — ผู้ทดสอบอ่านว่า "เวลาผิด" (hrms มติ 2026-09-17 จาก feedback HR)
// สัญญาค่าหลัง blur: "" · "HH:MM" ที่ถูกต้อง · หรือข้อความเกินช่วงที่ผู้ใช้พิมพ์ (schema ฟ้องด้วย TIME_PATTERN)

/** ค่าที่ถูกต้องหลัง blur — ใช้ใน schema: `z.string().regex(TIME_PATTERN)` (ช่องไม่บังคับ: `.or(z.literal(''))`) */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** ที่พิมพ์ → ค่าที่แสดงระหว่างพิมพ์: "0817" → "08:17" · "9:" / "9." → "09:" · "915" → "09:15"
 *  (ตัวแรก 3–9 เป็นชั่วโมงหลักเดียวได้อย่างเดียว) · ":" / "." ที่พิมพ์เองแปลว่าจบชั่วโมงแล้ว */
export function maskTimeInput(raw: string): string {
  const sep = raw.search(/[:.]/);
  if (sep >= 0) {
    const hours = raw.slice(0, sep).replaceAll(/\D/g, '').slice(-2);
    const minutes = raw.slice(sep + 1).replaceAll(/\D/g, '').slice(0, 2);
    return hours ? `${hours.padStart(2, '0')}:${minutes}` : minutes;
  }
  let digits = raw.replaceAll(/\D/g, '').slice(0, 4);
  if (/^[3-9]/.test(digits)) digits = `0${digits}`.slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** ตอน blur: เติมศูนย์ → "HH:MM" หรือ "" เมื่อไม่ได้พิมพ์อะไร ("8" → "08:00", "12:3" → "12:03")
 *  ค่าเกินช่วง ("24:00", "08:60") **คงไว้ตามที่พิมพ์** ให้ schema (`TIME_PATTERN`) ฟ้อง — ห้าม clamp
 *  เงียบ ๆ เป็นเวลาอื่น (เดิม "99:99" → "23:59" บันทึกเวลาผิดโดยไม่มีใครรู้) */
export function normalizeTimeInput(raw: string): string {
  const masked = maskTimeInput(raw);
  if (!masked) return '';
  const [h, m = ''] = masked.split(':');
  const value = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  return TIME_PATTERN.test(value) ? value : masked;
}

/**
 * ช่องเวลา `HH:MM` — ช่องพิมพ์ธรรมดาที่ mask ระหว่างพิมพ์แล้ว normalize ตอน blur · มือถือได้แป้นตัวเลข
 * (`inputMode="numeric"`) · ใช้กับ react-hook-form ได้ทั้ง `register` และ `Controller`, หรือ
 * `value`/`onChange` ธรรมดา — ทุกแบบอ่าน `e.target.value` ที่ถูก mask แล้วจากที่เดิม
 *
 * placeholder `HH:MM` ไม่แปล โดยตั้งใจ — เป็นรูปแบบค่า ไม่ใช่ข้อความ (ส่ง `placeholder` ทับได้)
 *
 * ```tsx
 * <Field>
 *   <FieldLabel htmlFor="start">{t('startTime')}</FieldLabel>
 *   <TimeInput id="start" {...form.register('startTime')} />
 * </Field>
 * ```
 */
export function TimeInput({
  onChange,
  onBlur,
  placeholder = 'HH:MM',
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={5}
      placeholder={placeholder}
      className={className}
      onChange={(e) => {
        e.target.value = maskTimeInput(e.target.value);
        onChange?.(e);
      }}
      onBlur={(e) => {
        e.target.value = normalizeTimeInput(e.target.value);
        // ดันค่าที่ normalize แล้วเข้า form state ก่อน — onBlur ของ RHF validate ทันที
        // และต้องเห็น "08:00" ไม่ใช่ "8" ที่พิมพ์ค้างไว้
        onChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>);
        onBlur?.(e);
      }}
    />
  );
}
