'use client';
// kit: ugt-nextjs-platform 4.82.0 · ugt-nextjs-design-setup/ui/settings-sheet.tsx
// kit-hash: 0309363a0085
// source: ugt-hrms components/ui/settings-form.tsx + switch-row.tsx + the Sheet sizes/scroll body of its sheet.tsx (radix-mira era)
//   — ported to base-mira Sheet + `field` + react-hook-form `useController` by ugt-nextjs-design-setup
// มติ 2026-10-16 A5 (platform docs/backlog.md §14) · DESIGN.md §4 บันไดเลือกภาชนะฟอร์ม (Sheet = master/ตั้งค่า ≥ 4 ช่อง)

import * as React from 'react';
import { ListChecks, type LucideIcon } from 'lucide-react';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { cn } from '@/lib/utils';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { SheetContent } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

// 2 ขนาดเท่านั้น (มติ A11) · ต้องเขียนเป็น `data-[side=right]:` — class ของ sheet.tsx เป็น
// `data-[side=right]:sm:max-w-sm` (class + attribute) ที่ชนะ `sm:max-w-xl` เปล่า ๆ เสมอ · `w-full` แทน
// `w-3/4` ของ primitive → มือถือเต็มจอ
const SHEET_SIZE = {
  xl: 'data-[side=right]:w-full data-[side=right]:sm:max-w-xl', // 576px — ฟอร์มล้วน
  '5xl': 'data-[side=right]:w-full data-[side=right]:sm:max-w-5xl', // 1024px — มีตารางย่อยในตัว
} as const;

type SettingsSheetContentProps = Omit<
  React.ComponentProps<typeof SheetContent>,
  'side' | 'onSubmit'
> & {
  /** `xl` ฟอร์มล้วน (ค่าเริ่ม) · `5xl` เมื่อมีตาราง/แท็บตารางย่อยในตัว — ไม่มีขนาดอื่น */
  size?: keyof typeof SHEET_SIZE;
  /** submit ของฟอร์ม (`form.handleSubmit(save)`) — header/body/footer อยู่ใน `<form>` เดียวกัน ปุ่มบันทึกจึงเป็น `type="submit"` ได้ตรง ๆ */
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

/**
 * Sheet ฟอร์มตั้งค่า/master — แก้ 1 record ที่มี ≥ 4 ช่อง · ชิดขวา · โครง 3 โซน: `SheetHeader` (title +
 * คำอธิบาย/รหัส) → `SettingsSheetBody` (เลื่อนในตัว) → `SheetFooter` (ติดล่างเสมอเพราะ body เป็นตัวเลื่อน)
 *
 * - **พื้น = พื้นของ `sheet.tsx`** (popover surface ตาม plugin) — ห้ามใส่ `bg-*` ทับที่นี่หรือที่ call site
 * - footer: switch "เปิดใช้งาน" (ถ้ามี) ชิดซ้าย · ยกเลิก (`outline`) → บันทึก (`type="submit"`, primary
 *   `default`) ชิดขวา — ปุ่มได้ขนาด `cta` จาก primitive edit ของ `SheetFooter` · primary ปุ่มเดียว
 * - ฟอร์ม dirty ปิดด้วย Esc/คลิกนอก ต้องถามก่อน (DESIGN.md §4)
 *
 * ```tsx
 * <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
 *   <SettingsSheetContent onSubmit={form.handleSubmit(save)}>
 *     <SheetHeader>
 *       <SheetTitle>{t('editTitle')}</SheetTitle>
 *       <SheetDescription>{editing?.code}</SheetDescription>
 *     </SheetHeader>
 *     <SettingsSheetBody>
 *       <SettingsSection icon={SlidersHorizontal} title={t('secRules')} description={t('secRulesDesc')}>
 *         <SettingsNumberField control={form.control} name="advanceDays" label={t('advance')}
 *           hint={t('advanceHint')} suffix={t('days')} placeholder={t('noLimit')} />
 *         <SettingsSwitchField control={form.control} name="allowHalf" label={t('half')} hint={t('halfHint')} />
 *         <SettingsRuleSummary title={t('summary')}><li>{summaryLine}</li></SettingsRuleSummary>
 *       </SettingsSection>
 *     </SettingsSheetBody>
 *     <SheetFooter className="items-center justify-between">
 *       <Label>…<Switch … />{t('active')}</Label>   // ซ้าย (ถ้ามี) — ผูกผ่าน Controller
 *       <div className="flex gap-2">
 *         <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t('cancel')}</Button>
 *         <Button type="submit" disabled={form.formState.isSubmitting}>{t('save')}</Button>
 *       </div>
 *     </SheetFooter>
 *   </SettingsSheetContent>
 * </Sheet>
 * ```
 */
export function SettingsSheetContent({
  size = 'xl',
  onSubmit,
  className,
  children,
  ...props
}: Readonly<SettingsSheetContentProps>) {
  return (
    <SheetContent side="right" className={cn(SHEET_SIZE[size], className)} {...props}>
      <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        {children}
      </form>
    </SheetContent>
  );
}

/** body ของ Sheet ฟอร์ม — กินที่ที่เหลือ + เลื่อนในตัว · section เรียงห่าง `gap-6` */
export function SettingsSheetBody({ className, ...props }: Readonly<React.ComponentProps<'div'>>) {
  return (
    <div
      data-slot="settings-sheet-body"
      className={cn('flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6', className)}
      {...props}
    />
  );
}

/**
 * หนึ่งกลุ่มของการตั้งค่า — icon tile `size-8` พื้น primary/10 + หัวข้อ + คำอธิบายบรรทัดเดียว · คั่นด้วย
 * เส้นล่าง (ตัวสุดท้ายไม่มี) · เนื้อหา grid 1 คอลัมน์ → 2 คอลัมน์ตั้งแต่ `sm` (switch/สรุปกฎเต็มแถวเอง)
 */
export function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: Readonly<{ icon: LucideIcon; title: string; description: string; children: React.ReactNode }>) {
  return (
    <section
      data-slot="settings-section"
      className="flex flex-col gap-4 border-b pb-6 last:border-b-0 last:pb-0"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

interface SettingsNumberFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  /** helper ที่มองเห็นใต้ช่องเสมอ — ไม่ใช่ tooltip ⓘ (มือถือ hover ไม่ได้) */
  hint: string;
  /** หน่วยท้ายช่อง ("วัน", "ครั้ง", "ชม.") — ไม่ใส่หน่วยใน label */
  suffix: string;
  /** "ว่าง = ไม่มีกำหนด" สื่อด้วย placeholder ("ไม่จำกัด") ไม่ใช่เลข 0 */
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  disabled?: boolean;
  /** ข้อความแทนตัวเลขตอนช่องถูกล็อกด้วย switch อื่น (เช่น "ตามอายุงาน") — ช่องไม่หาย แต่อ่านอย่างเดียว */
  lockedText?: string;
  /** คอลัมน์ NOT NULL ที่ 0 = ไม่จำกัด: ช่องว่างเก็บเป็น 0 และ 0 แสดงเป็นช่องว่าง */
  blankIsZero?: boolean;
}

/** ช่องตัวเลข + หน่วย suffix + helper · ช่องว่าง = `null` (หรือ `0` เมื่อ `blankIsZero`) · error ใต้ช่องจาก zod */
export function SettingsNumberField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  suffix,
  placeholder,
  min = 0,
  max,
  step,
  required,
  disabled,
  lockedText,
  blankIsZero,
}: Readonly<SettingsNumberFieldProps<T>>) {
  const { field, fieldState } = useController({ control, name });
  const id = React.useId();

  let shown = '';
  if (lockedText) shown = lockedText;
  else if (field.value != null && !(blankIsZero && field.value === 0)) shown = String(field.value);

  return (
    <Field data-invalid={fieldState.invalid || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </FieldLabel>
      <InputGroup data-disabled={disabled || undefined}>
        <InputGroupInput
          id={id}
          ref={field.ref}
          name={field.name}
          onBlur={field.onBlur}
          type={lockedText ? 'text' : 'number'}
          inputMode={step !== undefined && step % 1 !== 0 ? 'decimal' : 'numeric'}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          readOnly={lockedText !== undefined}
          placeholder={placeholder}
          aria-invalid={fieldState.invalid || undefined}
          value={shown}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '') field.onChange(blankIsZero ? 0 : null);
            else field.onChange(Number(v));
          }}
        />
        {!lockedText && (
          <InputGroupAddon align="inline-end">
            <InputGroupText>{suffix}</InputGroupText>
          </InputGroupAddon>
        )}
      </InputGroup>
      <FieldDescription>{hint}</FieldDescription>
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}

