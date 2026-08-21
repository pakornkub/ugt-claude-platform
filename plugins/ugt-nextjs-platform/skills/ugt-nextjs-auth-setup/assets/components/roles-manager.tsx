'use client';
// kit: ugt-nextjs-platform 4.26.0 · ugt-nextjs-auth-setup/components/roles-manager.tsx
// kit-hash: 26e28adf6e79
// components/roles-manager.tsx — interactive part of app/(admin)/admin/roles/page.tsx:
// DataTable โหมด client (บทบาทมีไม่กี่แถว — DESIGN.md §4) + create/edit ใน Sheet
// (checklist สิทธิ์ยาวและโตตาม ALL_PERMISSIONS — บันได dialog §4: panel ยาว = Sheet
// ไม่ใช่ Dialog ที่สูงจน scroll ไม่ได้) + ลบผ่าน ConfirmActionDialog ตามข้อตกลง
// (destructive ห้าม window.confirm) · ปุ่มแถวผ่าน IconAction + variant soft-*
// ต้องมี org UI kit จาก ugt-nextjs-design-setup ก่อน — โปรเจคที่ไม่มี kit ดู SKILL.md §4
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  const [openSheet, setOpenSheet] = useState<'create' | string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);

  const editingRole = roles.find((r) => r.id === openSheet) ?? null;

  const columns: ColumnDef<RoleRow>[] = [
    {
      accessorKey: 'name',
      header: 'ชื่อ',
      cell: ({ row }) => (
        <>
          {row.original.name}
          {/* ตัวระบุ = Badge outline (มติ 2026-08-21 — secondary สงวนให้ chip ตัวกรอง) */}
          {row.original.isSystem && (
            <Badge variant="outline" className="ml-2">
              ระบบ
            </Badge>
          )}
        </>
      ),
    },
    { accessorKey: 'description', header: 'คำอธิบาย' },
    {
      id: 'permissions',
      header: 'สิทธิ์',
      meta: {
        numeric: true,
        mobileLabel: 'สิทธิ์',
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
            meta: { mobileLabel: 'จัดการ' },
            cell: ({ row }) => (
              <div className="flex justify-end gap-1">
                {canUpdate && (
                  <IconAction
                    label={row.original.isSystem ? 'บทบาทระบบ — แก้ไขไม่ได้' : 'แก้ไข'}
                    variant="soft-primary"
                    disabled={row.original.isSystem}
                    onClick={() => setOpenSheet(row.original.id)}
                  >
                    <Pencil className="size-4" strokeWidth={2} />
                  </IconAction>
                )}
                {canDelete && (
                  <IconAction
                    label={row.original.isSystem ? 'บทบาทระบบ — ลบไม่ได้' : 'ลบ'}
                    variant="soft-destructive"
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
          <PageTitle>บทบาท</PageTitle>
          <PageDescription>กำหนดบทบาทและสิทธิ์การใช้งานของแต่ละบทบาท</PageDescription>
        </PageHeaderText>
        {canCreate && (
          <PageActions>
            <Button onClick={() => setOpenSheet('create')}>
              <Plus className="mr-2 size-4" strokeWidth={2} />
              สร้างบทบาท
            </Button>
          </PageActions>
        )}
      </PageHeader>

      <DataTable id="admin-roles" columns={columns} data={roles} globalSearch filterPlaceholder="ค้นหาบทบาท..." />

      {/* Sheet ตัวเดียวคุมทั้ง create/edit จาก state — checklist สิทธิ์เลื่อนใน body ของ Sheet */}
      <Sheet open={openSheet !== null} onOpenChange={(open) => !open && setOpenSheet(null)}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingRole ? 'แก้ไขบทบาท' : 'สร้างบทบาท'}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {openSheet !== null && (
              <RoleForm
                key={editingRole?.id ?? 'create'}
                allPermissions={allPermissions}
                role={editingRole}
                onSaved={() => setOpenSheet(null)}
                onCancel={() => setOpenSheet(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* destructive = ConfirmActionDialog เสมอ (DESIGN.md §4) — ห้าม window.confirm */}
      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`ลบบทบาท "${deleteTarget?.name ?? ''}"`}
        description={'ผู้ใช้ที่มีบทบาทนี้จะกลายเป็น "ไม่มีบทบาท" และใช้งานได้เฉพาะหน้าทั่วไปจนกว่าจะได้รับบทบาทใหม่'}
        confirmLabel="ลบบทบาท"
        successMessage="ลบบทบาทแล้ว"
        action={async () => {
          if (!deleteTarget) return { error: 'ไม่พบบทบาทที่เลือก' };
          const result = await deleteRoleAction(deleteTarget.id);
          return result.success ? { ok: true } : { error: result.error ?? 'ลบไม่สำเร็จ' };
        }}
      />
    </div>
  );
}
