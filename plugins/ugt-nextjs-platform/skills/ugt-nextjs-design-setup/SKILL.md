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
| Harness rule (read DESIGN.md before UI work) | `.claude/rules/ugt-nextjs-design.md` — from `assets/rules/ugt-nextjs-design.md` |

## 2. Org Standards (summary — full text in ugt-core `contracts/design.md`)

1. **shadcn-first ladder**: primitive → block/template → compose → custom
   Tailwind-utilities-only. Never hand-build what shadcn provides. No raw
   CSS / CSS-in-JS / inline styles except truly dynamic values.
2. **lucide only, never emoji** — and the fixed icon mapping (see
   `references/conventions.md`): same action = same icon on every page.
3. **Sizes = `default`** everywhere; sanctioned exceptions (`icon` in table
   rows, `sm` in dense toolbars) are listed in DESIGN.md, nowhere else.
4. **DataTable only** for tabular data; server-paginated data must sort and
   filter server-side through URL state — never client-sort a partial page.
   Every instance passes a **unique `id`** (prefs persist), and page-level
   filters live in the toolbar row via `toolbarFilters` — right after the
   search box, widest→narrowest (มติ 2026-08-11) — per-page config is part
   of the agreement, not a free choice.
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
· radius มาจากปุ่มเดียว `--radius: 0.45rem` แล้ว preset คูณออกเป็น 4 ระดับ (control 5.8 / card 7.2 / overlay 10.1 px — มติ 2026-08-09 ยกให้ preset คุม).

## 3. Workflow

### Step 1 — Detect project state

- `components.json` or `components/ui/` exists → **existing project** path.
- Neither, but the project already has real routes/components (`app/` or
  `pages/` beyond the create-next-app scaffold) or a non-shadcn UI
  dependency in `package.json` (MUI, Ant Design, Bootstrap, Chakra,
  styled-components, etc.) → **still existing project** path — no
  `components.json` to diff, but there's a real design already in place
  that a blind default-interview would clash with. Run the scan (§Scan in
  `references/interview.md`) with the package.json/CSS checks substituting
  for the components.json ones.
- Neither, and no real UI yet (bare scaffold) → **fresh project** path.
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
**Scale is its own decision, not a Deviation**: run the §Scale-scan table
(control height / padding / font / radius / density / form conventions) and,
when the measured scale differs from the kit, ask ข้อ 9 — ยึดของเดิม (rebase
the kit per §Scale bridge) / ยึด kit (migrate old forms) / แยกโซน. The
un-chosen middle — kit-default controls sprinkled into legacy screens at a
different size — is the field bug this step exists to prevent.

### Step 3 — Generate and install

1. `docs/DESIGN.md` from the template — fill every `__...__`, including the
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
   `next-app`) to the project slug, then **run the gate instead of eyeballing
   it**: `node <skill-dir>/scripts/verify.mjs` fails on any `components.json`
   that is not `style: base-mira` · `iconLibrary: lucide` · `rtl: false` ·
   `baseColor: neutral`, and separately fails on any Radix that reached the
   project — a `radix-ui`/`@radix-ui/*` dependency, a missing
   `@base-ui/react`, or a source file using `asChild` / `onSelect` on a menu
   item / `checked="indeterminate"` / `delayDuration`. Both checks are
   re-runnable at any time, so a wrong init cannot survive close-out. (mira
   presets can default to `hugeicons` — fix and uninstall any `@hugeicons/*`
   deps; `menuColor: "default"` is expected but not gated.) If the org preset
   ever writes a different `style` string than `base-mira`, update
   `scripts/verify.mjs`'s expectation in the same change — never leave the two
   disagreeing.
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
   vars: re-point `--font-heading` at the font-sans variables).
   **Radius is the preset's, not ours (มติ 2026-08-09)** — when replacing the
   `:root` block you MUST carry over the preset's `--radius` line
   (`base-mira` ships `0.45rem`), and leave its `@theme` radius scale
   (`--radius-sm/md/lg/xl/2xl/3xl/4xl` as `calc()` of `--radius`) untouched.
   Our token file deliberately declares no radius; dropping the preset's line
   too leaves `--radius` undefined and every card/button goes square.
   `scripts/verify.mjs` fails if it is missing.
   · substitute `__PRIMARY__`/`__PRIMARY_DARK__` from interview answers
   (dark ring tokens derive from `__PRIMARY_DARK__` automatically).
