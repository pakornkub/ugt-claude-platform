# Changelog — ugt-nextjs-platform

## 4.0.0 (2026-08-09)

**BREAKING — radius is now the preset's, not the org's** (มติ 2026-08-09).
`globals.tokens.css` no longer declares any radius; projects use what
`base-mira` ships.

The values were finally measured by running the org preset for real
(`shadcn init --preset b1ZzrZbs0`) instead of guessing — mira sets
`--radius: 0.45rem` (7.2px) and derives the rest by multiplication:

| role | mira (new) | org hand-set (old) |
| --- | --- | --- |
| chip `sm` (×0.6) | 4.32px | 4px |
| control `md` (×0.8) | 5.76px | 6px |
| card `lg` (×1) | 7.20px | 12px |
| overlay `xl` (×1.4) | 10.08px | 14px |

Small tiers were already all but identical — the real change is **cards and
dialogs get noticeably squarer** (12→7.2, 14→10.1). What the switch buys: one
knob (`--radius`) rescales everything, which the old setup could not do (its
four literals moved independently, and changing `--radius` only affected the
card tier — a trap documented in 3.4.0 and now gone).

Because the install replaces the `:root` block, three other places had to
change or projects would end up with **no** `--radius` at all and square
corners everywhere:

- `SKILL.md` merge step: explicitly carry over the preset's `--radius` line
  and leave its `@theme` radius scale untouched.
- `verify.mjs`: new check **`--radius survived the token merge`** (fails when
  the line was lost, warns when the `@theme` scale is gone), and the old
  "globals.css must not declare `--radius-2xl`" check is **removed** — the
  preset legitimately declares 2xl/3xl/4xl, so that check would have failed
  every project. The usage rule stays: source may only use the four agreed
  roles, `rounded-2xl` and up still fail.
- DESIGN.md §1 rewritten: radius comes from the preset, one knob adjusts it,
  changing it is a มติ.

All three checks were exercised against the real `globals.css` mira generated:
passes as-shipped, fails when `--radius` is stripped, fails on `rounded-3xl`.
`docs/design-preview.html` now renders the mira radii.

## 3.4.0 (2026-08-09)

