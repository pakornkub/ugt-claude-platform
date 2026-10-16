'use client';
// kit: ugt-nextjs-platform 4.82.0 · ugt-nextjs-design-setup/ui/reason-dialog.tsx
// kit-hash: 73034091a749
// source: ugt-hrms components/ui/reason-dialog.tsx (radix-mira era) — re-built on the kit FormDialog by ugt-nextjs-design-setup
// มติ 2026-10-16 B5 (platform docs/backlog.md §14) · DESIGN.md §4 Dialog ladder ("≤ 3 ช่อง ขอเหตุผล")

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { FormDialogBody, FormDialogContent, FormDialogFooter, FormDialogHeader } from '@/components/ui/form-dialog';
import { Textarea } from '@/components/ui/textarea';

export type ReasonDialogItem<Id extends string | number = string> = {
  id: Id;
  /** หัวการ์ดเมื่อหลายรายการอยู่ใน dialog เดียว — รายการเดียวไม่แสดง (ใส่ข้อมูลไว้ใน `description` แทน) */
  title?: React.ReactNode;
  /** บรรทัดรองใต้หัว (วันที่ · ประเภท · …) */
  meta?: React.ReactNode;
};

export type ReasonDialogResult<Id extends string | number = string> = { id: Id; note: string };

type ReasonDialogProps<Id extends string | number> = Readonly<{
  /** `null` = ปิด · array ใหม่ (id ชุดอื่น) = เริ่มช่องว่างใหม่ */
  items: ReasonDialogItem<Id>[] | null;
  title: string;
  description?: React.ReactNode;
  /** ป้ายของช่อง — default `kit.reasonDialog.reasonLabel` ("เหตุผล") */
  label?: string;
  placeholder?: string;
  /** บังคับกรอกหรือไม่ เป็นของแต่ละจุดที่เรียก — ปฏิเสธ/ยกเลิกที่ย้อนไม่ได้มักบังคับ */
  required?: boolean;
  confirmLabel: string;
  /** default `kit.reasonDialog.cancel` */
  cancelLabel?: string;
  /** `destructive` (แดงทึบ — ยืนยันปฏิเสธ/ยกเลิก) · `default` (primary — คำขอที่ไม่ทำลาย เช่น ส่งคำขอยกเลิก) */
  confirmVariant?: 'destructive' | 'default';
  maxLength?: number;
  /** ผู้เรียกปิดเอง (items → null) เมื่อสำเร็จ · error ให้ toast เองแล้วปล่อย dialog ค้าง — ข้อความที่พิมพ์ไม่หาย */
  onConfirm: (results: ReasonDialogResult<Id>[]) => Promise<void>;
  onClose: () => void;
}>;

type GuardState = { dirty: boolean; busy: boolean };

/**
 * Dialog ขอเหตุผลตัวกลาง (ปฏิเสธ · ไม่อนุมัติ · ขอยกเลิก) — ห้ามทำ dialog เหตุผลแยกเองรายหน้า
 *
 * - 1 รายการ = ช่องเดียว · หลายรายการ = การ์ดต่อรายการ (หัว + บรรทัดรอง + ช่อง) เนื้อเลื่อนได้
 * - ช่องบังคับ: ปุ่มยืนยันกดได้เสมอ → กดครั้งแรกแล้วช่องว่างขึ้นแดง + ข้อความใต้ช่อง แล้วตรวจใหม่ทุกครั้ง
 *   ที่พิมพ์ (= `mode: 'onSubmit'` + `reValidateMode: 'onChange'` ของฟอร์มทั้งแอป) — ไม่แดงตั้งแต่เปิด
 * - ระหว่างรอ server ปุ่ม/ช่องล็อก ปิดไม่ได้ · พิมพ์แล้ว Esc/คลิกนอกกรอบไม่ปิด (ไม่ทิ้งข้อความเงียบ ๆ —
 *   ปิดได้ด้วยปุ่มยกเลิก/✕ ที่ตั้งใจกดเท่านั้น)
 * - ปุ่มที่เปิด dialog นี้ (ปฏิเสธ) = `outline` ขอบแดง + `X` · ปุ่มยืนยันข้างใน = `destructive` แดงทึบ
 *   (`assets/ui/button-variants.md`) · footer 3 โซน + ขนาด `cta` มาจาก primitive
 *
 * ```tsx
 * <ReasonDialog
 *   items={rejecting?.map((r) => ({ id: r.id, title: r.requesterName, meta: formatDate(r.date) })) ?? null}
 *   title={t('rejectTitle')}
 *   description={rejecting?.length === 1 ? `${rejecting[0].requesterName} · ${formatDate(rejecting[0].date)}` : undefined}
 *   required
 *   confirmLabel={t('rejectConfirm')}
 *   onConfirm={async (results) => {
 *     const res = await rejectRequests(results);
 *     if ('error' in res) return void toast.error(res.error); // dialog ค้าง
 *     toast.success(t('rejected'));
 *     setRejecting(null);
 *   }}
 *   onClose={() => setRejecting(null)}
 * />
 * ```
 */
