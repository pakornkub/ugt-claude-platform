# copy the case fixture/ into the run cwd — $0 is the script path (Windows or POSIX form)
# fixture/components/ui/<shadcn primitives> + hooks/use-mobile.ts + components.json:
# what design-setup Step 3.4's `npx shadcn@latest add` leaves (the eval sandbox has
# no shell). shadcn/ui, MIT licence. Taken from https://ui.shadcn.com/r/styles/base-mira/<name>.json (2026-10-15)
# with the CLI's transforms replayed by hand: IconPlaceholder → lucide-react,
# registry paths → @/components/ui · @/hooks, `cn` → @/lib/utils (this fixture's
# utils), then design-setup's sanctioned edits: select trigger w-full, button
# success/soft/soft-*/field variants + solid destructive + size cta (button-variants.md),
# card shadow-xs ring-border + CardHeading pt · table 2xl:text-sm · dialog/sheet/alert-dialog
# 3 zones with cta footers (primitive-edits.md), SidebarContent scroll-thin, SidebarInset
# min-w-0, sidebar active row solid (layout-shells.md). `cn-*` style markers are left as
# the registry ships them. Refresh = re-fetch + replay.
# Shell = the kit's components/app-sidebar.tsx + site-header.tsx + lib/nav.ts, fed by the
# project-owned components/nav-items.ts through the client components/app-nav.tsx
# (references/nav-config.md — app/(app)/layout.tsx stays a Server Component and passes no
# icon-bearing list). Kit files carry their // kit: stamps; some older ones are left
# prettier-formatted as a real project would have them.
here="$(dirname "${0//\\//}")"
cp -r "$here/fixture/." .
