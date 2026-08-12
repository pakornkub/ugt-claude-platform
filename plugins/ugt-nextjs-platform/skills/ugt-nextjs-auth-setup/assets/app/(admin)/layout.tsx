// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-auth-setup/app/(admin)/layout.tsx
// kit-hash: 7098d770d05e
// app/(admin)/layout.tsx — the ongoing admin section (users/roles/audit-logs).
// Different route group from (admin-setup): that one only requires a session
// (permissions don't exist pre-bootstrap); this one requires an actual
// admin-domain permission.
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { syncPermissionsIfNeeded } from '@/lib/permissions-sync';
import { PERMISSIONS } from '@/lib/permissions';
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

  return (
    <div className="flex min-h-svh">
      <AdminNav perms={perms} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
