// kit: ugt-nextjs-platform 4.79.0 · ugt-nextjs-auth-setup/app/(admin)/layout.tsx
// kit-hash: 0c6bff8dbcee
// app/(app)/admin/layout.tsx — the ongoing admin section (users/roles/audit-logs).
// Different route group from (admin-setup): that one only requires a session
// (permissions don't exist pre-bootstrap); this one requires an actual
// admin-domain permission.
//
// โปรเจคนี้มี shell ของตัวเอง (app/(app)/layout.tsx) จึงย้ายหน้า admin มาอยู่ใต้
// (app) และเก็บไว้เฉพาะ GUARD — SHELL fallback (<AdminNav>) ถูกตัดทิ้ง เมนู admin
// merge เข้า sidebar ของโปรเจคแล้ว (components/app-nav.tsx — SKILL.md §5.6)
//   GUARD: session → syncPermissionsIfNeeded → permission → redirect
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { syncPermissionsIfNeeded } from '@/lib/permissions-sync';
import { PERMISSIONS } from '@/lib/permissions';
import { PageShell } from '@/components/ui/page-shell';

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
  if (!canAdmin) redirect('/');

  // PageShell ไม่ใช่ fragment เปล่า — padding ของหน้า admin มาจากตรงนี้ที่เดียว
  return <PageShell>{children}</PageShell>;
}
