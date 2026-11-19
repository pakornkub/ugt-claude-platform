'use client';
// kit: ugt-nextjs-platform 4.97.0 · ugt-nextjs-auth-setup/components/roles-manager.tsx
// kit-hash: ccd92da19d8d
// components/roles-manager.tsx — interactive part of app/(admin)/admin/roles/page.tsx:
// DataTable โหมด client (บทบาทมีไม่กี่แถว — DESIGN.md §4) + create/edit ใน Sheet
// (checklist สิทธิ์ยาวและโตตาม ALL_PERMISSIONS — บันได dialog §4: ฟอร์มใน Sheet =
// ui/settings-sheet ซึ่ง RoleForm วาดทั้งแผง) + ลบผ่าน ConfirmActionDialog ตามข้อตกลง
// (destructive ห้าม window.confirm) · ปุ่มแถวผ่าน IconAction + variant soft-*
// ต้องมี org UI kit จาก ugt-nextjs-design-setup ก่อน — โปรเจคที่ไม่มี kit ดู SKILL.md §4
import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet } from '@/components/ui/sheet';
import { DataTable } from '@/components/ui/data-table';
import { IconAction } from '@/components/ui/icon-action';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import {
  PageActions,
  PageDescription,
  PageHeader,
  PageHeaderText,
  PageTitle,
} from '@/components/ui/page-shell';
import { RoleForm } from '@/components/role-form';
import { deleteRoleAction } from '@/lib/actions/admin-roles';

type PermissionOption = { id: string; key: string; label: string; group: string };
type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionIds: string[];
};

