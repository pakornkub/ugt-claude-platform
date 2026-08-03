'use client';

// components/user-role-select.tsx — inline role-assign dropdown for one user row.
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { assignUserRoleAction } from '@/lib/actions/admin-users';

const NO_ROLE = '__none__'; // Radix Select rejects an empty-string item value

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

  function handleChange(value: string) {
    startTransition(async () => {
      const result = await assignUserRoleAction(userId, value === NO_ROLE ? null : value);
      if (!result.success) toast.error('เปลี่ยนบทบาทไม่สำเร็จ', { description: result.error });
    });
  }

  return (
    <Select value={currentRoleId ?? NO_ROLE} onValueChange={handleChange} disabled={disabled || isPending}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="ไม่มีบทบาท" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_ROLE}>ไม่มีบทบาท</SelectItem>
        {roles.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