**Correction to 3.3.0 — the radius comparison in that entry was wrong.**
3.3.0 said shadcn derives `sm/md/xl` from `--radius` as `−4/−2/+4px`. It does
not: shadcn derives them by **multiplication** — `sm ×0.6 · md ×0.8 · lg ×1 ·
xl ×1.4 · 2xl ×1.8 · 3xl ×2.2 · 4xl ×2.6` — with stock `--radius: 0.625rem`
giving 6 / 8 / 10 / 14px ([shadcn theming docs](https://ui.shadcn.com/docs/theming)).
The conclusion still holds and is now stated with the right numbers: our tiers
are **hand-set, not derived**, because mira puts controls at 28px, where a
derived `md` (9.6px at our `--radius`) reads as 34% radius-to-height instead
of 21%.

Two consequences that were never written down and are now in DESIGN.md §1:

- **Changing `--radius` does NOT rescale the tiers** here — it only moves
  `lg`/card, because the other three are literal values. Change a tier by
  editing its own line.
- **Only four tiers exist**: chip 4 · control 6 · card 12 · overlay 14.
  `--radius-2xl/3xl/4xl` are removed from `globals.tokens.css` — but removing
  them does **not** disable `rounded-2xl`, since Tailwind still ships its own
  defaults for those utilities. The real guard is a new `verify.mjs` check
  that fails on `rounded-2xl|3xl|4xl` in source and on any re-declaration of
  those variables in `globals.css` (tested on both failure modes plus the
  passing case).

Not verifiable from here, stated so nobody assumes: **whether the `base-mira`
preset ships its own radius values.** Styles clearly can carry radius —
public docs describe Lyra as zero-radius and Maia as larger-cornered — but
mira's exact numbers are not published, and our install replaces the whole
token block anyway, so the four tiers above are what a project actually gets
regardless of what the preset had.

## 3.3.0 (2026-08-09)

> **แก้ไขแล้วใน 3.4.0**: สูตร derive ของ shadcn ที่อ้างในหัวข้อนี้ (`−4/−2/+4`)
> ผิด — ที่ถูกคือคูณ (`×0.6 / ×0.8 / ×1.4`) ดูรายละเอียดใน 3.4.0


Two rules the agreement never stated, found by reviewing the preview page —
both are layout bugs that repeat on every form/detail screen until pinned:

- **`*` (required) must sit on the same line as its label.** Written because
  a label built as a grid container pushes the `*` onto its own row, leaving
  a red star floating above the field. DESIGN.md §4 now says the label line
  is a flex row, not a separate grid item.
- **label–value rows** (detail dialogs, summaries, data cards) are flex
  `justify-between` + `align-items:center`, column gap ≥16px, row height
  ≥~24px — a `StatusBadge` is taller than plain text and collides with the
  left-hand label without it.

Also documented, because the token file cited a section that did not exist:
**DESIGN.md §1 now carries the radius tiers** — control 6px (`--radius-md`) ·
card 12px (`--radius-lg` = `--radius`) · overlay 14px (`--radius-xl`) ·
chip 4px (`--radius-sm`), stated as **org values that deliberately replace
shadcn's derived scale** (shadcn derives sm/md/xl from `--radius` as −4/−2/+4;
the org pins tighter control corners to match mira density). Never override
per callsite.

`docs/design-preview.html` fixed for both layout rules and verified in a
browser: all three required labels keep `*` inline (18px single-line labels),
all four label–value rows are vertically centred with ≥110px column gap.

## 3.2.0 (2026-08-09)

**Fix — icon buttons in `DataTable` were two different sizes.** The four
pagination buttons hardcoded `size-8` / `h-8 w-8` (32px) while the toolbar's
column-settings button used the mira density default (28px) — visibly uneven
inside one table. All five now use `size="icon"` with no size override, and
the code carries a comment saying why an override must not come back.

Pinned so it cannot drift again (มติ 2026-08-09, ugt-core 2.2.0 carries the
stack-agnostic wording):

- DESIGN.md §4: pagination is rows-per-page + "หน้า X จาก Y" + four icon
  buttons, **no numbered page list**; icon buttons in a table are
  `size="icon"` only.
- `references/conventions.md`: new **Header cell anatomy** (drag handle →
  sortable label with direction indicator → per-column filter popover, with
  the auto-suppression rule when `serverPagination` has no `serverQuery`) and
  **Toolbar** / **Pagination** paragraphs.

`docs/design-preview.html` (repo-level) corrected to match the real
component — it had been showing a plain header row, text prev/next buttons,
and dialogs without the header/footer rules. Now shows the real header
affordances, the real pagination cluster, `FormDialog`'s bordered
header/scrollable body/bordered footer + built-in close ✕, and
`ConfirmActionDialog` deliberately without either.

## 3.1.0 (2026-08-09)

**Cross-feature consistency** — closing the gap between "the agreement was
installed" and "page 2 still looks like page 1" (ugt-core 2.1.0 carries the
stack-agnostic rules).

`ugt-nextjs-design-setup`:

- DESIGN.md §3 pins the **page-level filter bar**: inside the table's card,
  left-aligned, ordered period → org unit → status; page actions stay in
  `PageActions` top-right; control per the existing ladder and **never a bare
  `Input` as a filter** (free-text search is the DataTable toolbar's, not
  duplicated beside it).
- DESIGN.md §4: **every `<DataTable>` must pass a unique `id`** — column prefs
  persist only with one, so a table that forgets it silently behaves
  differently from every other table in the app. Turning a standard feature
  off now needs a reason that holds on any similar page.
- DESIGN.md §8: when a per-page UX choice becomes a **precedent** for later
  pages it is a มติ (§10) *and* gets written into the section it belongs to —
  the test is "must the next similar page do this too?". Plus the explicit
  reminder that design มติ live here, never in `project-context/decisions.md`.
- `scripts/verify.mjs` gains two real checks: a **fail** on any `<DataTable>`
  without an `id` or with a duplicated `id` (reported file:line), and a
  **warning** on an `<Input>` used as a search/filter control.
- `references/conventions.md`: new "Page-level filter bar" section and the
  DataTable "consistency obligations" block.
- `evals/evals.json` adds **evals 6 and 7 — a different kind of eval**: 1–5
  grade the install moment, 6–7 grade the agreement's actual purpose by asking
  for a *second* feature on a project that already has one, with no design
  instructions in the prompt, and checking the result against the first page
  (scaffold, filter placement, table config, StatusBadge, formatter) — plus
  the case where the second feature genuinely needs a new pattern and must
  record it as a precedent.

## 3.0.0 (2026-08-09)

**BREAKING — the naming + knowledge-architecture release** (pairs with
ugt-core 2.0.0). Renamed skills keep their old trigger words in the new
descriptions, so "บันทึก checkpoint" or "/ugt-nextjs-setup"-era habits still
route correctly.

Renames:

- `ugt-nextjs-setup` → **`ugt-nextjs-full-setup`** (the orchestrator no longer
  reads as a sibling of the `*-setup` children)
