'use client';

// components/role-form.tsx — create/edit a role, with permission checkboxes
// grouped by lib/permissions.ts's `group` field. Used inside a Dialog from
// app/(admin)/admin/roles/page.tsx for both "create" and "edit".
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { createRoleAction, updateRoleAction } from '@/lib/actions/admin-roles';

type PermissionOption = { id: string; key: string; label: string; group: string };

export function RoleForm({
  allPermissions,
  role,
  onSaved,
}: Readonly<{
  allPermissions: PermissionOption[];
  role?: { id: string; name: string; description: string | null; permissionIds: string[] } | null;
  onSaved: () => void;
}>) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissionIds ?? []));
  const [isPending, startTransition] = useTransition();

  // Plain reduce, not Map.groupBy (ES2024) — avoids forcing a tsconfig lib bump
  // in whatever project this template lands in.
  const groups = new Map<string, PermissionOption[]>();
  for (const perm of allPermissions) {
    const bucket = groups.get(perm.group) ?? [];
    bucket.push(perm);
    groups.set(perm.group, bucket);
  }

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSubmit() {
    startTransition(async () => {
      const input = { name, description, permissionKeys: [...selected] };
      const result = role ? await updateRoleAction(role.id, input) : await createRoleAction(input);
      if (!result.success) {
        toast.error('บันทึกไม่สำเร็จ', { description: result.error });
        return;
      }
      toast.success(role ? 'แก้ไขบทบาทแล้ว' : 'สร้างบทบาทแล้ว');
      onSaved();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="role-name">ชื่อบทบาท</Label>
        <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} disabled={isPending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role-description">คำอธิบาย</Label>
        <Input
          id="role-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
        />
      </div>
      <div className="space-y-4">
        <Label>สิทธิ์การใช้งาน</Label>
        {[...groups.entries()].map(([group, perms]) => (
          <div key={group} className="space-y-2">
            <p className="text-sm font-medium capitalize text-muted-foreground">{group}</p>
            <div className="grid grid-cols-2 gap-2">
              {perms.map((perm) => (
                <label key={perm.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.has(perm.id)}
                    onCheckedChange={(checked) => toggle(perm.id, checked === true)}
                    disabled={isPending}
                  />
                  {perm.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Button onClick={handleSubmit} disabled={isPending} className="w-full">
        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={2} /> : null}
        บันทึก
      </Button>
    </div>
  );
}
