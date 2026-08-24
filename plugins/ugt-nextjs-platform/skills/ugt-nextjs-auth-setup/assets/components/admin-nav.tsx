'use client';
// kit: ugt-nextjs-platform 4.46.1 · ugt-nextjs-auth-setup/components/admin-nav.tsx
// kit-hash: cd68cdca498f
// components/admin-nav.tsx — admin menu items + fallback sidebar for the (admin) section.
// One export, AdminNav — fallback standalone sidebar, only for projects with
//   no shell yet. A project that ALREADY has its own sidebar copies the nav
//   items below (filtered by perms, same pattern used here) into that nav
//   instead of rendering <AdminNav> — see SKILL.md §5.6. The item list now
//   lives inside the component (it used to be a module-level
//   `ADMIN_NAV_ITEMS` export) because each `label` comes from `t()`
//   (next-intl's useTranslations), which only works inside a component/hook
//   body, never at module scope.
//   Rebuilt on the shadcn Sidebar primitives (4.27.0): the old hand-rolled
//   <nav> broke the "shadcn component exists → use it" rule, had no active
//   state, and couldn't host <NavUser> (useSidebar throws with no
//   SidebarProvider — the provider lives in app/(admin)/layout.tsx).
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
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { NavUser, type NavUserProps } from '@/components/nav-user';
import { PERMISSIONS, type PermissionKey } from '@/lib/permissions';

export function AdminNav({
  perms,
  user,
}: Readonly<{
  perms: string[];
  /** ตัวตนสำหรับ NavUser ท้าย sidebar (DESIGN.md §3) — layout เป็นคนหาให้ */
  user: NavUserProps;
}>) {
  const t = useTranslations('auth.adminNav');
  const pathname = usePathname();
  const navItems: Array<{ href: string; label: string; icon: typeof Users; perm: PermissionKey }> = [
    { href: '/admin/users', label: t('users'), icon: Users, perm: PERMISSIONS.USERS_READ },
    { href: '/admin/roles', label: t('rolesAndPermissions'), icon: Shield, perm: PERMISSIONS.ROLES_READ },
    { href: '/admin/audit-logs', label: t('auditLogs'), icon: ScrollText, perm: PERMISSIONS.AUDIT_LOGS_READ },
  ];
  const items = navItems.filter((item) => perms.includes(item.perm));

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
              {items.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={href === activeHref}
                    tooltip={label}
                    render={<Link href={href} />}
                  >
                    <Icon strokeWidth={2} aria-hidden />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
