---
name: ugt-nextjs-design-setup
description: >
  Use when a project needs its design agreement — "ทำข้อตกลง design", "ตั้ง
  design system", "กำหนดธีม", "ทำ DESIGN.md", "จัด layout ให้เป็นมาตรฐาน",
  "สีกับฟ้อนต์ยังมั่วอยู่", "UI แต่ละหน้าไม่เหมือนกัน" — covering the interview
  → generated `docs/DESIGN.md` (the design source of truth), shadcn/ui tokens in
  globals.css (org indigo + semantic-6 status set), Inter + Noto Sans Thai
  fonts, the app shell (sidebar/topbar via shadcn blocks), the org UI kit
  (DataTable, FormDialog, StatusBadge, IconAction, date pickers, formatter lib),
  and the harness rule that makes every later session read the agreement before
  touching UI. Works on a fresh project (full interview) or an existing one
  (scan → draft agreement → recorded deviations). Also handles "sync ข้อตกลง
  design" after a plugin update and "ปรับให้ตรง org" on a preserve-mode
  project (re-align to the org standard). Also the home of the DEV environment
  bar + `[DEV] ` tab title ("แยกไม่ออกว่าอยู่ dev หรือ prod", "เผลอทดสอบบน
  prod", "คนกรอกข้อมูลจริงลง dev"). Run BEFORE ugt-nextjs-auth-setup —
  auth generates themed pages that must inherit these tokens. Not for feature
  UIs or Jenkins/DB/auth setup.
---

# UGT Design Setup — design agreement + tokens + org UI kit

## 1. Overview

Build UI first and agree on design later, and you retheme the whole app —
sometimes twice. This skill runs the agreement first: one
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
| Site header (breadcrumb เส้นทางเต็ม + จุด mount ของ toggles) | `components/site-header.tsx` — from `assets/components/`, mandatory on every sidebar shell (§Site header in layout-shells.md) |
| Company logos (tintable SVG, `fill="currentColor"`) | `public/brand/` — from `assets/brand/` |
| DEV environment indicator (amber bar on every page + `[DEV] ` tab title, dev deployment only) | `lib/environment.ts` + `components/dev-environment-bar.tsx` + `app/layout.tsx` — from `assets/lib/` + `assets/components/`; strings in `kit.devEnvironment` |
| Harness rule (read DESIGN.md before UI work) | `.claude/rules/ugt-nextjs-design.md` — from `assets/rules/ugt-nextjs-design.md` |

## 2. Org Standards (summary — full text in ugt-core `contracts/design.md`)

1. **shadcn-first ladder**: primitive → block/template → compose → custom
   Tailwind-utilities-only. Never hand-build what shadcn provides. No raw
   CSS / CSS-in-JS / inline styles except truly dynamic values.
2. **lucide only, never emoji** — and the fixed icon mapping (see
   `references/conventions.md`): same action = same icon on every page.
3. **Sizes = `default`** everywhere; sanctioned exceptions are listed in
   DESIGN.md, nowhere else: `size="icon"` for an icon-only button **anywhere**
   as long as it carries an `aria-label` (มติ 2026-08-21 — theme toggle,
   SidebarTrigger, column settings, pagination), **but inside a table row it
   must go through `IconAction`**; `sm` in dense toolbars.
4. **DataTable only** for tabular data; server-paginated data must sort and
   filter server-side through URL state — never client-sort a partial page.
   Every instance passes a **unique `id`** (prefs persist), and page-level
   filters live in the toolbar row via `toolbarFilters` — right after the
   search box, widest→narrowest (มติ 2026-08-11) — per-page config is part
   of the agreement, not a free choice (`references/datatable.md`).
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

**Preserve mode** (full-setup §2 Q0 = คงของเดิม, or the user says "คง/ใช้ design
เดิม" when this skill runs standalone) is the existing-project path with three
answers pre-filled — ข้อ 1 = มี (the reference is this project's own code),
ข้อ 5 = the shell the project already has, ข้อ 9 = ยึดของเดิม + rebase — one
extra question, ข้อ 10 (keep the project's font or move to Inter + Noto Sans
Thai; default keep — มติ 2026-09-09), and the scan is **not skippable**. The wrong reading:
"ใช้ design เดิม" taken as "leave design alone" → scan skipped →
kit installed on org indigo/mira defaults → the auth-setup admin pages, built
from the kit, shipped as a second template that looked nothing like the app.
Preserving a design means moving the kit onto it, not leaving the kit at its
defaults. Level is **token + shell** (มติ 2026-09-09): kit components stay as
they are and blend in through the rebased tokens and the existing layout.

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
2. shadcn init if none yet with **the org preset** (canonical, มติ 2026-08-04 —
   `base-mira` + `lucide` + `rtl:false` + neutral), then merge the tokens.
   Full detail, traps and fallbacks: **`references/shadcn-init.md`**. Must-not-miss:
   - **Existing project: Tailwind v4 before init** — none → install
     `tailwindcss @tailwindcss/postcss postcss`; **v3** → `npx @tailwindcss/upgrade`
     first (the token file is v4-only; `verify.mjs` fails on v3).
   - `npx shadcn@latest init --preset b1ZzrZbs0 --pointer --yes` (fresh project:
     `printf '<project-name>\n' |` … `--template next`) · **never `-b radix`** ·
     rename `package.json` `"name"` · **keep the `cn` npm package**.
   - Run `verify.mjs` right after init (gates preset + no Radix). Windows: run
     every CLI/build step from a **short path**.
   - Merge `assets/globals.tokens.css` into `app/globals.css` — **carry over the
     preset's `--radius` line** (verify fails without it) · substitute
     `__PRIMARY__`/`__PRIMARY_DARK__`.
3. Root layout + `next.config.ts` — exact wiring in **`references/root-layout.md`**.
   Must-not-miss:
   - Fonts Inter + Noto Sans Thai + Geist Mono via `next/font` (preserve mode ข้อ 10
     = คงฟ้อนต์เดิม → keep it, record `ฟ้อนต์: คงของเดิม (<ชื่อ>)` in §10) ·
     `<html lang={locale}>` when th+en.
   - Provider order: **`NextIntlClientProvider` outermost** → `QueryProvider`
     (+ `QueryProgress`) → `ThemeProvider` (dark = มี) → **`TooltipProvider`
     (required)** → children + `<Toaster richColors />`.
   - **DEV bar in the ROOT layout** (not site-header — the login page needs it
     too): `NEXT_PUBLIC_BASE_PATH` in `lib/env.ts`, `{isDevEnvironment() &&
     <DevEnvironmentBar />}` as the first child, and the title **prefixed**
     `[DEV] ` (prefix, not suffix).
   - **Register `createNextIntlPlugin('./i18n/request.ts')` in `next.config.ts`**
     — without it every `t()` throws and the whole app fails to render.
4. Install the base component set with `npx shadcn@latest add` (the CLI
   resolves `components.json` → base-mira, so it installs the right style).
   **อ่าน API จริงของ component จาก registry ของ base-mira เท่านั้น**:
   `curl -s https://ui.shadcn.com/r/styles/base-mira/<name>.json` ·
   ⚠️ **shadcn MCP ตอบ style default ที่เป็น Radix** และไม่มี parameter สั่งให้
   ตอบ base-mira — ถ้าเครื่องไหนต่อ MCP ตัวนี้อยู่ **ห้ามลอกโค้ดจากมัน** · ลำดับแหล่งอ้างอิงเต็ม +
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
   @hookform/resolvers zod lucide-react next-intl@^4` (v9 of tanstack-table
   renames the v8 API the kit uses; `add` doesn't always install lucide-react
   itself; `next-intl@^4` because the kit calls `getRequestConfig`,
   `NextIntlClientProvider`, `useTranslations`, `getTranslations` and
   `createNextIntlPlugin` directly — an unpinned install lets a future major
   change any of those out from under every project, the same class of break
   that hit `better-auth` unpinned) · `next-themes`
   when dark mode = มี · `@base-ui/react` (the base-mira primitives package —
   init installs it, verify it's there; combobox in the registry uses it) ·
   `next-intl@^4` เสมอทุกโปรเจค (มติ 2.2 — kit อ่านสตริงผ่าน
   catalog) · `exceljs` only when
   the project exports Excel/CSV (`lib/export.ts` + `ui/export-menu.tsx` —
   skip both files otherwise; route shape and traps in
   `references/export.md`) · `npx shadcn@latest add chart`
   (recharts) only when the project has charts — copy `ui/chart-example.tsx`
   as the color-rule reference · the `@tiptap/*` ^3 set + `ui/tiptap-editor.tsx`
   only when rich text exists · `motion` + `lib/motion.ts` only when custom
   motion = มี (pairs with `docs/MOTION.md`).
5. **App shell FIRST, then variants** — **preserve mode: skip the block.**
   The project's existing layout IS the shell (ข้อ 5 recorded as "เดิม"): do
   not install `sidebar-*`, no `<Sidebar>`/`<SidebarInset>`; later skills
   mount into the existing menu (auth §5.6). One exception is expected, not a
   violation: auth-setup's `NavUser` calls `useSidebar()`, so the existing
   shell gets wrapped in a bare `<SidebarProvider>` — context only, renders
   nothing, and `verify.mjs` does not treat it as a shadcn shell (it looks
   for `SidebarInset`/`<Sidebar>`). The block path below is only for a
   project with no layout that renders a nav.
   Otherwise: install the shadcn block named in
   `references/layout-shells.md` (never hand-composed) **before** touching
   `button.tsx` — `add <block>` prompts per existing file (even with
   `--yes`; pipe `yes n |` to decline in headless runs) and answering `y`
   would silently wipe just-applied variants. Then prune the block's demo
   debris per layout-shells.md, **and mount `components/site-header.tsx`
   (copied in Step 6) as the first child of `SidebarInset`** — feed it the
   same resolved nav items the sidebar renders, and put
   `<LanguageSwitcher />` (th+en) + `<ThemeToggle />` (dark = มี) in its
   `actions` slot. A shell whose top bar is just the trigger is the field
   bug this step closes.
6. Copy the org UI kit from `assets/ui/` into `components/ui/` and
   `assets/lib/` into `lib/` (`actions-locale.ts` → `lib/actions/locale.ts`,
   th+en only; **`site-header` + `site-header.test.ts` คู่กันเสมอ
   (ทุกโปรเจคที่มี sidebar shell)**, `lib/environment.ts` + `environment.test.ts` +
   `components/dev-environment-bar.tsx` (ทุกโปรเจค — wiring อยู่ Step 3.3 → `references/root-layout.md`),
   `theme-toggle` (dark mode = มี) and `language-switcher`
   (th+en) from `assets/components/` — list + provenance in
   `references/kit-inventory.md`; copying the two toggles without
   mounting them in site-header's `actions` slot is an incomplete install).
   **Then the select width edit (sanctioned, มติ 4.58.0)**: base-mira's
   `SelectTrigger` defaults to `w-fit`, so a form Select shrinks to its
   chosen value — add `w-full` to the trigger's base classes in
   `components/ui/select.tsx` (toolbar callsites keep overriding with
   `w-44`/`w-20` etc. via `cn`); `verify.mjs` fails without it. `assets/i18n/` → `i18n/` และ
   `assets/messages/` → `messages/` (**ทุกโปรเจค ไม่ใช่เฉพาะ th+en** — kit
   ทั้งชุดอ่านสตริงผ่าน catalog ตั้งแต่ 4.46.0 โปรเจคไทยล้วนได้ catalog
   ภาษาเดียวและไม่ต้องแปลอะไร มติ 2.2) · ตั้ง `next-intl@^4` เป็น dependency
   เสมอ ไม่ใช่เฉพาะ th+en (pin เดียวกับ npm i ใน Step 4). **theme-provider: the preset scaffold
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
| `__LANG__` | ข้อ 4 (th / th+en) |
| `__CONTROL_SCALE__` | ข้อ 9 (ค่า kit = mira · โปรเจคเดิม = ค่าที่วัดจริงจาก §Scale scan) |
| `__FONT__` | ข้อ 10 (preserve mode เท่านั้น — default คงฟ้อนต์เดิม) · ทุกกรณีอื่น = `Inter + Noto Sans Thai` |
| `__DEVIATIONS__` | ผล scan โปรเจคเดิม (Step 1) — โปรเจคใหม่ = "-" |
| `__ANSWERS_SUMMARY__` / `__ANSWERED_BY__` | สรุปคำตอบ + ผู้ตอบ ลงมติแถวแรกของ §10 |

(`verify.mjs` สแกน DESIGN.md / globals.css / MOTION.md / design-questions.md
หา `__*__` ที่ตกค้างให้แล้ว)

### Step 4 — Close out

1. Run `node <skill-dir>/scripts/verify.mjs` (cwd = project root); fix every
   ✘ — never report done with exit code 1 outstanding.
2. Summarize: every file added/changed, the answers recorded in DESIGN.md,
   and any deviations grandfathered.
3. Walk the Verification Checklist (§6).

### Sync mode ("sync ข้อตกลง design")

After a plugin update: read the project's `DESIGN.md` header version vs the
current ugt-core `contracts/design.md`. Present the diff (what the org
changed), apply what the user accepts, and record each acceptance/rejection
as a dated มติ. **Never silently rewrite the project's DESIGN.md** — it may
contain project มติ that deliberately deviate.

### Re-align mode ("ปรับให้ตรง org" on a preserve-mode project)

Trigger: `DESIGN.md` exists, its §10 carries preserve มติ (ยึดของเดิม /
คงของเดิม), and the user now wants the org standard. Not a fresh interview and
not Sync mode — the project is changing direction, and the failure modes are
reading the old มติ as still in force (tokens re-rebased onto the old brand),
regenerating DESIGN.md (project มติ lost), or switching tokens only (kit pages
go indigo, legacy pages stay hardcoded — two templates in one app).

1. **Re-scan** (§Scan in `references/interview.md`) and present the delta:
   token by token (primary, radius, control scale, font) old → org, plus
   every file that tokens alone won't move — hex colors, raw `<table>`,
   inline date formatting, per-page size overrides — with counts per file.
2. **Ask once** (AskUserQuestion): migrate each listed file now / grandfather
   into §9 / pick per file. Font is asked separately (keep or move to
   Inter + Noto Sans Thai) — the org default is not assumed.
3. **Apply**: tokens back to the org values in `globals.css` (Step 3.2 token
   merge — `references/shadcn-init.md` §Token merge), un-rebase `components/ui/*` per §Scale bridge in reverse, fonts per
   Step 3.3 (`references/root-layout.md` §Fonts) when moving, migrate the files chosen in step 2. The shell stays
   unless the user asks for the org shell (then Step 3.5).
4. **Record — append, never rewrite**: §10 gains
   `ยึด org (re-align) — แทนมติ <date ของมติ preserve>` and the font row
   `ฟ้อนต์: เปลี่ยนเป็น Inter + Noto Sans Thai` or `ฟ้อนต์: คงของเดิม (<ชื่อ>)`;
   §2/§4 values updated to the org ones; §9 rows added/closed to match step 2.
   `verify.mjs` reads the **last** mode and font rows in §10 — the exact
   phrase `ยึด org (re-align)` is what switches its preserve check off.
5. Close out as Step 4 (verify exit 0, check-contrast).

## 4. References

- `references/interview.md` — the question bank + defaults + the
  existing-project scan checklist (the interview step reads it — question bank, defaults, scan checklist)
- `references/layout-shells.md` — shell answer → shadcn block mapping + nav
  highlight rule + overflow rule
- `references/shadcn-init.md` — Step 3.2 in full: Tailwind v4 check/upgrade,
  org-preset init command, after-init gate, Windows short path, token merge
- `references/root-layout.md` — Step 3.3 in full: fonts + `lang`, provider
  stack, DEV environment bar + `[DEV] ` title, next-intl plugin
- `references/conventions.md` — component-usage rules in depth (ถูก/ผิด,
  control ladder, Base UI API check, Dialog ladder, Badge vs StatusBadge,
  icon mapping + IconAction tone, feedback, i18n)
- `references/datatable.md` — page-level filter bar + DataTable modes,
  toolbar, pagination, consistency obligations
- `references/export.md` — Excel/CSV export route shape and traps
- `references/kit-inventory.md` — every kit file with provenance and when to ship it

## 5. Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| Run before auth-setup when both are planned | Theme the app after auth already generated pages |
| Scan an existing project before asking anything | Interview an existing project from zero |
| Preserve mode: scan → rebase tokens onto the measured values → keep the shell | Read "ใช้ design เดิม" as "skip the design step" — the kit stays org default |
| Tailwind v3 found → upgrade to v4 before init | Merge the v4 token file into a v3 project (tokens ignored, kit renders broken) |
| Record every answer (even accepted defaults) as มติ | Treat defaults as "nothing to write down" |
| shadcn block for the shell | Hand-compose a sidebar/topbar |
| Diff-and-ask on existing `components/ui/` files | Overwrite the project's components silently |
| Run check-contrast + verify before closing | Close with a failing script "to fix later" |
| Sync mode diffs and records มติ | Regenerate DESIGN.md over project decisions |
| Dev deploy: root layout mounts `<DevEnvironmentBar />` + title `[DEV] ` from `isDevEnvironment()` | Rely on the site-header `DEV` badge alone (login page has none) or leave dev and prod looking identical |
| Re-align: list files tokens won't move, append `ยึด org (re-align)` | Flip tokens only and leave hardcoded legacy pages as a second template |

## 6. Verification Checklist

Run first, then walk what a script cannot see:

```bash
node <skill-dir>/scripts/verify.mjs      # cwd = project root
node <skill-dir>/scripts/check-contrast.mjs
```

- [ ] both scripts exit 0 — never close with a ✘ outstanding
- [ ] `components.json` is the org preset and no Radix reached the project
      (verify.mjs gates both — a plain `shadcn init` fails here)
- [ ] `docs/DESIGN.md` has no `__...__` left and its มติ table has today's entry
- [ ] every `<DataTable>` has a unique `id` (verify.mjs checks); page filters
      sit inside the table's card, left-aligned (by eye — verify.mjs only
      warns on a bare `<Input>` used as search/filter)
- [ ] `npm run build` passes
- [ ] sidebar shell → `components/site-header.tsx` mounted as the first
      child of `SidebarInset`, breadcrumb shows `group › หน้า` from the
      same nav config as the sidebar, and the toggles that were copied
      (`LanguageSwitcher`/`ThemeToggle`) actually render in its `actions`
      slot (verify.mjs checks presence/imports; the rendered breadcrumb is
      by eye)
- [ ] `components/ui/select.tsx` `SelectTrigger` carries `w-full`
      (verify.mjs checks) — a form Select must not shrink to its value
- [ ] a page using Button / Input / Table renders with the new tokens, in
      light **and** dark if dark mode was selected
- [ ] the installed UI matches the platform repo's `docs/web/design-preview.html`
      (open it from the marketplace checkout — the file is **not** copied into
      the project) — that page is the promise the org makes to the reader
- [ ] `node <skill-dir>/scripts/check-i18n.mjs` เขียว — catalog `th`/`en` มี key
      ชุดเดียวกัน และไฟล์ที่แปลงแล้วไม่มีสตริงไทยนอกคอมเมนต์
- [ ] `i18n/request.ts` + `i18n/messages.ts` + `messages/kit.*.ts` copy เข้าโปรเจคแล้ว
      (**ทุกโปรเจค ไม่ใช่เฉพาะ th+en**) และ `NextIntlClientProvider` อยู่นอกสุด
      ของ provider stack ใน `app/layout.tsx`
- [ ] `app/layout.tsx` เรียก `isDevEnvironment()` สองที่: render `<DevEnvironmentBar />` กับ title
      `[DEV] ` (verify.mjs เช็ค) · dev deploy จริงเห็นแถบเหลืองบนสุดของ**หน้า login ด้วย** และแท็บขึ้นต้น
      `[DEV] ` · prod ไม่เห็นทั้งสองอย่าง (by eye — verify.mjs ดูโค้ดไม่ใช่ deployment)
- [ ] `next.config.ts` ลงทะเบียน `createNextIntlPlugin('./i18n/request.ts')` แล้ว
      (ขาดข้อนี้ = `t()` ทุกตัวโยนตอน render, แอปไม่ขึ้น)
- [ ] th+en เท่านั้น: กดสลับภาษาแล้ว **ข้อความในตารางเปลี่ยนจริง** (หัวคอลัมน์
      ที่ผู้เรียกส่งมาจะยังเป็นภาษาเดิมจนกว่าโปรเจคจะแปลเอง — ที่ต้องเปลี่ยนคือ
      ปุ่มหน้า, ตัวกรอง, empty state, สรุปจำนวนแถว)
