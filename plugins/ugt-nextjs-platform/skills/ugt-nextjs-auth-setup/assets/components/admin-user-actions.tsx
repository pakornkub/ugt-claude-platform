'use client';
// kit: ugt-nextjs-platform 4.44.0 · ugt-nextjs-auth-setup/components/admin-user-actions.tsx
// kit-hash: 519ba0bffede

// installed by ugt-nextjs-auth-setup — [METHOD: LOCAL]
// ทางเดียวที่บัญชี local ถูกสร้าง — ไม่มีหน้าสมัครสมาชิก
// บัญชี SSO/AD ไม่ต้องเพิ่มที่นี่: เกิดเองตอน login ครั้งแรก (มติ 2026-08-11)
// แล้วค่อยกำหนด role จาก dropdown ในตาราง — ลบไฟล์นี้เมื่อไม่ได้เปิด local login
// ฟอร์ม = react-hook-form + zodResolver + ui/field (DESIGN.md §4) · กฎรหัสผ่าน
// มาจาก lib/password-policy.ts ที่เดียว ห้ามประกาศซ้ำที่นี่

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { IconAction } from '@/components/ui/icon-action';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  passwordSchema,
  PASSWORD_POLICY_HINT,
  setPasswordFormSchema,
} from '@/lib/password-policy';
import { createLocalUserAction, setUserPasswordAction } from '@/lib/actions/admin-users';

const NO_ROLE = '__none__'; // Select ห้าม value="" (ดู ugt-nextjs-pitfalls)
const CREATE_FORM_ID = 'create-local-user-form';
const SET_PASSWORD_FORM_ID = 'set-user-password-form';

const createUserFormSchema = z.object({
  name: z.string().trim().min(1, 'กรอกชื่อผู้ใช้'),
  email: z.string().trim().min(1, 'กรอกอีเมล').email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: passwordSchema,
  roleId: z.string(),
});
type CreateUserValues = z.infer<typeof createUserFormSchema>;

export function CreateUserDialog({
  roles,
}: Readonly<{ roles: { id: string; name: string }[] }>) {
  const [open, setOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: { name: '', email: '', password: '', roleId: NO_ROLE },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await createLocalUserAction({
      name: values.name,
      email: values.email,
      password: values.password,
      roleId: values.roleId === NO_ROLE ? null : values.roleId,
    });
    if (!result.success) {
      // "อีเมลนี้ถูกใช้แล้ว" เป็นความผิดของช่องอีเมลโดยตรง — ชี้ที่ช่องนั้น
      // ที่เหลือ (สิทธิ์/ระบบ) ขึ้นเป็นแบนเนอร์
      if (/อีเมล|email/i.test(result.error)) setError('email', { message: result.error });
      else setError('root', { message: result.error });
      return;
    }
    // รหัสผ่านตั้งต้นนี้ไม่ถูกเก็บไว้ที่ไหนอีก — แจ้งเจ้าตัวแล้วให้เปลี่ยนทันที
    toast.success('สร้างผู้ใช้แล้ว — แจ้งรหัสผ่านตั้งต้นให้เจ้าตัวและให้เปลี่ยนทันที');
    setOpen(false);
    reset();
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" strokeWidth={2} />
        เพิ่มผู้ใช้ local
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <FormDialogContent className="sm:max-w-md">
          <FormDialogHeader>
            <DialogTitle>เพิ่มผู้ใช้ local</DialogTitle>
            <DialogDescription>
              บัญชี SSO/AD ไม่ต้องเพิ่ม — เกิดเองเมื่อเจ้าตัวเข้าสู่ระบบครั้งแรก
              แล้วค่อยกำหนดบทบาทจากตาราง
            </DialogDescription>
          </FormDialogHeader>

          <FormDialogBody>
            <form id={CREATE_FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4">
              {errors.root?.message && <Callout tone="danger">{errors.root.message}</Callout>}

              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="new-user-name">
                  ชื่อ<span className="text-destructive">*</span>
                </FieldLabel>
                <Input id="new-user-name" aria-invalid={!!errors.name} {...register('name')} />
                <FieldError errors={errors.name ? [errors.name] : undefined} />
              </Field>

              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="new-user-email">
                  อีเมล<span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="new-user-email"
                  type="email"
                  autoComplete="off"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
                <FieldError errors={errors.email ? [errors.email] : undefined} />
              </Field>

              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="new-user-password">
                  รหัสผ่านตั้งต้น<span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="new-user-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <FieldDescription>{PASSWORD_POLICY_HINT}</FieldDescription>
                <FieldError errors={errors.password ? [errors.password] : undefined} />
              </Field>

              {/* Select ไม่ใช่ native input — ต้องผ่าน Controller ไม่ใช่ register */}
              <Field>
                <FieldLabel htmlFor="new-user-role">บทบาท</FieldLabel>
                <Controller
                  control={control}
                  name="roleId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="new-user-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_ROLE}>ยังไม่กำหนด</SelectItem>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </form>
          </FormDialogBody>

          <FormDialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" form={CREATE_FORM_ID} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              สร้าง
            </Button>
          </FormDialogFooter>
        </FormDialogContent>
      </Dialog>
    </>
  );
}

/**
 * แอดมินตั้งรหัสผ่านใหม่ให้ผู้ใช้ local — ทางกู้บัญชีที่ใช้ได้แม้ไม่มีระบบอีเมล
 * ทุก session ของผู้ใช้รายนั้นถูกยกเลิกทันทีที่ตั้งสำเร็จ
 */
export function SetPasswordDialog({
  userId,
  userName,
}: Readonly<{ userId: string; userName: string }>) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ password: string }>({
    resolver: zodResolver(setPasswordFormSchema),
    defaultValues: { password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await setUserPasswordAction({ userId, newPassword: values.password });
    if (!result.success) {
      setError('root', { message: result.error });
      return;
    }
    toast.success('ตั้งรหัสผ่านใหม่แล้ว — แจ้งเจ้าตัวและให้เปลี่ยนเองทันทีที่เข้าระบบ');
    setOpen(false);
    reset();
  });

  return (
    <>
      {/* ปุ่มใน row ตาราง = IconAction เสมอ (DESIGN.md §0.4/§4) — tooltip + aria มากับ label */}
      <IconAction label="ตั้งรหัสผ่าน" tone="info" onClick={() => setOpen(true)}>
        <KeyRound className="size-4" strokeWidth={2} />
      </IconAction>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <FormDialogContent height="auto" className="sm:max-w-md">
          <FormDialogHeader>
            <DialogTitle>ตั้งรหัสผ่านใหม่</DialogTitle>
            <DialogDescription>
              {userName} — ทุกอุปกรณ์ที่เขาเข้าระบบค้างไว้จะถูกออกจากระบบทันที
            </DialogDescription>
          </FormDialogHeader>

          <FormDialogBody>
            <form id={SET_PASSWORD_FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4">
              {errors.root?.message && <Callout tone="danger">{errors.root.message}</Callout>}
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="set-password">
                  รหัสผ่านใหม่<span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="set-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <FieldDescription>{PASSWORD_POLICY_HINT}</FieldDescription>
                <FieldError errors={errors.password ? [errors.password] : undefined} />
              </Field>
            </form>
          </FormDialogBody>

          <FormDialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" form={SET_PASSWORD_FORM_ID} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              ตั้งรหัสผ่าน
            </Button>
          </FormDialogFooter>
        </FormDialogContent>
      </Dialog>
    </>
  );
}
