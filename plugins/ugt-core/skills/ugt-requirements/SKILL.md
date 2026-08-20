---
name: ugt-requirements
description: >
  Read every document under the project's requirements folder and produce a
  committed Thai-language brief — `docs/requirements-brief/00-overview.md`
  (system purpose, user types, feature list, candidate tables, system-level
  open questions) plus one file per feature — sized for handing a single
  feature to the superpowers pipeline in its own session.
  Use when starting a project from a requirements folder, or when the user
  says "อ่าน requirement แล้วสรุป", "ทำ brief จาก docs", "สรุป requirement
  แยก feature", "เริ่มโปรเจคจากเอกสาร", or asks what the requirement docs
  are missing before building.
  Do NOT use for a quick question about one document (answer directly — no
  files), to design or build a feature (→ superpowers pipeline reading the
  brief), or to install anything (→ ugt-<stack>-setup skills).
---

# UGT Requirements — from a docs folder to a per-feature brief

## Overview

A new project usually arrives as a folder of raw documents: requirements,
mockups, business rules — scattered, sometimes contradictory, always
incomplete. Building straight from them fails in two ways: features get built
on guesses the documents never confirmed, and every later session has to
re-read the whole folder to work on one feature.

This skill turns that folder into a **committed brief**: one overview plus one
file per feature, in Thai (stakeholders read the open questions), each file
small enough to hand to the superpowers pipeline on its own. The most
important output is not the summary — it is the **Open Questions**: what the
documents do not say but the build needs, surfaced *before* code goes in the
wrong direction.

This skill only reads sources and writes the brief. It never designs,
scaffolds, or writes code — the handoff at the end is where its job stops.

## Reading the sources

1. Input folder: `docs/requirements/`. If it does not exist, ask the user
   where the requirement documents live — never guess and never scan the
   whole repo unprompted.
2. Read **every** readable file in the folder (recursively): Markdown, text,
   CSV, images and PDFs via the Read tool.
3. If a root `CONTEXT.md` (domain glossary) or `docs/adr/` exists — output of
   an earlier crystallization session — always read them as sources too: list
   them in the overview's **Sources** section like any other file and cite
   them in the briefs. Treat them as **frozen input**: once the project is
   running, decisions live in `docs/project-context/decisions.md` — never let
   the two systems grow in parallel.
4. A file that cannot be read (e.g. `.docx`, spreadsheets, corrupt files) is
   listed in the overview's **Sources** section as `unread` — visibly, so
   nobody mistakes the brief for complete coverage. Do not silently skip it,
   and do not invent its contents.
5. While reading, collect three kinds of findings:
   - **Facts** — what the documents actually state
   - **Conflicts** — places where documents contradict each other (a conflict
     is always promoted to an Open Question naming both sources)
   - **Gaps** — what the build needs but no document answers

If the folder implies many features (drafting each brief sequentially would
take a while), offer the user a parallel draft via the `Workflow` tool
instead: one agent per feature drafts its `<NN>-*.md`, independently and
read-only, then one pass reconciles cross-feature conflicts and writes
`00-overview.md`. State plainly that this spawns multiple agents and costs
more tokens than the single-agent draft. Only if the user opts in — a
handful of features stays single-agent.

**Pre-crystallization (optional).** If the user wants to settle open
questions by interview *before* this skill runs (e.g. a `/grill-with-docs`
session, where that plugin is installed), advise them to end that session by
dumping every settled decision into `docs/requirements/00-decisions.md`. A
glossary and sparing ADRs capture only a fraction of the answers — ordinary
decisions that qualify for neither evaporate with the session unless written
to a file this skill will read. Never require this step: it is an offer, and
this skill works the same without it.

## The brief structure

Output goes to `docs/requirements-brief/` (committed). All content in
**Thai**, except identifiers, table names, and file paths.

### `00-overview.md`

| Section | Content |
| --- | --- |
| ระบบทำอะไร | 2–5 sentences, the system's purpose in plain language |
| ผู้ใช้ / role | Every user type the documents mention, with what each can do |
| รายการ feature | Table: feature name → brief file → priority (if stated) → depends on — **no status column**; live status is the board's job (`docs/project-context/board.md`) |
| ตารางข้อมูล (candidate) | Union of tables/entities implied across features — candidates, not a schema |
| Cross-cutting | Concerns spanning features: auth, audit, notifications, integrations |
| Open Questions (ระดับระบบ) | System-wide gaps and conflicts, each phrased as a question a stakeholder can answer |
| Sources | Every source file: read (with a 1-line description) or `unread` (with reason) |

**Feature board**: this skill also writes one row per feature into
`docs/project-context/board.md` — a table
`| Feature | Brief | Priority | Depends on | สถานะ |` — creating the file if
missing (the folder normally exists via `ugt-context`). Every row starts
`☐ todo`; updating statuses later is `/ugt-handoff`'s job, and only the
สถานะ column — one writer per column, so the board cannot drift from the
handoff file. Status values: `☐ todo` · `🔨 in progress` ·
`⏳ blocked — <what it waits on>` · `✅ done`.

### `<NN>-<kebab-feature>.md` — one per feature

Number in dependency order (`01-` first buildable). Sections:

| Section | Content |
| --- | --- |
| ทำอะไร / ทำไม | What the feature does and the business reason |
| ผู้ใช้ที่เกี่ยวข้อง | Roles that touch this feature and how |
| Flow หลัก | Main flows as numbered steps; alternate/error flows if documented |
| ข้อมูลที่แตะ | Tables/entities this feature reads or writes |
| Dependency | Other features this one needs first (must match the overview table) |
| Open Questions | What the documents don't say but this feature's build needs — the most important section; write "ไม่มี" only if genuinely complete |
| อ้างอิง | Source files + section names backing this brief — cite, don't copy long passages |

Anything inferred rather than stated must be marked `(assumption)` inline —
an unmarked guess is worse than a gap, because nobody knows to question it.

## Open questions discipline

- Questions that **block** a feature's build: tell the user to take them to
  stakeholders *before* starting that feature — that is the whole point of
  extracting them early.
- Questions still unresolved when the session ends: point the user to
  `/ugt-handoff`, which records them under Open Questions in
  `.claude/state/handoff.md`. This skill **never writes `.claude/state/`
  itself** — that file has one owner.

## Re-runs and requirement changes

If `docs/requirements-brief/` already exists, report what is there and ask
before touching anything. Never overwrite silently — the brief is in git so
the user can diff either way, but the choice is theirs.

A requirement change is NOT always a new feature — route by the affected
feature's status on `docs/project-context/board.md`:

| เคส | ทำ |
| --- | --- |
| ของใหม่ ไม่กระทบ feature เดิม | brief ใหม่ (`NN-*.md`) + แถวใหม่บน board `☐ todo` |
| กระทบ feature ที่ยัง `☐ todo` | แก้ brief เดิมตรง ๆ — ยังไม่ได้ build อะไร |
| กระทบ feature ที่ `🔨 in progress` | แก้ brief เดิม + ให้ผู้ใช้บันทึกว่า scope เปลี่ยนกลางทางผ่าน `/ugt-handoff` |
| กระทบ feature ที่ `✅ done` | **ห้ามแก้ brief เดิม** (มันคือประวัติ) — เขียน brief ใหม่เป็น change (`NN-<feature>-revision.md`, อ้าง `business-rules.md` สำหรับพฤติกรรมปัจจุบันแทนการลอกความเข้าใจระบบมาใหม่) + แถวใหม่บน board · ห้ามดึงแถวเดิมกลับจาก ✅ |

Cross-cutting: if the new requirement contradicts a recorded decision
(`docs/project-context/decisions.md`, or `DESIGN.md` §10 for design) —
surface the conflict with the decision's date and reason; never silently
build against a standing decision.

## Handoff

Close out with, in this order:

1. The feature list in build order (dependencies first)
2. Open questions to resolve with stakeholders **before** each affected
   feature, blockers flagged
3. The next-step sentence, ready to paste into a fresh session:

   ```
   สร้าง feature <ชื่อ> ตาม docs/requirements-brief/<file>
   ```

   which enters the normal superpowers pipeline (brainstorming → plan → TDD →
   review). One feature per session keeps context clean.
4. Remind: commit the brief, then `/ugt-handoff`.

### Orchestration decision — propose ONE build plan, confirmed once

Before closing, judge three signals and propose a single build plan in one
message — never a per-feature question, and never dispatch anything silently:

| Signal | Route |
| --- | --- |
| This session's context was already compacted, or heavy work remains | Continue in a **new session** (handoff + commit first) — never push on in a bloated session |
| ≥ 2 features whose board `Depends on` is empty **and** whose blocking Open Questions are cleared | Offer parallel: one fresh session + git worktree per feature |
| Features form a chain, or several touch the same tables | Sequential in dependency order; shared `schema.prisma` changes land first on the main branch, then the independent parts may parallelize |

Rules the plan must state out loud:

- A feature is always dispatched to a **fresh session**, never a subagent —
  the superpowers pipeline inside it dispatches its own implementer/reviewer
  subagents, and a subagent cannot dispatch further.
- A feature with an unresolved blocking Open Question is not dispatchable —
  resolving it with stakeholders is the plan's first step, not a footnote.
- Merging a finished feature back = **integration check only**: run the full
  test/lint suite after each merge and update the board via `/ugt-handoff` —
  the branch was already reviewed twice inside its own pipeline; do not
  re-review it.
- The user confirms the plan **once**; how many parallel sessions to actually
  open is theirs to trim (each one costs real tokens).

## Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| Ask where the docs are if `docs/requirements/` is missing | Scan the whole repo guessing |
| List unreadable files as `unread` in Sources | Skip them silently or invent their contents |
| Promote every conflict between documents to an Open Question | Pick one version silently |
| Mark inferences `(assumption)` | Present guesses as documented facts |
| Ask before touching an existing brief | Regenerate over it silently |
| Write the brief in Thai | Mix in English prose (identifiers/table names stay as-is) |
| Stop at the handoff | Start designing or coding the first feature |
| One orchestration plan, confirmed once | Dispatch features silently, or interrogate the user per feature |

## Verification

Before closing out, confirm:

- [ ] `00-overview.md` has all seven sections, none empty
- [ ] Every feature file has an Open Questions section ("ไม่มี" only if truly complete)
- [ ] Every file in the requirements folder appears in Sources — as read or `unread`
- [ ] Every conflict found while reading appears as an Open Question
- [ ] No unmarked assumptions — check the brief for claims no source backs
- [ ] Feature dependency references match the overview table
- [ ] `docs/project-context/board.md` has one `☐ todo` row per feature file