interface SettingsSwitchRowProps {
  /** id ของ switch — ไม่ส่งจะ gen ให้ (label ผูก `htmlFor` เสมอ) */
  id?: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * แถว switch มาตรฐาน — label + คำอธิบายซ้าย · `Switch` ขวา ในกรอบ border · ใช้ได้นอกฟอร์ม rhf ด้วย
 * (ในฟอร์มใช้ `SettingsSwitchField`) · หน่วยที่ "เลือกได้เสมอ" แสดงเป็น switch ติด + `disabled` ให้เห็นครบชุด
 */
export function SettingsSwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: Readonly<SettingsSwitchRowProps>) {
  const autoId = React.useId();
  const switchId = id ?? autoId;
  const descriptionId = `${switchId}-description`;
  return (
    <div
      data-slot="settings-switch-row"
      className={cn('flex items-center justify-between gap-4 rounded-lg border p-4', className)}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor={switchId}>{label}</Label>
        {description && (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <Switch
        id={switchId}
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next)}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
      />
    </div>
  );
}

/** `SettingsSwitchRow` ผูก react-hook-form · กินเต็มแถวของ grid ใน section */
export function SettingsSwitchField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  disabled,
  onChanged,
}: Readonly<{
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  hint: string;
  disabled?: boolean;
  /** หลังเปลี่ยนค่า — เช่น ล็อก/ปลดช่องอื่นที่ขึ้นกับ switch นี้ */
  onChanged?: (checked: boolean) => void;
}>) {
  const { field } = useController({ control, name });
  return (
    <SettingsSwitchRow
      className="sm:col-span-2"
      label={label}
      description={hint}
      checked={Boolean(field.value)}
      disabled={disabled}
      onCheckedChange={(checked) => {
        field.onChange(checked);
        onChanged?.(checked);
      }}
    />
  );
}

/**
 * กล่อง "สรุปกฎ" แบบสด ท้าย section ที่หลายช่องรวมกันเป็นกฎเดียว — children = `<li>` ที่ผู้เรียกคำนวณด้วย
 * **pure function ตัวเดียวกับ server** (ห้ามเขียนสูตรซ้ำใน UI) · วันที่ในประโยคผ่าน `lib/format`
 */
export function SettingsRuleSummary({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div
      data-slot="settings-rule-summary"
      className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs sm:col-span-2"
    >
      <p className="mb-1 flex items-center gap-1.5 font-medium text-primary">
        <ListChecks className="size-3.5" strokeWidth={2} aria-hidden="true" />
        {title}
      </p>
      <ul className="list-disc space-y-0.5 pl-5 text-foreground">{children}</ul>
    </div>
  );
}
