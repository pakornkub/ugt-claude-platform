# Changelog — ugt-nextjs-platform

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
