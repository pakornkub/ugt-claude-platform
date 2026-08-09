'use client';

// components/roles-manager.tsx — interactive part of app/(admin)/admin/roles/page.tsx:
// create/edit dialog + delete. The page itself does the server-side guard + fetch.
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อ</TableHead>
            <TableHead>คำอธิบาย</TableHead>
            <TableHead>สิทธิ์</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell>
                {role.name}
                {role.isSystem && (
                  <Badge variant="secondary" className="ml-2">
                    system
                  </Badge>
                )}
              </TableCell>
              <TableCell>{role.description}</TableCell>
              <TableCell>{role.permissionIds.length}</TableCell>
              <TableCell className="flex gap-1">
                {canUpdate && !role.isSystem && (
                  <Dialog
                    open={openDialog === role.id}
                    onOpenChange={(open) => setOpenDialog(open ? role.id : null)}
                  >
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="แก้ไข">
                        <Pencil className="size-4" strokeWidth={2} />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>แก้ไขบทบาท</DialogTitle>
                      </DialogHeader>
                      {editingRole && (
                        <RoleForm
                          allPermissions={allPermissions}
                          role={editingRole}
                          onSaved={() => setOpenDialog(null)}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                )}
                {canDelete && !role.isSystem && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="ลบ"
                    disabled={isPending}
                    onClick={() => handleDelete(role)}
                  >
                    <Trash2 className="size-4" strokeWidth={2} />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
