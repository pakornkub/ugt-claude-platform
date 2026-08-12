'use client';
// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-auth-setup/components/role-form.tsx
// kit-hash: c7de0653d5b6

// components/role-form.tsx — create/edit a role, with the permission checklist
// in the HRMS shape (มติ 13.3): bordered groups, a tri-state select-all on each
// group header with an n/m count, indented children showing label + mono key,
// and a total-selected pill. Used inside a Dialog from
// app/(admin)/admin/roles/page.tsx for both "create" and "edit".
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { groupCheckedValue, groupState, toggleGroup } from '@/lib/permission-group-select';
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
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>สิทธิ์การใช้งาน</Label>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary tabular-nums">
            {selected.size} / {allPermissions.length}
          </span>
        </div>
        <div className="overflow-hidden rounded-md border">
          {[...groups.entries()].map(([group, perms], index) => {
            const groupIds = perms.map((p) => p.id);
            const state = groupState(groupIds, [...selected]);
            const selectedInGroup = groupIds.reduce((n, id) => (selected.has(id) ? n + 1 : n), 0);
            return (
              <div key={group} className={cn(index > 0 && 'border-t')}>
                <div className="flex items-center gap-2 border-b bg-muted/40 px-2.5 py-2.5">
                  <Checkbox
                    id={`group-${group}`}
                    checked={groupCheckedValue(state)}
                    onCheckedChange={() => setSelected(new Set(toggleGroup(groupIds, [...selected])))}
                    aria-label={`เลือกทั้งกลุ่ม ${group}`}
                    disabled={isPending}
                  />
                  <Label
                    htmlFor={`group-${group}`}
                    className="flex-1 cursor-pointer text-sm font-medium capitalize"
                  >
                    {group}
                  </Label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {selectedInGroup} / {groupIds.length}
                  </span>
                </div>
                {/* เยื้อง pl-9 ให้ checkbox ลูกอยู่ใต้ label หัวกลุ่ม → เห็นลำดับชั้นแม่-ลูก */}
                <div className="flex flex-col gap-2.5 py-2.5 pr-2.5 pl-9">
                  {perms.map((perm) => (
                    <div key={perm.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`perm-${perm.id}`}
                        checked={selected.has(perm.id)}
                        onCheckedChange={(checked) => toggle(perm.id, checked === true)}
                        disabled={isPending}
                      />
                      <Label
                        htmlFor={`perm-${perm.id}`}
                        className="flex flex-1 cursor-pointer flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[13px] font-normal"
                      >
                        <span>{perm.label}</span>
                        <span className="font-mono text-xs text-muted-foreground/70">{perm.key}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={isPending} className="w-full">
        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={2} /> : null}
        บันทึก
      </Button>
    </div>
  );
}
