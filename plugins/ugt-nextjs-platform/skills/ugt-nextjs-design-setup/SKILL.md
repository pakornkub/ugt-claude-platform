---
name: ugt-nextjs-design-setup
description: >
  Use when a project needs its design agreement — "ทำข้อตกลง design",
  "ตั้ง design system", "กำหนดธีม", "ทำ DESIGN.md", "จัด layout ให้เป็น
  มาตรฐาน", "สีกับฟ้อนต์ยังมั่วอยู่", "UI แต่ละหน้าไม่เหมือนกัน" — covering
  the interview → generated `docs/DESIGN.md` (the project's design source of
  truth), shadcn/ui tokens in `globals.css` (org indigo + semantic-6 status
  set), Inter + Noto Sans Thai fonts, the app shell (sidebar/topbar via shadcn
  blocks), the org UI kit (DataTable, FormDialog, StatusBadge, IconAction,
  date pickers, formatter lib), and the harness rule that makes every later
  session read the agreement before touching UI. Works on both a fresh
  project (full interview) and an existing one (scan → draft agreement →
  recorded deviations). Also handles "sync ข้อตกลง design" after a plugin
  update (diff the project against the org contract, record มติ).
  Run BEFORE ugt-nextjs-auth-setup when both are planned — auth generates
  themed pages (login, admin) that must inherit these tokens.
  Not for writing feature UIs themselves, and not for Jenkins/DB/auth setup
  (→ their own skills).
---

# UGT Design Setup — design agreement + tokens + org UI kit

## 1. Overview

Two production projects (`ugt-hrms`, `gov-boi-smart`) proved the same lesson:
build UI first and agree on design later, and you retheme the whole app —
one of them did it **twice**. This skill runs the agreement first: one
interview → `docs/DESIGN.md` → tokens + fonts + shell + UI kit installed →
a harness rule so the agreement outlives this session.

The normative source is **`contracts/design.md` in the ugt-core plugin**
(iron rules + org defaults). This skill is its Next.js rendering: shadcn/ui
(style `base-mira`, Base UI), Tailwind v4 tokens, lucide icons. Where this file and
the contract disagree, the contract wins — fix this file.

What lands in the project:

| Piece | Where |
| --- | --- |
| Design agreement (source of truth) | `docs/DESIGN.md` — from `assets/DESIGN.template.md` |
| Pending design questions doc | `docs/design-questions.md` — from `assets/design-questions.template.md` |
| Motion inventory (only if project opts into custom motion) | `docs/MOTION.md` — from `assets/MOTION.template.md` |
| Color/radius/status tokens (light+dark) | `app/globals.css` — from `assets/globals.tokens.css` |
| Fonts (Inter + Noto Sans Thai + Geist Mono via `next/font`) | `app/layout.tsx` |
| shadcn config (style `base-mira`, neutral, lucide) | `components.json` |
| Org UI kit | `components/ui/*` + `lib/format.ts` — from `assets/ui/` and `assets/lib/` |
| App shell (sidebar or topbar per interview) | `components/` + `app/(app)/layout.tsx` — see `references/layout-shells.md` |
| Company logos (tintable SVG, `fill="currentColor"`) | `public/brand/` — from `assets/brand/` |
| Harness rule (read DESIGN.md before UI work) | `.claude/rules/ugt-nextjs-design.md` — from `assets/rules-ugt-nextjs-design.md` |

## 2. Org standards (summary — full text in ugt-core `contracts/design.md`)

1. **shadcn-first ladder**: primitive → block/template → compose → custom
   Tailwind-utilities-only. Never hand-build what shadcn provides. No raw
   CSS / CSS-in-JS / inline styles except truly dynamic values.
2. **lucide only, never emoji** — and the fixed icon mapping (see
   `references/conventions.md`): same action = same icon on every page.
3. **Sizes = `default`** everywhere; sanctioned exceptions (`icon` in table
   rows, `sm` in dense toolbars) are listed in DESIGN.md, nowhere else.
4. **DataTable only** for tabular data; server-paginated data must sort and
   filter server-side through URL state — never client-sort a partial page.
5. **`lib/format.ts` only** for dates and numbers — `DD/MM/YYYY` Gregorian
   (ค.ศ.) on screen, ISO `yyyy-MM-dd` in exported files, wall-clock dates
   read as UTC parts, instants shown in Asia/Bangkok.
6. **Accessibility floor**: status = color + icon (StatusBadge), icon-only
   buttons = IconAction (label → aria-label + tooltip), focus rings stay,
   motion silent under `prefers-reduced-motion`, WCAG AA ≥ 4.5:1 verified by
   `scripts/check-contrast.mjs` on every color change.
7. **DESIGN.md wins over code** — and over beautification skills
   (`frontend-design`, `impeccable`): they may propose, never override.

