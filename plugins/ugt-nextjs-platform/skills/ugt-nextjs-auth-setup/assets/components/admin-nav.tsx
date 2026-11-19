'use client';
// kit: ugt-nextjs-platform 4.98.0 · ugt-nextjs-auth-setup/components/admin-nav.tsx
// kit-hash: 938b7afe1b87
// components/admin-nav.tsx — fallback sidebar for the (admin) section.
// The menu DATA lives in components/admin-nav-items.ts (a plain module) — import
// ADMIN_NAV_ITEMS from there, never from this 'use client' file: a Server
// Component importing it from here gets a client reference, not the array.
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
import { ADMIN_NAV_ITEMS } from '@/components/admin-nav-items';

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
