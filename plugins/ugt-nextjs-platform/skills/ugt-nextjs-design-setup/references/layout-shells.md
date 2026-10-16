# Layout shells — interview answer → shadcn block

Never hand-compose a shell. Start from the shadcn block, then apply the org
rules below. Install a block with `npx shadcn@latest add <block>` — the CLI
reads `components.json`, so it pulls the base-mira (Base UI) build.
Block names drift, so confirm the one below still resolves before installing:
`curl -s -o /dev/null -w '%{http_code}' https://ui.shadcn.com/r/styles/base-mira/sidebar-07.json`
must print `200`. (The registry index at `/r/index.json` lists components
only, not blocks, and the shadcn MCP that used to list them is no longer
declared by this plugin — see `base-ui-api.md`.)

## Shell mapping

| คำตอบข้อ 5 | ฐาน | หมายเหตุ |
| --- | --- | --- |
| Sidebar (default) | `sidebar-07` (collapsible icon sidebar) — or the closest current `sidebar-*` block; verify in the registry, names drift | Sidebar header = app name/logo · footer = `nav-user` (avatar + ชื่อ + logout) · **ต้องติด `components/site-header.tsx` ด้วยเสมอ** (`nav-config.md` §Site header) — คำตอบ "Sidebar" ไม่ใช่ข้อยกเว้น |

**After installing a `sidebar-*` block — mandatory cleanup** (the block ships
a demo, not an app shell; both eval runs independently needed these steps):

1. Move the `SidebarProvider`+`SidebarInset` composition out of the block's
   demo *page* into `app/(app)/layout.tsx` — the shell wraps the route
   group, not one page.
2. Delete the demo sample files: `team-switcher`, `nav-projects`,
   `nav-main`'s sample data, the demo `app/dashboard/page.tsx`. **The demo
   logo goes with them** — the sidebar header shows `ube-logo-short.svg`
   from `public/brand/` (DESIGN.md §3), never the block's placeholder icon.
   **Never through `<img>`**: the logos are `fill="currentColor"`, and an
   SVG loaded as an image cannot inherit CSS `color` — it renders black
   (field bug: a near-invisible black mark on the blue tile). Use a CSS mask
   so the token colour applies, and keep the basePath in the URL:

   ```tsx
   // client component — read the basePath directly (createEnv is empty in the client bundle)
   const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
   <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white">
     <span
       aria-hidden
       className="h-2 w-7 bg-primary [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
       style={{ maskImage: `url(${basePath}/brand/ube-logo-short.svg)` }}
     />
   </span>
   ```

   (The inline `style` is the sanctioned dynamic-value exception — the URL
   carries the runtime basePath.) The short logo is wide (≈3.7 : 1), so size
   it by width; `size-5` squeezes it to an unreadable sliver.
   The **long** logo (with tagline) belongs to the login hero — same mask
   pattern, already wired in auth-setup's `components/login-shell.tsx`
   (login page — dark hero + glass card: `ugt-nextjs-auth-setup` → `references/login-page.md`).
3. The scaffold's root `app/page.tsx` collides with `app/(app)/page.tsx` on
   `/` — remove/redirect the root one.
4. **Replace the block's `app-sidebar.tsx` with the kit's**
   (`assets/components/app-sidebar.tsx` + `lib/nav.ts` + `lib/nav.test.ts`) —
   it already carries the logo mask above, the app-name header, the menu
   search, the group dots, longest-prefix highlight and the `footer` slot for
   auth-setup's `<NavUser />`. Feed it from the nav config (`nav-config.md`). Then
   apply the **sidebar active-state edit** to `components/ui/sidebar.tsx`
   (§Org shell rules → Sidebar active state).
5. Mount `components/site-header.tsx` (kit) as the first child of
   `SidebarInset` — `nav-config.md` §Site header. A shell whose top bar holds only
   the trigger is an incomplete install (field bug: every screenshot of it
   read as "หน้าเปล่า ๆ ไม่เหมือน HRMS").
| Topbar | no dedicated block — compose from `navigation-menu` + the org rules; the reference implementation is gov-boi-smart's header (blue navbar) | User menu = `DropdownMenu` มุมขวาสุด |
| Sidebar + Topbar | `sidebar-07` + `components/site-header.tsx` (kit) | Header = breadcrumb เส้นทางเต็ม + toggles (`nav-config.md` §Site header) |
| Landing page (ข้อ 6 = มี) | pick a marketing block/template from the registry at implement time | Landing ใช้ token ชุดเดียวกัน — ห้ามธีมแยก |

Login/setup pages come themed from `ugt-nextjs-auth-setup` — this skill runs
first so those pages inherit the tokens; do not build login UI here.

## Nav config → moved to `nav-config.md`

The menu exists once as data (`lib/nav.ts` types, a project-owned `components/nav-items.ts`) and is
built in a **client** component (`components/app-nav.tsx`) that renders both `<AppSidebar>` and
`<SiteHeader>` — items carry lucide icons, which a Server Component layout cannot pass as props.
Full recipe, group colours and the admin merge: `nav-config.md`.

## Site header → moved to `nav-config.md` §Site header

Every sidebar shell mounts `components/site-header.tsx` as the first child of `SidebarInset`:
trigger · separator · breadcrumb from the same nav config · `actions` slot for the toggles · DEV badge.
Composition and visuals (D7): `nav-config.md` §Site header.

## Org shell rules (apply to whichever shell)

- **Menu items**: icon (lucide) + label เสมอ · group into sections when > ~7
  items · max depth 2 — deeper = split into in-page tabs · order: งานหลัก →
  รายงาน → ตั้งค่า/admin ล่างสุด
