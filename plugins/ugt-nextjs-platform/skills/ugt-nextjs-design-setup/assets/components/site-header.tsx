// kit: ugt-nextjs-platform 4.81.0 · ugt-nextjs-design-setup/components/site-header.tsx
// kit-hash: 1e03ed8b539d
// source: ugt-hrms site-header pattern — installed by ugt-nextjs-design-setup (org UI kit)
// Mount at the top of SidebarInset in app/(app)/layout.tsx — every sidebar
// shell gets this header; a bare header (trigger only, no breadcrumb/toggles)
// is the install mistake this component exists to prevent.
// Needs lib/nav.ts (the nav contract it shares with components/app-sidebar.tsx)
// + the kit.siteHeader catalog keys.
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FlaskConical, Home } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  NAV_GROUP_DOT,
  findActiveHref,
  navGroupColor,
  type NavGroup,
  type NavGroupColor,
  type NavItem,
} from '@/lib/nav';
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
import { StatusBadge } from '@/components/ui/status-badge';

// dev = basePath ลงท้าย -dev (Jenkinsfile: develop → /<project>-dev) — prod กับ dev หน้าตาเหมือนกันทุกจุด
// ถ้าไม่มีป้ายนี้ ผู้ใช้กรอกข้อมูลจริงลง dev โดยไม่รู้ตัว
const IS_DEV_DEPLOY = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').endsWith('-dev');

/**
 * One nav entry, labels already resolved (the caller owns t() — this
 * component never looks menu text up in a catalog, same contract as
 * ADMIN_NAV_ITEMS). Alias of `NavItem` from lib/nav.ts, kept so call sites
 * written against the older site-header still compile.
 */
export type SiteHeaderNavItem = NavItem;

interface Crumb {
  label: string;
  href?: string;
  /** Only on the group crumb, and only when the nav config gave the group a colour */
  color?: NavGroupColor;
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
 * Active item = `findActiveHref` from lib/nav.ts — the very function the
 * sidebar highlight calls, so the two can never disagree. URL segments
 * beyond the matched href are appended decoded (a record id like LV-0241
 * reads fine as-is). The group crumb carries the group's `--cat-*` colour
 * when `groups` gives it one.
 *
 * Exported for its test (site-header.test.ts — copy/skip the pair together).
 */
export function deriveCrumbs(
  pathname: string,
  items: readonly NavItem[],
  groups: readonly NavGroup[] = []
): Crumb[] {
  const activeHref = findActiveHref(pathname, items);
  const active = items.find((item) => item.href === activeHref);
  if (!active) return [];

  const crumbs: Crumb[] = [];
  if (active.group) {
    const color = navGroupColor(groups, active.group);
    crumbs.push(color ? { label: active.group, color } : { label: active.group });
  }
  crumbs.push({ label: active.label, href: active.href });
  const rest = pathname.slice(active.href.length).split('/').filter(Boolean);
  for (const segment of rest) crumbs.push({ label: decodeURIComponent(segment) });
  return crumbs;
}

/** The group's colour dot — the same dot the sidebar heading shows (decorative). */
function GroupDot({ color, className }: Readonly<{ color?: NavGroupColor; className?: string }>) {
  if (!color) return null;
  return (
    <span
      aria-hidden
      className={cn('size-1.5 shrink-0 rounded-full', NAV_GROUP_DOT[color], className)}
    />
  );
}

/** An earlier crumb: a link when it has an href, plain muted text (with its dot) otherwise. */
function CrumbText({ crumb }: Readonly<{ crumb: Crumb }>) {
  if (crumb.href) {
    return <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>;
  }
  return (
    <>
      <GroupDot color={crumb.color} />
      <span>{crumb.label}</span>
    </>
  );
}

/**
 * The shell's top bar: SidebarTrigger · vertical divider · full-path
 * breadcrumb · right slot. `actions` is the mount point the agreement names
 * for <LanguageSwitcher /> (ภาษา = th+en) then <ThemeToggle /> (dark = มี) —
 * page-specific actions stay in PageActions, not here.
 *
 * Breadcrumb visuals (มติ 2026-10-16 D7, from the ugt-hrms header): starts
 * with a home icon · the group crumb shows its colour dot (the sidebar
 * heading's dot) · on phones (<sm) it collapses to "dot + current page",
 * truncated, so it never pushes the toggles off the bar.
 */
export function SiteHeader({
  items,
  groups = [],
  homeHref = '/',
  actions,
  className,
}: Readonly<{
  items: readonly NavItem[];
  /** The same `groups` the sidebar gets — order + dot colour per heading */
  groups?: readonly NavGroup[];
  /** Target of the leading home icon */
  homeHref?: string;
  actions?: React.ReactNode;
  className?: string;
}>) {
  const t = useTranslations('kit.siteHeader');
  const pathname = usePathname();
  const crumbs = deriveCrumbs(pathname, items, groups);
  const last = crumbs.length - 1;
  const groupColor = crumbs.find((crumb) => crumb.color)?.color;

  return (
    <header
      className={cn(
        // แผงขาว (bg-card) เหมือน sidebar บนพื้นหน้าเทาฟ้า (D3) · px ตรงกับ PageShell (px-4 md:p-6)
        'flex h-12 shrink-0 items-center gap-2 border-b bg-card px-4 shadow-xs md:px-6',
        className
      )}
    >
      <SidebarTrigger className="-ml-1" />
      {/* ui/separator ใส่ self-stretch ให้แนวตั้ง — ทับ items-center ของ header เส้น h-4 จึงติดขอบบน · self-center ดึงกลับมากลาง */}
      <Separator
        orientation="vertical"
        className="mx-1 data-[orientation=vertical]:h-4 data-vertical:self-center"
      />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          {/* มือถือ: ซ่อนบ้าน + crumb กลาง เหลือ "จุดสีกลุ่ม + หน้าปัจจุบัน" (truncate) ไม่เบียดปุ่มขวา */}
          <BreadcrumbItem className="hidden sm:inline-flex">
            <BreadcrumbLink render={<Link href={homeHref} aria-label={t('home')} />}>
              <Home className="size-3.5" strokeWidth={2} aria-hidden />
            </BreadcrumbLink>
          </BreadcrumbItem>
          {crumbs.map((crumb, i) => (
            <React.Fragment key={`${crumb.label}-${i}`}>
              <BreadcrumbSeparator className="hidden sm:block" />
              {i === last ? (
                <BreadcrumbItem className="min-w-0">
                  <GroupDot color={groupColor} className="sm:hidden" />
                  <BreadcrumbPage className="truncate font-medium">{crumb.label}</BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                <BreadcrumbItem className="hidden sm:inline-flex">
                  <CrumbText crumb={crumb} />
                </BreadcrumbItem>
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {IS_DEV_DEPLOY && (
          <StatusBadge tone="warning" icon={FlaskConical}>
            DEV
          </StatusBadge>
        )}
        {actions}
      </div>
    </header>
  );
}
