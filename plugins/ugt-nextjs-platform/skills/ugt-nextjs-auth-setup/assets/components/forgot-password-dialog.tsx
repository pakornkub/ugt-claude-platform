'use client';
// kit: ugt-nextjs-platform 4.46.1 · ugt-nextjs-auth-setup/components/forgot-password-dialog.tsx
// kit-hash: f2de33ee7cb3

// installed by ugt-nextjs-auth-setup — [METHOD: LOCAL] + ต้องมี ugt-nextjs-mail-setup
// เป็น dialog ไม่ใช่หน้าใหม่ — flow นี้มีช่องเดียวและจบในตัว ไม่คุ้มกับอีกหนึ่ง route
// ลบไฟล์นี้พร้อมลิงก์ใน login-form.tsx เมื่อไม่ได้ติดตั้ง mail (ลิงก์ที่ส่งไม่ถึงใคร
// แย่กว่าไม่มีปุ่มให้กด)
// ฟอร์ม = react-hook-form + zodResolver + ui/field (DESIGN.md §4)

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
} from '@/components/ui/form-dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Callout } from '@/components/ui/callout';
import { Input } from '@/components/ui/input';
import { forgotPasswordAction } from '@/lib/actions/password';
import { useFieldErrorText } from '@/lib/use-field-error';

const FORM_ID = 'forgot-password-form';

// ช่องเดียว จึงประกาศ schema ไว้ข้างฟอร์ม — กฎรหัสผ่านที่ใช้ร่วมกันหลายหน้าอยู่ที่
// lib/password-policy.ts ตามเดิม (ที่นี่ไม่มีรหัสผ่านให้ตรวจ) · โค้ด EMAIL_REQUIRED/
// EMAIL_INVALID มาจาก auth.errors ชุดเดียวกับฟอร์ม login — ไม่สร้างคีย์ใหม่
const forgotPasswordFormSchema = z.object({
  email: z.string().min(1, 'EMAIL_REQUIRED').email('EMAIL_INVALID'),
});
type Values = z.infer<typeof forgotPasswordFormSchema>;

export function ForgotPasswordDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const [sent, setSent] = useState(false);
  const t = useTranslations('auth.forgotPassword');
  const tErrors = useTranslations('auth.errors');
  const fieldError = useFieldErrorText();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await forgotPasswordAction({ email: values.email });
    if ('code' in result) {
      setError('root', { message: tErrors(result.code as Parameters<typeof tErrors>[0]) });
      return;
    }
    // ข้อความยืนยันไม่บอกว่าอีเมลนี้มีอยู่จริงหรือไม่ — ถ้าบอก หน้านี้จะกลายเป็น
    // เครื่องมือไล่เช็คว่าใครเป็นผู้ใช้ของระบบ
    setSent(true);
  });

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setSent(false);
      reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <FormDialogContent height="auto" className="sm:max-w-md">
        <FormDialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </FormDialogHeader>

        {sent ? (
          <>
            <FormDialogBody>
              {/* กล่องแจ้งมาตรฐาน = Callout (DESIGN.md §6) — ไม่ทำกล่อง border เอง */}
              <Callout tone="success" icon={MailCheck}>
                {t('sentMessage')} {t('sentHint')}
              </Callout>
            </FormDialogBody>
            <FormDialogFooter>
              <Button onClick={() => handleOpenChange(false)}>{t('close')}</Button>
            </FormDialogFooter>
          </>
        ) : (
          <>
            <FormDialogBody>
              <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4">
                {errors.root?.message && <Callout tone="danger">{errors.root.message}</Callout>}
                <Field data-invalid={!!errors.email}>
                  <FieldLabel htmlFor="forgot-email">
                    {t('emailLabel')}<span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    {...register('email')}
                  />
                  <FieldError errors={fieldError(errors.email)} />
                </Field>
              </form>
            </FormDialogBody>
            <FormDialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {t('submit')}
              </Button>
            </FormDialogFooter>
          </>
        )}
      </FormDialogContent>
    </Dialog>
  );
}
