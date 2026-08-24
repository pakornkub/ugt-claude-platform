'use client';
// kit: ugt-nextjs-platform 4.46.1 · ugt-nextjs-auth-setup/components/users-table.tsx
// kit-hash: be9b9046a7db
// components/users-table.tsx — client half of /admin/users: column defs ต้องเป็น
// client code จึงแยกจาก page ที่ทำ guard + fetch · DataTable โหมด client
// (master data ทั้งชุด — DESIGN.md §4) · ต้องมี org UI kit จาก
// ugt-nextjs-design-setup ก่อน — โปรเจคที่ไม่มี kit ดู SKILL.md §4
import { useTranslations } from 'next-intl';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { UserRoleSelect } from '@/components/user-role-select';
// [METHOD: LOCAL] — ลบ import + คอลัมน์รหัสผ่านด้านล่างเมื่อไม่ได้เปิด local login
import { SetPasswordDialog } from '@/components/admin-user-actions';

type RoleOption = { id: string; name: string };
type UserRow = {
  id: string;
  name: string;
  email: string;
  authType: string;
  roleId: string | null;
};

export function UsersTable({
  users,
  roles,
  currentUserId,
  canUpdate,
  canResetPassword,
}: Readonly<{
  users: UserRow[];
  roles: RoleOption[];
  currentUserId: string;
  canUpdate: boolean;
  canResetPassword: boolean;
}>) {
  const t = useTranslations('auth');
  const columns: ColumnDef<UserRow>[] = [
    { accessorKey: 'name', header: t('usersTable.colName') },
    { accessorKey: 'email', header: t('usersTable.colEmail') },
    {
      accessorKey: 'authType',
      header: t('usersTable.colAuthMethod'),
      // ป้ายบอกชนิด ไม่ใช่สถานะ — Badge เปล่าไร้สี ไม่ใช่ StatusBadge
      cell: ({ row }) => <Badge variant="outline">{row.original.authType}</Badge>,
    },
    {
      id: 'role',
      header: t('usersTable.colRole'),
      meta: { mobileLabel: t('usersTable.colRole') },
      cell: ({ row }) => (
        <UserRoleSelect
          userId={row.original.id}
          currentRoleId={row.original.roleId}
          roles={roles}
          // แถวตัวเองเปลี่ยนบทบาทไม่ได้ — กันแอดมินลดสิทธิ์ตัวเองจนไม่มีใครแก้คืน
          disabled={!canUpdate || row.original.id === currentUserId}
        />
      ),
    },
    // [METHOD: LOCAL] — ทั้งคอลัมน์นี้ · id 'actions' = คอลัมน์ตรึงท้ายของ DataTable
    // (ลาก/ซ่อนไม่ได้) · ปุ่มถูกซ่อนเมื่อไม่มีสิทธิ์ ไม่ใช่ disable — ด่านจริงอยู่ในแอ็กชัน
    ...(canResetPassword
      ? [
          {
            id: 'actions',
            header: t('usersTable.colPassword'),
            meta: { mobileLabel: t('usersTable.colPassword') },
            cell: ({ row }) =>
              // บัญชี SSO/LDAP ตั้งรหัสผ่านที่ directory — ปุ่มนี้ทำอะไรให้ไม่ได้
              row.original.authType === 'local' ? (
                <SetPasswordDialog userId={row.original.id} userName={row.original.name} />
              ) : null,
          } satisfies ColumnDef<UserRow>,
        ]
      : []),
  ];

  return (
    <DataTable
      id="admin-users"
      columns={columns}
      data={users}
      globalSearch
      filterPlaceholder={t('usersTable.searchPlaceholder')}
    />
  );
}
