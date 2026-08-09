// app/(admin)/admin/users/page.tsx — list users, assign role inline.
// ponytail: no pagination — first 200 users, ORDER BY name. Add pagination
// when a real project has more users than that; not worth the complexity yet.
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { UserRoleSelect } from '@/components/user-role-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function AdminUsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_READ)) redirect('/');
  const canUpdate = perms.includes(PERMISSIONS.USERS_UPDATE);

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      take: 200,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, authType: true, roleId: true },
    }),
    prisma.role.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">ผู้ใช้งาน</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อ</TableHead>
            <TableHead>อีเมล</TableHead>
            <TableHead>วิธีเข้าสู่ระบบ</TableHead>
            <TableHead>บทบาท</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant="outline">{user.authType}</Badge>
              </TableCell>
              <TableCell>
                <UserRoleSelect
                  userId={user.id}
                  currentRoleId={user.roleId}
                  roles={roles}
                  disabled={!canUpdate || user.id === session.user.id}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
