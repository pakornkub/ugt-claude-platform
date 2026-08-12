// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-auth-setup/app/(admin)/admin/audit-logs/page.tsx
// kit-hash: 8850909108d3
// app/(admin)/admin/audit-logs/page.tsx — read-only ActivityLogs viewer.
// ponytail: no filters/pagination — latest 200 rows. Add filters (by user,
// action, date range) when a real project needs to search beyond that.
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function AdminAuditLogsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.AUDIT_LOGS_READ)) redirect('/');

  const logs = await prisma.activityLog.findMany({
    take: 200,
    orderBy: { createdAt: 'desc' },
  });
  const userIds = [...new Set(logs.map((l) => l.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">บันทึกกิจกรรม</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>เวลา</TableHead>
            <TableHead>ผู้ใช้</TableHead>
            <TableHead>การกระทำ</TableHead>
            <TableHead>รายละเอียด</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const user = userById.get(log.userId);
            return (
              <TableRow key={log.id}>
                <TableCell>{log.createdAt.toLocaleString('th-TH')}</TableCell>
                <TableCell>{user ? `${user.name} (${user.email})` : log.userId}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell className="max-w-md truncate font-mono text-xs">{log.detail}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
