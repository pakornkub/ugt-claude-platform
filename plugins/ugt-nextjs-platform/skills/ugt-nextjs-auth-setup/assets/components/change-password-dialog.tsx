'use client';
// kit: ugt-nextjs-platform 4.47.0 · ugt-nextjs-auth-setup/components/change-password-dialog.tsx
// kit-hash: 5a9771efd502

// installed by ugt-nextjs-auth-setup — [METHOD: LOCAL]
// เปิดจากเมนูโปรไฟล์ใน NavUser และแสดงเฉพาะบัญชี local เท่านั้น
// (บัญชี SSO/LDAP เปลี่ยนรหัสผ่านที่ directory ขององค์กร — ให้กล่องนี้กับเขา
// คือหลอกให้กรอกรหัสผ่านองค์กรลงในแอปที่เปลี่ยนอะไรไม่ได้)
//
// ฟอร์ม = react-hook-form + zodResolver + ui/field ตาม DESIGN.md §4:
// error ราย field อยู่ใต้ช่องนั้น ๆ · error ระดับฟอร์ม (เช่น "รหัสเดิมไม่ถูกต้อง"
// จาก server) เป็น Callout บนสุดของ body ไม่ใช่ toast ที่หายไปก่อนอ่านจบ

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
} from '@/components/ui/form-dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Callout } from '@/components/ui/callout';
import { Input } from '@/components/ui/input';
import {
  changePasswordFormSchema,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from '@/lib/password-policy';
import { useFieldErrorText } from '@/lib/use-field-error';
import { changePasswordAction } from '@/lib/actions/password';

const FORM_ID = 'change-password-form';

type Values = { currentPassword: string; password: string; confirmPassword: string };

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const t = useTranslations('auth.changePassword');
  const tErrors = useTranslations('auth.errors');
  // `passwordPolicy` is a sibling namespace of `errors`, not nested under it —
  // a separate hook call, same pattern as every other namespace in this plan.
  const tPolicy = useTranslations('auth.passwordPolicy');
  const fieldError = useFieldErrorText();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await changePasswordAction({
      currentPassword: values.currentPassword,
      newPassword: values.password,
    });
    if ('code' in result) {
      // server ตอบได้หลายอย่าง (รหัสเดิมผิด / ไม่ใช่บัญชี local / นโยบายรหัสผ่าน)
      // จึงขึ้นเป็นแบนเนอร์รวม ไม่เดาว่าเป็นความผิดของช่องไหน
      setError('root', {
        message: tErrors(result.code as Parameters<typeof tErrors>[0], {
          min: PASSWORD_MIN_LENGTH,
          max: PASSWORD_MAX_LENGTH,
        }),
      });
      return;
    }
    toast.success(t('success'));
    reset();
    onOpenChange(false);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <FormDialogContent height="auto" className="sm:max-w-md">
        <FormDialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </FormDialogHeader>

        <FormDialogBody>
          {/* ปุ่มอยู่ใน footer นอก <form> — ผูกกลับด้วย form="…" (HTML มาตรฐาน)
              แทนการทำ display:contents ซึ่งพฤติกรรม a11y ยังต่างกันข้ามเบราว์เซอร์ */}
          <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4">
            {errors.root?.message && <Callout tone="danger">{errors.root.message}</Callout>}

            <Field data-invalid={!!errors.currentPassword}>
              <FieldLabel htmlFor="current-password">
                {t('currentPasswordLabel')}<span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.currentPassword}
                {...register('currentPassword')}
              />
              <FieldError errors={fieldError(errors.currentPassword)} />
            </Field>

            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="change-new-password">
                {t('newPasswordLabel')}<span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="change-new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <FieldDescription>{tPolicy('hint', { min: PASSWORD_MIN_LENGTH })}</FieldDescription>
              <FieldError
                errors={fieldError(errors.password, {
                  min: PASSWORD_MIN_LENGTH,
                  max: PASSWORD_MAX_LENGTH,
                })}
              />
            </Field>

            <Field data-invalid={!!errors.confirmPassword}>
              <FieldLabel htmlFor="change-confirm-password">
                {t('confirmPasswordLabel')}<span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="change-confirm-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                {...register('confirmPassword')}
              />
              <FieldError errors={fieldError(errors.confirmPassword)} />
            </Field>
          </form>
        </FormDialogBody>

        <FormDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {t('submit')}
          </Button>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
