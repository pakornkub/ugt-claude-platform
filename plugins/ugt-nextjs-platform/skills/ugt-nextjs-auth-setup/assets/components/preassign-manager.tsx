'use client';
// kit: ugt-nextjs-platform 4.79.0 · ugt-nextjs-auth-setup/components/preassign-manager.tsx
// kit-hash: 0c2019f71f9a
// components/preassign-manager.tsx — แท็บ "ตั้งล่วงหน้า (รอเข้าระบบ)" ของ /admin/users
// installed by ugt-nextjs-auth-setup — [DIRECTORY]: ลบไฟล์นี้เมื่อไม่มี view พนักงาน
//
// ตั้ง role ให้คนที่ยังไม่เคย login: ค้น view HR → เลือกคน → เลือก role → บันทึก
// ไม่ได้สร้างบัญชี (มติ 2026-08-11 แก้ 2026-10-14) — lib/after-login.ts ใส่ role ให้
// ตอนเจ้าตัว SSO/LDAP login สำเร็จครั้งแรก แล้วแถวจะหายจากแท็บนี้เอง
// DataTable โหมด client (แถวรอมีไม่กี่แถว — DESIGN.md §4) · ลบผ่าน ConfirmActionDialog
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { type ColumnDef } from '@tanstack/react-table';
import { Loader2, Search, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { IconAction } from '@/components/ui/icon-action';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { Callout } from '@/components/ui/callout';
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
} from '@/components/ui/form-dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  createPreassignAction,
  deletePreassignAction,
  searchHrForPreassignAction,
  updatePreassignAction,
  type HrCandidate,
} from '@/lib/actions/admin-preassign';

type RoleOption = { id: string; name: string };
export type PreassignRow = {
  id: string;
  empCode: string;
  loginName: string;
  fullName: string;
  email: string | null;
  roleId: string;
  createdAt: Date;
  createdByName: string | null;
};

