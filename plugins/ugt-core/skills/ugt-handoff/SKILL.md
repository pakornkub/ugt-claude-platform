---
name: ugt-handoff
description: >
  Close out a work chunk by writing every result into its correct home:
  work state → `.claude/state/handoff.md` (what's in progress / next / open
  questions / recent done), feature status → `docs/project-context/board.md`,
  changed knowledge → the affected `docs/project-context/` files
  (architecture / business-rules / api / troubleshooting), and decisions →
  `docs/project-context/decisions.md` (append-only). Use at the END of any
  work chunk before the session ends — even when the same person continues
  tomorrow — when the user says "บันทึกไว้", "จบงานแล้ว", "save state",
  "handoff", "checkpoint", when a feature just finished (board + as-built
  rules must update), or when a bug was just diagnosed and the fix is worth
  recording so the next session doesn't rediscover it. Also use when starting
  work and the handoff file looks stale or contradicts the code.
  These files are committed, so they are the TEAM's memory — separate from
  Claude's machine-local auto memory. Don't use it to record a DESIGN decision
  (color, font, layout, component choice — "บันทึกมติ design"): those live in
  `docs/DESIGN.md` §10 and belong to the stack's design skill, not here.
  Don't use it to install anything (→ ugt-<stack>-full-setup), to bootstrap
  `docs/project-context/` the first time (→ ugt-context), or to record a
  stack-wide gotcha — that belongs in a PR to the platform repo.
  (เดิมชื่อ ugt-checkpoint)
---

# UGT Handoff — close the chunk, file every result where it belongs

## The two homes

| Home | Nature | Loaded |
| --- | --- | --- |
| `.claude/state/handoff.md` | **ของสด** — work state, changes weekly, deleted when resolved | every session (CLAUDE.md import) — keep ~60 lines |
| `docs/project-context/` | **ความรู้** — what the system is, grows with the project | on demand (only `00-index.md` is always loaded) |

Auto memory (`~/.claude/projects/...`) is one person's machine. Anything the
team must share lives in these committed files — **on conflict, committed
files win**.

## Step 1 — update the handoff file (every run)

Read the existing `.claude/state/handoff.md` and bring it up to date. Fixed
sections — keep all four, add none:

```markdown
# Handoff

Last updated: <YYYY-MM-DD>

## In progress
- <work genuinely mid-flight, with the files touched halfway — or "Nothing in progress">

## Next
- <upcoming work in order — including non-feature work: waiting on admin values, pending upgrades>

## Open Questions
- <question blocking work + who owes the answer — delete the row once answered>

## Done (newest first — keep only ~10; older history lives in git and board.md)
- YYYY-MM-DD <what finished + the main files involved>
```

Entries are **traceable** (file names, function names, PR numbers — not
"fixed the user page") and dated. No secrets — the file is committed.

## Step 2 — fan out this chunk's results (only the rows that apply)

| What happened this chunk | Write to | How |
| --- | --- | --- |
| A feature's status changed | `docs/project-context/board.md` | update **only** the สถานะ column (`☐` `🔨` `⏳ — <รออะไร>` `✅`). This skill is the board's only writer after row creation |
| A feature reached `✅ done` | `docs/project-context/business-rules.md` | summarize the **as-built** rules (including what changed from the brief along the way) under its domain, each rule pointing at `path:function`. The feature's brief in `docs/requirements-brief/` is now frozen history |
| Structure changed (new module, table, flow) | `docs/project-context/architecture.md` | update the affected section — pointers, not prose; deviations get `⚠ deviation:` + reason + date |
| Endpoint added/changed/removed | `docs/project-context/api.md` | keep the table current |
| A decision was taken | `docs/project-context/decisions.md` | **append**: `- YYYY-MM-DD <what> — **because** <reason> · rejected: <alternative>`. Never edit old entries — reversing = new entry referencing the old. **Design decisions go to `docs/DESIGN.md` §10 instead**, never here |
| A bug that cost real time was diagnosed | `docs/project-context/troubleshooting.md` | `- **<อาการ>** → <สาเหตุ> → <วิธีแก้> (date)` — write while details are fresh |
| `00-index.md` rows no longer match reality | `docs/project-context/00-index.md` | fix the index |

Then **commit the whole set together** — handoff + context in one commit is
the atomic unit of "what this chunk did and what it taught us".

## Where new knowledge goes — the 4-way triage

| Knowledge | Goes to | Never do |
| --- | --- | --- |
| Work state (ค้างไหน คิวอะไร คำถามอะไร) | `handoff.md` | Let it rot in chat history |
| True only for this project | the matching `docs/project-context/` file, or `.claude/rules/<project>-*.md` if path-bound | — |
| True for every project on this stack | **PR against the platform repo** (a proven `troubleshooting.md` entry graduates into the stack's pitfalls skill — then delete it here), bump the version | Edit installed skill files (plugin cache is disposable) |
| Personal preference of the current user | auto memory | Force it into committed files |

**Never create `.claude/skills/ugt-<same-name>/`** shadowing a platform skill —
extend under a new name (e.g. `.claude/skills/<project>-payroll-rules/`).

## Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| Update the existing handoff file | Rewrite it from scratch |
| Done section capped ~10 — prune as you add | Let the always-loaded file grow unbounded |
| Decisions append-only, with reason + rejected alternative | Editing/deleting old decisions, or a bare "decided X" |
| Design decision → `DESIGN.md` §10 · everything else → `decisions.md` | A third home, or the same decision in two homes |
| Board: touch only the สถานะ column | Rewrite board rows (they belong to /ugt-requirements) |
| Feature done → as-built summary into business-rules.md | Leave the knowledge only in the frozen brief |
| Reference real file/function names | Vague "improved the user page" |
| Stack-wide gotcha → PR to the platform | Keep it in one project and let others rediscover it |
| Commit handoff + context changes together | Commit state but leave knowledge dirty |

## Verification

- [ ] `handoff.md` has exactly the 4 sections, "Last updated" is today, Done ≤ ~10 rows
- [ ] `docs/project-context/board.md` สถานะ agrees with handoff's In progress/Done
- [ ] Every decision taken this chunk is in `decisions.md` (or DESIGN.md §10 if design) with reason + rejected alternative
- [ ] Feature(s) that reached done this chunk have their rules in `business-rules.md`
- [ ] Every added entry is dated · every pointer names a real file
- [ ] No secrets / `.env` values in any of these files (they are committed)
- [ ] `CLAUDE.md` still imports `@.claude/state/handoff.md` and `@docs/project-context/00-index.md`
- [ ] One commit covers the whole set
