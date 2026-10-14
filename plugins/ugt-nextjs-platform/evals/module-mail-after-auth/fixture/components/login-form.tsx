'use client';
// kit: ugt-nextjs-platform 4.79.0 · ugt-nextjs-auth-setup/components/login-form.tsx
// kit-hash: c63bb8f86891

// components/login-form.tsx — login form, all 3 org methods:
// SSO (Keycloak, primary) · AD/LDAP (fallback when Keycloak is down) · Local
// (external contractors without an AD account).
// Requires shadcn primitives: button, input, tabs, field — and sonner for toasts.
//
// "ลืมรหัสผ่าน?" ยังไม่ติดตั้ง — ต้องมี ugt-nextjs-mail-setup ก่อน (pass สอง: เพิ่ม
// ลิงก์ + ForgotPasswordDialog กลับเข้า LocalSection) · ระหว่างนี้ผู้รับเหมาที่ลืมรหัส
// ให้แอดมิน "ตั้งรหัสผ่าน" ให้ที่ /admin/users
//
// ฟอร์ม = react-hook-form + zodResolver + ui/field (DESIGN.md §4) · error ของการ
// เข้าสู่ระบบเป็น Callout ค้างบนฟอร์ม ไม่ใช่ toast (§6: error ระดับหน้า = banner) —
// toast หายไปก่อนผู้ใช้อ่านจบ และหน้า login คือที่ที่คนอ่านข้อความผิดพลาดจริง ๆ
// หมายเหตุ: ฟอร์ม login ตรวจแค่ "กรอกครบไหม" ห้ามผูก password-policy ที่นี่ —
// รหัสผ่านเดิมที่ตั้งไว้ก่อนนโยบายปัจจุบันต้องยังเข้าระบบได้

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Callout } from '@/components/ui/callout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Building2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { useFieldErrorText } from '@/lib/use-field-error';
import { ldapLoginAction, localLoginAction } from '@/lib/actions/auth';

// ─── Return-to-page (?from=) ─────────────────────────────────────────────────

// กัน open redirect: `from` มาจาก searchParams — ใครก็ส่งลิงก์
// `/login?from=https://evil.example` มาหลอกได้ จึงรับเฉพาะ path ภายในแอป
// (basePath-relative) เท่านั้น:
// - ต้องขึ้นต้น '/' — ตัด scheme URL (`https://…`, `javascript:…`) ทิ้งทั้งหมด
// - ห้าม '//' — protocol-relative URL (`//evil.example`) ออกนอกโดเมนได้
// - ห้าม '/\' — บาง browser normalize backslash เป็น '/' แล้วกลายเป็น '//'
// ไม่ผ่าน = ทิ้งเงียบ ๆ กลับหน้าแรก (ค่าผิดมาจากลิงก์ปลอม ไม่ใช่ความผิดผู้ใช้)
function sanitizeFrom(from: string | undefined): string {
  if (!from || !from.startsWith('/') || from.startsWith('//') || from.startsWith('/\\')) {
    return '/';
  }
  return from;
}

// ─── SSO (Keycloak) ──────────────────────────────────────────────────────────

function SsoSection({ from }: Readonly<{ from: string }>) {
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('auth.login');

  async function handleSsoLogin() {
    setIsLoading(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
      // better-auth 1.7 folded generic OAuth into the core social sign-in path —
      // signIn.social({ provider: 'keycloak' }) replaces the removed
      // signIn.oauth2({ providerId: 'keycloak' }).
      // callbackURL ต้องรวม basePath เอง (Better Auth ไม่รู้จัก basePath) —
      // `from` เป็น basePath-relative ที่ sanitize แล้ว จึง prepend ได้ตรง ๆ
      const { error } = await authClient.signIn.social({
        provider: 'keycloak',
        callbackURL: `${basePath}${from}`,
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

// ─── AD / LDAP username + password ───────────────────────────────────────────

const ldapLoginSchema = z.object({
  username: z.string().trim().min(1, 'AD_USERNAME_REQUIRED'),
  password: z.string().min(1, 'PASSWORD_REQUIRED'),
});
type LdapValues = z.infer<typeof ldapLoginSchema>;

function LdapSection({ from }: Readonly<{ from: string }>) {
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
    router.push(from); // Next.js is basePath-aware here — `from` เป็น basePath-relative
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

// ─── Local email + password ──────────────────────────────────────────────────

const localLoginSchema = z.object({
  email: z.string().trim().min(1, 'EMAIL_REQUIRED').email('EMAIL_INVALID'),
  password: z.string().min(1, 'PASSWORD_REQUIRED'),
});
type LocalValues = z.infer<typeof localLoginSchema>;

function LocalSection({ from }: Readonly<{ from: string }>) {
  const router = useRouter();
  const t = useTranslations('auth.login');
  const tErrors = useTranslations('auth.errors');
  const fieldError = useFieldErrorText();
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
    router.push(from); // Next.js is basePath-aware here — `from` เป็น basePath-relative
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
        <FieldLabel htmlFor="local-password">
          {t('passwordLabel')}<span className="text-destructive">*</span>
        </FieldLabel>
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
    </form>
  );
}

// ─── Login Form (exported) ───────────────────────────────────────────────────

export function LoginForm({
  className,
  sessionExpired = false,
  ssoError,
  from,
}: Readonly<{
  className?: string;
  sessionExpired?: boolean;
  ssoError?: string;
  // path (basePath-relative) ที่จะพาผู้ใช้กลับหลัง login สำเร็จ — มาจาก
  // searchParams `?from=` ที่ middleware.ts / SessionExpiredDialog / layout แนบมา
  from?: string;
}>) {
  // Direct process.env read is intentional here (same reason as lib/auth-client.ts):
  // t3-env createEnv() returns '' for NEXT_PUBLIC_* in the Turbopack client bundle.
  // Fallback is the generic catalog string (auth.login.appName), not a
  // substituted literal — NEXT_PUBLIC_APP_NAME is the only
  // place the real display name should come from; a Thai display-name literal
  // here would also trip check-i18n.mjs's "no Thai outside comments" rule.
  const t = useTranslations('auth.login');
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? t('appName');

  // validate ครั้งเดียวที่นี่ — ทุก section ได้ค่าที่ปลอดภัยแล้ว (กัน open redirect)
  const returnTo = sanitizeFrom(from);

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
            ssoError === 'sso_refused' ? t('ssoErrorRefused') :
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

      <SsoSection from={returnTo} />

      {/* separator between SSO (primary) and the form-based fallbacks */}
      <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">{t('orSeparator')}</span>
      </div>

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
          <LdapSection from={returnTo} />
        </TabsContent>
        <TabsContent value="local" className="pt-2">
          <LocalSection from={returnTo} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
