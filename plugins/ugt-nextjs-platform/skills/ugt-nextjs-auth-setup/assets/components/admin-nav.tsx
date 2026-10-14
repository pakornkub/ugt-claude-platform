'use client';
// kit: ugt-nextjs-platform 4.79.0 · ugt-nextjs-auth-setup/components/admin-nav.tsx
// kit-hash: 0b5581c5849a
// components/admin-nav.tsx — admin menu items + fallback sidebar for the (admin) section.
// Two exports:
//   ADMIN_NAV_ITEMS — the menu data. A project that ALREADY has its own
//     sidebar merges these into that nav (filtered by perms, same as below)
//     instead of rendering <AdminNav> — see SKILL.md §5.6. Each item carries
//     `labelKey`, not a resolved `label` string — `t()` (next-intl's
//     useTranslations) only works inside a component/hook body, never at
//     module scope, so the array can't hold pre-translated text. A project
//     merging these in resolves the display text itself, in whatever
//     component renders the merged sidebar, via
//     `useTranslations('auth.adminNav')(item.labelKey)`.
//     Badges: `getAdminNavBadges(perms)` (lib/admin-badges.ts, server) returns
//     `{ [href]: count }` — the users item shows how many logged-in users still
//     have no role. A merged sidebar renders it the same way as below:
//     `<SidebarMenuBadge>` when > 0, plus the `badgeLabelKey` text as sr-only.
//   AdminNav — fallback standalone sidebar, only for projects with no shell yet.
//     Rebuilt on the shadcn Sidebar primitives (4.27.0): the old hand-rolled
//     <nav> broke the "shadcn component exists → use it" rule, had no active
//     state, and couldn't host <NavUser> (useSidebar throws with no
//     SidebarProvider — the provider lives in app/(admin)/layout.tsx).
// UI hiding is UX only, not the security boundary — every action this nav
// links to re-checks the permission server-side (see references/rbac.md).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Users, Shield, ScrollText } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { NavUser, type NavUserProps } from '@/components/nav-user';
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

export function AdminNav({
  perms,
  user,
  badges = {},
}: Readonly<{
  perms: string[];
  /** ตัวตนสำหรับ NavUser ท้าย sidebar (DESIGN.md §3) — layout เป็นคนหาให้ */
  user: NavUserProps;
  /** `getAdminNavBadges(perms)` จาก lib/admin-badges.ts — key = href */
  badges?: Record<string, number>;
}>) {
  const t = useTranslations('auth.adminNav');
  const pathname = usePathname();
  const items = ADMIN_NAV_ITEMS.filter((item) => perms.includes(item.perm));

  // active = longest-prefix ด้วย `${href}/` (กฎ §3 — กัน /admin/users กับ
  // /admin/users/xyz สว่างพร้อมกันคนละแถว และกัน '/' match ทุกอย่าง)
  const activeHref = items
    .map(({ href }) => href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .reduce((best, href) => (href.length > best.length ? href : best), '');

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="truncate px-2 py-1.5 text-sm font-semibold group-data-[collapsible=icon]:hidden">
          {process.env.NEXT_PUBLIC_APP_NAME || t('fallbackAppName')}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('systemGroup')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(({ href, labelKey, icon: Icon, badgeLabelKey }) => {
                const count = badges[href] ?? 0;
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={href === activeHref}
                      tooltip={t(labelKey)}
                      render={<Link href={href} />}
                    >
                      <Icon strokeWidth={2} aria-hidden />
                      <span>{t(labelKey)}</span>
                      {count > 0 && badgeLabelKey && (
                        <span className="sr-only">{t(badgeLabelKey, { count })}</span>
                      )}
                    </SidebarMenuButton>
                    {/* ตัวเลขอย่างเดียวไม่มีความหมายกับ screen reader — ข้อความเต็มอยู่ใน sr-only ด้านบน */}
                    {count > 0 && <SidebarMenuBadge aria-hidden>{count}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser {...user} />
      </SidebarFooter>
    </Sidebar>
  );
}
