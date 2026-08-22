'use client';
// kit: ugt-nextjs-platform 4.30.0 · ugt-nextjs-auth-setup/components/reset-password-form.tsx
// kit-hash: 9e757fc2de9e

// installed by ugt-nextjs-auth-setup — [METHOD: LOCAL]
// ปลายทางของลิงก์ในอีเมล: app/(auth)/reset-password/page.tsx ส่ง token จาก
// searchParams เข้ามา (ดู SKILL.md §5.5)
// ฟอร์ม = react-hook-form + zodResolver + ui/field (DESIGN.md §4) · schema
// เดียวกับที่ server ใช้ ผู้ใช้จึงเห็นข้อความเดียวกันทั้งสองฝั่ง

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Callout } from '@/components/ui/callout';
import { Input } from '@/components/ui/input';
import { newPasswordSchema, PASSWORD_POLICY_HINT } from '@/lib/password-policy';
import { resetPasswordAction } from '@/lib/actions/password';

type Values = { password: string; confirmPassword: string };

export function ResetPasswordForm({ token }: Readonly<{ token: string }>) {
  const router = useRouter();
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
    const result = await resetPasswordAction({ token, password: values.password });
    if ('error' in result) {
      // ลิงก์หมดอายุ/ถูกใช้ไปแล้ว = ปัญหาของทั้งฟอร์ม ไม่ใช่ของช่องใดช่องหนึ่ง
      setError('root', { message: result.error });
      return;
    }
    toast.success('ตั้งรหัสผ่านใหม่เรียบร้อย กรุณาเข้าสู่ระบบอีกครั้ง');
    router.push('/login');
  });

  // ลิงก์ที่ถูกตัด/แก้ระหว่างทาง — บอกตั้งแต่ยังไม่ให้กรอก ดีกว่าให้ตั้งรหัสเสร็จแล้วค่อยพัง
  if (!token) {
    return (
      <div className="flex flex-col gap-4 text-sm">
        <Callout tone="danger">ลิงก์นี้ไม่ถูกต้องหรือไม่สมบูรณ์ กรุณาขอลิงก์ใหม่จากหน้าเข้าสู่ระบบ</Callout>
        <Button render={<Link href="/login" />}>กลับไปหน้าเข้าสู่ระบบ</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {errors.root?.message && <Callout tone="danger">{errors.root.message}</Callout>}

      <Field data-invalid={!!errors.password}>
        <FieldLabel htmlFor="new-password">
          รหัสผ่านใหม่<span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        <FieldDescription>{PASSWORD_POLICY_HINT}</FieldDescription>
        <FieldError errors={errors.password ? [errors.password] : undefined} />
      </Field>

      <Field data-invalid={!!errors.confirmPassword}>
        <FieldLabel htmlFor="confirm-password">
          ยืนยันรหัสผ่านใหม่<span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
        <FieldError errors={errors.confirmPassword ? [errors.confirmPassword] : undefined} />
      </Field>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        ตั้งรหัสผ่านใหม่
      </Button>
    </form>
  );
}
