# copy the case fixture/ into the run cwd — $0 is the script path (Windows or POSIX form)
# fixture/components/ui/<shadcn primitives> + hooks/use-mobile.ts + components.json:
# what design-setup Step 3.4's `npx shadcn@latest add` leaves (the eval sandbox has
# no shell). shadcn/ui, MIT licence. Taken from https://ui.shadcn.com/r/styles/base-mira/<name>.json (2026-10-15)
# with the CLI's transforms replayed by hand: IconPlaceholder → lucide-react,
# registry paths → @/components/ui · @/hooks, `cn` → @/lib/utils (this fixture's
# utils), then design-setup's sanctioned edits: select trigger w-full, button
# success/soft-*/field variants, SidebarContent scroll-thin, SidebarInset min-w-0. `cn-*`
# style markers are left as the registry ships them. Refresh = re-fetch + replay.
here="$(dirname "${0//\\//}")"
cp -r "$here/fixture/." .
