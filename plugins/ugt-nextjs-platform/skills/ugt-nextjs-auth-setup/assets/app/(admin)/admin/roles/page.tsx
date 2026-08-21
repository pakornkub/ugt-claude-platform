// kit: ugt-nextjs-platform 4.25.0 · ugt-nextjs-auth-setup/app/(admin)/admin/roles/page.tsx
// kit-hash: 547f0679ea65
// app/(admin)/admin/roles/page.tsx — server guard + fetch; interactivity in RolesManager.
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { RolesManager } from '@/components/roles-manager';

export default async function AdminRolesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.ROLES_READ)) redirect('/');

  const [roles, allPermissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        permissions: { select: { permissionId: true } },
      },
    }),
    prisma.permission.findMany({ orderBy: [{ group: 'asc' }, { label: 'asc' }] }),
  ]);

  return (
    <RolesManager
      roles={roles.map(({ permissions, ...r }) => ({
        ...r,
        permissionIds: permissions.map((p) => p.permissionId),
      }))}
      allPermissions={allPermissions}
      canCreate={perms.includes(PERMISSIONS.ROLES_CREATE)}
      canUpdate={perms.includes(PERMISSIONS.ROLES_UPDATE)}
      canDelete={perms.includes(PERMISSIONS.ROLES_DELETE)}
    />
  );
}
