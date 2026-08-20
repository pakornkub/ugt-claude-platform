<!-- ugt:start — this block is owned by `ugt-nextjs-full-setup` and may be rewritten wholesale on /plugin update.
     Put project-specific content OUTSIDE the markers or it will be lost on update.
     (HTML comments are stripped before entering context, so they cost no tokens.) -->

## Stack

Next.js (App Router) · TypeScript · React · Prisma → SQL Server ·
Better Auth (SSO Keycloak / AD-LDAP / Local) · Vitest · Jenkins + SonarQube + Docker

Project `__PROJECT_NAME__` · basePath prod `__BASE_PATH_PROD__` · dev `__BASE_PATH_DEV__`

## Commands

```bash
npm run dev            # develop
npm run build          # must pass before every push
npm run lint           # eslint
npm run format:check   # prettier (the pipeline calls this exact name)
npm run test:coverage  # vitest + coverage (Quality Gate needs >= 60% on new code)
```

## Rules that break the build every time

- `DATABASE_URL` lives in `prisma.config.ts` **only** — never put `url` in the
  `datasource` block of `schema.prisma`
- Never read `process.env` directly in app code — always `import { env } from '@/lib/env'`
  (exceptions: `lib/env.ts`, root `*.config.ts`, `instrumentation*.ts`, `sentry.*.config.ts`, test files)
- After every `schema.prisma` change: `npx prisma migrate dev` → **then always** `npx prisma generate`
- New tables: `@@map("PascalCasePlural")` + every field `@map("PascalCase")` + full audit columns
  (`Id/CreatedAt/UpdatedAt/CreatedBy/UpdatedBy/IsActive/IsDeleted`) · delete via `IsDeleted = 1`, never hard delete
- Never use a T-SQL reserved word as a column name (`key`, `value`, `group`, `count`, `order`) — add a qualifier
- Every privileged Server Action: **session → permission → action → audit log**, in that order
- Never `$queryRawUnsafe` / `$executeRawUnsafe` with user input — use tagged templates
- New TS/TSX code must pass the SonarQube Quality Gate on the first scan (`new_violations = 0`)
  — `ugt-nextjs-clean-code` loads itself when you touch `.ts`/`.tsx` files; follow it

## Team state + project knowledge (committed to the repo)

@.claude/state/handoff.md

@docs/project-context/00-index.md

- **Treat committed files as the latest truth** — on conflict with auto memory,
  they win (auto memory is machine-local, not shared with the team)
- **Call `/ugt-handoff` at the end of every work chunk** — it updates the
  handoff file + feature board + affected `docs/project-context/` files; commit
  the whole set together
- ก่อนเสนอเปลี่ยนแนวทาง/lib/โครงสร้าง → เช็ค `docs/project-context/decisions.md`
  ก่อนว่าเคยเคาะไปแล้วหรือยัง — ถ้าขัดมติเดิม ให้ยกขึ้นมาคุย ไม่ทำเงียบ ๆ
- เจอ error แปลก → เปิด `docs/project-context/troubleshooting.md` ก่อนเริ่ม debug
- Keep `handoff.md` short (~60 lines) — it loads into context every session

## Model mode (subagent routing)

@.claude/state/model-mode.md

- Follow that table when dispatching subagents or spawning teammates · switch
  preset with `/ugt-model-mode easy|default|god|auto` · main session model stays the
  user's `/model` · this table **wins over model advice inside superpowers
  skills** (e.g. SDD's Model Selection section)

## Which skill, when

| Task | How |
| --- | --- |
| Read-only work: answer a question about code/docs/config — no file edits | Answer **directly** — no pipeline, no brainstorming (the superpowers "1% chance → must invoke" rule does not apply to read-only work) |
| Start from a requirements folder → produce the committed per-feature brief | `/ugt-requirements` — then feed one feature at a time to the superpowers pipeline |
| First-time knowledge base (`docs/project-context/`) on an existing codebase | `ugt-context` — bootstrap once; afterwards `/ugt-handoff` maintains it |
| No logic change at all: typo, doc/README edit, config value, one-line fix at a known spot | Do it **directly** — skip the superpowers pipeline (auto-loading rules still apply) |
| Install/change infrastructure (DB, auth, test/lint, CI, deploy) | Invoke the matching `ugt-*` skill **directly** — it has its own interview; the setup path skips the **entire** superpowers pipeline (brainstorming/plans/TDD): the skill's SKILL.md is the plan, its verify script is the review |
| Build a feature / fix a bug | อ่าน `docs/project-context/` ที่เกี่ยวตาม `00-index.md` (architecture + โดเมนที่แตะ) **ก่อน** แล้ว **size it** (below) — small → offer the user a choice, otherwise go full pipeline |
| Write/edit `.ts`/`.tsx` files | `ugt-nextjs-clean-code` + `ugt-nextjs-pitfalls` load themselves via `paths` — no need to invoke |
| Finish work / hand off the session | `/ugt-handoff` |

### Sizing a feature/bug before the pipeline

Judge on the same three signals as `/ugt-model-mode`'s `auto` preset — **ambiguity**
of the requirement, **blast radius** (files/modules touched), **risk domain**
(auth/money/concurrency):

| Size | Signals | What happens |
| --- | --- | --- |
| Small | Requirement is unambiguous · ~1–3 files · not a risk domain | **Ask the user**: full pipeline (brainstorming → plan → TDD → review) or the light version (skip brainstorming, straight to TDD → review)? Never pick silently |
| Not small (ambiguous, cross-module, or risk domain) | — | Full pipeline, no need to ask — it's clearly warranted |

The light version still writes a test first and still gets reviewed — those
are the safety net against a broken change. Only brainstorming (exploring
ambiguity) and the standalone plan step are skippable, and only when there is
nothing ambiguous left to explore.

### Layer contract — when work is split across sessions/subagents

- A feature always goes to a **fresh session**, never a subagent — the
  pipeline inside it dispatches its own implementer/reviewer subagents, and a
  subagent cannot dispatch further.
- Merging a finished feature branch = **integration check only** (run the full
  test/lint suite, update the board via `/ugt-handoff`) — the branch was
  already reviewed twice inside its pipeline; never re-review the code.
- The pipeline's ledger (`.superpowers/sdd/`, git-ignored) is task-level
  scratch for one plan · feature-level status lives only in `board.md` +
  `handoff.md` (committed). Never copy content between the two.

## Where new knowledge goes (4 ทาง)

- Work state (ค้างไหน คิวอะไร คำถามค้าง) → `.claude/state/handoff.md`
- True only for this project → the matching `docs/project-context/` file
  (มติ → `decisions.md` · error ที่เคยเจอ → `troubleshooting.md` · กติกา as-built
  → `business-rules.md` · โครงสร้าง → `architecture.md`) or
  `.claude/rules/<project>-*.md` if path-bound · มติ design → `docs/DESIGN.md` §10
- True for every project on this stack → **open a PR against the
  `ugt-claude-platform` repo** — never edit installed skill files (plugin cache,
  deleted on update)
- Personal preference → auto memory · never create `.claude/skills/ugt-<same-name>/`
  shadowing a platform skill — extend under a new name

<!-- ugt:end -->