Org defaults (interview only asks "เปลี่ยนไหม"): primary indigo
`oklch(0.488 0.243 264.4)` · neutral hue ~258 · semantic-6 `--status-*` set ·
Inter + Noto Sans Thai · density ตระกูล mira (controls h-7, tables text-xs)
· radius tiers control 6 / card 12 / overlay 14 px.

## 3. Workflow

### Step 1 — Detect project state

- `components.json` or `components/ui/` exists → **existing project** path.
- Neither → **fresh project** path.
- Not Next.js App Router at all → say so plainly and stop; never adapt
  assets to another stack.

### Step 2 — Interview (one batch, defaults on every question)

Open `references/interview.md` and ask with AskUserQuestion. Fast path: the
user saying **"ตามมาตรฐานทั้งหมด"** accepts every default — then only
project-identity gaps (e.g. a brand color that has no org default) get asked.
Every answer, including accepted defaults, is written into DESIGN.md.

**Existing project**: scan first (the scan checklist is in
`references/interview.md` §Scan), present a **draft agreement from what the
code actually does**, then interview only the gaps and conflicts. Conflicts
become the Deviations table (§9 of DESIGN.md): migrate now or grandfather,
each with a recorded decision — never silently reformat the project.

### Step 3 — Generate and install

1. `docs/DESIGN.md` from the template — fill every `{{...}}`, including the
   ugt-core contract version in the header; seed the decision log (ส่วน 10)
   with today's มติ. Create `docs/design-questions.md` (empty skeleton).