export function RolesManager({
  roles,
  allPermissions,
  canCreate,
  canUpdate,
  canDelete,
}: Readonly<{
  roles: RoleRow[];
  allPermissions: PermissionOption[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}>) {
  const t = useTranslations('auth.rolesManager');
  const tErrors = useTranslations('auth.errors');
  // open แยกจาก target: ตอนปิด target ยังอยู่จน animation ปิดจบ (onOpenChangeComplete) เนื้อหาจึงไม่หายกลางทาง
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTarget, setSheetTarget] = useState<'create' | string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);
  const guard = useRef({ dirty: false, busy: false });
  const reportGuard = useCallback((state: { dirty: boolean; busy: boolean }) => {
    guard.current = state;
  }, []);

  const editingRole = roles.find((r) => r.id === sheetTarget) ?? null;
  const openSheet = (target: 'create' | string) => {
    setSheetTarget(target);
    setSheetOpen(true);
  };

  const columns: ColumnDef<RoleRow>[] = [
    {
      accessorKey: 'name',
      header: t('colRole'),
      cell: ({ row }) => (
        <>
          {row.original.name}
          {/* ตัวระบุ = Badge outline (มติ 2026-08-21 — secondary สงวนให้ chip ตัวกรอง) */}
          {row.original.isSystem && (
            <Badge variant="outline" className="ml-2">
              {t('systemBadge')}
            </Badge>
          )}
        </>
      ),
    },
    { accessorKey: 'description', header: t('colDescription') },
    {
      id: 'permissions',
      header: t('colPermissions'),
      meta: {
        numeric: true,
        mobileLabel: t('colPermissions'),
        headerClassName: 'text-right',
        cellClassName: 'text-right tabular-nums',
      },
      cell: ({ row }) => row.original.permissionIds.length,
    },
    // id 'actions' = คอลัมน์ตรึงท้ายของ DataTable (ลาก/ซ่อนไม่ได้) ·
    // ไม่มีสิทธิ์ = ซ่อนปุ่ม (กฎ §3 — เรื่อง permission) · บทบาท system =
    // disabled + tooltip บอกเหตุผล (มติ 2026-08-21 — business rule ต้องมองเห็น
    // ว่าปุ่มมีแต่ใช้ไม่ได้เพราะอะไร) — ด่านจริงยังอยู่ในแอ็กชันฝั่ง server
    ...(canUpdate || canDelete
      ? [
          {
            id: 'actions',
            header: '',
            meta: { mobileLabel: t('colActions') },
            cell: ({ row }) => (
              <div className="flex justify-end gap-1">
                {canUpdate && (
                  <IconAction
                    label={row.original.isSystem ? t('editSystemBlocked') : t('edit')}
                    tone="info"
                    disabled={row.original.isSystem}
                    onClick={() => openSheet(row.original.id)}
                  >
                    <Pencil className="size-4" strokeWidth={2} />
                  </IconAction>
                )}
                {canDelete && (
                  <IconAction
                    label={row.original.isSystem ? t('deleteSystemBlocked') : t('delete')}
                    tone="danger"
                    disabled={row.original.isSystem}
                    onClick={() => setDeleteTarget(row.original)}
                  >
                    <Trash2 className="size-4" strokeWidth={2} />
                  </IconAction>
                )}
              </div>
            ),
          } satisfies ColumnDef<RoleRow>,
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* หัวหน้าเพจตามโครง DESIGN.md §3: title + subtitle ซ้าย · action ขวา
          (ไม่ห่อ PageShell — padding ของหน้าเป็นของ shell/layout ที่ครอบอยู่) */}
      <PageHeader>
        <PageHeaderText>
          <PageTitle>{t('pageTitle')}</PageTitle>
          <PageDescription>{t('pageDescription')}</PageDescription>
        </PageHeaderText>
        {canCreate && (
          <PageActions>
            <Button onClick={() => openSheet('create')}>
              <Plus className="mr-2 size-4" strokeWidth={2} />
              {t('create')}
            </Button>
          </PageActions>
        )}
      </PageHeader>

      <DataTable id="admin-roles" columns={columns} data={roles} globalSearch filterPlaceholder={t('searchPlaceholder')} />

      {/* Sheet ตัวเดียวคุมทั้ง create/edit · RoleForm วาดทั้งแผง (SettingsSheetContent) ·
          ฟอร์มแก้แล้ว/กำลังบันทึก = Esc/คลิกนอกกรอบไม่ปิด ปิดได้ด้วยยกเลิก/✕ ที่ตั้งใจกด (DESIGN.md §4) */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open, details) => {
          if (open) return;
          const { dirty, busy } = guard.current;
          const dismissal = details.reason === 'outside-press' || details.reason === 'escape-key';
          if (busy || (dirty && dismissal)) {
            details.cancel();
            return;
          }
          setSheetOpen(false);
        }}
        // RoleForm อยู่นอก popup (ถือ useForm) — ปิดจบแล้วถอดทิ้ง เปิดรอบหน้าได้ฟอร์มใหม่ ไม่ค้างค่าที่พิมพ์ทิ้งไว้
        onOpenChangeComplete={(open) => {
          if (open) return;
          setSheetTarget(null);
          guard.current = { dirty: false, busy: false };
        }}
      >
        {sheetTarget !== null && (
          <RoleForm
            key={editingRole?.id ?? 'create'}
            allPermissions={allPermissions}
            role={editingRole}
            onSaved={() => setSheetOpen(false)}
            onCancel={() => setSheetOpen(false)}
            onGuardChange={reportGuard}
          />
        )}
      </Sheet>

      {/* destructive = ConfirmActionDialog เสมอ (DESIGN.md §4) — ห้าม window.confirm */}
      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('deleteConfirmTitle', { name: deleteTarget?.name ?? '' })}
        description={t('deleteConfirmDescription')}
        confirmLabel={t('deleteConfirmButton')}
        successMessage={t('deleteSuccess')}
        action={async () => {
          if (!deleteTarget) return { error: tErrors('ROLE_NOT_FOUND') };
          const result = await deleteRoleAction(deleteTarget.id);
          return result.success ? { ok: true } : { error: tErrors(result.code as Parameters<typeof tErrors>[0]) };
        }}
      />
    </div>
  );
}
