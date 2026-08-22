'use client';
// kit: ugt-nextjs-platform 4.30.0 · ugt-nextjs-auth-setup/components/change-password-dialog.tsx
// kit-hash: ae250c3c9cc8

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
import { changePasswordFormSchema, PASSWORD_POLICY_HINT } from '@/lib/password-policy';
import { changePasswordAction } from '@/lib/actions/password';

const FORM_ID = 'change-password-form';

type Values = { currentPassword: string; password: string; confirmPassword: string };

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
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
    if ('error' in result) {
      // server ตอบได้หลายอย่าง (รหัสเดิมผิด / ไม่ใช่บัญชี local / นโยบายรหัสผ่าน)
      // จึงขึ้นเป็นแบนเนอร์รวม ไม่เดาว่าเป็นความผิดของช่องไหน
      setError('root', { message: result.error });
      return;
    }
    toast.success('เปลี่ยนรหัสผ่านเรียบร้อย อุปกรณ์อื่นที่ค้างไว้ถูกออกจากระบบแล้ว');
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
          <DialogTitle>เปลี่ยนรหัสผ่าน</DialogTitle>
          <DialogDescription>
            หลังเปลี่ยนสำเร็จ อุปกรณ์อื่นที่ยังเข้าระบบค้างไว้จะถูกออกจากระบบทั้งหมด
          </DialogDescription>
        </FormDialogHeader>

        <FormDialogBody>
          {/* ปุ่มอยู่ใน footer นอก <form> — ผูกกลับด้วย form="…" (HTML มาตรฐาน)
              แทนการทำ display:contents ซึ่งพฤติกรรม a11y ยังต่างกันข้ามเบราว์เซอร์ */}
          <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4">
            {errors.root?.message && <Callout tone="danger">{errors.root.message}</Callout>}

            <Field data-invalid={!!errors.currentPassword}>
              <FieldLabel htmlFor="current-password">
                รหัสผ่านปัจจุบัน<span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.currentPassword}
                {...register('currentPassword')}
              />
              <FieldError errors={errors.currentPassword ? [errors.currentPassword] : undefined} />
            </Field>

            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="change-new-password">
                รหัสผ่านใหม่<span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="change-new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <FieldDescription>{PASSWORD_POLICY_HINT}</FieldDescription>
              <FieldError errors={errors.password ? [errors.password] : undefined} />
            </Field>

            <Field data-invalid={!!errors.confirmPassword}>
              <FieldLabel htmlFor="change-confirm-password">
                ยืนยันรหัสผ่านใหม่<span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="change-confirm-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                {...register('confirmPassword')}
              />
              <FieldError errors={errors.confirmPassword ? [errors.confirmPassword] : undefined} />
            </Field>
          </form>
        </FormDialogBody>

        <FormDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            เปลี่ยนรหัสผ่าน
          </Button>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
