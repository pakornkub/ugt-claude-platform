'use client';
// kit: ugt-nextjs-platform 4.47.0 · ugt-nextjs-auth-setup/components/admin-user-actions.tsx
// kit-hash: 61ea21224cca

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
import { useTranslations } from 'next-intl';
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
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  setPasswordFormSchema,
} from '@/lib/password-policy';
import { useFieldErrorText } from '@/lib/use-field-error';
import { createLocalUserAction, setUserPasswordAction } from '@/lib/actions/admin-users';

const NO_ROLE = '__none__'; // Select ห้าม value="" (ดู ugt-nextjs-pitfalls)
const CREATE_FORM_ID = 'create-local-user-form';
const SET_PASSWORD_FORM_ID = 'set-user-password-form';

const createUserFormSchema = z.object({
  name: z.string().trim().min(1, 'USER_NAME_REQUIRED'),
  email: z.string().trim().min(1, 'EMAIL_REQUIRED').email('EMAIL_INVALID'),
  password: passwordSchema,
  roleId: z.string(),
});
type CreateUserValues = z.infer<typeof createUserFormSchema>;

export function CreateUserDialog({
  roles,
}: Readonly<{ roles: { id: string; name: string }[] }>) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('auth.errors');
  const tAdmin = useTranslations('auth.adminUserActions');
  // `passwordPolicy` is a sibling namespace of `errors`, not nested under it —
  // a separate hook call, same pattern as every other namespace in this plan.
  const tPolicy = useTranslations('auth.passwordPolicy');
  const fieldError = useFieldErrorText();
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
      // ชี้ที่ช่องจริงจาก field ที่ server ส่งกลับมา (จาก path ของ zod issue) —
      // ไม่ใช่การเดาจากข้อความที่แปลแล้ว (เคย regex /อีเมล|email/i ใส่ result.error
      // ซึ่งพังทันทีที่ข้อความเปลี่ยนภาษาหรือเปลี่ยนคำ)
      const text = t(result.code as Parameters<typeof t>[0], {
        min: PASSWORD_MIN_LENGTH,
        max: PASSWORD_MAX_LENGTH,
      });
      if (result.field === 'email') setError('email', { message: text });
      else if (result.field === 'name') setError('name', { message: text });
      else setError('root', { message: text });
      return;
    }
    // รหัสผ่านตั้งต้นนี้ไม่ถูกเก็บไว้ที่ไหนอีก — แจ้งเจ้าตัวแล้วให้เปลี่ยนทันที
    toast.success(tAdmin('createSuccess'));
    setOpen(false);
    reset();
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" strokeWidth={2} />
        {tAdmin('addLocalUser')}
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
            <DialogTitle>{tAdmin('addLocalUser')}</DialogTitle>
            <DialogDescription>
              {tAdmin('addUserHintSso')} {tAdmin('addUserHintRole')}
            </DialogDescription>
          </FormDialogHeader>

          <FormDialogBody>
            <form id={CREATE_FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4">
              {errors.root?.message && <Callout tone="danger">{errors.root.message}</Callout>}

              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="new-user-name">
                  {tAdmin('nameLabel')}<span className="text-destructive">*</span>
                </FieldLabel>
                <Input id="new-user-name" aria-invalid={!!errors.name} {...register('name')} />
                <FieldError errors={fieldError(errors.name)} />
              </Field>

              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="new-user-email">
                  {tAdmin('emailLabel')}<span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="new-user-email"
                  type="email"
                  autoComplete="off"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
                <FieldError errors={fieldError(errors.email)} />
              </Field>

              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="new-user-password">
                  {tAdmin('initialPasswordLabel')}<span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="new-user-password"
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

              {/* Select ไม่ใช่ native input — ต้องผ่าน Controller ไม่ใช่ register */}
              <Field>
                <FieldLabel htmlFor="new-user-role">{tAdmin('roleLabel')}</FieldLabel>
                <Controller
                  control={control}
                  name="roleId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="new-user-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_ROLE}>{tAdmin('noRoleOption')}</SelectItem>
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
              {tAdmin('cancel')}
            </Button>
            <Button type="submit" form={CREATE_FORM_ID} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {tAdmin('createSubmit')}
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
  const t = useTranslations('auth.errors');
  const tAdmin = useTranslations('auth.adminUserActions');
  const tPolicy = useTranslations('auth.passwordPolicy');
  const fieldError = useFieldErrorText();
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
      setError('root', {
        message: t(result.code as Parameters<typeof t>[0], {
          min: PASSWORD_MIN_LENGTH,
          max: PASSWORD_MAX_LENGTH,
        }),
      });
      return;
    }
    toast.success(tAdmin('setPasswordSuccess'));
    setOpen(false);
    reset();
  });

  return (
    <>
      {/* ปุ่มใน row ตาราง = IconAction เสมอ (DESIGN.md §0.4/§4) — tooltip + aria มากับ label */}
      <IconAction label={tAdmin('setPasswordAction')} tone="info" onClick={() => setOpen(true)}>
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
            <DialogTitle>{tAdmin('setPasswordTitle')}</DialogTitle>
            <DialogDescription>
              {tAdmin('setPasswordDescription', { userName })}
            </DialogDescription>
          </FormDialogHeader>

          <FormDialogBody>
            <form id={SET_PASSWORD_FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4">
              {errors.root?.message && <Callout tone="danger">{errors.root.message}</Callout>}
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="set-password">
                  {tAdmin('newPasswordLabel')}<span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="set-password"
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
            </form>
          </FormDialogBody>

          <FormDialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tAdmin('cancel')}
            </Button>
            <Button type="submit" form={SET_PASSWORD_FORM_ID} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {tAdmin('setPasswordSubmit')}
            </Button>
          </FormDialogFooter>
        </FormDialogContent>
      </Dialog>
    </>
  );
}
