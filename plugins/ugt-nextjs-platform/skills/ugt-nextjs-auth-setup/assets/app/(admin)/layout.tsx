// kit: ugt-nextjs-platform 4.27.0 · ugt-nextjs-auth-setup/app/(admin)/layout.tsx
// kit-hash: ab1968ca47ac
// app/(admin)/layout.tsx — the ongoing admin section (users/roles/audit-logs).
// Different route group from (admin-setup): that one only requires a session
// (permissions don't exist pre-bootstrap); this one requires an actual
// admin-domain permission.
//
// Two jobs live here — keep them separate in your head:
//   GUARD (always keep): session → syncPermissionsIfNeeded → permission → redirect
//   SHELL (fallback only): the <AdminNav> two-pane below is for projects with
//     NO app shell yet. If the project already has its own sidebar/layout,
//     delete the shell part, render only {children}, and merge ADMIN_NAV_ITEMS
//     into the existing sidebar instead — SKILL.md §5.6.
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { syncPermissionsIfNeeded } from '@/lib/permissions-sync';
import { PERMISSIONS } from '@/lib/permissions';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AdminNav } from '@/components/admin-nav';

// Section-level guard: derived from sub-permissions, no separate "admin:read"
// key (see references/rbac.md). Add new admin pages' read permission here too.
const ADMIN_SECTION_PERMISSIONS = [
  PERMISSIONS.USERS_READ,
  PERMISSIONS.ROLES_READ,
  PERMISSIONS.AUDIT_LOGS_READ,
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  await syncPermissionsIfNeeded();

  const perms = await getUserPermissions(session.user.id);
  const canAdmin = ADMIN_SECTION_PERMISSIONS.some((p) => perms.includes(p));
  if (!canAdmin) redirect('/'); // adjust to your app's "forbidden" landing page

  // SHELL fallback — replace everything from here down with plain
  // `return <>{children}</>;` when the project's own shell wraps these pages
  // (see header comment). SidebarProvider is required: NavUser (in AdminNav's
  // footer) calls useSidebar() and throws without it.
  // ข้อมูลตัวตนสำหรับ NavUser — query เดียวเฉพาะ fallback shell; โปรเจคที่มี
  // shell ของตัวเองส่งข้อมูลนี้จาก layout ของตัวเองอยู่แล้ว (SKILL.md §5.5 ข้อ 4)
  const navUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { authType: true, userRole: { select: { name: true } } },
  });

  return (
    <SidebarProvider>
      <AdminNav
        perms={perms}
        user={{
          name: session.user.name,
          email: session.user.email,
          roleName: navUser?.userRole?.name ?? null,
          authType: (navUser?.authType ?? 'local') as 'sso' | 'ldap' | 'local',
        }}
      />
      <SidebarInset>
        <main className="p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
