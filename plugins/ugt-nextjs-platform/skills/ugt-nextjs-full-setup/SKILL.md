---
name: ugt-nextjs-full-setup
description: >
  The entry point for turning an existing Next.js project into one that can
  actually be deployed on the org's infrastructure. Use this whenever someone
  asks to "ทำให้ deploy ได้", "เอาขึ้น production", "ยังใช้งานจริงไม่ได้",
  "ทำให้ใช้งานได้จริง", wants to prepare a project they built with AI, or asks
  for several of database / login / test-lint / CI together. Use it just as
  readily when they describe the symptom instead of the fix — "โปรเจคยังไม่มี
  อะไรเลย", "ต้องเตรียมอะไรบ้างก่อนขึ้น server", "ทำตามมาตรฐานบริษัทให้ด้วย" —
  because that is exactly the case where they don't yet know which pieces they
  need, and this skill's job is to find out. It interviews once, routes to
  ugt-nextjs-database-setup → ugt-nextjs-test-lint-setup → ugt-nextjs-design-setup →
  ugt-nextjs-auth-setup → ugt-nextjs-cicd-setup in
  dependency order, then installs the harness files (CLAUDE.md block,
  .claude/rules, .claude/state) so the standards outlive the session.
  Do NOT use when the request names exactly one area: "ต่อ database", "ทำ CI",
  "ใส่ login SSO", "ตั้ง vitest", "ทำข้อตกลง design" go straight to that single
  skill. (เดิมชื่อ ugt-nextjs-setup)
---

# UGT Full Setup — org-standard installer (parent skill)

## Overview

Projects users build with AI usually have no login, no database, no CI. This
skill is the entry point: inspect the stack → ask what to install → invoke the
child skills in the correct order → summarize + smoke test.

| Child skill | Installs |
| --- | --- |
| `ugt-nextjs-database-setup` | SQL Server via Prisma + naming conventions |
| `ugt-nextjs-test-lint-setup` | Vitest (JUnit + lcov) + ESLint + Prettier + pre-commit |
| `ugt-nextjs-design-setup` | Design agreement (`docs/DESIGN.md`) + shadcn tokens/fonts/shell + org UI kit |
| `ugt-nextjs-auth-setup` | Login: SSO (Keycloak) / AD-LDAP / Local + RBAC + admin bootstrap |
| `ugt-nextjs-cicd-setup` | Jenkins + SonarQube Quality Gate + OWASP DC + Docker deploy + `/api/health` |

`ugt-nextjs-clean-code` and `ugt-nextjs-pitfalls` are not part of the install
order — they load themselves whenever matching `.ts`/`.tsx` files are touched
(`paths` frontmatter). Do not invoke them from here.

## Workflow

### 1. Inspect the project before asking

Read `package.json` and the file layout to learn:

- Is this really Next.js App Router? This skill set is built for exactly this
  stack (TS/React/Next.js + Prisma/SQL Server + Keycloak + Jenkins + SonarQube).
  If it is not, say so plainly — **never try to adapt the assets yourself.**
- What already exists: Prisma or another ORM, any auth system, vitest/jest/
  eslint, a Jenkinsfile/Dockerfile — **never overwrite existing setup silently.**
  Report what you found and ask first.

### 2. Interview — one combined batch of questions

Ask all of this in a single message (use AskUserQuestion if available):

**Module selection:**

1. What to install? Database / Quality (test+lint) / Design / Auth / CI (multi-select — default: all five)
2. [If Auth selected] Which login methods? SSO / LDAP / Local (default: SSO only)

