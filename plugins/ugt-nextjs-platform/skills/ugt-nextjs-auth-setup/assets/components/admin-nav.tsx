// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-auth-setup/components/admin-nav.tsx
// kit-hash: 85cefc8c5fc5
// components/admin-nav.tsx — sidebar for the (admin) section.
// UI hiding is UX only, not the security boundary — every action this nav
// links to re-checks the permission server-side (see references/rbac.md).
import Link from 'next/link';
import { Users, Shield, ScrollText } from 'lucide-react';
import { PERMISSIONS, type PermissionKey } from '@/lib/permissions';

const NAV_ITEMS: Array<{ href: string; label: string; icon: typeof Users; perm: PermissionKey }> = [
  { href: '/admin/users', label: 'ผู้ใช้งาน', icon: Users, perm: PERMISSIONS.USERS_READ },
  { href: '/admin/roles', label: 'บทบาท', icon: Shield, perm: PERMISSIONS.ROLES_READ },
  { href: '/admin/audit-logs', label: 'บันทึกกิจกรรม', icon: ScrollText, perm: PERMISSIONS.AUDIT_LOGS_READ },
];

export function AdminNav({ perms }: Readonly<{ perms: string[] }>) {
  const items = NAV_ITEMS.filter((item) => perms.includes(item.perm));

  return (
    <nav className="w-56 shrink-0 border-r p-4">
      <ul className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <Icon className="size-4" strokeWidth={2} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