export function ReasonDialog<Id extends string | number = string>(props: ReasonDialogProps<Id>) {
  const { items, onClose } = props;
  const guard = React.useRef<GuardState>({ dirty: false, busy: false });
  const report = React.useCallback((state: GuardState) => {
    guard.current = state;
  }, []);
  // คงรายการชุดล่าสุดไว้ระหว่าง animation ปิด (items → null) — ไม่งั้น popup ว่างเปล่าก่อนหายไป
  const [shown, setShown] = React.useState(items);
  if (items && items !== shown) setShown(items);
  const itemsKey = shown ? shown.map((i) => String(i.id)).join(',') : '';
  const single = shown?.length === 1;

  return (
    <Dialog
      open={items !== null}
      onOpenChange={(open, details) => {
        if (open) return;
        const { dirty, busy } = guard.current;
        const dismissal = details.reason === 'outside-press' || details.reason === 'escape-key';
        if (busy || (dirty && dismissal)) {
          details.cancel();
          return;
        }
        onClose();
      }}
    >
      <FormDialogContent className={single ? 'sm:max-w-md' : 'sm:max-w-lg'}>
        {/* key-reset: รายการชุดใหม่เริ่มด้วยช่องว่าง */}
        {shown && <ReasonForm key={itemsKey} {...props} items={shown} report={report} />}
      </FormDialogContent>
    </Dialog>
  );
}

function ReasonForm<Id extends string | number>({
  items,
  title,
  description,
  label,
  placeholder,
  required = false,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'destructive',
  maxLength,
  onConfirm,
  onClose,
  report,
}: ReasonDialogProps<Id> &
  Readonly<{ items: ReasonDialogItem<Id>[]; report: (state: GuardState) => void }>) {
  const t = useTranslations('kit.reasonDialog');
  const baseId = React.useId();
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    report({ dirty: Object.values(notes).some((n) => n.trim() !== ''), busy });
  }, [notes, busy, report]);

  const noteOf = (id: Id) => notes[String(id)] ?? '';
  const missing = (id: Id) => required && submitted && !noteOf(id).trim();
  const single = items.length === 1;

  async function handleConfirm() {
    setSubmitted(true);
    if (required && items.some((i) => !noteOf(i.id).trim())) return;
    setBusy(true);
    try {
      await onConfirm(items.map((i) => ({ id: i.id, note: noteOf(i.id).trim() })));
    } catch (error) {
      // onConfirm ควรดัก error ของตัวเอง (toast + ปล่อยค้าง) — throw ที่หลุดมา = network/bug
      console.error('ReasonDialog onConfirm failed', error); // NOSONAR typescript:S106
      toast.error(t('genericError'));
    } finally {
      setBusy(false);
    }
  }

  const field = (item: ReasonDialogItem<Id>, index: number) => {
    const invalid = missing(item.id);
    const inputId = `${baseId}-${index}`;
    const errorId = `${inputId}-error`;
    return (
      <Field data-invalid={invalid || undefined}>
        <FieldLabel htmlFor={inputId}>
          {label ?? t('reasonLabel')}
          {required && <span className="text-destructive">*</span>}
        </FieldLabel>
        <Textarea
          id={inputId}
          value={noteOf(item.id)}
          onChange={(e) => setNotes((prev) => ({ ...prev, [String(item.id)]: e.target.value }))}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={single ? 3 : 2}
          disabled={busy}
          aria-required={required}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
        />
        {invalid && <FieldError id={errorId}>{t('reasonRequired')}</FieldError>}
      </Field>
    );
  };

  return (
    <>
      <FormDialogHeader>
        <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </FormDialogHeader>

      <FormDialogBody className={single ? undefined : 'flex flex-col gap-3'}>
        {single
          ? field(items[0], 0)
          : items.map((item, index) => (
              <div key={String(item.id)} className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
                {(item.title || item.meta) && (
                  <div className="flex flex-col gap-0.5">
                    {item.title && <div className="text-sm font-medium">{item.title}</div>}
                    {item.meta && <div className="text-xs text-muted-foreground">{item.meta}</div>}
                  </div>
                )}
                {field(item, index)}
              </div>
            ))}
      </FormDialogBody>

      <FormDialogFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          {cancelLabel ?? t('cancel')}
        </Button>
        <Button variant={confirmVariant} onClick={() => void handleConfirm()} disabled={busy}>
          {busy && <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
          {confirmLabel}
        </Button>
      </FormDialogFooter>
    </>
  );
}