**Shared identity (used by every module — ask once, don't let child skills re-ask):**

3. Project name in kebab-case (e.g. `expense-portal`) + display name
4. Deployed under a basePath / shared domain? If yes → basePath prod/dev
   (e.g. `/expense-portal`, `/expense-portal-dev`)
5. Host ports prod / dev (e.g. 3000 / 3001)
6. Full app URLs prod / dev including basePath (e.g. `https://apps.example.com/expense-portal`)

**Module-specific questions** — **open the Interview section in the SKILL.md of
every selected child skill and fold its questions into this same batch**
(example topics, not the full list: DB: server, database name, existing or new,
stored procedures needed · Design: prototype/brand to match?, primary color,
shell sidebar/topbar, dark mode, ภาษา UI · Auth: Keycloak client exists yet,
AD details, first admin · CI: Sentry?, deploy target).

### 3. Install in order (never reorder)

```
Database → Quality → Design → Auth → CI
```

- **Auth must come after Database** — Better Auth stores user/session/account in Prisma.
- **Design must come before Auth** — auth generates themed pages (login,
  `/admin/*`); running design later means re-theming them (the retheme-twice
  lesson from gov-boi-smart).
- **Quality must come before CI** — the pipeline calls `lint`/`format:check`/
  `test:coverage` by exact name; without them it goes red at the third stage on
  the very first push.
- **CI comes last** — the pipeline needs to know whether a DB exists (migrate
  stage) and the build must pass first.
- Skip unselected modules; the relative order of the rest is unchanged.
- For each module: invoke the child skill (`ugt-nextjs-database-setup` /
  `ugt-nextjs-test-lint-setup` / `ugt-nextjs-design-setup` / `ugt-nextjs-auth-setup` /
  `ugt-nextjs-cicd-setup`) and follow its
  SKILL.md — pass down the interview answers already collected, never re-ask
  the user.

### 4. Install the harness layer (always, regardless of module selection)

The modules above install **code**, but the knowledge would vanish with the
session that installed it — this step is what makes it persist. Every file here
is **owned by the skill and may be overwritten on `/plugin update`**, except
where noted.

| Asset | Destination | Overwritable? |
| --- | --- | --- |
| `assets/CLAUDE-block.md` | inserted into root `CLAUDE.md` | **only between `<!-- ugt:start -->` … `<!-- ugt:end -->`** |
| `assets/settings.json` | merged into `.claude/settings.json` | merge our keys only |
| `assets/state/handoff.md` | `.claude/state/handoff.md` | **create once, never overwrite** |
| `assets/state/project-notes.md` | `.claude/state/project-notes.md` | **create once, never overwrite** |
| `assets/state/model-mode.md` | `.claude/state/model-mode.md` | **create once, never overwrite** — afterwards owned by `/ugt-model-mode` |

`.claude/rules/ugt-nextjs-*.md` files are NOT installed from here — each child
skill ships its own rule in its `assets/rules/` and installs it as part of its
own steps (so installing a single skill directly also gets its rule).

How:

1. **`CLAUDE.md`** — no file → create it from the block · file exists → look for
   the `<!-- ugt:start -->` marker: found → replace only the span between the
   markers · not found → **append** the block. Never touch a single line of the
   project's own content. Substitute `__PROJECT_NAME__` / `__BASE_PATH_PROD__` /
   `__BASE_PATH_DEV__` from the interview answers.
   > **Size check**: if the combined file exceeds ~200 lines, move project
   > content that is path-bound into `.claude/rules/<project>-*.md` instead of
   > letting CLAUDE.md bloat (longer files get followed less).
   > **Coexisting with Next.js 16.3+**: `next dev` upserts its own managed block
   > (`<!-- BEGIN:nextjs-agent-rules -->` + an `@AGENTS.md` import) into
   > CLAUDE.md, preserving everything outside it — same marker technique as
   > ours. Leave that block alone, commit it (deleting it just recreates an
   > uncommitted change), and never place the ugt block inside it. Opt-out, if
   > a project ever needs it: `agentRules: false` in next.config.
2. **`.claude/rules/`** — verify each installed module's child skill wrote its
   rule file (`ugt-nextjs-database.md` / `ugt-nextjs-auth.md` /
   `ugt-nextjs-ci.md` / `ugt-nextjs-design.md`). These files carry `paths`
   frontmatter, so the runtime loads them by itself when Claude touches
   matching files — there is no need to write "if you edit X, read Y" into
   CLAUDE.md.
3. **`.claude/settings.json`** — merge the keys `extraKnownMarketplaces`,
   `enabledPlugins`, `permissions` (the marketplace repo is already set to
   `pakornkub/ugt-claude-platform`) ·
   if the file already exists, merge — do not overwrite.
4. **`.claude/state/`** — create from the skeletons **only if absent** · if
   present, do not touch (it is the team's memory) · fill in the date and the
   installed modules in `handoff.md` · `model-mode.md` ships with the `default`
   preset — changing it is `/ugt-model-mode`'s job, not this skill's.
5. **`.gitignore`** — add `.claude/logs/` (audit logs are not committed), but
   **`.claude/state/` must be committed** — never ignore `.claude/` wholesale.
6. If the org has no machine-level hard boundary yet → point the user at the
   IT deployment guide `contracts/org-managed-settings.md` in the **ugt-core**
   plugin (canonical copy:
   https://github.com/pakornkub/ugt-claude-platform/blob/main/plugins/ugt-core/contracts/org-managed-settings.md)
   — a human-facing document for the IT team; the skill cannot install that part.

### 5. Close out

1. **Run `node <skill-dir>/scripts/verify.mjs` for every installed module**
   (cwd = project root), **including `ugt-nextjs-full-setup`'s own `scripts/verify.mjs`
   which checks the harness layer.** Fix every ✘ before closing — never report
   done with an exit code 1 outstanding. Then walk the remaining checklist
   items in each skill that a machine can't verify.
2. Summarize for the user: every file added/changed (grouped by module) and
   env vars that need real values. **Admin handoff is a FILE, not a chat
   message**: if CI was installed, `ugt-nextjs-cicd-setup` has already
   written `docs/admin-handoff.md` (from its
   `assets/admin-handoff.template.md` — plain-Thai steps + exact names +
   fill-in return section covering Jenkins + SonarQube + Keycloak); confirm
   it exists, has no `__...__` left, and tell the user to forward that file
   to the admin/DevOps team and wait for the returned values to fill
   `.env.local`. If CI was NOT installed but Auth was, render the same
   template with only the Keycloak section into `docs/admin-handoff.md`
   (SSO needs a client either way).
3. Attach a **smoke-test checklist** matching what was actually installed, e.g.:
   - [ ] `npm run build` passes
   - [ ] login works with every enabled method → protected page reachable → logout clears the cookie
   - [ ] `/admin/setup` grants Administrator on one click
   - [ ] push `develop` → pipeline green through all stages

## Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| Inspect existing setup before asking | Overwrite existing Prisma/auth/Jenkinsfile silently |
| One combined interview batch (incl. child-skill questions) | Ask one-by-one / let child skills re-ask |
| Always Database → Quality → Auth → CI | Install auth before a DB exists / CI before test scripts exist |
| Not Next.js → say it plainly | Adapt the assets to another stack yourself |
| Summarize files + admin requests at the end | Finish silently with no checklist |
| Edit `CLAUDE.md` only inside the `ugt:start/end` block | Rewrite the whole `CLAUDE.md` (team content lost) |
| Leave existing `.claude/state/` untouched | Reset team state because it "looks like a skeleton" |
| Install the harness every time (step 4) | Install only code and stop — knowledge dies with the session |
