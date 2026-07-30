# Changelog — ugt-nextjs-platform

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
