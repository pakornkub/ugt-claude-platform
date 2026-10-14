// kit: ugt-nextjs-platform 4.79.0 · ugt-nextjs-auth-setup/app/(admin)/admin/users/page.tsx
// kit-hash: 80bec346463e
// app/(app)/admin/users/page.tsx — server guard + fetch; the tables live in client components.
// แท็บ: ทั้งหมด · ยังไม่มีบทบาท · ตั้งล่วงหน้า (รอเข้าระบบ) — `?tab=no-role|pending` เปิดแท็บนั้น
// ตรง ๆ (ลิงก์ในเมลแจ้งแอดมินชี้ ?tab=no-role — เมื่อติดตั้ง mail-setup แล้ว)
// DataTable โหมด client (DESIGN.md §4): master data ดึงทั้งชุดแล้ว sort/filter/paginate
// ในหน่วยความจำ — ponytail: ผู้ใช้หลักพันคนขึ้นไปค่อยย้ายเป็นโหมด server แบบ audit-logs
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { toCanonicalEmail } from '@/lib/org-email';
import {
  PageActions,
  PageDescription,
  PageHeader,
  PageHeaderText,
  PageTitle,
} from '@/components/ui/page-shell';
import { Badge } from '@/components/ui/badge';
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminUsersTabs } from '@/components/admin-users-tabs';
import { UsersTable } from '@/components/users-table';
import { PreassignManager } from '@/components/preassign-manager';
// ปุ่มเพิ่มผู้ใช้ local (ผู้รับเหมาภายนอก) — บัญชี SSO/AD เกิดเองตอน login ครั้งแรก
import { CreateUserDialog } from '@/components/admin-user-actions';

const TABS = ['all', 'no-role', 'pending'] as const;
type Tab = (typeof TABS)[number];

export default async function AdminUsersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ tab?: string }> }>) {
  const t = await getTranslations('auth.adminUsersPage');
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_READ)) redirect('/');
  const canUpdate = perms.includes(PERMISSIONS.USERS_UPDATE);
  // ปุ่มถูก "ซ่อน" ไม่ใช่ disable ตามกฎ; ด่านจริงคือ guard ในแอ็กชัน
  const canCreate = perms.includes(PERMISSIONS.USERS_CREATE);
  const canResetPassword = perms.includes(PERMISSIONS.USERS_RESET_PASSWORD);

  const { tab } = await searchParams;
  const activeTab: Tab = TABS.includes(tab as Tab) ? (tab as Tab) : 'all';

  const [users, roles, pending] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, authType: true, roleId: true },
    }),
    prisma.role.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.pendingRoleAssignment.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        empCode: true,
        loginName: true,
        fullName: true,
        email: true,
        roleId: true,
        createdAt: true,
        createdBy: true,
      },
    }),
  ]);

  // แถวที่เก็บไว้ก่อนมี ORG_EMAIL_DOMAINS แสดงเป็นโดเมนหลักไปก่อน — login ครั้งหน้าถึงจะเขียนทับจริง
  const rows = users.map((u) => ({ ...u, email: toCanonicalEmail(u.email) }));
  const noRole = rows.filter((u) => !u.roleId);

  // ชื่อแอดมินที่ตั้ง — ActivityLogs ก็ไม่มี FK ด้วยเหตุผลเดียวกัน (คนถูกลบได้)
  const names = new Map(users.map((u) => [u.id, u.name]));
  const pendingRows = pending.map(({ createdBy, ...p }) => ({
    ...p,
    email: p.email ? toCanonicalEmail(p.email) : null,
    createdByName: names.get(createdBy) ?? null,
  }));

  const tableProps = { roles, currentUserId: session.user.id, canUpdate, canResetPassword };

  return (
    <div className="space-y-4">
      {/* หัวหน้าเพจตามโครง DESIGN.md §3: title + subtitle ซ้าย · action ขวา */}
      <PageHeader>
        <PageHeaderText>
          <PageTitle>{t('title')}</PageTitle>
          <PageDescription>{t('description')}</PageDescription>
        </PageHeaderText>
        {canCreate && (
          <PageActions>
            <CreateUserDialog roles={roles} />
          </PageActions>
        )}
      </PageHeader>

      {/* key: a soft navigation to another ?tab= (the admin mail link, a menu
          click) re-mounts the tabs so the URL wins over the previous local state */}
      <AdminUsersTabs key={activeTab} defaultValue={activeTab}>
        {/* three labels + counts overflow a 375 px screen — scroll the strip, not the page */}
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList>
            <TabsTrigger value="all">
              {t('tabAll')}
              <Badge variant="outline">{rows.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="no-role">
              {t('tabNoRole')}
              <Badge variant="outline">{noRole.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending">
              {t('tabPending')}
              <Badge variant="outline">{pendingRows.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="all" className="pt-2">
          <UsersTable tableId="admin-users" users={rows} {...tableProps} />
        </TabsContent>
        {/* เลือก role ในแท็บนี้แล้วแถวหายจากแท็บเอง (revalidatePath) — badge ในเมนูลดตาม */}
        <TabsContent value="no-role" className="pt-2">
          <UsersTable tableId="admin-users-no-role" users={noRole} {...tableProps} />
        </TabsContent>
        <TabsContent value="pending" className="pt-2">
          <PreassignManager rows={pendingRows} roles={roles} canUpdate={canUpdate} />
        </TabsContent>
      </AdminUsersTabs>
    </div>
  );
}
