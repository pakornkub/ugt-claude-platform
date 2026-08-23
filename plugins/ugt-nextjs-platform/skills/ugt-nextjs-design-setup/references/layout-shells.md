# Layout shells — interview answer → shadcn block

Never hand-compose a shell. Start from the shadcn block, then apply the org
rules below. Install a block with `npx shadcn@latest add <block>` — the CLI
reads `components.json`, so it pulls the base-mira (Base UI) build.
Block names drift, so confirm the one below still resolves before installing:
`curl -s -o /dev/null -w '%{http_code}' https://ui.shadcn.com/r/styles/base-mira/sidebar-07.json`
must print `200`. (The registry index at `/r/index.json` lists components
only, not blocks, and the shadcn MCP that used to list them is no longer
declared by this plugin — see `conventions.md` §ตรวจ API.)

## Shell mapping

| คำตอบข้อ 5 | ฐาน | หมายเหตุ |
| --- | --- | --- |
| Sidebar (default) | `sidebar-07` (collapsible icon sidebar) — or the closest current `sidebar-*` block; verify in the registry, names drift | Sidebar header = app name/logo · footer = `nav-user` (avatar + ชื่อ + logout) |

**After installing a `sidebar-*` block — mandatory cleanup** (the block ships
a demo, not an app shell; both eval runs independently needed these steps):

1. Move the `SidebarProvider`+`SidebarInset` composition out of the block's
   demo *page* into `app/(app)/layout.tsx` — the shell wraps the route
   group, not one page.
2. Delete the demo sample files: `team-switcher`, `nav-projects`,
   `nav-main`'s sample data, the demo `app/dashboard/page.tsx`.
3. The scaffold's root `app/page.tsx` collides with `app/(app)/page.tsx` on
   `/` — remove/redirect the root one.
4. Rebuild `app-sidebar.tsx` per the org rules below (Thai menu, app-name
   header, nav-user footer, longest-prefix highlight).
| Topbar | no dedicated block — compose from `navigation-menu` + the org rules; the reference implementation is gov-boi-smart's header (blue navbar) | User menu = `DropdownMenu` มุมขวาสุด |
| Sidebar + Topbar | `sidebar-07` + a slim header (`site-header` pattern จาก HRMS) | Header ใส่ breadcrumb + actions ของหน้า |
| Landing page (ข้อ 6 = มี) | pick a marketing block/template from the registry at implement time | Landing ใช้ token ชุดเดียวกัน — ห้ามธีมแยก |

Login/setup pages come themed from `ugt-nextjs-auth-setup` — this skill runs
first so those pages inherit the tokens; do not build login UI here.

## Org shell rules (apply to whichever shell)

- **Menu items**: icon (lucide) + label เสมอ · group into sections when > ~7
  items · max depth 2 — deeper = split into in-page tabs · order: งานหลัก →
  รายงาน → ตั้งค่า/admin ล่างสุด
- **Permission-hidden, not disabled** — hide items the user lacks `*:read`
  for; the server guard is the real boundary (contract `auth.md`)
- **Nav highlight**: current item = the **longest** href among
  `pathname === href || pathname.startsWith(href + '/')` — the `+ '/'` stops
  `/` matching everything, the longest-match stops `/cut` and `/cut-history`
  both lighting up (bug both projects hit)
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
- **Page skeleton** (every page, no exceptions): page title
  (`text-2xl font-semibold tracking-tight`, no leading icon) + actions ขวาบน
  + content in a card · breadcrumb above the title only when depth > 2
- **Mobile**: sidebar collapses to the block's built-in sheet/drawer ·
  content transforms are systematic (table→card via DataTable, dialog→bottom
  sheet via the primitive) — never per-page improvisation
