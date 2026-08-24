'use client';
// kit: ugt-nextjs-platform 4.47.0 · ugt-nextjs-auth-setup/components/reset-password-form.tsx
// kit-hash: aaea566a235c

// installed by ugt-nextjs-auth-setup — [METHOD: LOCAL]
// ปลายทางของลิงก์ในอีเมล: app/(auth)/reset-password/page.tsx ส่ง token จาก
// searchParams เข้ามา (ดู SKILL.md §5.5)
// ฟอร์ม = react-hook-form + zodResolver + ui/field (DESIGN.md §4) · schema
// เดียวกับที่ server ใช้ ผู้ใช้จึงเห็นข้อความเดียวกันทั้งสองฝั่ง

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Callout } from '@/components/ui/callout';
import { Input } from '@/components/ui/input';
import { newPasswordSchema, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '@/lib/password-policy';
import { useFieldErrorText } from '@/lib/use-field-error';
import { resetPasswordAction } from '@/lib/actions/password';

type Values = { password: string; confirmPassword: string };

export function ResetPasswordForm({ token }: Readonly<{ token: string | undefined }>) {
  const router = useRouter();
  const t = useTranslations('auth.resetPassword');
  const tErrors = useTranslations('auth.errors');
  const tPolicy = useTranslations('auth.passwordPolicy');
  const fieldError = useFieldErrorText();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await resetPasswordAction({ token: token!, password: values.password });
    if ('code' in result) {
      // ลิงก์หมดอายุ/ถูกใช้ไปแล้ว = ปัญหาของทั้งฟอร์ม ไม่ใช่ของช่องใดช่องหนึ่ง
      setError('root', {
        message: tErrors(result.code as Parameters<typeof tErrors>[0], {
          min: PASSWORD_MIN_LENGTH,
          max: PASSWORD_MAX_LENGTH,
        }),
      });
      return;
    }
    toast.success(t('success'));
    router.push('/login');
  });

  // ลิงก์ที่ถูกตัด/แก้ระหว่างทาง — บอกตั้งแต่ยังไม่ให้กรอก ดีกว่าให้ตั้งรหัสเสร็จแล้วค่อยพัง
  if (!token) {
    return (
      <div className="flex flex-col gap-4 text-sm">
        <Callout tone="danger">{t('invalidLink')}</Callout>
        <Button render={<Link href="/login" />}>{t('backToLogin')}</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {errors.root?.message && <Callout tone="danger">{errors.root.message}</Callout>}

      <Field data-invalid={!!errors.password}>
        <FieldLabel htmlFor="new-password">
          {t('newPasswordLabel')}<span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="new-password"
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
        <FieldLabel htmlFor="confirm-password">
          {t('confirmPasswordLabel')}<span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
        <FieldError errors={fieldError(errors.confirmPassword)} />
      </Field>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {t('submit')}
      </Button>
    </form>
  );
}
