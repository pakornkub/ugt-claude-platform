// kit: ugt-nextjs-platform 4.27.0 · ugt-nextjs-auth-setup/app/(admin)/admin/users/page.tsx
// kit-hash: ee9e82532290
// app/(admin)/admin/users/page.tsx — server guard + fetch; the table lives in UsersTable.
// DataTable โหมด client (DESIGN.md §4): master data ดึงทั้งชุดแล้ว sort/filter/paginate
// ในหน่วยความจำ — ponytail: ผู้ใช้หลักพันคนขึ้นไปค่อยย้ายเป็นโหมด server แบบ audit-logs
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import {
  PageActions,
  PageDescription,
  PageHeader,
  PageHeaderText,
  PageTitle,
} from '@/components/ui/page-shell';
import { UsersTable } from '@/components/users-table';
// [METHOD: LOCAL] — ลบ import + ปุ่มด้านล่างเมื่อไม่ได้เปิด local login
// (บัญชี SSO/AD เกิดเองตอน login ครั้งแรก ไม่มีใครต้องเพิ่ม — มติ 2026-08-11)
import { CreateUserDialog } from '@/components/admin-user-actions';

export default async function AdminUsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_READ)) redirect('/');
  const canUpdate = perms.includes(PERMISSIONS.USERS_UPDATE);
  // [METHOD: LOCAL] — ปุ่มถูก "ซ่อน" ไม่ใช่ disable ตามกฎ; ด่านจริงคือ guard ในแอ็กชัน
  const canCreate = perms.includes(PERMISSIONS.USERS_CREATE);
  const canResetPassword = perms.includes(PERMISSIONS.USERS_RESET_PASSWORD);

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, authType: true, roleId: true },
    }),
    prisma.role.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-4">
      {/* หัวหน้าเพจตามโครง DESIGN.md §3: title + subtitle ซ้าย · action ขวา */}
      <PageHeader>
        <PageHeaderText>
          <PageTitle>ผู้ใช้งาน</PageTitle>
          <PageDescription>
            บัญชี SSO/AD เกิดเองตอนเข้าสู่ระบบครั้งแรก — เพิ่มด้วยมือเฉพาะบัญชี local
          </PageDescription>
        </PageHeaderText>
        {canCreate && (
          <PageActions>
            <CreateUserDialog roles={roles} />
          </PageActions>
        )}
      </PageHeader>
      <UsersTable
        users={users}
        roles={roles}
        currentUserId={session.user.id}
        canUpdate={canUpdate}
        canResetPassword={canResetPassword}
      />
    </div>
  );
}