- `ugt-nextjs-quality-setup` → **`ugt-nextjs-test-lint-setup`** (no more
  collision with "Quality Gate", which belongs to clean-code/cicd)
- displayName → "UGT Next.js Platform"

Assets are now one convention everywhere:

- **Placeholders**: one system — `__X__` — in every asset (was 3 systems:
  `<x>`, `__X__`, `{{X}}`). Angle/mustache notation survives only as prose
  notation in docs. Verify scripts updated to match.
- **Mirror layout**: every asset sits at its destination path
  (`assets/lib/auth.ts` → `lib/auth.ts`, `assets/app/(admin)/…` →
  `app/(admin)/…`) — the auth copy table collapsed from 26 rows to a
  copy-the-tree rule + 4 exceptions.
- **Rules travel with their owner**: `.claude/rules/ugt-nextjs-{database,
  auth,ci,design}.md` are installed by their own child skill from
  `assets/rules/` — installing a single skill now also installs its rule.
- Every skill now ships both `evals.json` and `trigger-evals.json`
  (5 new trigger sets; baselines run at the release gate).

Knowledge architecture (see ugt-core 2.0.0 for the design):
`assets/state/` now ships `handoff.md` (new sections) + `model-mode.md` only;
`project-notes.md` is gone; the harness step invokes `ugt-context` to
bootstrap `docs/project-context/`; CLAUDE-block imports
`@docs/project-context/00-index.md`, tells sessions to read the relevant
context **before** entering the superpowers pipeline, to check `decisions.md`
before proposing direction changes, and to open `troubleshooting.md` before
debugging a strange error; the knowledge triage is now 4-way.

### Migration — existing v2.x projects (AI-executable; run after `/plugin update`)

1. `git mv .claude/state/checkpoint.md .claude/state/handoff.md` and
   `git mv .claude/state/mode.md .claude/state/model-mode.md`.
2. Create `docs/project-context/` by running **`ugt-context`** (existing
   codebase → scan path). Then move history into it:
   - `handoff.md` §Decisions entries → append to
     `docs/project-context/decisions.md` (keep dates/reasons verbatim), then
     delete the section; retitle sections to **In progress / Next / Open
     Questions / Done** and trim Done to ~10 rows.
   - `project-notes.md`: Error Patterns → `troubleshooting.md` · Deviations →
     `⚠ deviation` lines in `architecture.md` at the relevant section · Open
     Questions → `handoff.md` §Open Questions. Then delete
     `project-notes.md`.
   - If `docs/requirements-brief/00-overview.md` has a สถานะ column: move the
     feature rows + statuses to `docs/project-context/board.md` and drop the
     column from the overview.
3. Re-run `ugt-nextjs-full-setup`'s harness step (step 4–5 only) to refresh
   the CLAUDE.md block (new imports + rules) — project content outside the
   markers is untouched.
4. Verify: `node <plugin>/skills/ugt-nextjs-full-setup/scripts/verify.mjs`
   from the project root — it fails loudly on any leftover v2.x file.

Release gate (run before tagging): a scratch project on the v2.x layout
(checkpoint + project-notes + mode + old CLAUDE block + a brief with a สถานะ
column) fails verify with 5 actionable errors naming the migration; executing
steps 1–3 above verbatim lands it on **14/14 green**, with team content
outside the `ugt:start/end` markers untouched. A fresh harness install is
14/14 green as well.

## 2.9.3 (2026-08-05)

`ugt-nextjs-design-setup`: **company logo assets** join the kit —
`assets/brand/ube-logo-short.svg` (shell header) and `ube-logo-long.svg`
(with tagline — login/landing), both converted to `fill="currentColor"` so
CSS `color` tints them (brand blue, white-on-dark, any theme). The install
step copies them to the project's `public/brand/`, and DESIGN.md §3 gains
the usage rule (short = header, long = login/landing, ห้าม embed
logo รูปอื่น/สีเพี้ยน). Also fixes a leftover `radix-mira` mention in
conventions.md's kit inventory (missed in the 2.9.0 sweep).

## 2.9.2 (2026-08-05)

**Admin handoff becomes a standard FILE, not a chat message.** The external
setup work (Jenkins credentials/job/webhook, SonarQube projects/gate/webhook,
Keycloak client) was already surfaced with exact project-specific names — but
as a rendered table in chat, which users then had to copy for their admin
team. Now:

