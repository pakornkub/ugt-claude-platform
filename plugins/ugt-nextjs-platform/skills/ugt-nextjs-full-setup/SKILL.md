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
  dependency order (plus the optional ugt-nextjs-mail-setup /
  ugt-nextjs-upload-setup modules when the interview surfaces email or file
  uploads), then installs the harness files (CLAUDE.md block,
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
| `ugt-nextjs-mail-setup` | Workflow email over the org SMTP relay + admin-editable templates + dev mode (optional — only if the project sends mail) |
| `ugt-nextjs-upload-setup` | File attachments on a Docker volume + ClamAV scanning + guarded download route (optional — only if users attach files) |
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

1. What to install? Database / Quality (test+lint) / Design / Auth / CI —
   **default: all five**
2. Does the project need either of the optional feature modules? Ask both as a
   yes/no, phrased in terms of what the app does, not the module name:
   - **Mail** — "ระบบนี้ต้องส่งอีเมลแจ้งเตือนไหม (เช่น แจ้งผู้อนุมัติ / แจ้งผลกลับผู้ขอ)"
   - **Upload** — "ผู้ใช้ต้องแนบไฟล์ไหม (เช่น เอกสารประกอบ ใบเสร็จ รูป)"
   Both default to **no**: each adds real infrastructure (an SMTP relay to
   request from the admin team; a Docker volume plus a ~2 GB ClamAV container
   that must be backed up separately), so neither should arrive uninvited.
3. [If Auth selected] Which login methods? SSO / LDAP / Local (default: SSO only)
4. [If Mail selected] SMTP host/port, sender address, support contact for the
   email footer — see `ugt-nextjs-mail-setup`'s Interview
5. [If Upload selected] Max file size + is there a reverse proxy in front,
   which records get attachments, **how attachments link to those records**
   (see that skill's Interview — it is a business-logic decision, not a
   default), and retention for deleted files

**Shared identity (used by every module — ask once, don't let child skills re-ask):**

6. Project name in kebab-case (e.g. `expense-portal`) + display name
7. Deployed under a basePath / shared domain? If yes → basePath prod/dev
   (e.g. `/expense-portal`, `/expense-portal-dev`)
8. Host ports prod / dev (e.g. 3000 / 3001)
9. Full app URLs prod / dev including basePath (e.g. `https://apps.example.com/expense-portal`)

**Module-specific questions** — **open the Interview section in the SKILL.md of
every selected child skill and fold its questions into this same batch**
(example topics, not the full list: DB: server, database name, existing or new,
stored procedures needed · Design: prototype/brand to match?, primary color,
shell sidebar/topbar, dark mode, ภาษา UI · Auth: Keycloak client exists yet,
AD details, directory view, scope/approval · CI: Sentry?, deploy target).
**Never ask "who is the first admin"** — auth-setup §3 Q5 forbids it (the
answer cannot be used: no pre-registration, มติ 2026-08-11); the first person
to log in becomes Administrator via `/admin/setup`, and that sentence goes in
the summary + `docs/admin-handoff.md` instead.

### 2.5 Choose the run shape — one proposal, confirmed once

Every answer is now on file, so nothing below re-asks the user anything.
Judge the load and propose ONE way to run the install:

| Signal | Proposal |
| --- | --- |
| ≤ 2 modules, fresh project | Run straight through in this session (the default) |
| 3+ modules, or an existing project needing careful merges | Split into chunks of 1–3 modules; end each chunk with `/ugt-handoff` (answers + progress land in `handoff.md`) and continue in a fresh session — §3 order unchanged |
| Full install but the user wants a single session | Dispatch each module to a subagent: the dispatch prompt = the child skill's SKILL.md path + only the interview answers that module needs; the subagent follows the skill and returns a summary + its `verify.mjs` result — never file dumps |

Either split keeps the §3 order: chunks/subagents run **sequentially**, never
two modules at once — they edit the same `package.json` / `schema.prisma` /
compose files.

**The setup path never enters the superpowers pipeline** — no brainstorming,
no plan step, no TDD skill, regardless of how aggressive their triggers are:
each child SKILL.md already is the plan, and its `verify.mjs` + checklist
already are the review. This binds subagents too: an installer subagent
dispatches nothing further.

### 3. Install in order (never reorder)

```
Database → Quality → Design → Auth → [Mail] → [Upload] → CI
```

- **Auth must come after Database** — Better Auth stores user/session/account in Prisma.
- **Mail comes after Auth** — it needs the actor (session email) and adds the
  `dev-mode:enable` permission to the auth permission list. It is optional:
  install it only when the project sends email.
  **[Local login + Mail] one step back afterwards**: "ลืมรหัสผ่าน" lives in
  auth but sends through mail, so it cannot be wired while mail does not exist
  yet. Once mail-setup finishes, return to auth-setup §5.5 and install the
  reset pieces (`sendResetPassword` in `lib/auth.ts`, the forgot dialog, the
  `/reset-password` page). Skipping this leaves local accounts with **no
  recovery path except an admin** — say so out loud rather than leaving it
  silently undone.
- **Design must come before Auth** — auth generates themed pages (login,
  `/admin/*`); running design later means re-theming them (the retheme-twice
  lesson from gov-boi-smart).
- **Quality must come before CI** — the pipeline calls `lint`/`format:check`/
  `test:coverage` by exact name; without them it goes red at the third stage on
  the very first push.
- **Upload comes after Auth and before CI** — it needs the permissions and
  audit log from Auth. **But its compose/Dockerfile snippet waits for CI**:
  the storage bind mount + `clamav` service are edits to files cicd-setup is
  the one that writes — so at Upload time install everything except that
  snippet, then apply upload-setup §4.4 as a close-out step right after
  cicd-setup lays down the Dockerfile + both compose files (and add
  `storage` + `clamav-db` to the Jenkinsfile `[VOLUME]` `mkdir -p` line).
  Optional: only when users attach files.
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
| `assets/state/model-mode.md` | `.claude/state/model-mode.md` | **create once, never overwrite** — afterwards owned by `/ugt-model-mode` |
| (via `ugt-context` skill) | `docs/project-context/` (7 files) | **create once** — afterwards owned by `/ugt-handoff` |

`.claude/rules/ugt-nextjs-*.md` files are NOT installed from here — each child
skill ships its own rule in its `assets/rules/` and installs it as part of its
own steps (so installing a single skill directly also gets its rule).

How:

1. **`CLAUDE.md`** — no file → create it from the block · file exists → look for
   the `<!-- ugt:start` marker (any version suffix): found → replace only the
   span between the markers · not found → **append** the block. Never touch a
   single line of the project's own content. Substitute `__PROJECT_NAME__` /
   `__BASE_PATH_PROD__` / `__BASE_PATH_DEV__` from the interview answers and
   `__HARNESS_VERSION__` from this plugin's current `plugin.json` version —
   verify.mjs compares that stamp against the installed plugin and warns when
   the block has fallen behind (paste-into-file assets have no other sync).
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
   `ugt-nextjs-ci.md` / `ugt-nextjs-design.md` — plus `ugt-nextjs-mail.md` /
   `ugt-nextjs-upload.md` when those optional modules were selected). These
   files carry `paths`
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
   If legacy v2.x files exist (`checkpoint.md` / `mode.md` /
   `project-notes.md`) → stop and migrate first per the v3.0.0 CHANGELOG.
5. **`docs/project-context/`** — invoke the **`ugt-context`** skill (ugt-core):
   fresh project → skeleton files; existing codebase → its scan path (draft →
   user review → write). Skip only if the folder already exists.
6. **`.gitignore`** — add `.claude/logs/` (audit logs are not committed), but
   **`.claude/state/` and `docs/project-context/` must be committed** — never
   ignore `.claude/` wholesale.
7. If the org has no machine-level hard boundary yet → point the user at the
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
3. Attach a **smoke-test checklist** — the Verification Checklist below,
   trimmed to what was actually installed.

## Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| Inspect existing setup before asking | Overwrite existing Prisma/auth/Jenkinsfile silently |
| One combined interview batch (incl. child-skill questions) | Ask one-by-one / let child skills re-ask |
| 3+ modules → propose chunked sessions or per-module subagents (§2.5) | Grind through one long session until context compaction degrades the work |
| Always Database → Quality → Design → Auth → CI | Install auth before a DB exists / before the design kit (its admin pages render with kit DataTable) / CI before test scripts exist |
| Not Next.js → say it plainly | Adapt the assets to another stack yourself |
| Summarize files + admin requests at the end | Finish silently with no checklist |
| Edit `CLAUDE.md` only inside the `ugt:start/end` block | Rewrite the whole `CLAUDE.md` (team content lost) |
| Leave existing `.claude/state/` untouched | Reset team state because it "looks like a skeleton" |
| Install the harness every time (step 4) | Install only code and stop — knowledge dies with the session |

## Verification Checklist

Every installed module has its own `verify.mjs`; this skill has one too, for
the harness layer. Run them all, then walk the rest of this list — the last
four items are the smoke test §5 Close out hands to the user:

```bash
node <skill-dir>/scripts/verify.mjs      # cwd = project root, once per module
```

- [ ] every module's `verify.mjs` exits 0, **including this skill's own**
- [ ] `CLAUDE.md` stays under 200 lines (this skill's verify.mjs enforces it)
- [ ] `.claude/rules/` and `.claude/state/` exist and the rule files carry a
      `paths:` frontmatter — without it a rule never loads
- [ ] `docs/admin-handoff.md` exists with no `__...__` left, and the user has
      been told to forward it (it is a FILE, not a chat message)
- [ ] `npm run build` passes
- [ ] login works with every enabled method → protected page reachable →
      logout clears the cookie
- [ ] `/admin/setup` grants Administrator on one click
- [ ] push `develop` → pipeline green through all stages
