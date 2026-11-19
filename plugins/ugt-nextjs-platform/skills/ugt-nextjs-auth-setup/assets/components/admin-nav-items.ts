// kit: ugt-nextjs-platform unreleased · ugt-nextjs-auth-setup/components/admin-nav-items.ts
// kit-hash: 45a76386005f
// components/admin-nav-items.ts — the admin menu data, in a PLAIN module (no
// 'use client') so a Server Component shell can read it too. Imported from the
// 'use client' admin-nav.tsx, a Server Component gets a client reference
// instead of the array and `.filter` throws — every page under that shell 500s.
//
// A project that ALREADY has its own sidebar merges these into that nav
// (filtered by perms) instead of rendering <AdminNav> — SKILL.md §5.6. Each item
// carries `labelKey`, not a resolved `label`: resolve it where the merged nav is
// rendered — `useTranslations('auth.adminNav')` in a client component, or
// `getTranslations('auth.adminNav')` in a server one.
// Badges: `getAdminNavBadges(perms)` (lib/admin-badges.ts, server) returns
// `{ [href]: count }` — render `<SidebarMenuBadge>` when > 0, plus the
// `badgeLabelKey` text as sr-only.
// UI hiding is UX only, not the security boundary — every page/action re-checks
// the permission server-side (see references/rbac.md).
import { Users, Shield, ScrollText } from 'lucide-react';
import { PERMISSIONS, type PermissionKey } from '@/lib/permissions';

export const ADMIN_NAV_ITEMS: Array<{
  href: string;
  labelKey: string;
  icon: typeof Users;
  perm: PermissionKey;
  /** auth.adminNav key read by screen readers next to the badge count ({count}) */
  badgeLabelKey?: string;
}> = [
  { href: '/admin/users', labelKey: 'users', icon: Users, perm: PERMISSIONS.USERS_READ, badgeLabelKey: 'usersWithoutRole' },
  { href: '/admin/roles', labelKey: 'rolesAndPermissions', icon: Shield, perm: PERMISSIONS.ROLES_READ },
  { href: '/admin/audit-logs', labelKey: 'auditLogs', icon: ScrollText, perm: PERMISSIONS.AUDIT_LOGS_READ },
];
