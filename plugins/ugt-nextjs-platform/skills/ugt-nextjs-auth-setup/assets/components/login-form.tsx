'use client';
// kit: ugt-nextjs-platform 4.49.1 · ugt-nextjs-auth-setup/components/login-form.tsx
// kit-hash: df78cc30fd77

// components/login-form.tsx — login form supporting all 3 org methods.
// DELETE the sections marked [METHOD: …] that were not selected during the interview:
//   - SSO only (default): keep SsoSection, delete LdapSection/LocalSection + Tabs block
//   - SSO + one form method: replace the Tabs block with the single remaining section
//   - No SSO: delete SsoSection + the "or" separator
// Requires shadcn primitives: button, input, tabs, field — and sonner for toasts.
// [METHOD: LOCAL + mail] also `dialog` (ForgotPasswordDialog mounts one).
//
// ฟอร์ม = react-hook-form + zodResolver + ui/field (DESIGN.md §4) · error ของการ
// เข้าสู่ระบบเป็น Callout ค้างบนฟอร์ม ไม่ใช่ toast (§6: error ระดับหน้า = banner) —
// toast หายไปก่อนผู้ใช้อ่านจบ และหน้า login คือที่ที่คนอ่านข้อความผิดพลาดจริง ๆ
// หมายเหตุ: ฟอร์ม login ตรวจแค่ "กรอกครบไหม" ห้ามผูก password-policy ที่นี่ —
// รหัสผ่านเดิมที่ตั้งไว้ก่อนนโยบายปัจจุบันต้องยังเข้าระบบได้

import { useState } from 'react';
import { useForm } from 'react-hook-form'; // [METHOD: LDAP|LOCAL]
import { zodResolver } from '@hookform/resolvers/zod'; // [METHOD: LDAP|LOCAL]
import { z } from 'zod'; // [METHOD: LDAP|LOCAL]
import { useRouter } from 'next/navigation'; // [METHOD: LDAP|LOCAL]
import { useTranslations } from 'next-intl'; // [METHOD: LDAP|LOCAL]
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // [METHOD: LDAP|LOCAL]
import { Field, FieldError, FieldLabel } from '@/components/ui/field'; // [METHOD: LDAP|LOCAL]
import { Callout } from '@/components/ui/callout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // [METHOD: LDAP|LOCAL]
import { Loader2, Building2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client'; // [METHOD: SSO]
import { useFieldErrorText } from '@/lib/use-field-error'; // [METHOD: LDAP|LOCAL]
// [METHOD: LDAP|LOCAL] — delete this import when neither form method is enabled;
// with a single form method, keep only that method's action.
import { ldapLoginAction, localLoginAction } from '@/lib/actions/auth';
// [METHOD: LOCAL] — ต้องมี ugt-nextjs-mail-setup ด้วย; ลบพร้อมลิงก์ "ลืมรหัสผ่าน?"
import { ForgotPasswordDialog } from '@/components/forgot-password-dialog';

// ─── [METHOD: SSO] SSO (Keycloak) ────────────────────────────────────────────

function SsoSection() {
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('auth.login');

  async function handleSsoLogin() {
    setIsLoading(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
      // better-auth 1.7 folded generic OAuth into the core social sign-in path —
      // signIn.social({ provider: 'keycloak' }) replaces the removed
      // signIn.oauth2({ providerId: 'keycloak' }).
      const { error } = await authClient.signIn.social({
        provider: 'keycloak',
        callbackURL: `${basePath}/`,
      });
      if (error) throw error;
      // success → browser redirects to Keycloak; keep spinner spinning
    } catch {
      // redirect didn't happen (Keycloak unreachable / config error / network) —
      // reset state so the button is clickable again without a page refresh
      toast.error(t('ssoConnectFailed'));
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-balance text-muted-foreground">
        {t('ssoTitle')}
      </p>
      <Button className="w-full" onClick={handleSsoLogin} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t('ssoConnecting')}
          </>
        ) : (
          <>
            <Building2 className="size-4" />
            {t('ssoSubmit')}
          </>
        )}
      </Button>
    </div>
  );
}

// ─── [METHOD: LDAP] AD / LDAP username + password ────────────────────────────

const ldapLoginSchema = z.object({
  username: z.string().trim().min(1, 'AD_USERNAME_REQUIRED'),
  password: z.string().min(1, 'PASSWORD_REQUIRED'),
});
type LdapValues = z.infer<typeof ldapLoginSchema>;

