# Kit inventory — every file in assets/ui/ + assets/lib/ (+ shipped components) with provenance and when to ship it

"From": HRMS = `ugt-hrms` (radix-mira, ported to Base UI by hand) · BOI =
`gov-boi-smart` (base-mira) — full provenance note at the top of
`conventions.md`.

| File | From | Note |
| --- | --- | --- |
| `ui/data-table.tsx` | HRMS | see `datatable.md` §DataTable → Kit status |
| `ui/form-dialog.tsx` | HRMS | compound + height variants |
| `ui/status-badge.tsx` | HRMS | exports `TONE_STYLES` |
| `ui/icon-action.tsx` | BOI (Base UI native, `render` prop) | label required |
| `ui/confirm-action-dialog.tsx` | BOI (Base UI native) | destructive confirm |
| `ui/date-picker.tsx` / `ui/date-range-picker.tsx` | HRMS | |
| `ui/combobox.tsx` | HRMS | generic (employee-combobox ไม่เอา — HR-specific) |
| `ui/page-shell.tsx` · `ui/detail-dialog-shell.tsx` · `ui/detail-row.tsx` · `ui/detail-section.tsx` | HRMS | |
| `ui/query-state.tsx` · `ui/truncated-text.tsx` | HRMS | query-state needs `ui/callout` |
| `ui/callout.tsx` | HRMS | page-level banner; tones reuse `TONE_STYLES` |
| `ui/bulk-action-bar.tsx` | HRMS (4 approval pages) | เลือกหลายแถวแล้วสั่งงานรวม; needs `checkbox`; pairs with `DataTable` `onSelectionChange` + `resetSelectionKey` |
| `ui/export-menu.tsx` | HRMS | ปุ่ม Excel/CSV สำหรับ `toolbarExtra`; ship only when a page exports (needs `dropdown-menu` + `sonner`) |
| `components/theme-provider.tsx` | standard next-themes wrapper | **fallback only** — the org preset scaffold ships its own (superset: hotkey + disableTransitionOnChange); keep the registry's file when present |
| `components/site-header.tsx` | HRMS header pattern (absorbed as an asset in 4.58.0 — before that it was only a pointer at HRMS code and installs shipped empty top bars) | **every sidebar shell** — SidebarTrigger + เส้นคั่น + breadcrumb เส้นทางเต็มจาก nav config + right slot for the toggles (needs `breadcrumb` + `separator` + the sidebar block) |
| `components/site-header.test.ts` | kit-native | ships with `site-header.tsx` — copy/skip the pair together (locks `deriveCrumbs`: crumb แรก = หัว group ไม่ใช่เพจอื่น · longest-prefix · decode segment) |
| `components/dev-environment-bar.tsx` | ugt-voice-platform (2026-10-09), re-skinned onto `TONE_STYLES.warning` + lucide `FlaskConical` + the `kit.devEnvironment` catalog | **every project** — full-width amber banner for the dev deployment, mounted in `app/layout.tsx` above the shell (so the login page gets it too) behind `isDevEnvironment()`; optional `note` prop for a project-owned extra clause · server-compatible (no `'use client'`) |
| `lib/environment.ts` · `lib/environment.test.ts` | ugt-voice-platform (2026-10-09) | `isDevEnvironment()` = `NEXT_PUBLIC_BASE_PATH` ends with `-dev` (the cicd develop-deploy convention) · server-only · the `?? ''` survives `SKIP_ENV_VALIDATION` · pair ships together |
| `components/theme-toggle.tsx` | HRMS | ship only when dark mode = มี (needs `next-themes`) · **mount = `actions` ของ site-header** ไม่ใช่แค่ copy ไฟล์ |
| `components/language-switcher.tsx` | HRMS | ship only when ภาษา = th+en (needs `next-intl` + `lib/actions/locale.ts`) · **mount = `actions` ของ site-header ก่อน ThemeToggle** |
| `lib/format.ts` | merge: HRMS `format-date.ts` (Intl + cache + wall-clock/instant contract) + BOI `formatNumber`/`bangkokToday` + new `formatExportDate` (ISO) | the only formatter |
| `lib/format.test.ts` | kit-native | ships with `lib/format.ts` — ล็อก timezone contract (Asia/Bangkok pin + `toDateKey` ของปฏิทินต้องไม่ร่นวัน) |
| `lib/avatar.ts` · `lib/avatar.test.ts` | HRMS `lib/utils.ts` (มติ 2026-10-16 B12) | `avatarColorClass(seed)` → literal `bg-cat-1..8` (pair with `text-white`) + `getInitials(name)` (first + last word, skips Thai leading vowels เ แ โ ใ ไ) · own file, not `lib/utils.ts` — that one is shadcn's (`cn`) and the kit never overwrites it · pair ships together · needs the `--cat-*` tokens |
| `lib/table-query.ts` · `lib/table-prefs.ts` · `lib/pagination.ts` | BOI | URL-state + column prefs + page params for server-mode tables (`table-query` imports `firstParam` from `pagination`) |
| `lib/actions-locale.ts` → `lib/actions/locale.ts` | HRMS | th+en only; standalone — no session guard on purpose (mutates only the caller's own locale cookie), so it never depends on auth-setup |
| `lib/export.ts` | merge: HRMS's two hand-written export routes, collapsed into one column spec (+ BOM, formula guard, row cap) | server-only (`exceljs`); pairs with `ui/export-menu` |
| `lib/export.test.ts` | kit-native | ships with `lib/export.ts` — copy/skip the pair together (covers BOM, formula guard, row cap) |
| `components/query-provider.tsx` · `lib/http-error.ts` | HRMS `components/providers.tsx` + `lib/http-error.ts` | one QueryClient for the whole app (staleTime 0 · retry 1 · 401 → `session-expired` event); queryFns throw `HttpError`, never bare `Error` |
| `ui/query-progress.tsx` | HRMS | top progress bar on **initial** fetches only (background refetches stay silent); needs `nprogress` + the CSS block in its header comment |
| `ui/tiptap-editor.tsx` | HRMS + kit toolbar (4.38.0) | the app's one rich-text editor; ship only when rich text exists (`@tiptap/*` ^3 set). Toolbar buttons go through `ui/icon-action` (so `tooltip` must be installed) — no hand-rolled icon button, no native `title` |
| `ui/chart-example.tsx` | HRMS `run-trend-chart` (OT stripped) | reference to copy-adapt-delete, not a shared component; needs `npx shadcn add chart` |
| `lib/motion.ts` | new — the agreement's numbers as importable constants | only when custom motion = มี (pairs with `docs/MOTION.md`); dep `motion` |
| `ui/button-variants.md` | BOI → recipes on the base-mira button, colors mapped to org tokens | the sanctioned `components/ui/button.tsx` edit |
| `brand/ube-logo-short.svg` · `brand/ube-logo-long.svg` | company asset | → `public/brand/` · `fill="currentColor"` (tint via CSS — **mask, never `<img>`**, which renders it black; snippet in layout-shells.md cleanup step 2) · short = shell header, long (tagline) = login/landing |
