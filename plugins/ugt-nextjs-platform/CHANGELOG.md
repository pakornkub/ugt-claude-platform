# Changelog — ugt-nextjs-platform

## 4.26.0 (2026-08-21)

Four design มติ (2026-08-21) resolving the contract-vs-artifact contradictions
the 4.25.0 audit surfaced — each decided, then contract + assets + preview
aligned in the same change:

- **เพิ่ม/สร้าง buttons are `primary`** (DESIGN §1 amended; it said เขียวทึบ
  while every shipped artifact used primary). `success` now explicitly means
  อนุมัติ/ยืนยันเชิงบวก. Preview's action-color demo updated.
- **Business-rule-disabled row buttons show disabled + tooltip reason** —
  hiding stays permission-only (§3). `IconAction` gains `disabled` support
  (span-wrapped trigger so the tooltip still fires — disabled buttons swallow
  pointer events); system-role rows in `/admin/roles` render both buttons
  disabled with "บทบาทระบบ — แก้ไข/ลบไม่ได้". Preview §13 aligned (both
  Administrator buttons disabled; the fictional "delete disabled because the
  role has users" state and the "ผู้ใช้" column the asset never shipped are
  removed).
- **`DataTable` wraps itself in the §3 card** (toolbar as card head, table
  flush, pagination as card foot — ≥sm only; mobile keeps its row-cards).
  New `card` prop defaults on; pass `card={false}` inside dialogs/sheets.
  Rules file forbids double-wrapping.
- **Identifier badges are `Badge variant="outline"`** per the §4 semantic
  table (`secondary` stays reserved for closable filter chips) — NavUser role
  badge and the roles-table "ระบบ" badge (also un-Englished from "system")
  switched; preview's two `lbadge sec` sites aligned.

## 4.25.0 (2026-08-21)

`ugt-nextjs-auth-setup` + a new release gate. Field report from a full-setup
pilot (CR System): six defects, five of them living in this repo's own assets —
the admin UI was ported from HRMS (radix-mira era) into the Base UI kit and
nothing ever enforced the design agreement on shipped assets.

- **nav-user.tsx: the logout / profile menu items did nothing when clicked.**
  Three `DropdownMenuItem`s still used Radix's `onSelect`; base-mira (Base UI)
  menu items take `onClick` and ignore `onSelect` silently — the menu opened,
  the items rendered, clicks were no-ops. Now `onClick` (logout keeps the menu
  open via `closeOnClick={false}` so the spinner is visible).
- **roles-manager.tsx rewritten to the design agreement it ships next to**:
  delete confirms through the kit's `ConfirmActionDialog` (was `window.confirm`
  — DESIGN.md §4 forbids it, and the ponytail excuse was wrong: the kit already
  ships the dialog); row buttons are `IconAction` + `soft-primary`/
  `soft-destructive` (was bare ghost buttons with no tooltip/color); create/edit
  moved from a fixed-height `Dialog` (unscrollable once the permission list
  grew) to a `Sheet` with a scrolling body, matching the dialog ladder and what
  design-preview §13 has drawn all along; the stray `asChild` is gone.
- **Admin pages get real page headers**: users / roles / audit-logs now compose
  `PageHeader`/`PageTitle`/`PageDescription`/`PageActions` from `ui/page-shell`
  (subtitle included) instead of hand-written `<h1>`.
- **First-admin flow**: SKILL.md §3 no longer asks "who is the first admin" —
  the answer was unusable by design (มติ 2026-08-11: no pre-registration), so
  asking only created the expectation of a seeded account. Instead the
  protected app layout gates on `isAdminInitialized()` (now caches its positive
  result) and redirects every login to `/admin/setup` until the bootstrap
  happens — no more blank permission-less first login — and the install summary
  + `docs/admin-handoff.md` must state in Thai that the first person to log in
  becomes Administrator. §5.1 also stops suggesting a bare `npx shadcn init`
  (it initializes the Radix style; the kit is Base UI — design-setup's preset
  init is the only sanctioned path) and now lists every component the admin
  UI actually imports (`alert-dialog sheet avatar dropdown-menu`).
- **Enforcement, so this class of defect stops shipping**: new release gate
  `scripts/lint-kit-assets.mjs` (in the README release chain) fails on
  `asChild`, `onSelect` on menu items, `window.confirm/alert/prompt`,
  `@radix-ui/*` imports, and raw control bytes, across **all** `.ts`/`.tsx`
  assets; auth's `verify.mjs` gains the same checks project-side plus a warn
  when no layout wires the first-admin gate; SKILL.md §7/§8 document the Base
  UI API rule and the new manual checks. `stamp-kit-assets.mjs`'s stamp regex
  now strips CRLF stamps (a Windows checkout previously left stray `\r`s and
  `--check` never converged).

**Then a 4-agent full-plugin audit** (Base UI API · DESIGN compliance · SKILL
flows · stale ports) swept everything else. Fixed in this release; the
remainder is recorded in `docs/backlog.md` §5:

- **Functional breaks**: `upload-setup/lib/storage.ts` carried three raw
  control bytes (NUL included) in a regex — the file read as *binary* to every
  grep-based gate, making it invisible to the very lint written above; now the
  escape text `[\x00-\x1f\x7f]` and a lint rule against control bytes.
  `lib/permissions.ts` declared `files:*` / `dev-mode:enable` keys **without**
  `ALL_PERMISSIONS` seeds — they could never be granted (upload/download 403
  forever) and their presence steered installers past the mail/upload skills'
  own "add key + seed" step; the keys now belong to their owning skills, and
  the unshipped `users:delete` seed (a checkbox granting nothing) is gone.
  `admin-setup.ts` now seeds via the idempotent `syncPermissionsIfNeeded()` —
  the old bare `createMany` wedged the bootstrap forever if a prior attempt
  died between seeding and role-creation (`skipDuplicates` doesn't exist on
  SQL Server).
- **More Radix leftovers, same shipped-bug class**: `role-form.tsx` fed the
  group checkbox Radix's `'indeterminate'` string — truthy, so a
  partially-selected permission group rendered fully checked; now Base UI's
  `checked` + `indeterminate` (the helper producing the Radix value is
  deleted). `nav-user.tsx` styled its trigger with `data-[state=open]` (Base
  UI emits `data-popup-open` — the open-highlight never fired);
  `combobox.tsx` had six dead `data-[state=…]` animation selectors
  (`data-open`/`data-closed` now); `tiptap-editor.tsx`'s link button used
  `window.prompt` → a kit Popover+Input.
- **Kit component fixes**: `ConfirmActionDialog` confirms destructive in red
  (`confirmVariant`, default `destructive` — was the primary/blue registry
  default); `date-picker` closes its popover on select (it used to stay open
  covering the "to" field); `truncated-text` drops a stray `{' '}` that skewed
  its overflow measurement; `query-state` retry icon `RotateCcw`→`RefreshCw`
  (RotateCcw = กู้คืน per the icon map); DataTable's row-range line formats
  through `formatNumber` ("1–20 จาก 1,248").
- **DESIGN.md §4 form/footer pass over the auth forms**: required `*` on every
  mandatory label, `Callout` for the forgot-password confirmation box,
  `IconAction soft-primary` for the set-password row button, role-form gets a
  ยกเลิก/บันทึก footer, `Badge` for its count pill, dead `done` state removed
  from admin-setup-form, `Button variant="link"` for "ลืมรหัสผ่าน?", size
  overrides (`h-10`, `size="lg"`, `font-bold`) dropped.
