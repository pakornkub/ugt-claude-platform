import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { AppSiteHeader } from '@/components/app-nav';
import { AppSidebar } from '@/components/app-sidebar';
import { SessionExpiredDialog } from '@/components/session-expired-dialog';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { getAdminNavBadges } from '@/lib/admin-badges';
import { auth } from '@/lib/auth';
import { env } from '@/lib/env';
import { getUserPermissions, isAdminInitialized } from '@/lib/get-user-permissions';
import { prisma } from '@/lib/prisma';

// ชื่อ cookie session ต้องตรงกับ lib/auth.ts / lib/actions/auth.ts / middleware.ts
// (prefix จาก basePath — prod กับ dev อยู่ host เดียวกัน cookie ต้องไม่ชนกัน)
const COOKIE_PREFIX = (env.NEXT_PUBLIC_BASE_PATH || '').replace(/^\//, '') || 'better-auth';

/**
 * Shell ของทุกหน้าที่อยู่หลัง login — หน้า login / setup ของ auth-setup อยู่นอก
 * route group นี้ จึงไม่ถูกครอบด้วย sidebar (ตามที่ตั้งใจ)
 *
 * ลำดับ: session จริง (ไม่ใช่แค่ cookie — middleware เช็คได้แค่ว่ามี cookie) →
 * first-admin gate → สิทธิ์ + badge + ตัวตนสำหรับ NavUser
 * `SiteHeader` เป็นลูกคนแรกของ `SidebarInset` เสมอ และใช้เมนูชุดเดียวกับที่
 * sidebar วาด เพื่อให้ breadcrumb กับเมนูพูดตรงกัน (DESIGN.md §3)
 */
export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) {
    // cookie ยังอยู่แต่ session ใช้ไม่ได้ = หมดอายุ/ถูกยกเลิก → บอกผู้ใช้ด้วย banner
    // x-from = path ปัจจุบัน (ตัด basePath) จาก middleware — login เสร็จพากลับมาหน้าเดิม
    const cookieStore = await cookies();
    const hasSessionCookie = cookieStore
      .getAll()
      .some((c) => c.name === `${COOKIE_PREFIX}.session_token` || c.name === `__Secure-${COOKIE_PREFIX}.session_token`);
    const from = requestHeaders.get('x-from') ?? '';
    const q = new URLSearchParams();
    if (hasSessionCookie) q.set('reason', 'session_expired');
    if (from && from !== '/') q.set('from', from);
    redirect(q.size > 0 ? `/login?${q}` : '/login');
  }

  // ยังไม่มีผู้ดูแลระบบ → คนแรกที่ login ถูกพาไปกดตั้งค่า ไม่ใช่เจอแอปว่าง ๆ ไร้สิทธิ์
  if (!(await isAdminInitialized())) redirect('/admin/setup');

  const perms = await getUserPermissions(session.user.id);
  const [profile, badges] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        authType: true,
        empCode: true,
        position: true,
        department: true,
        userRole: { select: { name: true } },
      },
    }),
    getAdminNavBadges(perms),
  ]);

  return (
    <SidebarProvider>
      <AppSidebar
        perms={perms}
        badges={badges}
        user={{
          name: session.user.name,
          email: session.user.email,
          roleName: profile?.userRole?.name ?? null,
          authType: (profile?.authType ?? 'local') as 'sso' | 'ldap' | 'local',
          empCode: profile?.empCode ?? null,
          position: profile?.position ?? null,
          department: profile?.department ?? null,
        }}
      />
      <SidebarInset>
        <AppSiteHeader perms={perms} />
        {children}
      </SidebarInset>
      {/* ตัวรับ 401 กลางหน้า (session หมดระหว่างเปิดหน้าค้าง) — mount ครั้งเดียวที่นี่ */}
      <SessionExpiredDialog />
    </SidebarProvider>
  );
}
