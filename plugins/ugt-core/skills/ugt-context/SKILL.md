---
name: ugt-context
description: >
  Bootstrap the project's knowledge base — `docs/project-context/` (00-index,
  board, architecture, business-rules, api, decisions, troubleshooting): the
  as-built map that lets a session read what the system IS instead of
  re-exploring the codebase every time. Use when the user says "สร้าง project
  context", "ทำสารบัญโปรเจค", "โปรเจคนี้ยังไม่มี context", "อยากให้ AI
  ไม่ต้องอ่านโค้ดใหม่ทุกรอบ", when `ugt-<stack>-full-setup` reaches its
  context-bootstrap step, or when an existing project wants its codebase
  scanned into the context files for the first time.
  This skill CREATES the folder once. It never maintains it — ongoing updates
  are `/ugt-handoff`'s job at the end of every work chunk. Do NOT use to
  update context after normal work (→ /ugt-handoff), to record work state
  (→ /ugt-handoff), or to read requirement documents (→ /ugt-requirements).
---

# UGT Context — bootstrap the project's knowledge base

## Why this folder exists

`.claude/state/handoff.md` answers "งานถึงไหน" and is always-loaded, so it must
stay short. Knowledge that grows with the project — what the system is, its
rules, its decisions, its known problems — lives in `docs/project-context/`,
loaded **on demand**: only `00-index.md` (the table of contents) is imported
into every session. Sessions read the relevant file before planning instead of
re-exploring code; humans read the same files as documentation.

| File | Content | Written by (after bootstrap) |
| --- | --- | --- |
| `00-index.md` | สารบัญ + pointers to every knowledge home | `/ugt-handoff` |
| `board.md` | feature status board (single-writer) | rows by `/ugt-requirements`, status by `/ugt-handoff` |
| `architecture.md` | module map · data flow · main tables · ⚠ deviations | `/ugt-handoff` |
| `business-rules.md` | as-built business rules, pointers into code | `/ugt-handoff` (on feature done) |
| `api.md` | endpoint index | `/ugt-handoff` |
| `decisions.md` | append-only decision log (all except design → DESIGN.md §10) — **skipped when the project keeps ADRs** (see below) | `/ugt-handoff` |
| `troubleshooting.md` | symptom → cause → fix, project-specific | `/ugt-handoff` |

**One decision home.** If `docs/adr/` already exists, or the mattpocock-skills
pipeline is installed (its `domain-modeling` writes ADRs there), do **not**
create `decisions.md` — edit the `decisions.md` row in `00-index.md` to point
at `docs/adr/` instead, and `/ugt-handoff` records decisions as ADRs. Two
decision logs in one repo is the one thing this folder must never cause.

## Workflow

### 1. Detect state

- `docs/project-context/` already exists → report what is there and **stop**
  unless the user explicitly asks to regenerate a specific file. Never
  overwrite silently — these files are the team's knowledge.
- Fresh project (no meaningful source yet) → **skeleton path**: copy every
  template from `assets/` to `docs/project-context/`, substitute nothing,
  done. The files fill up as work happens (via `/ugt-handoff`).
- Existing codebase → **scan path** (below).

### 2. Scan path — existing codebase

Read the project and DRAFT the three scannable files (leave `decisions.md`,
`troubleshooting.md`, `board.md` as skeletons — those hold history no scan can
recover):

If the codebase is large (many modules/routes — scanning would take several
minutes single-threaded), offer the user a parallel scan via the `Workflow`
tool instead: one agent drafts `architecture.md`, one `api.md`, one
`business-rules.md`, independently and read-only, merged before the review
step below. State plainly that this spawns multiple agents and costs more
tokens than the single-agent scan. Only if the user opts in — small projects
stay single-agent. (Harness without a `Workflow` tool: dispatch the same
read-only fan-out via the `Agent`/`Task` tool instead — same split, same
merge step.)

1. **`architecture.md`** — from the folder layout, `package.json`, the schema
   (e.g. `prisma/schema.prisma`), and the main flows visible in routing.
   Stack hints (Next.js): module map from `app/`/`components/`/`lib/`
   top-level folders · main tables from the schema's models · data flows from
   page → action/route → service → table chains.
2. **`api.md`** — enumerate route handlers (Next.js: `app/**/route.ts` +
   Server Actions in `lib/actions/`) into the table: method, path, one-line
   purpose, file. "ใครเรียก" only where obvious — never guess.
3. **`business-rules.md`** — only rules the code states loudly (validation
   schemas, guard clauses, constants with business meaning). Every inferred
   rule is marked `(assumption)` — an unmarked guess is worse than a gap.
   If `docs/requirements-brief/` exists, cross-check against it and flag
   places where code and brief disagree as `(assumption)` + a question.

Rules for the draft:

- **Pointers, not mirrors** — every entry names the file/function that holds
  the truth; never paraphrase logic the code already expresses.
- Respect the size caps in each template's header comment.
- Deviations from `ugt-*` standards found during the scan → `⚠ deviation:`
  lines in `architecture.md` with today's date and "(found in scan — reason
  unknown, confirm with team)".

### 3. Review before writing

Present the drafts to the user for correction **before** committing — the
scan can misread intent, and a wrong context file misleads every future
session. After approval: write the files, then remind the user to commit.

### 4. Hand off ownership

Close by stating: from now on `/ugt-handoff` maintains every file here at the
end of each work chunk — this skill is done and should not run again for this
project (except to regenerate after a major restructure, on explicit request).

## Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| Skeletons for fresh projects — empty is honest | Invent architecture for code that doesn't exist |
| Pointers into code (`path:function`) | Copy logic/prose out of the code into the docs |
| Mark every inference `(assumption)` | Present guesses as facts |
| Draft → user review → write | Write scan results straight to disk |
| Leave decisions/troubleshooting/board as skeletons on scan | Fabricate history no scan can know |
| Stop if the folder already exists | Regenerate over team knowledge silently |

## Verification Checklist

- [ ] `docs/project-context/` has all 7 files (6 when the project keeps ADRs —
      then `00-index.md`'s decisions row points at `docs/adr/`)
- [ ] `00-index.md` table rows match the files that actually exist
- [ ] Every architecture/api/business-rules entry points at a real file path
- [ ] No unmarked assumptions in scanned drafts
- [ ] CLAUDE.md imports `@docs/project-context/00-index.md` (installed by the
      stack's full-setup — if missing, tell the user to re-run its harness step)
- [ ] The folder is committed (it is the team's knowledge, like `.claude/state/`)
