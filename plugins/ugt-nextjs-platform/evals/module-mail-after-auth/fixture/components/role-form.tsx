'use client';
// kit: ugt-nextjs-platform 4.46.1 · ugt-nextjs-auth-setup/components/role-form.tsx
// kit-hash: dd8d9fb19060

// components/role-form.tsx — create/edit a role, with the permission checklist
// in the HRMS shape (มติ 13.3): bordered groups, a tri-state select-all on each
// group header with an n/m count, indented children showing label + mono key,
// and a total-selected pill. Rendered in the Sheet body of roles-manager.tsx for
// both "create" and "edit" (checklist ยาว = Sheet ตามบันได dialog DESIGN.md §4).
// ฟอร์ม = react-hook-form + zodResolver + ui/field (§4) · checklist ไม่ใช่ native
// input จึงผูกผ่าน Controller
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Callout } from '@/components/ui/callout';
import { cn } from '@/lib/utils';
import { groupState, toggleGroup } from '@/lib/permission-group-select';
import { useFieldErrorText } from '@/lib/use-field-error';
import { createRoleAction, updateRoleAction } from '@/lib/actions/admin-roles';

type PermissionOption = { id: string; key: string; label: string; group: string };

const roleFormSchema = z.object({
  name: z.string().trim().min(1, 'ROLE_NAME_REQUIRED'),
  description: z.string().trim(),
  permissionIds: z.array(z.string()),
});
type RoleFormValues = z.infer<typeof roleFormSchema>;

export function RoleForm({
  allPermissions,
  role,
  onSaved,
  onCancel,
}: Readonly<{
  allPermissions: PermissionOption[];
  role?: { id: string; name: string; description: string | null; permissionIds: string[] } | null;
  onSaved: () => void;
  onCancel: () => void;
}>) {
  const t = useTranslations('auth.roleForm');
  const tErrors = useTranslations('auth.errors');
  const fieldError = useFieldErrorText();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: role?.name ?? '',
      description: role?.description ?? '',
      permissionIds: role?.permissionIds ?? [],
    },
  });

  // Plain reduce, not Map.groupBy (ES2024) — avoids forcing a tsconfig lib bump
  // in whatever project this template lands in.
  const groups = new Map<string, PermissionOption[]>();
  for (const perm of allPermissions) {
    const bucket = groups.get(perm.group) ?? [];
    bucket.push(perm);
    groups.set(perm.group, bucket);
  }

  const onSubmit = handleSubmit(async (values) => {
    const input = {
      name: values.name,
      description: values.description,
      permissionIds: values.permissionIds,
    };
    const result = role ? await updateRoleAction(role.id, input) : await createRoleAction(input);
    if (!result.success) {
      setError('root', { message: tErrors(result.code as Parameters<typeof tErrors>[0]) });
      return;
    }
    toast.success(role ? t('editSuccess') : t('createSuccess'));
    onSaved();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errors.root?.message && <Callout tone="danger">{errors.root.message}</Callout>}

      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="role-name">
          {t('nameLabel')}<span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="role-name"
          aria-invalid={!!errors.name}
          disabled={isSubmitting}
          {...register('name')}
        />
        <FieldError errors={fieldError(errors.name)} />
      </Field>

      <Field>
        <FieldLabel htmlFor="role-description">{t('descriptionLabel')}</FieldLabel>
        <Input id="role-description" disabled={isSubmitting} {...register('description')} />
      </Field>

      <Controller
        control={control}
        name="permissionIds"
        render={({ field }) => {
          const selected = new Set(field.value);
          const toggleOne = (id: string, checked: boolean) => {
            const next = new Set(selected);
            if (checked) next.add(id);
            else next.delete(id);
            field.onChange([...next]);
          };
          return (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>{t('permissionsLabel')}</Label>
                {/* ตัวเลขนับ = Badge + tabular-nums (DESIGN.md §4) ไม่ทำ pill เอง */}
                <Badge className="tabular-nums">
                  {selected.size} / {allPermissions.length}
                </Badge>
              </div>
              <div className="overflow-hidden rounded-md border">
                {[...groups.entries()].map(([group, perms], index) => {
                  const groupIds = perms.map((p) => p.id);
                  const state = groupState(groupIds, [...selected]);
                  const selectedInGroup = groupIds.reduce(
                    (n, id) => (selected.has(id) ? n + 1 : n),
                    0
                  );
                  return (
                    <div key={group} className={cn(index > 0 && 'border-t')}>
                      <div className="flex items-center gap-2 border-b bg-muted/40 px-2.5 py-2.5">
                        {/* Base UI: checked เป็น boolean + indeterminate แยก prop —
                            ค่า 'indeterminate' แบบ Radix เป็น truthy จะโชว์เป็นติ๊กเต็มทั้งที่เลือกบางส่วน */}
                        <Checkbox
                          id={`group-${group}`}
                          checked={state === 'all'}
                          indeterminate={state === 'some'}
                          onCheckedChange={() => field.onChange(toggleGroup(groupIds, [...selected]))}
                          aria-label={t('selectGroupAria', { group })}
                          disabled={isSubmitting}
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
                              onCheckedChange={(checked) => toggleOne(perm.id, checked === true)}
                              disabled={isSubmitting}
                            />
                            <Label
                              htmlFor={`perm-${perm.id}`}
                              className="flex flex-1 cursor-pointer flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-sm font-normal"
                            >
                              <span>{perm.label}</span>
                              <span className="font-mono text-xs text-muted-foreground/70">
                                {perm.key}
                              </span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }}
      />

      {/* footer ตามข้อตกลง §4: ยกเลิก (outline) ซ้าย · primary ขวาสุด ปุ่มเดียว */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={2} /> : null}
          {t('save')}
        </Button>
      </div>
    </form>
  );
}
