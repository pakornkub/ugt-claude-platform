# Changelog — ugt-nextjs-platform

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
