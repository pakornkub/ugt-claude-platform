---
name: ugt-mode
description: >
  Read or switch the project's model mode — the committed preset
  (`.claude/state/mode.md`) that decides which Claude model
  (fable/opus/sonnet/haiku) each task type gets when work is dispatched to a
  subagent. Use when the user says "/ugt-mode", "เปลี่ยนโหมด", "โหมดประหยัด",
  "ประหยัด token", "โหมด god", "อัดคุณภาพเต็มที่", asks which mode is active,
  or complains the setup spends too many (or too few) tokens for the job.
  Do NOT use to change the main session model — that is `/model`, which only
  the user can run.
---

# UGT Mode — per-task-type model routing for subagents

## Overview

One committed file, `.claude/state/mode.md`, tells every session which model to
pass when dispatching a subagent (the superpowers pipeline and direct Agent
calls both dispatch subagents). Three presets trade cost against quality.

**Hard limit to state up front:** this affects **subagents only**. The main
session model is chosen by the user with `/model`; no skill can switch it
per task, so never claim otherwise — if the user wants the main model changed,
tell them to run `/model`.

## The three presets

| Task type | `easy` | `default` | `god` |
| --- | --- | --- | --- |
| Plan / analyze / understand requirements | opus | fable | fable |
| Write code (feature work) | sonnet | sonnet | opus |
| Review code | opus | fable | fable |
| Diagnose a bug (root cause unknown) | opus | fable | fable |
| Fix a bug (root cause known) | sonnet | sonnet | opus |
| Run tests / verify scripts (mechanical) | haiku | haiku | haiku |
| Docs / light edits | haiku | haiku | haiku |

Design invariants (hold in every preset — keep them if the team ever adds one):

- **Planner and reviewer are never weaker than the coder** — a weak reviewer
  approving a strong coder's output is how bugs ship.
- **Diagnose ≠ fix.** Finding the root cause is the expensive half; executing a
  known fix is cheap. They get separate rows on purpose.
- **Mechanical work is always haiku** — running a verify script needs no
  judgment at any quality level.

## Switching mode

On "/ugt-mode <preset>" (or an equivalent phrase — "โหมดประหยัด" = `easy`,
"โหมด god"/"อัดคุณภาพ" = `god`):

1. Rewrite `.claude/state/mode.md` **wholesale** from the template below,
   substituting the Model column from the chosen preset's column. This file is
   skill-owned — wholesale rewrite is correct here (unlike checkpoint.md).
2. Confirm to the user: the new mode, and that it applies from the next
   subagent dispatch (no restart needed — the file is re-read via the
   CLAUDE.md `@` import each session, and current-session dispatches should
   follow the new table immediately).
3. Remind them it is committed — the whole team gets it on pull.

Template (`<mode>` = preset name, model column from the table above):

```markdown
# Model Mode

<!-- Owned by /ugt-mode — switch with `/ugt-mode easy|default|god`, never edit by hand. -->

Current mode: **<mode>**

When dispatching a subagent (superpowers pipeline or Agent tool), pass `model:`
by task type:

| Task type | Model |
| --- | --- |
| Plan / analyze / understand requirements | <model> |
| Write code (feature work) | <model> |
| Review code | <model> |
| Diagnose a bug (root cause unknown) | <model> |
| Fix a bug (root cause known) | <model> |
| Run tests / verify scripts (mechanical) | haiku |
| Docs / light edits | haiku |

- Subagents only — the main session model is the user's `/model`; never switch it.
- Task type not listed → omit `model:` (the subagent inherits the session model).
```

## Reading mode

"โหมดตอนนี้คืออะไร" / "/ugt-mode" with no argument → read
`.claude/state/mode.md` and report the `Current mode:` line plus its table.
File missing → say no mode is set (dispatches inherit the session model) and
offer `/ugt-mode default` to create it.

## Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| Rewrite `mode.md` wholesale from the template | Hand-edit single rows (drifts from every preset) |
| Point the user to `/model` for the main session | Claim the mode changed the main-loop model |
| Keep haiku on mechanical rows in every preset | "Upgrade" verify-script runs to an expensive model |
| Leave `checkpoint.md` / `project-notes.md` alone | Record the switch as a checkpoint Decision (it's config, not history) |

## Verification

- [ ] `.claude/state/mode.md` has a `Current mode: **easy|default|god**` line
- [ ] The table's non-mechanical rows match that preset's column exactly
- [ ] The two mechanical rows still say `haiku`
- [ ] No other file was touched
