'use client';
// kit: ugt-nextjs-platform 4.61.2 · ugt-nextjs-auth-setup/components/user-role-select.tsx
// kit-hash: a249c14ba0d6

// components/user-role-select.tsx — inline role-assign dropdown for one user row.
import { useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { assignUserRoleAction } from '@/lib/actions/admin-users';

const NO_ROLE = '__none__'; // Base UI Select ถือว่า value="" คือ "ยังไม่เลือก" — ดู ugt-nextjs-pitfalls

export function UserRoleSelect({
  userId,
  currentRoleId,
  roles,
  disabled,
}: Readonly<{
  userId: string;
  currentRoleId: string | null;
  roles: Array<{ id: string; name: string }>;
  disabled?: boolean;
}>) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('auth.userRoleSelect');
  const tErrors = useTranslations('auth.errors');

  // Base UI ≥ 1.8 types onValueChange as (value: string | null) — accept null too
  function handleChange(value: string | null) {
    startTransition(async () => {
      const result = await assignUserRoleAction(userId, !value || value === NO_ROLE ? null : value);
      if (!result.success) {
        toast.error(t('changeFailedTitle'), { description: tErrors(result.code as Parameters<typeof tErrors>[0]) });
      }
    });
  }

  return (
    <Select value={currentRoleId ?? NO_ROLE} onValueChange={handleChange} disabled={disabled || isPending}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder={t('noRole')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_ROLE}>{t('noRole')}</SelectItem>
        {roles.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
