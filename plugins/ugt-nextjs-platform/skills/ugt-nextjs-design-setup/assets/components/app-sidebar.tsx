// kit: ugt-nextjs-platform 4.81.0 · ugt-nextjs-design-setup/components/app-sidebar.tsx
// kit-hash: 5fd337e0e5a9
// source: ugt-hrms components/app-sidebar.tsx (visuals only) — installed by ugt-nextjs-design-setup (org UI kit)
// The shell's sidebar, built on the shadcn `sidebar-*` block primitives
// (components/ui/sidebar.tsx). Structure is the kit's, not hrms's: the menu is
// rendered from the resolved nav config it is handed (`items` + `groups`,
// types in lib/nav.ts) — the SAME pair <SiteHeader> gets, so the highlight and
// the breadcrumb can never disagree. hrms hardcoded its menu here; the kit
// never does.
//
// What it adds over the bare block (มติ 2026-10-16 D7):
//   - active item = SOLID primary fill — comes from the sanctioned edit to
//     components/ui/sidebar.tsx (layout-shells.md §Sidebar active state), not
//     from a className here, so <AdminNav> and any other menu get it too
//   - menu search box (client-side, label + group heading) — hidden while the
//     sidebar is collapsed to icons, and ignored then so no item vanishes
//     behind a search the user cannot see
//   - a `--cat-*` colour dot before each group heading (decorative; the
//     breadcrumb shows the same dot) — `NavGroup.color`, optional
//   - mobile: tapping an item closes the sheet
// Footer = whatever `footer` is (auth-setup's <NavUser />).
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import {
  NAV_GROUP_DOT,
  filterNavItems,
  findActiveHref,
  groupNavItems,
  type NavGroup,
  type NavItem,
} from '@/lib/nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';

// client component — read the basePath directly (createEnv is empty in the client bundle)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

interface AppSidebarProps {
  /** Resolved, permission-filtered menu — the same list <SiteHeader items> gets */
  items: readonly NavItem[];
  /** Section order + optional `--cat-*` dot per heading — the same list <SiteHeader groups> gets */
  groups?: readonly NavGroup[];
  /** App name in the sidebar header (resolved text) */
  appName: string;
  /** Optional second line under the name */
  appTagline?: string;
  /** Target of the logo/name link */
  homeHref?: string;
  /**
   * Menu search box — on by default (มติ D7). Pass `false` only for a menu
   * short enough to read at a glance, and say why in a comment.
   */
  search?: boolean;
  /** Sidebar footer — auth-setup's <NavUser /> */
  footer?: React.ReactNode;
}

export function AppSidebar({
  items,
  groups = [],
  appName,
  appTagline,
  homeHref = '/',
  search = true,
  footer,
  ...props
}: Readonly<AppSidebarProps & Omit<React.ComponentProps<typeof Sidebar>, 'children'>>) {
  const t = useTranslations('kit.appSidebar');
  const pathname = usePathname();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const [query, setQuery] = React.useState('');

  // ยุบเป็นแถบไอคอน = ช่องค้นหาถูกซ่อน → ห้ามกรองต่อ ไม่งั้นเมนูหายไปโดยมองไม่เห็นเหตุผล
  const searching = search && !(state === 'collapsed' && !isMobile);
  // active คิดจากเมนูทั้งชุด ไม่ใช่ชุดที่กรองแล้ว — ค้นหาอยู่ก็ยังรู้ว่าอยู่หน้าไหน
  const activeHref = findActiveHref(pathname, items);
  const sections = groupNavItems(filterNavItems(items, searching ? query : ''), groups);

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href={homeHref} onClick={closeOnMobile} />}>
              {/* โลโก้ SVG fill="currentColor" ต้องผ่าน CSS mask ไม่ใช่ <img> (ไม่งั้นออกดำ) ·
                  inline style = ข้อยกเว้นค่า dynamic ที่อนุญาต (URL พก basePath) — layout-shells.md */}
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white">
                <span
                  aria-hidden
                  className="h-2 w-7 bg-primary [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat]"
                  style={{ maskImage: `url(${basePath}/brand/ube-logo-short.svg)` }}
                />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">{appName}</span>
                {appTagline && <span className="truncate text-muted-foreground">{appTagline}</span>}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {search && (
          <div className="relative group-data-[collapsible=icon]:hidden">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
            <SidebarInput
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setQuery('');
              }}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              className="pl-8"
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {sections.map(({ group, items: sectionItems }) => (
          <SidebarGroup key={group?.label ?? ''}>
            {group && (
              <SidebarGroupLabel>
                {group.color && (
                  <span
                    aria-hidden
                    className={cn(
                      'mr-2 size-1.5 shrink-0 rounded-full',
                      NAV_GROUP_DOT[group.color]
                    )}
                  />
                )}
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {sectionItems.map((item) => {
                  const count = item.badge ?? 0;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={item.href === activeHref}
                        tooltip={item.label}
                        render={<Link href={item.href} onClick={closeOnMobile} />}
                      >
                        {item.icon && <item.icon strokeWidth={2} aria-hidden />}
                        <span className="truncate">{item.label}</span>
                        {count > 0 && item.badgeLabel && (
                          <span className="sr-only">{item.badgeLabel}</span>
                        )}
                      </SidebarMenuButton>
                      {/* ตัวเลขเปล่า ๆ ไม่มีความหมายกับ screen reader — ข้อความเต็มอยู่ใน sr-only ด้านบน */}
                      {count > 0 && (
                        <SidebarMenuBadge aria-hidden>{formatNumber(count)}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {sections.length === 0 && (
          <p className="px-4 py-2 text-xs text-muted-foreground" role="status">
            {t('noMatch')}
          </p>
        )}
      </SidebarContent>

      <SidebarFooter>{footer}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
