# Nav config + site header — one menu → `AppSidebar` + `SiteHeader`

Moved out of `layout-shells.md` (release 2 of backlog §14, มติ 2026-10-16 D7) — its shell steps
(cleanup 4–5) point here for the data the two components share and for the header itself.
Kit files: `components/app-sidebar.tsx` · `components/site-header.tsx` · `lib/nav.ts`
(+ `lib/nav.test.ts`) — provenance in `kit-inventory.md`.

The menu exists **once**, as data, and both `<AppSidebar>` and `<SiteHeader>`
render from it — the highlight and the breadcrumb then go through the same
`findActiveHref` (`lib/nav.ts`) and cannot disagree. Types live in
`lib/nav.ts` (kit); the menu itself is the project's:

```ts
// components/nav-items.ts — project-owned (not a kit file)
import { CalendarDays, FileBarChart } from 'lucide-react';
import type { NavGroup, NavItem } from '@/lib/nav';

/** Sidebar order: งานหลัก → รายงาน → ตั้งค่า/admin ล่างสุด · color = optional dot */
export const NAV_GROUPS: readonly NavGroup[] = [
  { label: 'งานหลัก', color: 'cat-1' },
  { label: 'รายงาน', color: 'cat-6' },
  { label: 'ตั้งค่า', color: 'cat-8' },
];

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'คำขอลา', href: '/leave', icon: CalendarDays, group: 'งานหลัก' },
  { label: 'สรุปรายเดือน', href: '/reports/monthly', icon: FileBarChart, group: 'รายงาน', permission: 'reports:read' },
];
```

- `group` on an item = the exact heading text of a `NavGroup` (the first
  breadcrumb). An item whose group is missing from `NAV_GROUPS` still renders
  (appended section, no dot) — `groupNavItems` never drops a menu entry.
- **Group colour = `--cat-1..8` only** (`NavGroupColor`), never `status-*`:
  status colours mean รอ/อนุมัติ/ปฏิเสธ and a menu group is not a state
  (ugt-hrms used status tokens here — a deviation the kit did not take).
  Optional; one colour per group; the breadcrumb shows the same dot.
- Labels are **resolved text**. Under th+en resolve them where hooks work (a
  client component): `t(labelKey)` per item and per group.
- **The list cannot cross the server → client boundary**: items carry `icon`
  (a component), and RSC refuses to serialize it — so a Server Component
  layout must not pass `NAV_ITEMS` to `<AppSidebar>`/`<SiteHeader>` as a
  prop. Pass only plain data (`perms: string[]`, the NavUser identity,
  `badges: Record<href, number>`) into one project-owned client file that
  builds the list and renders both:

```tsx
// components/app-nav.tsx — 'use client', project-owned
export function useShellNav(perms: readonly string[], badges: Readonly<Record<string, number>> = {}) {
  const t = useTranslations('auth.adminNav');
  const admin = ADMIN_NAV_ITEMS.filter((i) => perms.includes(i.perm)).map((i) => ({
    label: t(i.labelKey), href: i.href, icon: i.icon, group: t('systemGroup'),
    badge: badges[i.href], badgeLabel: i.badgeLabelKey ? t(i.badgeLabelKey, { count: badges[i.href] ?? 0 }) : undefined,
  }));
  const items = [...NAV_ITEMS.filter((i) => !i.permission || perms.includes(i.permission)), ...admin];
  const groups = [...NAV_GROUPS, { label: t('systemGroup'), color: 'cat-8' as const }];
  return { items, groups };
}
export function AppShellSidebar({ perms, badges, user }: Readonly<{ … }>) {
  return <AppSidebar {...useShellNav(perms, badges)} appName="ระบบคำขอลา" footer={<NavUser {...user} />} />;
}
export function AppShellHeader({ perms }: Readonly<{ perms: readonly string[] }>) {
  return <SiteHeader {...useShellNav(perms)} actions={<><LanguageSwitcher /><ThemeToggle /></>} />;
}
```

  (Admin items + badges are auth-setup's — §5.6 of its SKILL.md; a project
  with no login yet skips the permission filter and the admin merge.)
  `app/(app)/layout.tsx` then renders `<SidebarProvider><AppShellSidebar … />
  <SidebarInset><AppShellHeader … />{children}</SidebarInset></SidebarProvider>`.

