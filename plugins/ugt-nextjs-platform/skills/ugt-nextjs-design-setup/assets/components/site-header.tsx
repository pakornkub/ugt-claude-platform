// kit: ugt-nextjs-platform 4.58.0 · ugt-nextjs-design-setup/components/site-header.tsx
// kit-hash: e78b7497865c
// source: ugt-hrms site-header pattern — installed by ugt-nextjs-design-setup (org UI kit)
// Mount at the top of SidebarInset in app/(app)/layout.tsx — every sidebar
// shell gets this header; a bare header (trigger only, no breadcrumb/toggles)
// is the install mistake this component exists to prevent.
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

/**
 * One nav entry, labels already resolved (the caller owns t() — this
 * component never touches the catalog, same contract as ADMIN_NAV_ITEMS).
 */
export interface SiteHeaderNavItem {
  /** Resolved menu label, identical to what the sidebar shows */
  label: string;
  href: string;
  /** Resolved group heading the item sits under in the sidebar (if any) */
  group?: string;
}

interface Crumb {
  label: string;
  href?: string;
}

/**
 * Breadcrumb = full path, derived from the SAME nav config the sidebar
 * renders — never hardcoded per page:
 *
 *   group › page                     (a nav page: "งานหลัก › ใบลา")
 *   group › page › segment(s)       (deeper routes: "งานหลัก › ใบลา › LV-0241")
 *
 * The first crumb is the item's GROUP HEADING exactly as the sidebar shows
 * it — never a sibling page's label (hand-built crumbs got this wrong in the
 * field: "ภาพรวม › ใบลา" where ภาพรวม was another page, not the group).
 * Active item = longest href among `pathname === href || startsWith(href+'/')`
 * — the same longest-prefix rule as the sidebar highlight, so the two can
 * never disagree. URL segments beyond the matched href are appended decoded
 * (a record id like LV-0241 reads fine as-is).
 *
 * Exported for its test (site-header.test.ts — copy/skip the pair together).
 */
export function deriveCrumbs(pathname: string, items: readonly SiteHeaderNavItem[]): Crumb[] {
  let active: SiteHeaderNavItem | undefined;
  for (const item of items) {
    const match = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (match && (!active || item.href.length > active.href.length)) active = item;
  }
  if (!active) return [];

  const crumbs: Crumb[] = [];
  if (active.group) crumbs.push({ label: active.group });
  crumbs.push({ label: active.label, href: active.href });
  const rest = pathname.slice(active.href.length).split('/').filter(Boolean);
  for (const segment of rest) crumbs.push({ label: decodeURIComponent(segment) });
  return crumbs;
}

/**
 * The shell's top bar: SidebarTrigger · vertical divider · full-path
 * breadcrumb · right slot. `actions` is the mount point the agreement names
 * for <LanguageSwitcher /> (ภาษา = th+en) then <ThemeToggle /> (dark = มี) —
 * page-specific actions stay in PageActions, not here.
 */
export function SiteHeader({
  items,
  actions,
  className,
}: Readonly<{
  items: readonly SiteHeaderNavItem[];
  actions?: React.ReactNode;
  className?: string;
}>) {
  const pathname = usePathname();
  const crumbs = deriveCrumbs(pathname, items);
  const last = crumbs.length - 1;

  return (
    <header
      className={`flex h-12 shrink-0 items-center gap-2 border-b px-4 ${className ?? ''}`}
    >
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <React.Fragment key={`${crumb.label}-${i}`}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {i === last ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : crumb.href ? (
                  <BreadcrumbLink render={<Link href={crumb.href} />}>
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </header>
  );
}