export function PreassignManager({
  rows,
  roles,
  canUpdate,
}: Readonly<{ rows: PreassignRow[]; roles: RoleOption[]; canUpdate: boolean }>) {
  const t = useTranslations('auth.preassign');
  const tErrors = useTranslations('auth.errors');
  const [deleteTarget, setDeleteTarget] = useState<PreassignRow | null>(null);

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? '-';
  const columns: ColumnDef<PreassignRow>[] = [
    { accessorKey: 'fullName', header: t('colName') },
    { accessorKey: 'empCode', header: t('colEmpCode') },
    { accessorKey: 'loginName', header: t('colLoginName') },
    { accessorKey: 'email', header: t('colEmail') },
    {
      id: 'role',
      header: t('colRole'),
      meta: { mobileLabel: t('colRole') },
      cell: ({ row }) =>
        canUpdate ? (
          <PreassignRoleSelect id={row.original.id} roleId={row.original.roleId} roles={roles} />
        ) : (
          roleName(row.original.roleId)
        ),
    },
    {
      accessorKey: 'createdAt',
      header: t('colCreatedAt'),
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    { accessorKey: 'createdByName', header: t('colCreatedBy') },
    // ไม่มีสิทธิ์ = ซ่อนปุ่ม (ไม่ใช่ disable) — ด่านจริงอยู่ในแอ็กชัน
    ...(canUpdate
      ? [
          {
            id: 'actions',
            header: '',
            meta: { mobileLabel: t('colActions') },
            cell: ({ row }) => (
              <div className="flex justify-end">
                <IconAction label={t('delete')} tone="danger" onClick={() => setDeleteTarget(row.original)}>
                  <Trash2 className="size-4" strokeWidth={2} />
                </IconAction>
              </div>
            ),
          } satisfies ColumnDef<PreassignRow>,
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t('hint')}</p>
        {canUpdate && <AddFromHrDialog roles={roles} />}
      </div>
      <DataTable id="admin-users-preassign" columns={columns} data={rows} globalSearch filterPlaceholder={t('searchPlaceholder')} />
      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('deleteTitle', { name: deleteTarget?.fullName ?? '' })}
        description={t('deleteDescription')}
        confirmLabel={t('delete')}
        successMessage={t('deleteSuccess')}
        action={async () => {
          if (!deleteTarget) return { ok: true };
          const result = await deletePreassignAction(deleteTarget.id);
          return result.success ? { ok: true } : { error: tErrors(result.code as Parameters<typeof tErrors>[0]) };
        }}
      />
    </div>
  );
}

/** แก้ role ของแถวรอ — inline แบบเดียวกับ UserRoleSelect ในแท็บทั้งหมด */
function PreassignRoleSelect({ id, roleId, roles }: Readonly<{ id: string; roleId: string; roles: RoleOption[] }>) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('auth.preassign');
  const tErrors = useTranslations('auth.errors');
  return (
    <Select
      // items: without it Base UI renders the raw value in <SelectValue> (a cuid)
      items={roles.map((r) => ({ value: r.id, label: r.name }))}
      value={roleId}
      onValueChange={(value: string | null) => {
        if (!value || value === roleId) return;
        startTransition(async () => {
          const result = await updatePreassignAction(id, value);
          if (!result.success) {
            toast.error(t('updateFailed'), { description: tErrors(result.code as Parameters<typeof tErrors>[0]) });
          }
        });
      }}
      disabled={isPending}
    >
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const ADD_FORM_ID = 'preassign-add-form';
// เหตุที่เลือกคนนี้ไม่ได้ — catalog เป็น key ชั้นเดียว จึงแม็ปแทนการต่อสตริง
const STATUS_LABEL_KEY = {
  'has-account': 'statusHasAccount',
  pending: 'statusPending',
  'no-ad': 'statusNoAd',
} as const;

/** ค้น view HR → เลือกคน → เลือก role — server หาตัวตนจาก view ซ้ำเองตอนบันทึก */
function AddFromHrDialog({ roles }: Readonly<{ roles: RoleOption[] }>) {
  const t = useTranslations('auth.preassign');
  const tErrors = useTranslations('auth.errors');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<HrCandidate[] | null>(null);
  const [picked, setPicked] = useState<HrCandidate | null>(null);
  const [roleId, setRoleId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isSaving, startSave] = useTransition();

  const reset = () => {
    setQuery('');
    setPeople(null);
    setPicked(null);
    setRoleId('');
    setError(null);
  };

  const search = () => {
    setError(null);
    setPicked(null);
    startSearch(async () => {
      const result = await searchHrForPreassignAction(query);
      if (!result.success) {
        setError(tErrors(result.code as Parameters<typeof tErrors>[0]));
        return;
      }
      setPeople(result.people);
    });
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!picked || !roleId) {
      setError(t('pickBoth'));
      return;
    }
    startSave(async () => {
      const result = await createPreassignAction({ empCode: picked.empCode, roleId });
      if (!result.success) {
        setError(tErrors(result.code as Parameters<typeof tErrors>[0]));
        return;
      }
      toast.success(t('createSuccess', { name: picked.name }));
      setOpen(false);
      reset();
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" strokeWidth={2} />
        {t('addFromHr')}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <FormDialogContent className="sm:max-w-xl">
          <FormDialogHeader>
            <DialogTitle>{t('addFromHr')}</DialogTitle>
            <DialogDescription>{t('addDescription')}</DialogDescription>
          </FormDialogHeader>

          <FormDialogBody>
            <div className="flex flex-col gap-4">
              {error && <Callout tone="danger">{error}</Callout>}

              {/* ค้นหาเป็นฟอร์มแยก — Enter ในช่องค้นหาต้องไม่ไปกดบันทึก */}
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  search();
                }}
              >
                <Input
                  aria-label={t('searchLabel')}
                  placeholder={t('searchHrPlaceholder')}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <Button type="submit" variant="outline" disabled={isSearching || query.trim().length < 2}>
                  {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" strokeWidth={2} />}
                  {t('searchButton')}
                </Button>
              </form>

              {people?.length === 0 && <p className="text-sm text-muted-foreground">{t('noResults')}</p>}
              {people && people.length > 0 && (
                <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto" aria-label={t('resultsLabel')}>
                  {people.map((person) => {
                    const selectable = person.status === 'available';
                    const selected = picked?.empCode === person.empCode;
                    return (
                      <li key={person.empCode}>
                        <button
                          type="button"
                          disabled={!selectable}
                          aria-pressed={selected}
                          onClick={() => setPicked(person)}
                          className={cn(
                            'flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                            'hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent',
                            selected && 'border-primary bg-primary/5'
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block font-medium">{person.name}</span>
                            <span className="block truncate text-muted-foreground">
                              {[person.empCode, person.loginName, person.position, person.department]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          </span>
                          {!selectable && (
                            <Badge variant="outline" className="shrink-0">
                              {t(STATUS_LABEL_KEY[person.status as Exclude<HrCandidate['status'], 'available'>])}
                            </Badge>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <form id={ADD_FORM_ID} onSubmit={save}>
                <Field>
                  <FieldLabel htmlFor="preassign-role">{t('roleLabel')}</FieldLabel>
                  <Select
                    items={roles.map((r) => ({ value: r.id, label: r.name }))}
                    value={roleId || null}
                    onValueChange={(value: string | null) => setRoleId(value ?? '')}
                  >
                    <SelectTrigger id="preassign-role">
                      <SelectValue placeholder={t('rolePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </form>
            </div>
          </FormDialogBody>

          <FormDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                // setOpen(false) alone skips onOpenChange — clear the search/pick too
                setOpen(false);
                reset();
              }}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" form={ADD_FORM_ID} disabled={isSaving || !picked || !roleId}>
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {t('save')}
            </Button>
          </FormDialogFooter>
        </FormDialogContent>
      </Dialog>
    </>
  );
}