3. Fonts + providers in `app/layout.tsx` — the exact wiring:

   ```tsx
   import { Geist_Mono, Inter, Noto_Sans_Thai } from 'next/font/google';
   const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
   const notoSansThai = Noto_Sans_Thai({ subsets: ['thai'], variable: '--font-noto-sans-thai' });
   const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
   // <html lang="th" className={`${inter.variable} ${notoSansThai.variable} ${geistMono.variable}`}>
   ```

   `<html lang="th">` → `<html lang={locale}>` เมื่อ ภาษา = th+en (อ่าน locale
   ด้วย `getLocale()` จาก `next-intl/server` ใน RootLayout ซึ่งเป็น Server
   Component อยู่แล้ว) — `lang` ที่ไม่ตรงภาษาจริงทำให้ screen reader อ่านผิดภาษา
   และ `:lang()` ใน CSS เลือกฟอนต์ผิด

   Body wraps: **`NextIntlClientProvider` (นอกสุด — provider อื่นและ children
   ทุกตัวต้องอยู่ข้างใน ไม่งั้น `useTranslations` โยน error ตอน render)** →
   **`QueryProvider` (from `assets/components/query-provider.tsx`
   — the app's single QueryClient; also copy `assets/lib/http-error.ts`, and
   `assets/ui/query-progress.tsx` + its CSS block rendered just inside the
   provider)** → `ThemeProvider` (from `assets/components/theme-provider.tsx`,
   when dark mode = มี) → **`TooltipProvider` (required — the mira styles'
   Tooltip does not self-wrap a provider; sidebar tooltips crash prerender
   without it; delay 0 per the agreement)** → children + `<Toaster richColors />`.
4. Install the base component set with `npx shadcn@latest add` (the CLI
   resolves `components.json` → base-mira, so it installs the right style).
   **อ่าน API จริงของ component จาก registry ของ base-mira เท่านั้น**:
   `curl -s https://ui.shadcn.com/r/styles/base-mira/<name>.json` ·
   ⚠️ **plugin ไม่ประกาศ shadcn MCP แล้ว** (ถอดออก 4.43.0 — มันตอบ style
   default ที่เป็น Radix โดยไม่มีทางสั่งให้ตอบ base-mira) · ถ้าเครื่องไหนยัง
   ต่อ MCP ตัวนี้อยู่เอง **ห้ามลอกโค้ดจากมัน** · ลำดับแหล่งอ้างอิงเต็ม +
   ตารางความต่าง Radix↔Base UI อยู่ที่ `references/conventions.md` §ตรวจ API:
   `button input label select checkbox radio-group field dialog alert-dialog
   sheet dropdown-menu popover tooltip table tabs badge card sonner skeleton
   breadcrumb empty command calendar scroll-area separator switch textarea
   avatar input-group`
   (**`field`, not `form`** — the mira styles' `form.json` is an empty stub; the
   registry moved form composition to the `field` primitive. It still pairs
   with zod + react-hook-form.)
   Then the kit's npm deps — **pin majors, the kit is version-coupled**:
   `npm i @tanstack/react-table@^8 @tanstack/react-query@^5
   @tanstack/react-query-devtools@^5 nprogress date-fns@^4 react-hook-form
   @hookform/resolvers
   zod lucide-react` (v9 of tanstack-table renames the v8 API the kit uses;
   `add` doesn't always install lucide-react itself) · `next-themes` when dark
   mode = มี · `@base-ui/react` (the base-mira primitives package — init installs it, verify it's there; combobox in the
   registry uses it) · `next-intl` เสมอทุกโปรเจค (มติ 2.2 — kit อ่านสตริงผ่าน
   catalog) · `exceljs` only when
   the project exports Excel/CSV (`lib/export.ts` + `ui/export-menu.tsx` —
   skip both files otherwise; route shape and traps in
   `references/conventions.md` §Export) · `npx shadcn@latest add chart`
   (recharts) only when the project has charts — copy `ui/chart-example.tsx`
   as the color-rule reference · the `@tiptap/*` ^3 set + `ui/tiptap-editor.tsx`
   only when rich text exists · `motion` + `lib/motion.ts` only when custom
   motion = มี (pairs with `docs/MOTION.md`).
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
   `references/conventions.md` §Kit). `assets/i18n/` → `i18n/` และ
   `assets/messages/` → `messages/` (**ทุกโปรเจค ไม่ใช่เฉพาะ th+en** — kit
   ทั้งชุดอ่านสตริงผ่าน catalog ตั้งแต่ 4.46.0 โปรเจคไทยล้วนได้ catalog
   ภาษาเดียวและไม่ต้องแปลอะไร มติ 2.2) · ตั้ง `next-intl` เป็น dependency
   เสมอ ไม่ใช่เฉพาะ th+en. **theme-provider: the preset scaffold
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
8. Install the harness rule: copy `assets/rules/ugt-nextjs-design.md` →
   `.claude/rules/ugt-nextjs-design.md` (whole-file overwritable on update).