- **Permission-hidden, not disabled** — hide items the user lacks `*:read`
  for; the server guard is the real boundary (contract `auth.md`)
- **Nav highlight**: current item = the **longest** href among
  `pathname === href || pathname.startsWith(href + '/')` — the `+ '/'` stops
  `/` matching everything, the longest-match stops `/cut` and `/cut-history`
  both lighting up (bug both projects hit) — implemented once as
  `findActiveHref` in `lib/nav.ts`, which both `<AppSidebar>` and
  `<SiteHeader>` call — a project-built menu calls it too instead of
  re-deriving (auth-setup's standalone `<AdminNav>` inlines the same rule
  because it may run where `lib/nav.ts` was never copied)
- **Overflow (topbar)**: menu wider than the bar → horizontal scroll, **never wrap**
- **Overflow (sidebar)**: a menu taller than the viewport must scroll **with a
  visible scrollbar**. The `sidebar-*` block ships `SidebarContent` with
  `no-scrollbar` — a shadcn utility that is literally
  `scrollbar-width: none` plus a hidden webkit scrollbar. It still scrolls, but
  nothing tells the user more menu exists below, which is the same silent-loss
  failure as a clipped table. During the block cleanup: **replace
  `no-scrollbar` with `scroll-thin`** — the org utility shipped in
  `globals.tokens.css` (6px track, `--border` thumb that brightens on hover,
  Firefox + WebKit). `scripts/verify.mjs` fails on `no-scrollbar` and warns
  when `scroll-thin` is absent.

  ```tsx
  // components/ui/sidebar.tsx — SidebarContent
  'scroll-thin flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
  ```
  (the right-side group dropping to a second line was a real production fix)
- **Overflow (content)**: `SidebarInset` is a flex item with `min-width: auto`, so a wide table
  makes **the whole page** scroll sideways (the sidebar slides under the content, the page
  header buttons fall off the right edge) instead of the table scrolling inside its own
  wrapper. During the block cleanup add `min-w-0` to the `SidebarInset` class list. Seen on a page
  with an 11-column table at 1280px: `main` measured 1094px in a 1024px slot, and with `min-w-0`
  the table wrapper scrolls internally. `scripts/verify.mjs` warns when it is missing.

  ```tsx
  // components/ui/sidebar.tsx — SidebarInset
  'relative flex w-full min-w-0 flex-1 flex-col bg-background ...',
  ```
- **Sidebar active state = solid** (มติ 2026-10-16 D7 — replaces the preset's
  "Subtle" `bg-sidebar-accent` tint, which on a white sidebar is a faint gray
  barely distinguishable from hover). Sanctioned edit, three strings in
  `components/ui/sidebar.tsx` — the primitive, not a className per menu, so
  auth-setup's `<AdminNav>` fallback and any project-built menu get it too:

  ```tsx
  // sidebarMenuButtonVariants (base string) — was: data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground
  'data-active:bg-sidebar-primary data-active:font-medium data-active:text-sidebar-primary-foreground'
  // SidebarMenuBadge — was: peer-data-active/menu-button:text-sidebar-accent-foreground
  'peer-data-active/menu-button:text-sidebar-primary-foreground'
  // SidebarMenuAction (showOnHover branch) — same swap as the badge
  'peer-data-active/menu-button:text-sidebar-primary-foreground'
  ```
  Keep `hover:bg-sidebar-accent` as is: `data-active:` sorts after `hover:` in
  Tailwind v4, so the active row stays solid under the pointer. The badge and
  the row action sit ON the active row, so they must switch to the
  `-primary-foreground` text with it (dark text on the fill otherwise).
  `SidebarMenuSubButton` keeps its subtle highlight (depth-2 rows, and its
  `[&>svg]:text-sidebar-accent-foreground` would turn dark on a solid fill).
  `scripts/verify.mjs` warns when `sidebarMenuButtonVariants` still carries
  `data-active:bg-sidebar-accent`.
- **Menu search** (D7): `<AppSidebar>` renders a search box under the app name
  (`SidebarInput`, `kit.appSidebar.searchPlaceholder`) — client-side,
  matches the item label or its group heading, Esc clears, "ไม่พบเมนู" when
  nothing matches. Hidden — and ignored — while the sidebar is collapsed to
  icons, so no item disappears behind a search the user cannot see. On by
  default; `search={false}` only for a menu readable at a glance, with a
  comment saying so.
- **Group dots** (D7): `NavGroup.color` (`cat-1..8`) draws a small dot before
  the group heading; the breadcrumb repeats it. Decorative only — never a
  `status-*` colour, never the only thing that tells groups apart (the
  heading text does that). Item icons stay the sidebar foreground colour.
- **Page skeleton** (every page, no exceptions): page title
  (`text-2xl font-semibold tracking-tight`, no leading icon) + actions ขวาบน
  + content in a card · three page patterns — data / form (single column,
  one card per section) / dashboard — DESIGN.md §3 · content capped at
  `max-w-[96rem]` centred while the site-header stays full width (มติ
  2026-10-16 A1 — the cap is built into `PageShell`; never set per page) ·
  breadcrumb lives in the site-header only, never above the title
- **Sidebar surface**: white (`--sidebar: oklch(1 0 0)`, มติ 2026-10-16
  TK-SB) on the #f5f7fb page, separated by its border — keep the block's
  `border-r`; don't tint it back
- **Mobile**: sidebar collapses to the block's built-in sheet/drawer (tapping
  an `<AppSidebar>` item closes it) · breadcrumb → dot + current page ·
  content transforms are systematic (DataTable → list rows in one card —
  built into `ui/data-table`, `datatable.md` §Mobile; dialog/popover → bottom
  sheet) — never per-page improvisation