- **Dialog ladder sharpened** (template + conventions + design rules file):
  "ยาว" now explicitly includes any form whose list/checklist **grows with
  data** — long even if short today, so it goes in a `Sheet`/page, never a
  fixed-height Dialog. Encodes the exact judgment the role-form bug slipped
  through ("3 ช่อง" looked ≤6 while the permission checklist grew unbounded).
- **Drift & dead-ends closed**: `RoleInput.permissionKeys` renamed
  `permissionIds` (it always carried ids); `ActivityLogs` gains
  `@@index([createdAt]/[action]/[userId])` (the unbounded audit table had
  none); audit-log date filters get ตั้งแต่/ถึง labels; the auth rules file
  (`.claude/rules/ugt-nextjs-auth.md`) now **covers the admin UI components**
  (nav-user shipped its bug outside the rules' path globs) and states the
  Base UI contract + ConfirmActionDialog/IconAction/page-shell rules — the
  design rules file states the Base UI API rule too, since it is the one that
  loads on every UI file; `ugt-nextjs-full-setup` no longer re-asks the
  banned first-admin question and its Quick Rule restores Design to the
  install order; cicd's `admin-handoff.template.md` gains the
  "ผู้ดูแลระบบคนแรก" section auth §5.5 depends on; upload-setup's compose
  snippet switches from named volumes to `/srv/appdata` bind mounts (it
  contradicted cicd §2.8's ห้าม-named-volume contract) and declares its
  design-kit prerequisite; test-lint ships the `build` script + the
  `.gitignore` step its own verify demanded; database's `lib/env.ts` gains
  the client-block/runtimeEnv EXTENSION POINT that `NEXT_PUBLIC_BASE_PATH`
  keeps being lost to; `scope.ts` documents that `ownOrgCode` has no
  enforcing helper yet.

`ugt-nextjs-auth-setup`: the three admin pages finally follow the design
agreement they ship next to — DESIGN.md §4 says "DataTable only for tabular
data", yet the assets still rendered raw shadcn `Table` (extracted from an HRMS
snapshot older than HRMS's own DataTable upgrade). The preview (§13) had been
drawing DataTables for months; the assets now match it instead of the other way
around.

- `/admin/users` + `/admin/roles` → kit `DataTable` **client mode** (bounded
  master data fetched whole). New `components/users-table.tsx` holds the
  column defs (client code); the password column is `[METHOD: LOCAL]`.
  `roles-manager.tsx` drops the per-row Dialog mounts for one controlled edit
  dialog. The users page loses its `take: 200` cap — the table paginates now.
- `/admin/audit-logs` → **server mode**, the full contract: the page parses
  searchParams (`parsePageParams`/`parsePageSize` fallback 20 per the
  watch-table มติ, `parseTableQuery` allowlist `sortable: ['createdAt']`),
  queries Prisma directly — no separate API route — and redirects when `?page`
  runs past the end. New `components/audit-logs-table.tsx` renders toolbar
  filters (ชื่อผู้ใช้ → ช่วงวันที่ → action, กว้าง→แคบ มติ 2026-08-11) that push
  `q`/`from`/`to`/`action` to the URL; DataTable pushes `page`/`pageSize`/
  `sort`/`dir` itself. Date bounds are computed at `+07:00` (createdAt is an
  instant; the container runs UTC), the date→param round-trip reads local
  parts (never `toISOString` — the UTC+ off-by-one-day bug HRMS already paid
  for), and the action Select's options come from `distinct` values in the
  log, not a hardcoded list. `detail` JSON opens in a dialog, not only a
  title tooltip (mobile has no hover).
- SKILL.md §4 gains the second prerequisite: the org UI kit
  (`ugt-nextjs-design-setup`) must be installed before auth — full-setup's
  design → auth order already guarantees it; a standalone auth install into a
  kit-less project either runs design-setup first or knowingly downgrades the
  admin pages to plain `Table` as a recorded DESIGN.md deviation. §5.2 lists
  the two new assets; §8 gains the server-side-filter check.
- `docs/design-preview.html` §13 corrected to the real component behavior:
  audit-logs toolbar now shows the page-level filters (the preview drew only a
  search box — drifting from reality is the defect class 4.19.0 documented),
  its per-column filter icons are gone (server mode filters live in the
  toolbar), pagination reads 20 แถว/หน้า, and the client-mode tables show
  filter funnels instead of sort arrows (client mode has no sort toggle in the
  shipped component).

## 4.23.0 (2026-08-20)

Companion to ugt-core 2.5.0 (the 4-hour-setup field report). Three changes,
all about *how the work runs*, none about what gets installed:

- `ugt-nextjs-full-setup` gains **§2.5 Choose the run shape**: after the
  interview batch, propose ONE way to run the install — straight through
  (≤2 modules, fresh project) · chunked sessions of 1–3 modules with
  `/ugt-handoff` between (3+ modules or careful merges) · per-module
  subagents that follow the child SKILL.md and return only a summary +
  verify result. Splits stay sequential (modules share `package.json` /
  `schema.prisma`), §3 order unchanged. Codifies in writing that **the setup
  path never enters the superpowers pipeline** — each child SKILL.md is the
  plan, `verify.mjs` is the review.
- `CLAUDE-block.md`: the infrastructure row now excludes the *entire*
  pipeline (brainstorming/plans/TDD), not just brainstorming — TDD's broad
  trigger could still fire mid-install. New **Layer contract** subsection
  (feature = fresh session, never a subagent · merge = integration check
  only, no re-review · SDD ledger vs board/handoff are separate territories).
  The model-mode bullet now states the table wins over model advice inside
  superpowers skills.

## 4.22.0 (2026-08-20)

`ugt-nextjs-design-setup`: the scale question. Field report: an existing
project answered "คงของเดิมไว้ แต่ใช้ shadcn" and got a two-scale UI — legacy
48px inputs next to kit-default 28px controls in the same form. Density/sizes
were "deliberately not asked" (an org iron rule meant for fresh projects), and
the scan never measured the old UI's control metrics, so nobody chose which
scale wins. Four changes:

- **§Scale scan** in `references/interview.md`: measure the existing UI from
  real code across six dimensions — control size (height/padding/icon), shape
  (radius/border/shadow/focus ring), typography (control/label/heading sizes),
  density (form gap, card padding, table rows), form conventions
  (label/required/error placement), colors (already in the main checklist) —
  and present an old-vs-kit comparison table before asking.
- **ข้อ 9** (ชุด 3): when the measured scale differs from the kit, ask which
  scale wins — ยึดของเดิม (rebase kit, recommended) / ยึด kit (migrate old
  forms) / แยกโซน (never mix in one page) — with real numbers in the question
  and the cost of each path in the option descriptions. The un-chosen middle
  is explicitly named as the outcome that must never happen.
- **§Scale bridge**: how to rebase correctly — every dimension has exactly one
  source file (`ui/input|button|select|textarea`, `--radius`, `ui/table`,
  `ui/field`); per-page overrides are banned as the origin of round-two mess.
- `DESIGN.template.md` §4: the mira density line became a fillable
  `__CONTROL_SCALE__` agreement plus the scale rule (same-form controls equal
  height; sizes change only at `components/ui/*`).

## 4.21.0 (2026-08-20)

`ugt-nextjs-auth-setup`: SSO first-login hardening. Field report: a
production SSO login died with `unable_to_create_user`, and the error page
itself 404'd at the proxy — the user saw a blank nginx page. Root cause was
email drift (AD email domain differs from the stored row's email, e.g.
`@company.com` vs `@company.co.th`), a case `auth-flows.md` already documented
but the shipped `lib/auth.ts` never implemented. Four changes:

- `lib/auth.ts` `mapProfileToUser` now resolves the existing row by
  `ldapUsername` first and lets its email win (prevents the
  create-instead-of-link unique-constraint death), and throws a findable
  message when Keycloak sends no email at all.
- `lib/auth.ts` adds `accountLinking.requireLocalEmailVerified: false` —
  better-auth ≥1.6.11 blocks implicit linking into `emailVerified: false`
  rows (nOAuth fix), which every LDAP-upsert/admin-created row is. Safe here
  because self-registration is closed (มติ 2026-08-11).
- `lib/auth.ts` adds `onAPIError.errorURL` = `${basePath}/login` (the default
  `/api/auth/error` is computed WITHOUT the basePath — same trap as
  redirectURI and the reset link — and 404s behind a shared-domain proxy)
  plus an `onError` log so the real cause lands in `docker logs`.
  `login-form.tsx` maps `?error=<code>` to Thai messages; SKILL.md §5.5 wires
  the new `ssoError` prop.
- `scripts/verify.mjs`: new FAIL check (SSO without `onAPIError.errorURL`)
  and WARN check (no `ldapUsername` lookup in `mapProfileToUser`);
  `auth-flows.md` troubleshooting table gains the full
  `unable_to_create_user` checklist.

## 4.20.0 (2026-08-19)

`ugt-nextjs-auth-setup` no longer ships a second sidebar into projects that
already have one. Field feedback: installing into an existing project produced
a separate admin sidebar (the asset default) instead of new menu items in the
project's own nav. Three changes:

- `components/admin-nav.tsx` now exports **`ADMIN_NAV_ITEMS`** (menu data with
  per-item permission keys) separately from the `<AdminNav>` fallback sidebar,
  so an existing sidebar can merge the three admin items directly.
- `app/(admin)/layout.tsx` documents its two jobs — GUARD (always keep) vs
  SHELL (fallback only) — with an inline marker showing what to delete when
  the project's own shell wraps the admin pages.
- `SKILL.md` gains **§5.6**: detect an existing shell first; merge
  `ADMIN_NAV_ITEMS` + strip the shell from the admin layout when one exists,
  copy as-is only for shell-less projects. Plus §3 Q8: ask which existing
  menus should come under RBAC — declaring keys in `ALL_PERMISSIONS` is the
  registration step that makes them appear in the `/admin/roles` checklist;
  unregistered menus stay session-only by design.
- `scripts/verify.mjs`: the admin-pages check now suffix-matches
  `admin/<seg>/page.tsx` anywhere under the project instead of two fixed
  paths — a §5.6 install that nests `(admin)` under the project's shell no
  longer reports a false FAIL.

Validated with a 3-eval benchmark (existing-sidebar merge / fresh no-shell /
existing-menu RBAC) against the 4.19.0 snapshot: new skill 11/11 assertions,
old skill 8/11 — the old version reproduced the reported double-sidebar bug
in both existing-sidebar scenarios.

## 4.19.0 (2026-08-18)

`ugt-nextjs-auth-setup`'s `references/directory-enrichment.md` now states
up front that the standard pattern has **two separate HR views**, not one:
the employee/identity view (`lib/directory.ts`) and the authorize/approval
view (`lib/approval-chain.ts`). Previously that split was documented only in
`references/data-scope.md`, so a reader who opened `directory-enrichment.md`
alone had no signal a second view existed. Confirmed against `ugt-hrms`'s
real schema (`vwHR_SC_Employee` vs `HR_SC_AuthorizeEmployee_ms`) — the
existing column mapping in both asset files already matched; this was a
cross-reference gap, not a code gap.

## 4.18.0 (2026-08-16)

`ugt-nextjs-full-setup`'s `CLAUDE-block.md` no longer routes every "build a
feature / fix a bug" straight into the full superpowers pipeline
(brainstorming → plan → TDD → review). It now **sizes the work first** on the
same three signals `ugt-model-mode`'s `auto` preset already uses — ambiguity,
blast radius, risk domain. Small, unambiguous, low-risk work gets offered a
choice (full pipeline or a light version that skips brainstorming/plan but
keeps TDD + review); anything ambiguous, cross-module, or touching a risk
domain still goes full pipeline without asking. Fixes the previous
all-or-nothing behavior that made a one-file, well-understood bug fix pay the
same process cost as a multi-module feature.

## 4.17.0 (2026-08-16)

`ugt-nextjs-auth-setup`'s `assets/env.example` now ships
`NODE_TLS_REJECT_UNAUTHORIZED=0` **uncommented by default** — for projects
whose containers sit on a closed intranet with no outbound path to the
internet, Node couldn't verify the org's internal-CA Keycloak cert and SSO
failed with "Invalid OAuth configuration" every time until someone manually
uncommented the line. The comment above it now says plainly why it's on and
warns to remove it the moment the container gains any outbound access (npm
registry, external API, etc.) — it disables TLS verification for the entire
Node process, not just the Keycloak connection. `SKILL.md`'s Quick Rules table
updated to match (no longer "never by default").

## 4.16.0 (2026-08-12)

**Form validation convention — the last two audit-addendum items, closed
together** (they were always one story told from two sides). New
`pitfalls/references/form-validation.md`, loaded when building forms or the
Server Actions they submit to:

- **Two layers on purpose**: RHF + zod in the browser is UX; `safeParse` in
  the Server Action is the security boundary — an action is a public HTTP
  endpoint and TypeScript types are erased at runtime. HRMS runs this at 48
  boundaries.
- **Schema factory per form** in `lib/validations/`, messages injected —
  testable without next-intl, wording owned by the component. RHF
  `mode`/`reValidateMode` stay at library defaults (the old "org standard"
  merely restated them; the real rule is one line: don't override).
- **Choice values are literal unions** (`z.enum`) so fabricated values die at
  the boundary instead of landing in the database.
- **The rule with teeth — limits defined once**: HRMS keeps its form schema
  and action schema aligned by a comment and a promise; when they drift the
  user passes the form and gets rejected at save with nothing highlighted.
  Numbers/regexes/enums live in one module both schemas import. No new asset
  needed — the kit already ships the canonical example: `password-policy.ts`
  is one definition consumed by the reset form, the change dialog and the
  admin create action.
- pitfalls' description gains the symptom trigger
  ("ฟอร์มผ่านแต่บันทึกไม่ได้") and the reference table gains the row.

With this, the 2026-08-04 audit addendum is **fully closed**: react-query
(4.12.0) · zustand (4.15.0) · RHF/zod (4.16.0).

## 4.15.0 (2026-08-12)

**The zustand question is closed: rejected, with a client-state ladder in its
place** (มติ 2026-08-12 — the last open item from the 2026-08-04 audit
addendum besides the two form-validation ones).

The evidence made the call easy. HRMS — the larger production app — ships
zero stores. gov-boi's entire zustand footprint turned out to be one 18-line
store mirroring `selectedTaxId`, whose real source of truth is a **cookie**
written by a server action, with a single consumer and an in-file comment
admitting the rest was "for future use": a third copy of one value, bought
before anyone needed it.

- `pitfalls/references/data-fetching.md` gains **§0 Client-state ladder**:
  server data → React Query · filter/sort/page/tab → URL · one component →
  `useState` · a subtree → lift/Context · **a store library → not a standard,
  needs a dated project มติ first**. Stop at the first rung that fits.
- The audit addendum row is closed with the decision and the evidence.

Also: `stamp-kit-assets.mjs` now keeps a file's stamp version when its content
hash is unchanged — the stamp reads "the release this file last changed in",
which is what kit-sync's "ติดตั้งที่ X" report actually wants to say, and a
docs-only release no longer rewrites 84 asset files (this release proves it:
zero asset churn). `--check` validates presence + hash, not version equality.

## 4.14.0 (2026-08-12)

**New skill `ugt-nextjs-kit-sync` + version stamps on every copied asset** —
closing the systemic gap that assets are copied into projects and then sit
still while the plugin moves on (`/plugin update` refreshes the knowledge, not
the copies; HRMS kept a `scrollX` bug for weeks after the plugin fixed it).

The mechanism, per the maintainer's design (มติ 2026-08-11): check which side
is newer, then choose per file — update or merge.

- Every whole-file-copy asset (84 `.ts/.tsx` files) now carries two baked
  header lines: `// kit: <plugin> <version> · <skill>/<path>` and
  `// kit-hash:` (sha256-12 of the content excluding the stamp, LF-normalized
  so a Windows checkout doesn't read as an edit). Version answers "is the copy
  behind"; hash answers **"did the project touch it"** — the distinction that
  makes a safe proposal possible. Merged/pasted/appended assets
  (globals.tokens.css, prisma snippets, env.example) are deliberately
  unstamped: they never exist in a project as a whole file.
- `scripts/stamp-kit-assets.mjs` (repo): stamps at release, `--check` joins
  the release gate. README release steps updated.
- `check-kit-freshness.mjs` (in the skill, report-only, `--json` for the
  flow): classifies every stamped project file as **CURRENT** (equals the
  current asset — even when only the stamp label is old) / **UPDATE**
  (outdated, never touched → safe overwrite) / **MERGE** (outdated and
  modified — which by design includes placeholder-substituted files;
  indistinguishable from a real edit and the careful path is right for both) /
  **REMOVED** (asset retired or renamed → CHANGELOG). All four states proven
  against a fixture project before shipping.
- The skill flow: report → consent per file (or all) → UPDATE re-substitutes
  placeholder values pulled from the file being replaced; MERGE is a
  **semantic three-way merge with the CHANGELOG as the base narrative** —
  read the project's file, the new asset, and every CHANGELOG entry between
  the two versions, keep both sides, surface conflicts instead of picking the
  plugin's side. Stamps stay verbatim; merged files truthfully report MERGE
  again next round. Close-out = มติ in decisions.md + owning skills' verify +
  project tests.
- Files installed before this release carry no stamp; the skill matches them
  to assets by path and treats them as MERGE once — the first sync adds
  stamps.

## 4.13.0 (2026-08-11)

`ugt-nextjs-cicd-setup` follows the platform contract's new **Persistent
data** section (`ugt-core/contracts/cicd.md`): volume: interview ข้อ 7,
บล็อก `[VOLUME]` ใน compose, verify check, admin handoff — ตาม contract
Persistent data.

- SKILL.md §3 gains interview item **7. Volume?** — a path that must persist
  across deploys (e.g. uploads) → list them → uncomment `[VOLUME]` in both
  compose files; none → delete the block. §2.8 **Persistent data** restates
  the contract (bind mount under `/srv/appdata/<project>/<name>`, dev suffixed
  `-dev`, no named volumes, no secrets in a volume, no code bind-mounted over
  the image). §4.3 gains the corresponding cleanup step.
- Both `assets/docker-compose.yml` and `docker-compose.dev.yml` gain a
  commented `[VOLUME]` block under `ports:` (default: no volume) —
  `/srv/appdata/__PROJECT_NAME__/uploads` prod, `-dev` suffix for dev.
- `assets/admin-handoff.template.md`: the first-project-on-server appendix
  now also covers the one-time `/srv/appdata` bootstrap (`sudo mkdir -p
  /srv/appdata && sudo chown jenkins:jenkins /srv/appdata`) — every project's
  own path underneath is created by its Deploy stage.
- `scripts/verify.mjs`: the compose check now fails on any bind mount outside
  `/srv/appdata/`.
- `assets/Jenkinsfile` Deploy stage gains the `[VOLUME]` mkdir+chown block
  (ported from `ugt-python-cicd-setup`, after the `[DB]` migrate step, before
  `docker-compose up -d`) — without it §2.8's "Deploy stage สร้าง path + chown
  ให้ตรง UID" was unfulfilled and an uncommented compose volume hit
  `root:root` `PermissionError`.
- `scripts/verify.mjs`: the `[DB]`/`[SENTRY]` consistency checks no longer
  regex the whole Jenkinsfile — the header legend permanently mentions both
  tags in comments, so a project that correctly deleted the blocks still
  false-failed. They now test `jfActive` (pipeline body, comment lines
  stripped), the same fix the python/php verify scripts carry.

## 4.12.0 (2026-08-11)

**The four "rule exists, asset missing" gaps are closed.** Each had a
convention naming the required library with nothing to install, which in
practice means every project re-derives the setup and drifts.

- **React Query provider** (from HRMS `components/providers.tsx`, now standard
  in every install): `components/query-provider.tsx` — one QueryClient for the
  whole app, `staleTime 0` (org data changes from many hands; freshness beats
  fetch thrift), `retry 1`, and a `QueryCache.onError` that turns a mid-session
  401 into a `session-expired` event for auth's watcher instead of an error
  toast. With it: `lib/http-error.ts` (queryFns throw `HttpError`, never bare
  `Error` — the 401 routing depends on the status being attached) and
  `ui/query-progress.tsx` (top bar on **initial** fetches only; background
  refetches stay silent so the bar doesn't flash on every post-save
  invalidation; its nprogress CSS rides in the header comment).
  `pitfalls/data-fetching.md` now names the provider and the
  never-`new QueryClient`-in-a-page rule.
- **`ui/tiptap-editor.tsx`** — HRMS's editor verbatim (389 lines: toolbar,
  source mode, an `insert()` handle for server-built HTML like mail-template
  tokens). Ships only when the project has rich text; `@tiptap/*` ^3 set.
- **`ui/chart-example.tsx`** — a reference to copy-adapt-delete, not a shared
  component (charts are feature code; `npx shadcn add chart` provides the real
  primitive). What it teaches is the color rule with teeth: generic series →
  `--chart-1..5` in order; a series that *is* a status → the matching
  `--status-*`, so the chart and the StatusBadge on the table tell the same
  story in the same color.
- **`lib/motion.ts`** — the agreement's numbers (0.2s ease-out, ≤12px) as
  importable constants plus `fadeSlideUp(reduced)`/`fadeOnly()`, so pages stop
  inventing their own durations. The decision ladder is unchanged and stated
  in the file: don't animate → CSS → only then `motion`. HRMS's animated tab
  underline was NOT extracted — it is built on Radix and the kit is Base UI;
  the technique (layoutId + `useReducedMotion`) is cited instead.

Install wiring: `QueryProvider` joins the layout provider chain (outermost),
`@tanstack/react-query` + devtools + `nprogress` join the standard deps;
chart/tiptap/motion stay opt-in per project, listed with their triggers in
SKILL step 3.4 and the kit inventory.

## 4.11.0 (2026-08-11)

**One toolbar row** (มติ 2026-08-11). The maintainer flagged the three-strip
card header — filter row, then a half-empty search row, then chips — as
reading wrong, and it did: three scans for one job. The layout follows the
canonical shadcn DataTable toolbar now:

```
[search] [period] [org] [status]   …   [export] [columns]
[active-filter chips]                       ← only when filtering
─────────────────────────────────────────── ← the one divider
table …
```

- `data-table.tsx` gains a **`toolbarFilters` slot**, rendered right after the
  search box; page-level filters go there (wide → narrow) instead of a
  separate row above. The toolbar row wraps on narrow screens. Placement is
  layout only — a filter that changes which rows exist must still ride the
  server query (that rule is unchanged).
- Chips row survives on purpose: it is the one place per-column filters (from
  the header popovers) become visible and individually clearable — the
  "values shown in the controls, no chips" variant was considered and
  rejected for exactly that reason.
- The divider rule from earlier today simplifies to: the last control row
  present carries the single divider (chips when filtering, the toolbar
  otherwise).
- `conventions.md` §Page-level filter bar + §DataTable Toolbar rewritten;
  design SKILL §2.4 updated; preview specimen 4 redrawn (active filter shown
  with a primary border so "filtering is on" is visible even before the chips
  row). The org contract needed no change — it pins "same card, leading edge,
  wide → narrow", which this still satisfies.

## 4.10.0 (2026-08-11)

Two changes from the maintainer reviewing the admin pages against HRMS, plus a
preview rework.

**AD pre-registration removed** (มติ 2026-08-11, reverses part of 4.7.1/4.8.0):
`addDirectoryUserAction` and the AD branch of the "เพิ่มผู้ใช้" dialog are gone.
AD accounts behave exactly like SSO — the directory already has their data, the
row appears on first login, and the role is assigned from `/admin/users` after
that. Hand-typing an `ldapUsername` had only downside: one typo and the login
upsert creates a second user, leaving the role on a row nobody uses. HRMS's
`addHREmployeeAction` stays un-extracted, now by decision rather than omission.
The dialog is local-only again; `lib/directory.ts` keeps its two call sites
(LDAP login + SSO hook) — enrichment on login is unaffected.

**Permission checklist brought up to the HRMS shape** (มติ 13.3). The skeleton's
checklist was a flat two-column grid; HRMS's is the version that survived real
use. `role-form.tsx` now renders bordered groups with a **tri-state select-all
per group header** (with n/m counts), indented children, the **mono permission
key beside every label** — so what a dev reads in code is what an admin sees on
screen — and a total-selected pill. The pure helpers behind the tri-state
(`groupState` / `groupCheckedValue` / `toggleGroup`) are extracted verbatim as
`lib/permission-group-select.ts`.

**Preview section 13 redrawn inside the app shell.** All three pages (users,
roles, audit) now sit in the sidebar shell with a "ผู้ดูแลระบบ" nav group, as
they will actually appear; the roles specimen shows the HRMS-style checklist in
a Sheet (long form → Sheet, per the Dialog ladder) including an indeterminate
group header; the add-user dialog is local-only with the reasoning shown beside
it; disabled delete buttons demonstrate both blockers (system role · role still
in use).

## 4.9.0 (2026-08-10)

**Permission answers "may they"; nothing answered "whose data".** 4.8.0 put
`empCode` / `orgCode` / `superEmpCode` on the user row and stopped there — the
raw material for row-level scope with no layer that enforced it. That gap is the
most common hole in internal apps: a user passes every guard, edits `?empCode=`
to a colleague's, and reads their rows. The skill's own
`ugt-nextjs-pitfalls/references/hardening.md` already described the incident;
there was just nothing to reach for.

- `lib/scope.ts` (from `ugt-hrms/lib/services/employee-monitor-scope.ts` +
  the subtree walk in `hr-lookup.ts`): `resolveDataScope` →
  `isEmpCodeAllowed` for one record, `scopeWhere` for a list, both from the
  **same** scope object — a list filtered one way and a detail page checked
  another leaves a gap nothing on screen reveals.
  - An account with no linked `empCode` sees nothing; `scopeWhere` yields
    `{ in: [] }`, which is zero rows rather than all of them.
  - Out of scope answers **404** — 403 confirms the id exists.
  - `collectSubtreeEmpCodes` is pure and ships with `lib/scope.test.ts`
    covering the cases that regress in silence: multi-level teams, a cycle
    (real HR data has them, from keying errors), a null supervisor, and the
    unlinked account.
- `lib/approval-chain.ts` (from `workflow-resolver.ts` + `hr-lookup.ts`) reads
  the org **approval-chain view** — one row per step (`EmpCode` + `Seq`). It is
  a different object from the employee view, and `superEmpCode` there is only
  the denormalized direct supervisor: fine for team scope, wrong for routing an
  approval.
- **The two linked-server modules fail in opposite directions, deliberately.**
  `directory.ts` swallows and returns `null` — it runs during login, and an HR
  outage must not become "nobody can log in". `approval-chain.ts` rethrows —
  returning `[]` would save a request with no approver, tell the user
  "submitted", and leave it sitting until someone chases it weeks later.
  Callers must also separate `[]` (no chain configured → contact HR) from a
  thrown error (system down → retry); one message sends people to HR over a
  network blip.
- `verify.mjs` now flags a route or action that accepts an `empCode` from the
  client without resolving scope, a `scopeWhere` that does not constrain, a
  missing `scope.test.ts`, and an approval-chain lookup that swallows its error.
- Fixed a pre-existing inconsistency while here: the scope permission was
  documented as `resource:view-all` in `permissions.ts` and `hardening.md` but
  `resource:read-all` in `rbac.md`. Standardized on **`read-all`**, which is
  what the production code actually uses.

Not extracted, and the reference says so: HRMS's per-menu workflow config,
approval-chain snapshots taken at submit time, and its bulk `/admin/users/sync`
page. Those encode one organization's workflow rules, not an org-wide standard.

## 4.8.0 (2026-08-10)

**Identity now comes from the employee directory, not just the IdP.** SSO and
LDAP answer exactly one question — "who are you" — and the skill stopped there,
leaving three `EXTENSION POINT: enrich the user from your own directory` comments
and no mechanism. Every feature needing an employee code, department, position
or supervisor would have gone and queried the HR view itself, each mapping the
columns its own way.

- `lib/directory.ts`, generalized from `ugt-hrms/lib/hr-lookup.ts` (the
  HR-domain half — shift rules, leave quota, approval chains, subordinate BFS —
  stayed behind; that is feature code, not identity):
  `getDirectoryPerson` · `getDirectoryPersonByEmpCode` · `searchDirectory` ·
  `directoryUserFields`.
- Wired at all three points that create or refresh a user, from the **same**
  helper: `ldapLoginAction`, the SSO `session.create.after` hook, and
  `addDirectoryUserAction`. Separate implementations would leave SSO users and
  AD users with different columns filled, and nothing would surface it until a
  page needed the missing one. SSO must enrich in the hook — Better Auth drops
  custom fields returned from `mapProfileToUser`.
- The `user` model gains `empCode` · `fullNameThai` · `position` · `department`
  · `orgCode` · `superEmpCode`, documented as a **cache, not the source**, and
  refreshed on every login rather than once at signup — people change teams.
- **Every lookup returns `null` instead of throwing.** A dead HR server must
  degrade to "the Thai name is stale", never to "nobody can log in".
- `Prisma.raw` for the view name and column list, which are identifiers rather
  than values — interpolating them normally makes them bound parameters and the
  SQL fails. Nothing user-supplied ever goes near it. The SQL rules themselves
  (SELECT-only, CAST every column, no recursive CTEs) are not restated here;
  they live in `ugt-nextjs-database-setup` → `references/raw-sql-and-sp.md`.
- `addDirectoryUserAction` no longer asks the admin to type a name and email —
  it resolves them from the directory. Typed values would be overwritten at the
  person's first login anyway, so they could only ever be right by luck.
- Interview gains "is there a central employee database?" so answering *no* is a
  recorded decision rather than a silent omission, and `verify.mjs` checks the
  lookup fails soft, uses `Prisma.raw`, and is actually called from a login path.

## 4.7.1 (2026-08-10)

**User administration was missing entirely**, in both directions. 4.7.0
described the password policy as shared with "admin-create"; checking that claim
found no such thing, and pulling the thread found two holes that had been there
since local login was first offered:

- **No account could be created by hand at all.** `/admin/users` only listed
  users and assigned roles; `/admin/setup` promotes an already-logged-in user;
  there is no sign-up page. `USERS_CREATE` and `USERS_RESET_PASSWORD` sat in
  `ALL_PERMISSIONS` with nothing implementing them. A local-only project could
  not get its first person in.
- **Sign-up was open to anyone who could reach the app.**
  `emailAndPassword.enabled: true` publishes `POST /api/auth/sign-up/email` and
  nothing closed it.

`ugt-hrms` had already solved both — the skill just never extracted it. It is
extracted now, generalized:

- `createLocalUserAction` · `setUserPasswordAction` · `addDirectoryUserAction`
  in `lib/actions/admin-users.ts`, all on the org guard order, all audited
  (`users.create`, `users.password-set`), none putting a password in `detail`.
  `components/admin-user-actions.tsx` puts them on `/admin/users` as one
  "เพิ่มผู้ใช้" dialog that switches between a local account (with an initial
  password) and an AD account.
- **AD accounts can be pre-registered.** They already appear on the first
  successful bind, but a role often has to be in place before day one. The
  `ldapUsername` must match exactly what the person types at login — that is
  the key the login upsert matches on, so a typo produces a second user and the
  role sits on the row nobody uses.
- `emailAndPassword.disableSignUp: true`. This also blocks the server-side
  `auth.api.signUpEmail()` (verified in 1.5.4 — the check is inside the handler,
  no server bypass), which is why the admin action writes the `user` +
  `credential` rows itself with `hashPassword` from `better-auth/crypto`, the
  way HRMS does. That avoids a second problem in passing: `signUpEmail` mints a
  session for the account being created.
- An admin **sets a password directly** rather than mailing a link, because
  `ugt-nextjs-mail-setup` is optional and a project without it would otherwise
  have no recovery path at all. Every session of that user is revoked, and the
  cost — two people knowing one credential for a while — is stated in the rule
  file rather than left implicit.
- `scripts/create-first-user.ts` for the chicken-and-egg a local-only project
  hits: accounts come from `/admin/users`, which needs a login nobody has yet.
  It refuses to run once any user exists.
- `verify.mjs` fails on a missing `disableSignUp`, a missing
  `createLocalUserAction`, an admin action still calling `signUpEmail`, and a
  missing bootstrap script.

## 4.7.0 (2026-08-10)

**Local login is finally complete.** Until now a project could hand someone a
local account and had no way to let them recover it — the only path was an
admin editing the database. `ugt-nextjs-mail-setup` (4.4.0) removed the blocker.

- `lib/password-policy.ts` — **one** schema for length and complexity, imported
  by reset, change and admin-create. `lib/auth.ts` previously said complexity
  "belongs in Zod schemas on the create-user / reset-password forms", which is
  how three forms end up with three different rules and the loosest one becomes
  the real policy.
- `lib/actions/password.ts` — forgot / reset / change, each rate-limited and
  audited (`password.reset.requested` · `password.reset` ·
  `password.reset.refused` · `password.change` · `password.change.failed`).
- `lib/auth.ts` gains `sendResetPassword`, `resetPasswordTokenExpiresIn` (1h),
  `revokeSessionsOnPasswordReset` and `onPasswordReset`; `proxy.ts` makes
  `/reset-password` public; NavUser grows a **เปลี่ยนรหัสผ่าน** item that is
  hidden unless `authType === 'local'`; the login form grows "ลืมรหัสผ่าน?".
- `auth.password-reset` joins the mail templates, so the wording is admin-editable
  while the link button stays fixed chrome nobody can delete by accident.

Four decisions that are security, not preference, and are written down as such:

1. **The reset link is built from `token` + `NEXT_PUBLIC_BASE_PATH` by hand.**
   Better Auth's own `url` omits the Next.js basePath — the same trap already
   documented for the Keycloak `redirectURI` — so mailing it 404s, and only in
   production, where the basePath exists.
2. **Every email gets the same answer**, real or not. Anything else turns the
   form into a way to test who has an account.
3. **SSO/LDAP accounts are refused a reset.** Their password lives in the
   directory; a second app-local password beside it defeats the directory.
4. **Reset and change both revoke the user's other sessions.** People reset
   because they think someone else is in the account; leaving that session alive
   makes the reset theatre.

API note, verified against the better-auth **1.5.4** in `ugt-hrms/node_modules`
rather than from memory: `auth.api.forgetPassword` **no longer exists** — it is
`requestPasswordReset` now. The old name still type-checks and fails at runtime,
so `verify.mjs` fails on it explicitly.

Also fixed while adding the template: `mail-setup`'s "every key has a definition
and a default" check read the key list with a regex that stopped at the first
`]`. A `[METHOD: …]` comment inside the array would have closed the match early
and every key after it would have gone **unchecked in silence**. The regex now
anchors on `] as const`, and the array carries a comment saying why brackets
must stay out of it.

## 4.6.0 (2026-08-10)

**Excel/CSV export joins the UI kit** — extracted from `ugt-hrms`, where the
same ~120 lines were written twice (`access-monitor/export`,
`employee-monitor/export`) and drifted apart. Deliberately **not a new skill**:
export is ordinary feature work with no infrastructure, and
`ugt-nextjs-upload-setup`'s trigger evals confirm judges already route
"ปุ่ม export Excel" away from it 3/3 — a skill would have blurred a boundary
that works.

- `lib/export.ts` — one `ExportColumn[]` spec drives **both** formats, so CSV
  and Excel cannot disagree. HRMS proved why that matters: `employee-monitor`
  shipped a CSV with **15 headers and 13 values per row**, misaligned all the
  way down, because the header string and the row array were maintained
  separately. That class of bug is now unrepresentable.
- Three things the hand-written routes got wrong, fixed once:
  **no UTF-8 BOM** (Thai opens as garbage in Excel on Windows), **no formula
  guard** (a cell starting with `=`/`+`/`-`/`@` is executable — `=cmd|…` is a
  real attack against whoever opens the file), and **no row cap** on
  `employee-monitor` while `access-monitor` capped at 10,000. `exceljs` is now
  a dynamic import, so a CSV request no longer loads an xlsx parser.
- `ui/export-menu.tsx` — the dropdown, reshaped to the toolbar's icon-button
  form so it matches the column-settings button it sits beside; the filename
  now comes from the server's `Content-Disposition` instead of being guessed a
  second time on the client.
- `references/conventions.md` §Export — the route order (**session →
  permission → scope → zod → capped query → audit → build**) and the DO/DON'T
  table. The export bypasses pagination, which makes the scope check the only
  thing between a user and every row in the table.
- `assets/lib/export.test.ts` travels with the code — 4 assertions covering
  BOM, formula guard, negative numbers staying numeric, and column alignment.
- `scripts/verify.mjs` gains a check that fails on a hand-rolled export
  (`exceljs` or `text/csv` outside `lib/export.ts`); it stays silent in
  projects that export nothing.
- `docs/design-preview.html`: Export was drawn as a text button in the page
  header, which matched neither the kit nor HRMS. Moved into the table toolbar
  as an icon button — the preview drifting from reality is the same defect
  class this release is about.

Trigger-eval baselines run for the two 4.4/4.5 skills (3 judges, 27 queries
interleaved, randomized per judge): **mail 24/24 primary · upload 21/21 ·
negatives 36/36**, every negative landing on its expected owner unanimously.
No description changes needed.

## 4.5.1 (2026-08-09)

Two gaps in 4.4.0/4.5.0, both found by review rather than by a check:

- **The installer never asked about Upload.** Mail was in the module question;
  Upload only ever appeared in the child-skill table and the install order, so
  a run of `ugt-nextjs-full-setup` would have skipped it silently. Both are now
  asked as their own yes/no, phrased by what the app does ("ต้องส่งอีเมลแจ้งเตือนไหม",
  "ผู้ใช้ต้องแนบไฟล์ไหม") rather than by module name, and both default to **no** —
  each drags in real infrastructure (an SMTP relay to request; a volume plus a
  ~2 GB ClamAV container needing its own backup), so neither should arrive
  uninvited.
- **How an attachment links to its record was presented as a default when it is
  a business decision.** The path itself is always a column, and that stays
  fixed — but the polymorphic `entityType`+`entityId` shape the skeleton ships
  is one of three, and the schema said so nowhere. New
  `references/attachment-linking.md` lays out polymorphic vs a real FK per
  owning type vs a single column on the business table, with the trade-off that
  actually bites: polymorphic has **no FK protecting it**, so deleting an owning
  record leaves orphan rows that only the retention sweep will catch. The
  interview now asks, the schema comment says it is a choice, and the checklist
  requires the answer in `docs/project-context/decisions.md`.

## 4.5.0 (2026-08-09)

**New skill `ugt-nextjs-upload-setup`** — file attachments, the second runtime
gap. 4.4.0 recorded that this needed three org decisions before any code could
be written; they were made on 2026-08-09:

| Decision | Answer |
| --- | --- |
| Where files live | **Docker volume** |
| Which types | **All types, virus-scanned** |
| Downloads | **Permission-checked every request** |

Unlike every other skill here, **nothing was extracted** — `ugt-hrms` has no
upload path at all, so this is built from the decisions rather than from a
running implementation, and the SKILL says so.

What it installs: `lib/storage.ts` (volume paths derived from a generated
`yyyy/mm/<uuid>`, never from the filename, with a containment check) ·
`lib/virus-scan.ts` (clamd INSTREAM spoken directly over TCP — ~40 lines, no
npm client on the upload path) · an upload Route Handler · a guarded download
route · `lib/attachment-access.ts` (deny-all skeleton the project must
implement) · the `Attachments` model · a `FileUpload` component · the
Dockerfile/compose changes · `.claude/rules`.

The rules that carry the risk:

- **Scan before the volume, fail closed.** Bytes are scanned in memory;
  anything but a definite *clean* refuses the upload (503 when the scanner is
  down). A scanner that waves files through when it is broken is worse than
  none, because everyone believes files are checked. `verify.mjs` fails when
  `writeStoredFile` runs before `scanBuffer`.
- **Always `octet-stream` + `attachment` + `nosniff`.** "All types allowed"
  makes this non-negotiable: a virus-free `.svg` or `.html` served inline is
  stored XSS on the app's own domain.
- **Missing and forbidden both answer 404** — a 403 confirms the id exists.
- **Upload is a Route Handler, not a Server Action** — `bodySizeLimit` caps
  Server Actions at 1 MB and fails opaquely above it.
- The storage volume **is not covered by the database backup** and
  `docker compose down -v` deletes it; both go into `docs/admin-handoff.md`.

Also: `lib/format.ts` gains **`formatFileSize`** (1024-based, KB/MB/GB, `.0`
trimmed) — file sizes are numbers shown to users, so they belong in the central
formatter rather than being formatted inline. `ugt-nextjs-auth-setup` now ships
`files:create` / `files:read` alongside `dev-mode:enable`.

Install order is now `Database → Quality → Design → Auth → [Mail] → [Upload] →
CI`; Upload is opt-in and must precede CI, whose compose files it modifies.

## 4.4.0 (2026-08-09)

**New skill `ugt-nextjs-mail-setup`** — the first of the runtime-feature gaps
identified in the platform review. Extracted from `ugt-hrms`, where this exact
code sends every approval email in production.

What it installs: `nodemailer` over the org SMTP relay · admin-editable
templates (subject + body stored as one `AppSettings` row per key, in-code
defaults so mail works before anyone edits anything) · fixed email chrome
(card, header, greeting, status banner, CTA, "do not reply" footer) assembled
in code so an admin can change wording but never the layout or the disclaimer ·
`AppSettings` model · the `.claude/rules` file · `references/templates-and-tokens.md`.

Three production lessons carried over as enforced rules:

- **Dev mode is mandatory.** A user holding `dev-mode:enable` receives workflow
  mail themselves — CC dropped, `[DEV] ` on the subject, a banner naming the
  real recipients — so an approval flow can be tested end to end without
  notifying anyone. `verify.mjs` fails on any `sendTemplatedMail` call without
  an `actor`, because omitting it turns dev mode off silently.
- **Missing `SMTP_HOST` throws.** Without the guard nodemailer falls back to
  `localhost:25` and mail disappears with no error — checked by the script.
- **Every token is HTML-escaped.** `htmlVariables` is the single bypass, for
  server-built HTML only; the script fails when a user-typed token name
  (`reason`, `comment`, `note`, …) appears in that list.

Wiring: install order becomes `Database → Quality → Design → Auth → [Mail] → CI`
(Mail is opt-in and must follow Auth — it needs the session actor and adds
`dev-mode:enable` to `ugt-nextjs-auth-setup`'s permission list, which now ships
that key with a warning to grant it to testers only).

Not in scope, stated so it is not assumed: **file upload**. The review named it
alongside email, but `ugt-hrms` has no upload path at all — no `formData()`
handler, no volume, no storage dependency, only CSV/XLSX *exports*. There is
nothing to extract, and writing one would mean inventing answers to three org
decisions (where files live given `docker-compose` mounts no volume, size/type
limits and whether virus scanning is required, and whether downloads must be
permission-checked). Those go to the team before any code.

## 4.3.0 (2026-08-09)

**One scrollbar style for the whole org.** 4.1.0 said "delete `no-scrollbar`",
which leaves the OS scrollbar — chunky on Windows, invisible-until-hover on
macOS, different on every machine. `globals.tokens.css` now ships
`@utility scroll-thin` (6px, `--border` thumb, brightens on hover, Firefox +
WebKit), lifted from `ugt-hrms` where the same arbitrary-variant string was
pasted per call site.

- `SidebarContent`: swap `no-scrollbar` → `scroll-thin` (block-cleanup step in
  `references/layout-shells.md`, with the exact line to paste).
- `DataTable`: the sideways scroll container gets `scroll-thin` too, so the
  scrollbar that 4.1.0 turned on looks deliberate.
- `verify.mjs`: fails when `no-scrollbar` survives or when `globals.css` has
  no `@utility scroll-thin`; warns when `SidebarContent` carries neither.
  All four paths tested.

### Syncing a project that installed the kit before 4.3.0

The kit is copied into projects, so an update does not reach them. Nothing
here is urgent, but a project on an older copy is missing these — re-copy the
file, or apply the one-liner:

| What | Where | How |
| --- | --- | --- |
| Sideways scroll on wide tables (**the "data disappears" fix**) | `components/ui/data-table.tsx` | `scrollX` default `false` → `true`; add `scroll-thin` to the container |
| Filter chips as `Badge` | same file | the hand-rolled pill → `<Badge variant="secondary">` |
| Visible sidebar scrollbar | `components/ui/sidebar.tsx` | `no-scrollbar` → `scroll-thin` |
| `scroll-thin` itself | `app/globals.css` | copy the `@utility` block from `assets/globals.tokens.css` |
| Identity block | `components/nav-user.tsx` | new file from `ugt-nextjs-auth-setup` (projects with their own version: keep it, but check the two menu items and the two standard profile rows match) |
| Radius from the preset | `app/globals.css` | drop the org `--radius*` declarations, keep the preset's (see 4.0.0) |

`ugt-hrms` — the source of most of this kit — currently has the **old**
`scrollX = false` and the hand-rolled chip, so the table-clipping bug reported
from there is still live in that project until it syncs. Its sidebar already
matches (it removed `no-scrollbar` in `cf8cd53`, which is where the
`scroll-thin` style came from).

## 4.2.0 (2026-08-09)

**Every app now ships the same identity block.** Ported from `ugt-hrms`
`components/nav-user.tsx`, generalized — the HR-only parts (employee photo
lookup, Thai full name, emp-code / position / cost-centre rows) are gone and
come back through a single `extraRows` prop.

- New asset `ugt-nextjs-auth-setup/assets/components/nav-user.tsx`: sidebar
  footer button (avatar + name + email + `MoreVertical`) → dropdown with
  exactly two items, **บัญชีผู้ใช้** and **ออกจากระบบ** (spinner while
  pending; SSO routes to the backchannel logout, other methods to the plain
  one) → a read-only profile card.
- DESIGN.md §3 fixes the placement and both menu items, so "who am I / sign
  out" sits in the same spot in every app; §3 also describes the profile card
  (banner → avatar → name → role `Badge` → label–value rows, with **email**
  and **last login method** as the two rows every app has).
- **มติ 2026-08-09 — recorded exception**: the profile card may use per-row
  dividers (`divide-y`), which §4 forbids for detail dialogs generally. A
  profile is one short list; splitting it into sections would invent headings
  that carry no meaning. The exception is scoped to this card only.

**Badge, stated properly.** There are two components — `Badge` and
`StatusBadge` (itself `Badge variant="outline"`) — and "chip" is a *usage*, not
a third thing. DESIGN.md §4 now tables the five cases: status → StatusBadge ·
label/identifier → `Badge outline` · count → `Badge` + `tabular-nums` ·
removable filter chip → `Badge secondary` + ✕ · icon-free coloured label →
`Badge outline` + `TONE_STYLES`. All five are `rounded-full`.

**Sidebar count badges** are new to the agreement (มติ 2026-08-09): only for
menus holding **work waiting on that user**, `h-5 min-w-5 rounded-full px-1
text-xs tabular-nums`, **hidden at 0** (never a literal "0"), `99+` above 99,
and the number must come from a query already scoped to the user's
permissions — not a system-wide total.

**Radius `sm` was mislabelled.** The token comment and DESIGN called it
"chip 4px"; chips and badges are `rounded-full` and never touch it. Verified
against the registry: `sm` is for sub-elements *inside* controls — `size="xs"`
buttons, focus-ring targets that are not full buttons (a chip's ✕, the column
drag handle, the header sort button), tooltips, and sidebar menu items.
Corrected in `globals.tokens.css`, DESIGN.md §1 and the preview.

`docs/design-preview.html` grows two specimens: the five badge cases, and
NavUser + the profile card; the shell mock now shows count badges and the
NavUser footer.

## 4.1.0 (2026-08-09)

**Overflow — content must never disappear without a trace.** Reported from a
real project ("ข้อมูลใน DataTable หาย ไม่มี scroll") and confirmed in the code.

- `DataTable`: **`scrollX` now defaults to `true`.** It was `false`, and the
  wrapper applies `overflow-x-clip` in that case — so any table wider than its
  container had its trailing columns cut off with no scrollbar and no other
  hint. Passing `scrollX={false}` is still allowed but is now the opt-in, and
  `verify.mjs` fails unless a comment next to it explains why clipping is safe
  there. (The Y axis was already fine: the table has no `max-h` and the header
  is `sticky`, so it rides the page scroll.)
- **Sidebar**: the `sidebar-*` block ships `SidebarContent` with shadcn's
  `no-scrollbar` utility — verified to be `scrollbar-width: none` plus a
  hidden webkit scrollbar. A long menu scrolls but nothing tells the user
  more exists below. The block cleanup in `references/layout-shells.md` now
  requires removing it, and `verify.mjs` fails while it is present.
- DESIGN.md §3 gains an overflow table covering all four surfaces (table X,
  table Y, sidebar, topbar) with the shared principle stated once.

**Filter chips are `Badge` now.** The chips above the table were a hand-rolled
pill (`rounded-full border bg-muted px-2 py-0.5 text-xs`) — same idea as
`Badge` but a different height and font size, so filter chips did not match
badges elsewhere. They now render `<Badge variant="secondary">`, which is also
what `StatusBadge` builds on (`Badge variant="outline"` + tone + required
icon), so all three pill shapes finally come from one component.

`docs/design-preview.html`: every hard-coded `border-radius` inside the
specimen scope now uses the radius variables — the page was violating the
"ห้าม override ราย callsite" rule it teaches, and after the 4.0.0 switch to
mira's radii those literals no longer matched anything.

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