## Site header (ทุก shell ที่มี sidebar — ไม่ใช่ของเสริม)

`components/site-header.tsx` (kit asset, extracted from the HRMS header —
before 4.58.0 it existed only as words pointing at HRMS code, which is why
installs shipped empty top bars). Composition, left→right:

1. `SidebarTrigger` — the collapse button.
2. Vertical `Separator` — `h-4` **plus `data-vertical:self-center`**: `ui/separator`
   gives vertical separators `self-stretch`, which overrides the header's
   `items-center`, so a fixed-height line hugs the top edge instead of sitting
   in the middle (looked like a broken/missing line next to the trigger).
3. **Breadcrumb = เส้นทางเต็ม** derived from the SAME nav config the sidebar
   renders (pass the resolved items in — labels identical to the menu, never
   hardcoded): `group › หน้า` on a nav page ("งานหลัก › ใบลา"), plus any
   deeper URL segments appended decoded ("งานหลัก › ใบลา › LV-0241").
   **The first crumb is the item's group HEADING as the sidebar shows it —
   never a sibling page's label** (hand-built crumbs shipped
   "ภาพรวม › ใบลา" where ภาพรวม was another page; the `group` field on each
   nav item must therefore carry the exact heading text). Active item = the
   same `findActiveHref` (`lib/nav.ts`) the sidebar highlight calls, so
   header and sidebar can never disagree — `deriveCrumbs` is exported and
   locked by `site-header.test.ts` (copy/skip the pair together). Last crumb =
   current page (no link); earlier crumbs link.
   **Visuals (มติ 2026-10-16 D7, from ugt-hrms)**: the trail starts with a
   home icon (`homeHref`, aria-label from `kit.siteHeader.home`) · the group
   crumb shows its `--cat-*` dot when `groups` (same array as the sidebar)
   gives one · below `sm` the trail collapses to **dot + current page**,
   truncated, so it never pushes the toggles off the bar. Pass the same
   `items` + `groups` the sidebar gets — never a second list.
4. Right slot (`actions` prop) — **the mount point for the toggles**:
   `<LanguageSwitcher />` (เมื่อ ภาษา = th+en) then `<ThemeToggle />`
   (เมื่อ dark mode = มี). Copying those two components and rendering them
   nowhere was the other half of the empty-header bug. Page-specific
   actions do NOT go here — they stay in `PageActions`.
5. **ป้าย `DEV`** (built into the asset, left of the toggles) — a warning
   `StatusBadge` shown when `NEXT_PUBLIC_BASE_PATH` ends with `-dev`, which is
   exactly the develop deploy (`ugt-nextjs-ci.md`: develop = everything
   suffixed `-dev`). prod and dev share one host and look identical, so
   without it nothing but the URL says which one a user is typing into. No new env
   var — the basePath already tells the two apart. It is the **compact** signal:
   the primary one is the full-width amber `<DevEnvironmentBar />` mounted in
   `app/layout.tsx` above the whole shell (SKILL.md step 3.3 → `root-layout.md` §DEV environment indicator) — it also covers the
   login page, which has no header — plus the `[DEV] ` title prefix so the browser
   tab differs too. The bar is non-sticky by design (it scrolls away rather than
   cover a sticky top bar), which is why the badge stays. The sidebar block's
   panel is `fixed` and overlays the bar's left edge at scroll 0 — keep the bar's
   text centered (default) and any `note` short.

The header is a white bar (`bg-card shadow-xs`, like the sidebar on the
#f5f7fb page — D3) with `border-b` separating it from the page, and its
horizontal padding matches `PageShell` (`px-4 md:px-6`). The header
breadcrumb **replaces** the old rule "breadcrumb above the title when depth
> 2": it lives in the site-header only; pages render no breadcrumb of their
own.