- New asset `ugt-nextjs-cicd-setup/assets/admin-handoff.template.md` — a
  plain-Thai, step-by-step handoff document: 1-minute overview table,
  per-system sections (exact credential IDs / project keys / Client ID /
  redirect URIs generated to match the project's settings), a fill-in
  **"ค่าที่ต้องส่งกลับ"** section the admin completes and returns (secrets
  explicitly routed to a secure channel, never into the file), and a closing
  checklist. Sections for unselected systems are deleted, not left blank;
  server-level first-project setup is an optional appendix.
- cicd-setup close-out now **writes `docs/admin-handoff.md`** into the
  project and tells the user to forward that file; chat summary is
  secondary. Raw per-system detail stays in the existing references.
- Parent `ugt-nextjs-setup` close-out: confirms the file exists with no
  `{{...}}` left; Auth-without-CI renders the Keycloak-only version.
- auth-setup (solo run, SSO client not yet created): renders its Keycloak
  request from `references/keycloak-client.md` into the same
  `docs/admin-handoff.md` (updating the section if the file already exists)
  — stays self-contained, no cross-skill file reference.

## 2.9.1 (2026-08-04)

`ugt-nextjs-design-setup`: polish from behavioral eval **iteration-2** on
the base-mira preset — both runs passed everything (verify 14/14, contrast
30/30 first-try, `next build` green with zero kit TS errors → the Base UI
port is proven on real projects; 9+ of iteration-1's 12 frictions confirmed
fixed by two agents independently). This release closes the six minor
frictions that remained, all doc-level:

- **Windows short-path is now the primary flow**, not a footnote — deep
  paths break both the shadcn CLI and Turbopack builds (MAX_PATH; junctions
  don't help): scaffold + run all CLI/build steps at a short real path,
  then move. Plus a recovery line for `--template next` dying mid-install
  (re-run init in existing-project mode after `npm install`).
- **Install order flipped: shell block BEFORE button variants** —
  `add <block>` prompts per existing file even with `--yes` (headless:
  `yes n |`), and a `y` would silently wipe just-applied variants.
- **theme-provider**: keep the preset scaffold's own file (superset of our
  asset — hotkey + disableTransitionOnChange); the asset is fallback only.
- layout-shells.md: mandatory `sidebar-*` block cleanup steps (move
  Provider composition into `app/(app)/layout.tsx`, delete demo samples,
  resolve the root `app/page.tsx` collision).
- globals.tokens.css ships `--font-heading: var(--font-sans)` and the merge
  instruction keeps preset `@layer`/`@theme` additions (cursor-pointer
  rule).
- Init step renames `package.json` `"name"` from the template's `next-app`.
- evals.json updated to the base-mira standard (eval-3's deviation fixture
  flips to radix-mira — the old standard is now the deviation under test).

## 2.9.0 (2026-08-04)

`ugt-nextjs-design-setup`: **standard base flips to `base-mira` (Base UI)**,
superseding the radix-mira มติ of the same day — the org preset
(`b1ZzrZbs0`) was deliberately authored on Base UI and the user confirmed
that intent, so the standard follows the preset rather than the other way
around. Minor bump: the shipped kit's component API changed.

- Init commands drop `-b radix` (and the docs now warn *against* adding it).
  Fallback becomes `--preset mira`. verify.mjs expects `style: "base-mira"`.
- Kit ported Radix → Base UI: `asChild` → `render` prop at 7 sites
  (combobox, data-table ×2, date-picker, truncated-text, theme-toggle) ·
  `icon-action.tsx` + `confirm-action-dialog.tsx` restored to their
  gov-boi-smart **Base UI originals** (the Radix-era `preventDefault`
  workaround on AlertDialogAction is gone — Base UI doesn't auto-close).
  Remaining kit files audited clean of Radix-only API. `grep asChild|@radix-ui`
  over assets/: 0.
- Provenance flips: gov-boi-smart (base-mira) is now the base-aligned
  reference; **ugt-hrms stays the DataTable reference but every sync now
  ports `asChild` → `render`** (recorded in conventions.md §Kit status).
- Scan checklist: `base-mira` = compliant, `radix-*` = recorded deviation.
- Historical trail kept in `docs/design-skill-draft.md` (superseded มติ
  struck through, not erased).

## 2.8.2 (2026-08-04)

`ugt-nextjs-design-setup`: the org now has its own **canonical shadcn
preset** (authored in the shadcn configurator, then verified by a live init
run) — init becomes
`printf '<name>\n' | npx shadcn@latest init --preset b1ZzrZbs0 -b radix --template next --pointer --yes`
for greenfield (scaffolds the Next app too — no separate create-next-app),
same command without `--template next` for existing projects. Verified
output: `radix-mira` + `lucide` + `rtl:false` + menu default/solid/subtle +
neutral. Two live findings baked into the docs: **`-b radix` is mandatory**
(the preset code was authored on the Base UI side — without the flag it
yields `base-mira` and the Radix kit breaks), and `--template next` has a
project-name prompt `--yes` doesn't cover (hence the `printf` pipe). The
generic `--preset mira -b radix` invocation stays documented as fallback.
Post-init verification expanded: `rtl: false` + `menuColor: "default"` join
the lucide check. DESIGN.template §1 now records the menu agreement
(Default / Solid / Subtle) from the preset.

## 2.8.1 (2026-08-04)

`ugt-nextjs-design-setup` hardening from the first behavioral eval run
(2 evals × with/without-skill on real scaffolds; with-skill passed 14/14
assertions + verify + contrast + build in both — but only by improvising
past 12 frictions, all now fixed; baselines scored 2/14, confirming the
skill carries org knowledge, not general competence):

- SKILL.md: the real init invocation (`npx shadcn@latest init --preset mira
  -b radix` — "style radix-mira" is not a CLI flag) + force `iconLibrary`
  to lucide and strip `@hugeicons/*` (the mira preset's default) + Windows
  MAX_PATH/`subst` hazards note.
- **`form` → `field`**: radix-mira's `form.json` is an empty stub — install
  list, template, rules, and conventions now all say `ui/field`
  (still zod + react-hook-form).
- npm deps pinned (`@tanstack/react-table@^8` — v9 renames the kit's API —
  `date-fns@^4`) + `react-hook-form zod lucide-react` added explicitly.
- `button-variants.md` now ships the **`field` variant** (kit date-picker
  needs it; today's registry button dropped it — was a build breaker) and
  the template sanctions it.
- `globals.tokens.css`: dark `--ring`/`--sidebar-ring` now derive from
  `{{PRIMARY_DARK}}` instead of hardcoded indigo.
- interview.md documents the **brand-color AA trap** (mid-lightness brand +
  "dark primary lighter" + near-white foreground can't all pass AA) with the
  sanctioned fix: flip dark `--primary-foreground` to a dark brand tone, as
  a มติ.
- Exact `app/layout.tsx` next/font snippet now in SKILL.md (the old text
  pointed at a template section that had no snippet) + **root
  `TooltipProvider` requirement** (radix-mira Tooltip doesn't self-wrap;
  sidebar tooltips crash prerender without it).
- New asset `components/theme-provider.tsx` (next-themes wrapper — was
  improvised in both eval runs).
- `lib/format.ts`: locale now defaults to `'th'` (ไทยล้วน projects no longer
  pass it on every call).
- conventions.md: added ถูก/ผิด code-example pairs for the five most common
  violations (StatusBadge, DataTable, formatter, size default, IconAction).

## 2.8.0 (2026-08-04)

`ugt-nextjs-design-setup`: the **full-option DataTable** lands, closing
2.7.0's known gap — built and tested inside ugt-hrms first (PR #166: 10 new
tests, components/ui 62/62, tsc + next build clean), then synced back as the
asset (de-i18n'd to Thai literals like the rest of the kit):

- Server mode done right: new `serverQuery` prop — sort/filter/paginate all
  through URL state (`lib/table-query.ts`); legacy `serverPagination`-only
  tables get per-column filter UI suppressed (partial-page guard).
- Per-column popover filter + active-filter chips (per-chip ✕ + clear-all),
  multi-column AND.
- Column drag-reorder (dependency-free, keyboard-accessible) + hide/show
  (Settings2 popover) + localStorage prefs via the new `id` prop
  (`lib/table-prefs.ts`) + reset-to-default.
- Page size default 10, options 10/20/50; `lib/pagination.ts` upgraded to
  the HRMS-adapted version (`parsePageSize` clamps URL-supplied sizes to the
  option set).
- Trigger-evals baseline recorded: 42/42 primary across 3 judges
  (text-isolated, 7 distractors) — no description change needed.

## 2.7.0 (2026-08-04)

New skill: **`ugt-nextjs-design-setup`** — the design agreement installer,
rendering ugt-core's new `contracts/design.md` (1.5.0) for Next.js. Extracted
from `ugt-hrms` (the reference implementation) and `gov-boi-smart` (whose git
history — two full rethemes — is the reason the skill runs *before* UI
exists). Full evidence trail: `docs/design-skill-draft.md` in this repo.

- Interview (defaults on every question, "ตามมาตรฐานทั้งหมด" fast path) →
  generated `docs/DESIGN.md` with a dated decision log; existing projects get
  scan → draft agreement → recorded Deviations (migrate/grandfather) instead
  of a silent reformat.
- Installs: shadcn `radix-mira` config, org tokens (indigo primary,
  semantic-6 `--status-*` set, WCAG-AA-verified — `scripts/check-contrast.mjs`
  re-verifies on every color change), Inter + Noto Sans Thai, app shell from
  shadcn blocks, the org UI kit (DataTable, FormDialog, StatusBadge,
  IconAction, ConfirmActionDialog, date pickers, combobox, detail-*,
  query-state, merged `lib/format.ts`), and the `.claude/rules/
  ugt-nextjs-design.md` harness rule so the agreement outlives the session.
- "sync ข้อตกลง design" mode: after a plugin update, diff the project's
  DESIGN.md against the contract and record มติ — never overwrite.
- Plugin now declares the **shadcn MCP server** (`.mcp.json`) so component/
  block installs browse the live registry.
- `ugt-nextjs-setup` (parent): install order is now Database → Quality →
  **Design** → Auth → CI — design must precede auth because auth generates
  themed pages.
- Known gap, deliberate: the shipped `ui/data-table.tsx` is the HRMS build;
  the full-option merge (URL-state server mode + per-column popover filter +
  dnd + localStorage prefs) is being built and tested inside ugt-hrms first
  (มติ 2026-08-04) and will replace the asset when it lands.

Real-deployment feedback: `ugt-nextjs-auth-setup` shipped the RBAC data model
and the permission-check plumbing, but never the pages to actually manage it.
Confirmed while investigating — `references/rbac.md`'s own documented
first-admin bootstrap flow redirects to `/admin/users`, and the shipped
`admin-setup-action.ts` redirected to `/` with an "adjust to your admin
landing page" comment, because the page it was supposed to land on never
existed.

- New route group `(admin)` — `/admin/users` (list + inline role assign,
  can't change your own role), `/admin/roles` (create/edit/delete + a
  permission-checkbox grid grouped by `permission.group`; the system
  `Administrator` role can't be edited or deleted), `/admin/audit-logs`
  (read-only `ActivityLogs` viewer). All three follow the existing
  session → permission → action → audit-log Server Action contract; the
  section layout hides nav items per-permission (UI only — every action still
  gates server-side).
- New `lib/permissions-sync.ts` (`syncPermissionsIfNeeded`) — `rbac.md`
  already recommended this upsert-on-request pattern for permissions added to
  `ALL_PERMISSIONS` after bootstrap; it was never actually shipped as code.
  Wired into `app/(admin)/layout.tsx`.
- Bootstrap now redirects to the real `/admin/users` instead of `/` (both
  `admin-setup-action.ts` and the setup page's "already initialized" check).
- `scripts/verify.mjs` — checks the three admin pages exist, the bootstrap
  redirect isn't still pointing at `/`, `syncPermissionsIfNeeded` is both
  defined and called, and both role mutations check `isSystem`.
- `references/rbac.md` — new "Ongoing admin pages" section (route table +
  guards); the permission-sync section now points at the shipped file instead
  of describing a "recommended pattern" that didn't exist yet.
- Scope, decided with the user rather than assumed: users page is list +
  assign-role only, no "create user" button (SSO/LDAP auto-provision on
  login; Local method has no self-registration in this skeleton either — a
  known gap, out of scope here) · roles page gets full CRUD with a permission
  checkbox grid · audit-log viewer included.

## 2.5.0 (2026-08-03)

Feedback from a real deployment: local `docker compose` testing had no env
file to read, and the admin handoff at the end of setup was three separate
documents instead of one table with this project's actual names.

- **`ugt-nextjs-cicd-setup`** — new step 4.5 creates local `.env` (mirrors
  `.env.local` + `APP_PORT=<prod port>`) and `.env.dev` (+ `APP_PORT=<dev
  port>`), both gitignored, so `docker compose up` / `docker compose -f
  docker-compose.dev.yml --env-file .env.dev up` work locally without a
  Jenkins deploy. `docker compose` auto-loads a file literally named `.env` —
  it never reads `.env.local`, which is why this was missing.
- New `references/external-config-handoff.md` — the Jenkins credential list,
  SonarQube project/gate setup, and Keycloak client request, previously three
  separate reference docs, collapsed into **one table** using the same
  `__PROJECT_NAME__`-style placeholders the skill already substitutes
  elsewhere, so the admin gets exact names instead of a prose summary. Wired
  into `ugt-nextjs-setup`'s close-out step as the mandated final output.
- `scripts/verify.mjs` — new check that `.env`/`.env.dev`/`.env.local` are
  gitignored and `.env.example` isn't accidentally caught by a broad
  `.env*` rule.
- **`ugt-nextjs-auth-setup`** — `assets/env.example` gains a commented-out
  `NODE_TLS_REJECT_UNAUTHORIZED=0` for local dev against an internal-CA
  Keycloak/LDAP (the gotcha was already documented in
  `references/keycloak-client.md` but never actually in the template).
  Off by default, loud warning against ever uncommenting it in `.env`/the
  prod Jenkins credential — it disables TLS verification process-wide, not
  just for one connection.

## 2.4.0 (2026-08-03)

Harness refresh for `/ugt-mode auto` (ugt-core 1.4.0). Existing projects: run
`/ugt-nextjs-setup` again to refresh the block, or just run `/ugt-mode auto`
directly — the skill rewrites `mode.md` wholesale anyway.

- `assets/state-mode.md` + `assets/CLAUDE-block.md` — preset list becomes
  `easy|default|god|auto`; dispatch wording broadened to cover Agent Teams
  teammate spawns ("dispatching a subagent or spawning a teammate")
- `scripts/verify.mjs` — the `Current mode:` check accepts `auto`

## 2.3.0 (2026-08-03)

Two new triage rows in the CLAUDE.md block. Existing projects: run
`/ugt-nextjs-setup` again to refresh the block (project content outside the
markers is untouched, as always).

- `assets/CLAUDE-block.md` — "Which skill, when" gains a **read-only work**
  row: answering questions about code/docs/config goes directly, with an
  explicit note that superpowers' "1% chance → must invoke" rule does not
  apply to read-only work. Without this, the always-loaded `using-superpowers`
  dispatcher could pull `brainstorming` into a plain question and start a
  design interview nobody asked for (observed in practice; the existing
  "small task" row only covered edits, not reads).
- `assets/CLAUDE-block.md` — "Which skill, when" also gains a
  **requirements-folder** row: starting from a requirements folder to produce
  the committed per-feature brief routes to `/ugt-requirements` (new in
  ugt-core 1.2.0), then features go to the superpowers pipeline one at a
  time. The read-only row deliberately excludes brief *production* — a quick
  question about the docs stays direct, producing the brief artifact is the
  skill's job.

## 2.2.0 (2026-07-30)

Harness additions for the `/ugt-mode` skill (ugt-core 1.1.0) plus a task-triage
rule. Existing projects: run `/ugt-nextjs-setup` again to refresh the CLAUDE.md
block, or just run `/ugt-mode default` once (creates `mode.md`; the block
import can wait for the next refresh).

- `assets/state-mode.md` — new skeleton → `.claude/state/mode.md` (create once,
  never overwrite; owned by `/ugt-mode` afterwards): per-task-type subagent
  model routing, shipped on the `default` preset
- `assets/CLAUDE-block.md` — new "Model mode" section importing
  `@.claude/state/mode.md`, and a triage row in "Which skill, when": small
  tasks (typo, doc edit, config value, one-line fix at a known spot) go
  directly, skipping the superpowers pipeline — auto-loading rules still apply
- `ugt-nextjs-setup` — `state-mode.md` added to the step-4 asset table;
  `scripts/verify.mjs` checks `mode.md` declares a valid mode (warn-only when
  absent, so pre-2.2.0 installs stay green)

## 2.1.1 (2026-07-30)

- ugt-nextjs-setup: document coexistence with Next.js 16.3+ auto-generated
  agent files — next dev upserts its own managed block (BEGIN:nextjs-agent-rules
  + @AGENTS.md import) into CLAUDE.md preserving content outside it (verified
  against the Next.js ai-agents guide); commit that block, never edit it, and
  never nest the ugt block inside it. Opt-out: agentRules: false.

## 2.1.0 (2026-07-30)

New skill **`ugt-nextjs-pitfalls`** — production-bug lessons for feature code,
distilled from the source HRMS project's bug-fix log and conventions
(audit: `docs/app-patterns-audit.md`). Auto-loads via `paths` on
`app/`, `components/`, `lib/` edits, same mechanism as `ugt-nextjs-clean-code`.

- `references/dates-timezones.md` — Date→string binding for MSSQL SP/linked-server
  params (`toLocalYmd`), anchor-matched getters, wall-clock vs instant
  formatters, CE-storage + BE-display via central helpers
- `references/data-fetching.md` — React Query × Server Actions
  (`revalidatePath` doesn't touch the client cache), dataset filters re-fetch,
  stable `data` identities (`'use no memo'` × React Compiler), basePath client
  fetch prefix, API envelope
- `references/hardening.md` — server-side scope overrides, ownership =
  identity match, fail-closed gates, cron date-guards, DTO literal unions,
  effective-value pre-fill, i18n checklist
- `scripts/verify.mjs` — greppable checks (bare `/api` fetch, empty
  `SelectItem`, swallow-catches, inline `±543`, anchor-suspect serializers,
  selectable tables missing `getRowId`)

Curation note: items already covered by framework defaults/docs (RSC-by-default,
RHF default modes, `getRowId`, adjust-during-render) were kept only as one-line
Quick Rules or dropped — see the audit's curation pass.

Trigger evals: `evals/trigger-evals.json` — 20 queries × 3 judges; iteration 0
= 54/60 (missing "wrong row selected" / "stale code after edit" symptoms in
the description), description fixed, iteration 1 = 60/60.

Also in this release — `ugt-nextjs-auth-setup/references/auth-flows.md`
addenda from the same audit: resolve SSO identity by `ldapUsername` (existing
row's email wins; `unable_to_create_user` on email drift),
`accountLinking.requireLocalEmailVerified: false` for sync-created users, and
don't enforce `ldaps://` for private-network AD (3 new gotcha-table rows).

## 2.0.0 (2026-07-29)

**Breaking at the plugin level, invisible at the project level.** The
stack-agnostic pieces moved to the new `ugt-core` plugin, which this plugin now
declares as a dependency — `/plugin update` pulls it automatically, and target
projects need **zero** changes (`/ugt-checkpoint` keeps its name; installed
CLAUDE.md/rules/state files stay valid untouched).

Moved out (now in ugt-core v1.0.0): `skills/ugt-checkpoint/`,
`hooks/hooks.json`, `scripts/audit-log.mjs`,
`references/org-managed-settings.md` (→ `ugt-core/contracts/`). The only
content edit in the remaining six skills is the IT-doc pointer in
`ugt-nextjs-setup` step 4.6.

If you consume this plugin by folder copy (README mode B), copy **both**
`plugins/ugt-core` and `plugins/ugt-nextjs-platform` from now on.

## 1.0.0 (2026-07-27)

First release. Extracted from a production HRMS project, rebuilt clean — no
references to the source project's private skills or Copilot-era instructions.

### Skills (7)

- `ugt-nextjs-setup` — parent installer: one interview batch, routes
  Database → Quality → Auth → CI, installs the harness layer, refuses
  non-Next.js stacks instead of adapting
- `ugt-nextjs-database-setup` — SQL Server via Prisma: naming conventions, audit
  columns, reserved-word guard, raw-SQL/SP patterns, migration playbooks
- `ugt-nextjs-quality-setup` — Vitest (JUnit + lcov) / ESLint / Prettier /
  husky + lint-staged, wired to the exact script names the pipeline calls
- `ugt-nextjs-auth-setup` — Better Auth SSO (Keycloak) / AD-LDAP / Local + RBAC +
  audit logging + first-admin bootstrap; every production redirect-loop and
  cookie gotcha documented with its fix
- `ugt-nextjs-cicd-setup` — 10-stage Jenkins pipeline, SonarQube Quality Gate
  (blocking), OWASP DC, two-image Docker deploy, `/api/health` route
- `ugt-nextjs-clean-code` — pass the Quality Gate on the first scan; auto-loads on
  `.ts`/`.tsx` edits via `paths` frontmatter
- `ugt-checkpoint` — team state in `.claude/state/` + the 3-way knowledge
  triage (project notes / PR upstream / auto memory)

### Harness layer (installed into target projects by ugt-nextjs-setup)

- `CLAUDE.md` block between `<!-- ugt:start/end -->` markers (updatable
  without touching team content), importing team state via `@`
- `.claude/rules/ugt-{database,auth,ci}.md` with `paths:` frontmatter —
  loaded by the runtime when matching files are touched
- `.claude/state/{checkpoint,project-notes}.md` skeletons (created once,
  never overwritten)
- `.claude/settings.json` — marketplace + plugin declaration so cloning
  prompts the install, plus a starter deny/ask permission set

### Plugin-level

- Audit-trail hooks (`PostToolUse` / `PostToolUseFailure` /
  `InstructionsLoaded`) appending metadata-only JSONL to `.claude/logs/` —
  deliberately never logs file contents or tool inputs
- `scripts/verify.mjs` per skill — each Verification Checklist as one
  runnable command; tested against a real production project and negative cases
- `evals/evals.json` per skill — 18 cases / 118 assertions; iteration-1
  results: with-skill 34/34 (100%) vs without-skill 18/34 (53%)
- `evals/trigger-evals.json` — 20-query trigger-boundary regression set;
  baseline 60/60 correct
- `references/org-managed-settings.md` — the hard-boundary deployment guide
  for IT (managed-settings.json), stated plainly as outside the skill's reach