2. shadcn init if none yet — **the org preset (canonical, มติ 2026-08-04;
   verified: produces `base-mira` + `lucide` + `rtl:false` +
   menu default/solid/subtle + neutral)**:

   ```bash
   # โปรเจคใหม่ล้วน — scaffolds the Next app too (no separate create-next-app):
   printf '<project-name>\n' | npx shadcn@latest init --preset b1ZzrZbs0 --template next --pointer --yes
   # โปรเจคเดิมที่มี Next.js แล้ว:
   npx shadcn@latest init --preset b1ZzrZbs0 --pointer --yes
   ```

   (a custom preset code from the shadcn configurator: mira family on
   **Base UI** — a deliberate มติ 2026-08-04 superseding the earlier
   radix-mira choice — single-repo, no RTL, pointer on buttons. **Do NOT
   pass `-b radix`**: it would flip the style to `radix-mira` and the kit
   is Base UI now. The `printf` pipe answers `--template next`'s
   project-name prompt, which `--yes` does not cover. Fallback if the code
   ever stops resolving: `npx shadcn@latest init --preset mira` — there is
   NO `--style base-mira` flag.)
   **After init**: rename `package.json`'s `"name"` (the template writes
   `next-app`) to the project slug · verify `components.json` — expected:
   `style: "base-mira"` · `iconLibrary: "lucide"` (mira presets can default
   to `hugeicons` — fix and uninstall any `@hugeicons/*` deps) ·
   `rtl: false` · `menuColor: "default"`. If the org preset ever writes a
   different `style` string than `base-mira`, update `scripts/verify.mjs`'s
   expectation in the same change — never leave the two disagreeing.
   If the init dies mid-install (postinstall spawn errors happen in
   sandboxes) it can leave a scaffold **without `components.json`** — run
   `npm install`, then re-run the init in existing-project mode (no
   `--template`).
   **Windows: work from a short path as the primary flow, not a fallback**
   — deep paths (~>180 chars) break BOTH the shadcn CLI (misleading
   `ERR_PACKAGE_IMPORT_NOT_DEFINED` chalk error) AND `next build`
   (Turbopack filesystem MAX_PATH; junctions don't help). Scaffold, run
   every CLI/build step at a short real path, then move the project. Never
   a `subst` drive (realpath guard misfires).
   Merge `assets/globals.tokens.css` into `app/globals.css` (replace the
   `:root`/`.dark` token blocks; keep any project/preset `@layer` rules —
   e.g. the preset's button `cursor: pointer` — and keep preset `@theme`
   vars: re-point `--font-heading` at the font-sans variables)
   · substitute `{{PRIMARY}}`/`{{PRIMARY_DARK}}` from interview answers
   (dark ring tokens derive from `{{PRIMARY_DARK}}` automatically).
3. Fonts + providers in `app/layout.tsx` — the exact wiring:

   ```tsx
   import { Geist_Mono, Inter, Noto_Sans_Thai } from 'next/font/google';
   const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
   const notoSansThai = Noto_Sans_Thai({ subsets: ['thai'], variable: '--font-noto-sans-thai' });
   const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
   // <html lang="th" className={`${inter.variable} ${notoSansThai.variable} ${geistMono.variable}`}>
   ```

   Body wraps: `ThemeProvider` (from `assets/components/theme-provider.tsx`,
   when dark mode = มี) → **`TooltipProvider` (required — the mira styles'
   Tooltip does not self-wrap a provider; sidebar tooltips crash prerender
   without it; delay 0 per the agreement)** → children + `<Toaster richColors />`.
4. Install the base component set — prefer the **shadcn MCP** (`ToolSearch`
   for `shadcn` tools; the plugin declares the server) to browse/add, fall
   back to `npx shadcn@latest add`:
   `button input label select checkbox radio-group field dialog alert-dialog
   sheet dropdown-menu popover tooltip table tabs badge card sonner skeleton
   breadcrumb empty command calendar scroll-area separator switch textarea
   avatar input-group`
   (**`field`, not `form`** — the mira styles' `form.json` is an empty stub; the
   registry moved form composition to the `field` primitive. It still pairs
   with zod + react-hook-form.)
   Then the kit's npm deps — **pin majors, the kit is version-coupled**:
   `npm i @tanstack/react-table@^8 date-fns@^4 react-hook-form zod
   lucide-react` (v9 of tanstack renames the v8 API the kit uses; `add`
   doesn't always install lucide-react itself) · `next-themes` when dark
   mode = มี · `@base-ui/react` (the base-mira primitives package — init installs it, verify it's there; combobox in the
   registry uses it) · `next-intl` only when ภาษา = th+en.
5. **App shell FIRST, then variants**: install the shadcn block named in
   `references/layout-shells.md` (never hand-composed) **before** touching
   `button.tsx` — `add <block>` prompts per existing file (even with
   `--yes`; pipe `yes n |` to decline in headless runs) and answering `y`
   would silently wipe just-applied variants. Then prune the block's demo
   debris per layout-shells.md.
6. Copy the org UI kit from `assets/ui/` into `components/ui/` and
   `assets/lib/` into `lib/` (`actions-locale.ts` → `lib/actions/locale.ts`,
   th+en only; `theme-toggle` (dark mode = มี) and `language-switcher`
   (th+en) from `assets/components/` — list + provenance in
   `references/conventions.md` §Kit). **theme-provider: the preset scaffold
   already ships `components/theme-provider.tsx` (a superset of our asset)
   — keep the registry's file; the asset is only a fallback for projects
   that somehow lack it.** Apply `assets/ui/button-variants.md` to the
   installed `components/ui/button.tsx` — the sanctioned `success` /
   `soft-*` variants **and the `field` variant (mandatory: the kit's
   date-picker uses it and today's registry button doesn't ship it — build
   breaks without it)**. Never overwrite an existing same-name file
   silently — diff and ask.
   Also copy `assets/brand/` → `public/brand/` (company logos as tintable
   SVGs — `fill="currentColor"`, so CSS `color` sets the brand blue or
   white-on-dark): `ube-logo-short.svg` for the shell header (sidebar/topbar),
   `ube-logo-long.svg` (with tagline) for login/landing. Usage rule lands in
   DESIGN.md §3.
7. Run `node <skill-dir>/scripts/check-contrast.mjs` (cwd = project root) —
   every ✘ pair must be fixed before closing.
8. Install the harness rule: copy `assets/rules-ugt-nextjs-design.md` →
   `.claude/rules/ugt-nextjs-design.md` (whole-file overwritable on update).

### Step 4 — Close out

1. Run `node <skill-dir>/scripts/verify.mjs` (cwd = project root); fix every
   ✘ — never report done with exit code 1 outstanding.
2. Summarize: every file added/changed, the answers recorded in DESIGN.md,
   and any deviations grandfathered.
3. Smoke checklist:
   - [ ] `npm run build` passes
   - [ ] a page using Button/Input/Table renders with the new tokens (both
     light and dark if dark mode was selected)
   - [ ] `check-contrast.mjs` exits 0
   - [ ] `docs/DESIGN.md` มติ table has today's entry

### Sync mode ("sync ข้อตกลง design")

After a plugin update: read the project's `DESIGN.md` header version vs the
current ugt-core `contracts/design.md`. Present the diff (what the org
changed), apply what the user accepts, and record each acceptance/rejection
as a dated มติ. **Never silently rewrite the project's DESIGN.md** — it may
contain project มติ that deliberately deviate.

## 4. References

- `references/interview.md` — the question bank + defaults + the
  existing-project scan checklist (**always read before interviewing**)
- `references/layout-shells.md` — shell answer → shadcn block mapping + nav
  highlight rule + overflow rule
- `references/conventions.md` — component-usage rules in depth (Dialog
  ladder, Badge vs StatusBadge, icon mapping, TONE_STYLES exception,
  DataTable modes) + the kit inventory with provenance

## 5. Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| Run before auth-setup when both are planned | Theme the app after auth already generated pages |
| Scan an existing project before asking anything | Interview an existing project from zero |
| Record every answer (even accepted defaults) as มติ | Treat defaults as "nothing to write down" |
| shadcn block for the shell | Hand-compose a sidebar/topbar |
| Diff-and-ask on existing `components/ui/` files | Overwrite the project's components silently |
| Run check-contrast + verify before closing | Close with a failing script "to fix later" |
| Sync mode diffs and records มติ | Regenerate DESIGN.md over project decisions |