function LdapSection() {
  const router = useRouter();
  const t = useTranslations('auth.login');
  const tErrors = useTranslations('auth.errors');
  const fieldError = useFieldErrorText();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LdapValues>({
    resolver: zodResolver(ldapLoginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await ldapLoginAction(values);
    if (result?.code) {
      // ไม่ชี้ว่าช่องไหนผิด — บอกว่า "username หรือรหัสผ่านไม่ถูกต้อง" ช่องใดช่องหนึ่ง
      // คือการยืนยันให้คนเดาว่ามี username นี้อยู่จริง
      setError('root', { message: tErrors(result.code as Parameters<typeof tErrors>[0]) });
      return;
    }
    router.push('/'); // Next.js is basePath-aware here
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {errors.root?.message && <Callout tone="danger">{errors.root.message}</Callout>}
      <Field data-invalid={!!errors.username}>
        <FieldLabel htmlFor="ldap-username">
          {t('adUsernameLabel')}<span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="ldap-username"
          autoComplete="username"
          aria-invalid={!!errors.username}
          {...register('username')}
        />
        <FieldError errors={fieldError(errors.username)} />
      </Field>
      <Field data-invalid={!!errors.password}>
        <FieldLabel htmlFor="ldap-password">
          {t('passwordLabel')}<span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="ldap-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        <FieldError errors={fieldError(errors.password)} />
      </Field>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {t('submit')}
      </Button>
    </form>
  );
}

// ─── [METHOD: LOCAL] Local email + password ──────────────────────────────────

const localLoginSchema = z.object({
  email: z.string().trim().min(1, 'EMAIL_REQUIRED').email('EMAIL_INVALID'),
  password: z.string().min(1, 'PASSWORD_REQUIRED'),
});
type LocalValues = z.infer<typeof localLoginSchema>;

function LocalSection() {
  const router = useRouter();
  const t = useTranslations('auth.login');
  const tErrors = useTranslations('auth.errors');
  const fieldError = useFieldErrorText();
  const [forgotOpen, setForgotOpen] = useState(false); // ต้องมี ugt-nextjs-mail-setup
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LocalValues>({
    resolver: zodResolver(localLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await localLoginAction(values);
    if (result?.code) {
      setError('root', { message: tErrors(result.code as Parameters<typeof tErrors>[0]) });
      return;
    }
    router.push('/'); // Next.js is basePath-aware here
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {errors.root?.message && <Callout tone="danger">{errors.root.message}</Callout>}
      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="local-email">
          {t('emailLabel')}<span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="local-email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        <FieldError errors={fieldError(errors.email)} />
      </Field>
      <Field data-invalid={!!errors.password}>
        <div className="flex items-center justify-between">
          <FieldLabel htmlFor="local-password">
            {t('passwordLabel')}<span className="text-destructive">*</span>
          </FieldLabel>
          {/* ต้องมี ugt-nextjs-mail-setup — ลบลิงก์นี้พร้อม ForgotPasswordDialog
              เมื่อโปรเจคไม่มีระบบส่งอีเมล */}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground"
            onClick={() => setForgotOpen(true)}
          >
            {t('forgotPasswordLink')}
          </Button>
        </div>
        <Input
          id="local-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        <FieldError errors={fieldError(errors.password)} />
      </Field>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {t('submit')}
      </Button>
      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </form>
  );
}

// ─── Login Form (exported) ───────────────────────────────────────────────────

export function LoginForm({
  className,
  sessionExpired = false,
  ssoError,
}: Readonly<{ className?: string; sessionExpired?: boolean; ssoError?: string }>) {
  // Direct process.env read is intentional here (same reason as lib/auth-client.ts):
  // t3-env createEnv() returns '' for NEXT_PUBLIC_* in the Turbopack client bundle.
  // ⚠️ PLACEHOLDER: replace '__PROJECT_NAME__' in the fallback below with the real app name (see SKILL.md §6 placeholder table)
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? '__PROJECT_NAME__';
  const t = useTranslations('auth.login');

  // แบนเนอร์ค้างไว้แทน toast ที่เด้งตอน mount: ทั้งสองกรณีมาจาก searchParams ฝั่ง
  // server และเป็นเหตุผลว่า "ทำไมถึงมาอยู่หน้านี้" — ผู้ใช้ต้องอ่านทันได้ตลอด
  const banner = sessionExpired
    ? { tone: 'warning' as const, text: t('sessionExpiredBanner') }
    : ssoError
      ? {
          tone: 'danger' as const,
          text:
            ssoError === 'unable_to_create_user' ? t('ssoErrorUnableToCreateUser') :
            ssoError === 'account_not_linked' ? t('ssoErrorAccountNotLinked') :
            t('ssoErrorGeneric', { code: ssoError }),
        }
      : null;

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{appName}</h1>
        <p className="text-sm text-balance text-muted-foreground">{t('subtitle')}</p>
      </div>

      {banner && <Callout tone={banner.tone}>{banner.text}</Callout>}

      {/* [METHOD: SSO] */}
      <SsoSection />

      {/* [METHOD: LDAP|LOCAL] — separator between SSO and form-based login.
          Delete when SSO is the only method, or when SSO is not enabled. */}
      <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">{t('orSeparator')}</span>
      </div>

      {/* [METHOD: LDAP|LOCAL] — keep the Tabs block only when BOTH form methods are
          enabled; with a single form method, render <LdapSection /> or <LocalSection />
          directly instead. */}
      <Tabs defaultValue="ldap">
        <TabsList className="w-full">
          <TabsTrigger value="ldap" className="flex-1">
            {t('tabAd')}
          </TabsTrigger>
          <TabsTrigger value="local" className="flex-1">
            {t('tabEmail')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ldap" className="pt-2">
          <LdapSection />
        </TabsContent>
        <TabsContent value="local" className="pt-2">
          <LocalSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
