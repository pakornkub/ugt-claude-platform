---
name: ugt-checkpoint
description: >
  Save or read the project's handoff state — `.claude/state/checkpoint.md`
  (what's done / in progress / next, plus decisions taken) and
  `.claude/state/project-notes.md` (Error Patterns, Deviations, Open Questions).
  Use at the END of any work chunk before the session ends, when the user says
  "บันทึกไว้", "จบงานแล้ว", "save state", "handoff", "checkpoint", or when a bug
  was just diagnosed and the fix is worth recording so the next session doesn't
  rediscover it. Also use when starting work and the checkpoint looks stale or
  contradicts what's actually in the code.
  These two files are committed, so they are the TEAM's memory — separate from
  Claude's own auto memory, which is machine-local and not shared.
  Don't use it to install anything (→ ugt-nextjs-setup) or to record a gotcha that is
  true for every project on this stack — that belongs in a PR to the platform
  repo, not in one project's notes.
---

# UGT Checkpoint — record state for the next session and for teammates

## Why these files exist when Claude already has auto memory

Auto memory (`~/.claude/projects/<repo>/memory/`) belongs to **one person's
machine** — the docs state it plainly: *"Auto memory is machine-local... Files
are not shared across machines"*. Anything the team must know together has to
live in files committed to the repo.

| Location | Contents | Visible to |
| --- | --- | --- |
| `.claude/state/checkpoint.md` | Current work state + decisions already taken | Everyone who clones the repo |
| `.claude/state/project-notes.md` | Error Patterns · Deviations · Open Questions | Everyone who clones the repo |
| auto memory | Personal preferences/habits of that machine's user | That person, that machine |

**On conflict, the committed files win** — auto memory may be stale or someone
else's.

## Writing the checkpoint (end of a work chunk)

1. Read the existing `.claude/state/checkpoint.md` first — **update it, never
   rewrite it from scratch.** Decision history has value.
2. Bring it up to date with reality, using this structure (keep every section;
   add or remove none):

```markdown
# Checkpoint

Last updated: YYYY-MM-DD

## In progress
- <work genuinely mid-flight, with the files touched halfway — or "Nothing in progress">

## Done (newest first)
- YYYY-MM-DD <what finished + the main files involved>

## Next
- <known upcoming work, in the order it should happen>

## Decisions taken (do not revisit without talking to the team)
- YYYY-MM-DD <what was decided> — **because** <reason> · rejected alternative: <what was not chosen>
```

3. Write things that are **traceable** — file names, function names, PR numbers;
   not "fixed the user page".
4. Every `Decision` entry needs **the reason + the rejected alternative** —
   otherwise someone re-litigates it in three months without knowing it was
   already weighed.
5. Skip anything git already records (diffs, commit names) — record only what
   cannot be read from the code.

## Writing project-notes (on hitting an error or an oddity)

`.claude/state/project-notes.md` has **3 fixed sections**, never more:

| Section | Contents | Good example |
| --- | --- | --- |
| **Error Patterns** | Symptom → cause → fix, for problems that already cost time | "`prisma generate` reports P1012 after adding a field → forgot to migrate first → run `migrate dev`, then `generate`" |
| **Deviations** | Places this project **intentionally** differs from the `ugt-*` standards, with the reason | "Table `LegacyEmp` has no audit columns because it is a view dumped from the legacy system" |
| **Open Questions** | Unanswered questions blocking work + who owes the answer | "Is the prod basePath `/hr` or `/hrms` — waiting on IT" |

## Where new knowledge goes — the 3-way triage

Before writing anything into `project-notes.md`, ask who the knowledge is true for:

| Knowledge | Goes to | Never do |
| --- | --- | --- |
| True only for this project | `project-notes.md` (or `.claude/rules/<project>-*.md` if it's a path-bound rule) | — |
| True for every project on this stack (Prisma/Keycloak/Jenkins gotcha) | **Open a PR against `ugt-claude-platform`**, then bump the version | Edit installed skill files — they live in the plugin cache, whose path changes on every update and gets deleted |
| A personal preference of the current user | Leave it to auto memory | Force it into committed files everyone else must carry |

**Never create `.claude/skills/ugt-<same-name>/` shadowing a platform skill** —
it works mechanically, but produces two diverging sets of knowledge with nobody
knowing which one is active. To extend, create a skill under a **new** name,
e.g. `.claude/skills/<project>-payroll-rules/`.

## Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| Read the existing file, then update | Rewrite the whole file (decision history lost) |
| Decisions carry reason + rejected alternative | A bare "decided to use X" |
| Reference real file/function names | Vague "improved the user page" |
| Stack-wide gotcha → PR to the platform | Keep it in one project and let others rediscover it |
| Date every entry | Undated entries (in a year nobody knows what still holds) |

## Verification

- [ ] `.claude/state/checkpoint.md` has all 4 sections and "Last updated" is today
- [ ] `.claude/state/project-notes.md` has the 3 fixed sections
- [ ] Every added entry is dated · every Decision has its reason
- [ ] No secrets / `.env` values in these files (they are committed)
- [ ] `CLAUDE.md` still imports `@.claude/state/checkpoint.md` (or the next session won't see it)
