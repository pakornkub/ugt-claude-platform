// kit: ugt-nextjs-platform 4.81.0 · ugt-nextjs-design-setup/lib/nav.ts
// kit-hash: 821e84a70cd9
// installed by ugt-nextjs-design-setup (org UI kit) — the shell's nav contract
// ONE resolved item list feeds both <AppSidebar> (components/app-sidebar.tsx)
// and <SiteHeader> (components/site-header.tsx): the menu highlight and the
// breadcrumb read the same items through the same `findActiveHref`, so the
// two can never disagree. The project's own menu (components/nav-items.ts or
// a client hook that resolves t() + permissions) builds the list; this file
// holds only types + pure helpers, never menu data.
//
// Pure module (no React, no 'use client') — safe to import from server and
// client code alike. Note the list itself carries `icon` (a component), so it
// cannot be passed from a Server Component into a Client Component as a prop;
// resolve it inside a client component (references/nav-config.md).
import type { LucideIcon } from 'lucide-react';

/**
 * Group dot colours = the decorative categorical palette `--cat-1..8`
 * (globals.css), never a `status-*` token: status colours carry meaning
 * (รอ / อนุมัติ / ปฏิเสธ) and a menu group is not a state (มติ 2026-10-16 D7 —
 * ugt-hrms used status-* here, recorded as a deviation not taken).
 */
export const NAV_GROUP_COLORS = [
  'cat-1',
  'cat-2',
  'cat-3',
  'cat-4',
  'cat-5',
  'cat-6',
  'cat-7',
  'cat-8',
] as const;
export type NavGroupColor = (typeof NAV_GROUP_COLORS)[number];

/** Literal class per colour — Tailwind only generates classes it can read verbatim in source. */
export const NAV_GROUP_DOT: Readonly<Record<NavGroupColor, string>> = {
  'cat-1': 'bg-cat-1',
  'cat-2': 'bg-cat-2',
  'cat-3': 'bg-cat-3',
  'cat-4': 'bg-cat-4',
  'cat-5': 'bg-cat-5',
  'cat-6': 'bg-cat-6',
  'cat-7': 'bg-cat-7',
  'cat-8': 'bg-cat-8',
};

/** One sidebar section. Order of the `groups` array = order in the sidebar. */
export interface NavGroup {
  /** Resolved heading text, exactly as the sidebar shows it (the first breadcrumb) */
  label: string;
  /** Optional dot before the heading — the breadcrumb shows the same dot */
  color?: NavGroupColor;
}

/**
 * One menu entry, labels already resolved (the caller owns t() — kit
 * components never look up menu text in a catalog).
 */
export interface NavItem {
  /** Resolved menu label */
  label: string;
  href: string;
  /** lucide icon — menu items are icon + label (DESIGN.md §3) */
  icon?: LucideIcon;
  /** Resolved heading of the group the item sits under — must equal a `NavGroup.label` */
  group?: string;
  /**
   * Permission needed to see the item. Filtered by the CALLER before the list
   * reaches the shell ("hidden, not disabled" — the server guard is the real
   * boundary); the kit components ignore it.
   */
  permission?: string;
  /** Count at the row end (SidebarMenuBadge) — renders only when > 0 */
  badge?: number;
  /** Resolved screen-reader text for the badge ("3 คนยังไม่มีบทบาท") — a bare number means nothing */
  badgeLabel?: string;
}

/**
 * The active item = the LONGEST href among `pathname === href ||
 * pathname.startsWith(href + '/')`. The `+ '/'` stops `/` matching every
 * route; the longest match stops `/leave` and `/leave-history` lighting up
 * together (a bug both source projects hit).
 */
export function findActiveHref(
  pathname: string,
  items: readonly Pick<NavItem, 'href'>[]
): string | undefined {
  let best: string | undefined;
  for (const { href } of items) {
    const match = pathname === href || pathname.startsWith(`${href}/`);
    if (match && (best === undefined || href.length > best.length)) best = href;
  }
  return best;
}

/**
 * Menu search: case-insensitive substring on the item label OR its group
 * heading (typing a heading shows that whole section). Blank = everything.
 */
export function filterNavItems<T extends NavItem>(items: readonly T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [...items];
  return items.filter(
    (item) => item.label.toLowerCase().includes(q) || (item.group ?? '').toLowerCase().includes(q)
  );
}

/** Colour of a group heading, if the nav config gave it one. */
export function navGroupColor(
  groups: readonly NavGroup[],
  label: string | undefined
): NavGroupColor | undefined {
  if (label === undefined) return undefined;
  return groups.find((g) => g.label === label)?.color;
}

export interface NavSection<T extends NavItem = NavItem> {
  /** undefined = items without a group (rendered first, no heading) */
  group?: NavGroup;
  items: T[];
}

/**
 * Items → sidebar sections in `groups` order. Never drops an item: an item
 * whose `group` is missing from `groups` still gets a section (appended, no
 * colour) — a filtered-by-order-list menu silently lost every item whose
 * group text had a typo. Empty sections are omitted.
 */
export function groupNavItems<T extends NavItem>(
  items: readonly T[],
  groups: readonly NavGroup[] = []
): NavSection<T>[] {
  const ungrouped = items.filter((item) => item.group === undefined);
  const sections: NavSection<T>[] = ungrouped.length > 0 ? [{ items: ungrouped }] : [];
  const known = new Set(groups.map((g) => g.label));
  const unknown: NavGroup[] = [];
  for (const item of items) {
    if (item.group === undefined || known.has(item.group)) continue;
    if (!unknown.some((g) => g.label === item.group)) unknown.push({ label: item.group });
  }
  for (const group of [...groups, ...unknown]) {
    const inGroup = items.filter((item) => item.group === group.label);
    if (inGroup.length > 0) sections.push({ group, items: inGroup });
  }
  return sections;
}
