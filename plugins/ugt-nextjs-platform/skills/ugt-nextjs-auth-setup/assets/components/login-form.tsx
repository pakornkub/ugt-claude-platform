'use client';
// kit: ugt-nextjs-platform 4.25.0 · ugt-nextjs-auth-setup/components/login-form.tsx
// kit-hash: 9891ede72a23

// components/login-form.tsx — login form supporting all 3 org methods.
// DELETE the sections marked [METHOD: …] that were not selected during the interview:
//   - SSO only (default): keep SsoSection, delete LdapSection/LocalSection + Tabs block
//   - SSO + one form method: replace the Tabs block with the single remaining section
//   - No SSO: delete SsoSection + the "or" separator
// Requires shadcn primitives: button, input, label, tabs — and sonner for toasts.
// [METHOD: LOCAL + mail] also `dialog` (ForgotPasswordDialog mounts one).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // [METHOD: LDAP|LOCAL]
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // [METHOD: LDAP|LOCAL]
import { Label } from '@/components/ui/label'; // [METHOD: LDAP|LOCAL]
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // [METHOD: LDAP|LOCAL]
import { Loader2, Building2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client'; // [METHOD: SSO]
// [METHOD: LDAP|LOCAL] — delete this import when neither form method is enabled;
// with a single form method, keep only that method's action.
import { ldapLoginAction, localLoginAction } from '@/lib/actions/auth';
// [METHOD: LOCAL] — ต้องมี ugt-nextjs-mail-setup ด้วย; ลบพร้อมลิงก์ "ลืมรหัสผ่าน?"
import { ForgotPasswordDialog } from '@/components/forgot-password-dialog';

// ─── [METHOD: SSO] SSO (Keycloak) ────────────────────────────────────────────

function SsoSection() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSsoLogin() {
    setIsLoading(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
      const { error } = await authClient.signIn.oauth2({
        providerId: 'keycloak',
        callbackURL: `${basePath}/`,
      });
      if (error) throw error;
      // success → browser redirects to Keycloak; keep spinner spinning
    } catch {
      // redirect didn't happen (Keycloak unreachable / config error / network) —
      // reset state so the button is clickable again without a page refresh
      toast.error('ไม่สามารถเชื่อมต่อระบบ SSO ได้ กรุณาลองใหม่อีกครั้ง');
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-balance text-muted-foreground">
        เข้าสู่ระบบด้วยบัญชีองค์กร (Single Sign-On)
      </p>
      <Button className="w-full" onClick={handleSsoLogin} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            กำลังเชื่อมต่อ...
          </>
        ) : (
          <>
            <Building2 className="size-4" />
            เข้าสู่ระบบด้วย SSO
          </>
        )}
      </Button>
    </div>
  );
}

// ─── [METHOD: LDAP] AD / LDAP username + password ────────────────────────────

function LdapSection() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    const result = await ldapLoginAction({ username, password });
    if (result?.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }
    router.push('/'); // Next.js is basePath-aware here
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="ldap-username">Username (AD)</Label>
        <Input
          id="ldap-username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ldap-password">รหัสผ่าน</Label>
        <Input
          id="ldap-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="size-4 animate-spin" />}
        เข้าสู่ระบบ
      </Button>
    </form>
  );
}

// ─── [METHOD: LOCAL] Local email + password ──────────────────────────────────

function LocalSection() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false); // ต้องมี ugt-nextjs-mail-setup

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    const result = await localLoginAction({ email, password });
    if (result?.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }
    router.push('/'); // Next.js is basePath-aware here
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="local-email">อีเมล</Label>
        <Input
          id="local-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="local-password">รหัสผ่าน</Label>
          {/* ต้องมี ugt-nextjs-mail-setup — ลบลิงก์นี้พร้อม ForgotPasswordDialog
              เมื่อโปรเจคไม่มีระบบส่งอีเมล */}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground"
            onClick={() => setForgotOpen(true)}
          >
            ลืมรหัสผ่าน?
          </Button>
        </div>
        <Input
          id="local-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="size-4 animate-spin" />}
        เข้าสู่ระบบ
      </Button>
      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </form>
  );
}

// ─── Login Form (exported) ───────────────────────────────────────────────────

// Better Auth redirects failed auth flows here with ?error=<code>
// (onAPIError.errorURL in lib/auth.ts). The full cause is in the server log —
// these messages just tell the user it is not their fault and who to call.
const SSO_ERROR_MESSAGES: Record<string, string> = {
  unable_to_create_user:
    'เข้าสู่ระบบสำเร็จ แต่สร้างบัญชีผู้ใช้ไม่สำเร็จ กรุณาแจ้งผู้ดูแลระบบ (unable_to_create_user)',
  account_not_linked:
    'บัญชีนี้ยังเชื่อมกับระบบไม่ได้ กรุณาแจ้งผู้ดูแลระบบ (account_not_linked)',
};

export function LoginForm({
  className,
  sessionExpired = false,
  ssoError,
}: Readonly<{ className?: string; sessionExpired?: boolean; ssoError?: string }>) {
  // Direct process.env read is intentional here (same reason as lib/auth-client.ts):
  // t3-env createEnv() returns '' for NEXT_PUBLIC_* in the Turbopack client bundle.
  // ⚠️ PLACEHOLDER: replace '__PROJECT_NAME__' in the fallback below with the real app name (see SKILL.md §7)
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? '__PROJECT_NAME__';

  useEffect(() => {
    if (sessionExpired) {
      toast.info('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
    } else if (ssoError) {
      toast.error(
        SSO_ERROR_MESSAGES[ssoError] ?? `เข้าสู่ระบบไม่สำเร็จ กรุณาแจ้งผู้ดูแลระบบ (${ssoError})`,
      );
    }
    // Only run once on mount — both props are derived from server-side searchParams
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{appName}</h1>
        <p className="text-sm text-balance text-muted-foreground">เข้าสู่ระบบเพื่อใช้งาน</p>
      </div>

      {/* [METHOD: SSO] */}
      <SsoSection />

      {/* [METHOD: LDAP|LOCAL] — separator between SSO and form-based login.
          Delete when SSO is the only method, or when SSO is not enabled. */}
      <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">หรือ</span>
      </div>

      {/* [METHOD: LDAP|LOCAL] — keep the Tabs block only when BOTH form methods are
          enabled; with a single form method, render <LdapSection /> or <LocalSection />
          directly instead. */}
      <Tabs defaultValue="ldap">
        <TabsList className="w-full">
          <TabsTrigger value="ldap" className="flex-1">
            บัญชี AD
          </TabsTrigger>
          <TabsTrigger value="local" className="flex-1">
            อีเมล
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
