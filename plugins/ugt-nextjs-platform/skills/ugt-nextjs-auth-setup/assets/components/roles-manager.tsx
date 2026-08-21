'use client';
// kit: ugt-nextjs-platform 4.24.0 · ugt-nextjs-auth-setup/components/roles-manager.tsx
// kit-hash: 4b2aaec713c2
// components/roles-manager.tsx — interactive part of app/(admin)/admin/roles/page.tsx:
// DataTable โหมด client (บทบาทมีไม่กี่แถว — DESIGN.md §4) + create/edit dialog +
// delete. The page itself does the server-side guard + fetch. ต้องมี org UI kit
// จาก ugt-nextjs-design-setup ก่อน — โปรเจคที่ไม่มี kit ดู SKILL.md §4
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
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
  const [openDialog, setOpenDialog] = useState<'create' | string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(role: RoleRow) {
    // ponytail: window.confirm — a full alert-dialog component isn't worth
    // the extra shadcn install for a single destructive action. Upgrade if
    // the project already has alert-dialog for other reasons.
    if (!window.confirm(`ลบบทบาท "${role.name}"? ผู้ใช้ที่มีบทบาทนี้จะกลายเป็น "ไม่มีบทบาท"`)) return;
    startTransition(async () => {
      const result = await deleteRoleAction(role.id);
      if (!result.success) toast.error('ลบไม่สำเร็จ', { description: result.error });
      else toast.success('ลบบทบาทแล้ว');
    });
  }

  const editingRole = roles.find((r) => r.id === openDialog) ?? null;

  const columns: ColumnDef<RoleRow>[] = [
    {
      accessorKey: 'name',
      header: 'ชื่อ',
      cell: ({ row }) => (
        <>
          {row.original.name}
          {row.original.isSystem && (
            <Badge variant="secondary" className="ml-2">
              system
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
    // id 'actions' = คอลัมน์ตรึงท้ายของ DataTable (ลาก/ซ่อนไม่ได้) · บทบาท system
    // แก้/ลบไม่ได้ · ปุ่มถูกซ่อนเมื่อไม่มีสิทธิ์ ไม่ใช่ disable — ด่านจริงอยู่ในแอ็กชัน
    ...(canUpdate || canDelete
      ? [
          {
            id: 'actions',
            header: '',
            meta: { mobileLabel: 'จัดการ' },
            cell: ({ row }) =>
              row.original.isSystem ? null : (
                <div className="flex justify-end gap-1">
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="แก้ไข"
                      onClick={() => setOpenDialog(row.original.id)}
                    >
                      <Pencil className="size-4" strokeWidth={2} />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="ลบ"
                      disabled={isPending}
                      onClick={() => handleDelete(row.original)}
                    >
                      <Trash2 className="size-4" strokeWidth={2} />
                    </Button>
                  )}
                </div>
              ),
          } satisfies ColumnDef<RoleRow>,
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">บทบาท</h1>
        {canCreate && (
          <Dialog open={openDialog === 'create'} onOpenChange={(open) => setOpenDialog(open ? 'create' : null)}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" strokeWidth={2} />
                สร้างบทบาท
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>สร้างบทบาท</DialogTitle>
              </DialogHeader>
              <RoleForm allPermissions={allPermissions} onSaved={() => setOpenDialog(null)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <DataTable id="admin-roles" columns={columns} data={roles} globalSearch filterPlaceholder="ค้นหาบทบาท..." />

      {/* dialog แก้ไขตัวเดียวคุมจาก state — ไม่ mount Dialog ต่อแถวเหมือนตอนใช้ Table ดิบ */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขบทบาท</DialogTitle>
          </DialogHeader>
          {editingRole && (
            <RoleForm allPermissions={allPermissions} role={editingRole} onSaved={() => setOpenDialog(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
