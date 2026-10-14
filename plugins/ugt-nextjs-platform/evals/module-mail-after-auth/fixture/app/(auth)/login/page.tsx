import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CalendarPlus, ClipboardList, ListChecks } from 'lucide-react';

import { LoginForm } from '@/components/login-form';
import { LoginShell } from '@/components/login-shell';
import { auth } from '@/lib/auth';

// ชื่อแท็บจาก catalog — หน้า login ไม่มีข้อความไทยตรง ๆ (rules/ugt-nextjs-auth.md §Login page)
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.login');
  return { title: t('submit') };
}

/**
 * หน้า login สองคอลัมน์ (auth-setup references/login-page.md) — hero ซ้ายจาก
 * catalog `app.loginHero` ของโปรเจค · ฟอร์มขวา: SSO (หลัก) · AD · อีเมล (ผู้รับเหมา)
 */
export default async function LoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ reason?: string; error?: string; from?: string }> }>) {
  // เช็ค session จริงเท่านั้น — cookie เก่าที่ใช้ไม่ได้แล้วต้องตกมาที่ฟอร์ม ไม่ใช่วน / ↔ /login
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect('/');

  const { reason, error, from } = await searchParams;
  const t = await getTranslations('app.loginHero');
  const hero = {
    title: t('title'),
    description: t('description'),
    features: [
      { icon: CalendarPlus, title: t('f1Title'), text: t('f1Text') },
      { icon: ListChecks, title: t('f2Title'), text: t('f2Text') },
      { icon: ClipboardList, title: t('f3Title'), text: t('f3Text') },
    ],
    footer: t('footer', { year: new Date().getFullYear() }),
  };

  return (
    <LoginShell hero={hero}>
      <LoginForm sessionExpired={reason === 'session_expired'} ssoError={error} from={from} />
    </LoginShell>
  );
}