### Placeholders (ทุกตัว — จับคู่กับคำถาม interview)

ทุก `__…__` ในไฟล์ template (DESIGN.template.md · MOTION.template.md ·
design-questions.template.md · globals.tokens.css) พร้อมที่มาของคำตอบ —
"fill every `__...__`" เฉย ๆ เคยทำให้ตัวที่ไม่มีคำถามตรง ๆ ถูกข้าม:

| Placeholder | มาจาก |
| --- | --- |
| `__PROJECT_NAME__` | ชื่อโปรเจค (full-setup ถามแล้ว / ถามเองเมื่อ standalone) |
| `__DATE__` | วันที่รันติดตั้ง |
| `__STD_VERSION__` | เวอร์ชัน ugt-core ใน `plugins/ugt-core/.claude-plugin/plugin.json` ณ ตอนติดตั้ง |
| `__REFERENCE__` | ข้อ 1 — prototype/brand ที่ต้อง match |
| `__PRIMARY__` / `__PRIMARY_DARK__` | ข้อ 2 — สีหลัก (dark ต้องสว่างกว่า light) |
| `__DARK_MODE__` | ข้อ 3 |
| `__SHELL__` | ข้อ 5 (sidebar/topbar/ทั้งคู่) |
| `__LANDING__` | ข้อ 6 |
| `__LANG__` | ข้อ 7 (th / th+en) |
| `__ERA__` | ข้อ 8 (พ.ศ. / ค.ศ.) |
| `__CONTROL_SCALE__` | ข้อ 9 (ค่า kit = mira · โปรเจคเดิม = ค่าที่วัดจริงจาก §Scale scan) |
| `__DEVIATIONS__` | ผล scan โปรเจคเดิม (Step 1) — โปรเจคใหม่ = "-" |
| `__ANSWERS_SUMMARY__` / `__ANSWERED_BY__` | สรุปคำตอบ + ผู้ตอบ ลงมติแถวแรกของ §10 |

(`verify.mjs` สแกน DESIGN.md / globals.css / MOTION.md / design-questions.md
หา `__*__` ที่ตกค้างให้แล้ว)

### Step 4 — Close out

1. Run `node <skill-dir>/scripts/verify.mjs` (cwd = project root); fix every
   ✘ — never report done with exit code 1 outstanding.
2. Summarize: every file added/changed, the answers recorded in DESIGN.md,
   and any deviations grandfathered.
3. Smoke checklist:
   - [ ] every `<DataTable>` has a unique `id` · page filters sit in the
     table's card, left-aligned (verify.mjs checks both)
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
  DataTable modes, Excel/CSV export) + the kit inventory with provenance

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

## 6. Verification Checklist

Run first, then walk what a script cannot see (details in Step 4 — Close out):

```bash
node <skill-dir>/scripts/verify.mjs      # cwd = project root
node <skill-dir>/scripts/check-contrast.mjs
```

- [ ] both scripts exit 0 — never close with a ✘ outstanding
- [ ] `components.json` is the org preset and no Radix reached the project
      (verify.mjs gates both — a plain `shadcn init` fails here)
- [ ] `docs/DESIGN.md` has no `__...__` left and its มติ table has today's entry
- [ ] every `<DataTable>` has a unique `id`; page filters sit inside the
      table's card, left-aligned (verify.mjs checks both)
- [ ] `npm run build` passes
- [ ] a page using Button / Input / Table renders with the new tokens, in
      light **and** dark if dark mode was selected
- [ ] the installed UI matches `docs/design-preview.html` — that page is the
      promise the org makes to the reader
