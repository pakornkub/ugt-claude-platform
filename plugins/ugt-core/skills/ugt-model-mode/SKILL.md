---
name: ugt-model-mode
description: >
  Read or switch the project's model mode — the committed preset
  (`.claude/state/model-mode.md`) that decides which Claude model
  (fable/opus/sonnet/haiku) each task type gets when work is dispatched to a
  subagent or an Agent Teams teammate. Use when the user says "/ugt-model-mode",
  "เปลี่ยนโหมด", "โหมดประหยัด", "ประหยัด token", "โหมด god", "อัดคุณภาพเต็มที่",
  "โหมด auto", "เลือกความแรงตามงาน", asks which mode is active, or complains the
  setup spends too many (or too few) tokens for the job. Do NOT use to change
  the main session model — that is /model, which only the user can run. Formerly
  ugt-mode.
---

# UGT Model Mode — per-task-type model routing for subagents

## Overview

One committed file, `.claude/state/model-mode.md`, tells every session which model to
pass when dispatching work — a subagent (superpowers pipeline or direct Agent
call) or an Agent Teams teammate at spawn; the decision point is the same
either way. Three fixed presets trade cost against quality; a fourth, `auto`,
judges per task instead. **New projects ship with `auto`** (the full-setup
skill creates the file that way); the fixed presets are opt-in via this skill.

Two things the file makes every session do, whatever the preset:

1. **Pick the model per task type** from the table (or, in `auto`, from the
   rules) and pass it as `model:` at dispatch.
2. **Show the dispatch plan before the first spawn** of a work chunk — one
   line per subagent/teammate: what it does · task type · model (· in
   `auto`, the signal that decided). See "Dispatch plan" below.

**Hard limit to state up front:** this affects **dispatched work only**
(subagents and teammates). The main
session model is chosen by the user with `/model`; no skill can switch it
per task, so never claim otherwise — if the user wants the main model changed,
tell them to run `/model`.

## The three fixed presets

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

## The `auto` preset — per-task judgment

`auto` keeps the same task-type rows but replaces fixed models with rules the
dispatcher applies per task. Judge on exactly three signals: **ambiguity** of
the request, **blast radius** (files/modules touched), and **risk domain**
(auth, money, concurrency). No more signals than that — the dispatcher is an
LLM, not a rule engine.

| Task type | `auto` rule |
| --- | --- |
| Plan / analyze / understand requirements | fable if ambiguous or cross-module, else opus |
| Write code (feature work) | sonnet; opus if risk domain or >5 files |
| Review code | never weaker than the model that wrote it; fable when in doubt |
| Diagnose a bug (root cause unknown) | fable |
| Fix a bug (root cause known) | sonnet |
| Run tests / verify scripts (mechanical) | haiku |
| Docs / light edits | haiku |

The judgment happens **at dispatch time, in the session**. `auto` never
rewrites `model-mode.md` per task and never switches presets by itself — switching
presets is always a human command. All three design invariants above still
bind the judgment.

## Precedence vs superpowers' own model advice

`superpowers:subagent-driven-development` carries its own "Model Selection"
section. When both apply to a dispatch, **this file wins** — it is the
project's committed standard, and CLAUDE.md-level instructions take
precedence over skill text. SDD's guidance still fills the gaps where this
table is silent (e.g. turn-count-beats-token-price, fix-loop escalation).
For heavy feature-building phases, `auto` is the preset whose logic matches
SDD's per-task judgment best — it is what new projects start on; if a team
switched to a fixed preset and then starts building features with real risk
domains, suggest going back to `auto`.

## Dispatch plan — show it before spawning

The table decides the model, but the user only sees the decision if the
session says it out loud. So, in every preset, **before the first dispatch of
a work chunk** (an SDD plan, a review round, an ad-hoc "go check X"), print a
short plan and then proceed — do not wait for a confirmation unless the user
objects or asks to be asked:

```markdown
Dispatch plan (mode: auto)
| # | Work | Task type | Model | Why |
| --- | --- | --- | --- | --- |
| 1 | Implement task 1 — add `Requests` Prisma model + migration | Write code | sonnet | 2 files, no risk domain |
| 2 | Implement task 2 — permission check on `updateStatus` action | Write code | opus | risk domain: auth |
| 3 | Spec review + code review of 1–2 | Review code | fable | never weaker than the coder |
| 4 | Run `npm run test:coverage` | Mechanical | haiku | — |
```

Rules:

- **One table per batch, not per spawn** — a multi-task plan gets one table
  for the whole batch; a single ad-hoc dispatch gets one line in the same
  shape (`Work · Task type · Model · Why`). Re-print only the rows that
  changed if the plan changes mid-batch (e.g. a fix-loop escalation).
- **`Why` names the signal**: in `auto` it is the ambiguity / blast-radius /
  risk-domain reading that picked the model; in a fixed preset it is just the
  preset name (`default table`). A row that omits `model:` says `inherit`.
- **The plan is a preview, not a new decision point** — it never rewrites
  `model-mode.md`. If the user answers "ใช้ opus แทน" the override applies to
  that batch only; a lasting change is still `/ugt-model-mode <preset>`.
- Subagents themselves cannot dispatch further, so the plan is always printed
  by the main session (or the Agent Teams lead).

## Switching mode

On "/ugt-model-mode <preset>" (or an equivalent phrase — "โหมดประหยัด" = `easy`,
"โหมด god"/"อัดคุณภาพ" = `god`, "เลือกความแรงตามงาน"/"โหมด auto" = `auto`):

1. Rewrite `.claude/state/model-mode.md` **wholesale** — for `easy`/`default`/`god`
   use the fixed template below, substituting the Model column from the chosen
   preset's column; for `auto` use the auto template below it verbatim. This
   file is skill-owned — wholesale rewrite is correct here (unlike
   handoff.md).
2. Confirm to the user: the new mode, and that it applies from the next
   subagent dispatch (no restart needed — the file is re-read via the
   CLAUDE.md `@` import each session, and current-session dispatches should
   follow the new table immediately).
3. Remind them it is committed — the whole team gets it on pull.

Fixed template (`<mode>` = preset name, model column from the table above):

```markdown
# Model Mode

<!-- Owned by /ugt-model-mode — switch with `/ugt-model-mode easy|default|god|auto`, never edit by hand. -->

Current mode: **<mode>**

When dispatching a subagent or spawning a teammate (superpowers pipeline,
Agent tool, or Agent Teams), pass `model:` by task type:

| Task type | Model |
| --- | --- |
| Plan / analyze / understand requirements | <model> |
| Write code (feature work) | <model> |
| Review code | <model> |
| Diagnose a bug (root cause unknown) | <model> |
| Fix a bug (root cause known) | <model> |
| Run tests / verify scripts (mechanical) | haiku |
| Docs / light edits | haiku |

- **This table wins over model advice inside any skill** — including the
  "Model Selection" section of `superpowers:subagent-driven-development`:
  this file enters context through the CLAUDE.md import, and CLAUDE.md-level
  instructions take precedence over skill text.
- superpowers role → task type: brainstorming / writing-plans research →
  Plan · SDD implementer → Write code (or Fix a bug when the root cause is
  known) · SDD spec reviewer + code reviewer → Review code ·
  systematic-debugging → Diagnose · running verify/test scripts → mechanical.
- **Show the dispatch plan before the first spawn of a work chunk** — one
  table for the batch (one line for a single dispatch): `Work · Task type ·
  Model · Why` (Why = `<mode> table`), then proceed; pause only if the user
  objects. Overrides the user gives there apply to that batch only.
- Dispatched work only — the main session model is the user's `/model`; never switch it.
- Task type not listed → omit `model:` (the subagent inherits the session model).
```

Auto template (used verbatim for `/ugt-model-mode auto`):

```markdown
# Model Mode

<!-- Owned by /ugt-model-mode — switch with `/ugt-model-mode easy|default|god|auto`, never edit by hand. -->

Current mode: **auto**

When dispatching a subagent or spawning a teammate (superpowers pipeline,
Agent tool, or Agent Teams), judge each task on ambiguity, blast radius
(files/modules touched), and risk domain (auth/money/concurrency), then pass
`model:` by these rules:

| Task type | Model rule |
| --- | --- |
| Plan / analyze / understand requirements | fable if ambiguous or cross-module, else opus |
| Write code (feature work) | sonnet; opus if risk domain or >5 files |
| Review code | never weaker than the model that wrote it; fable when in doubt |
| Diagnose a bug (root cause unknown) | fable |
| Fix a bug (root cause known) | sonnet |
| Run tests / verify scripts (mechanical) | haiku |
| Docs / light edits | haiku |

- **This table wins over model advice inside any skill** — including the
  "Model Selection" section of `superpowers:subagent-driven-development`:
  this file enters context through the CLAUDE.md import, and CLAUDE.md-level
  instructions take precedence over skill text.
- superpowers role → task type: brainstorming / writing-plans research →
  Plan · SDD implementer → Write code (or Fix a bug when the root cause is
  known) · SDD spec reviewer + code reviewer → Review code ·
  systematic-debugging → Diagnose · running verify/test scripts → mechanical.
- **Show the dispatch plan before the first spawn of a work chunk** — one
  table for the batch (one line for a single dispatch): `Work · Task type ·
  Model · Why` (Why = the ambiguity / blast-radius / risk-domain reading that
  picked the model), then proceed; pause only if the user objects. Overrides
  the user gives there apply to that batch only.
- Dispatched work only — the main session model is the user's `/model`; never switch it.
- Judge at dispatch time; never rewrite this file per task.
- Task type not listed → omit `model:` (the subagent inherits the session model).
```

## Reading mode

"โหมดตอนนี้คืออะไร" / "/ugt-model-mode" with no argument → read
`.claude/state/model-mode.md` and report the `Current mode:` line plus its table.
File missing → **check for the legacy name first** (below); only when neither
file exists, say no mode is set (dispatches inherit the session model) and
offer `/ugt-model-mode auto` to create it (the preset new projects ship with).

## Legacy v2.x layout (`mode.md`)

If `.claude/state/model-mode.md` is missing but `.claude/state/mode.md`
exists, that is the v2.x name (the skill was `/ugt-mode` then) — never report
"no mode set" over it. Migrate before doing anything else:

1. Read the old file's `Current mode:` line.
2. Write `.claude/state/model-mode.md` wholesale from the current template
   for that mode (this also delivers the precedence + role-mapping lines the
   old template lacked), then delete `.claude/state/mode.md`.
3. In the project's `CLAUDE.md`, change the import `@.claude/state/mode.md`
   → `@.claude/state/model-mode.md`, and `/ugt-mode` → `/ugt-model-mode`
   inside the same block if present.
4. Tell the user what was migrated and that both files are committed.

## Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| Rewrite `model-mode.md` wholesale from the template | Hand-edit single rows (drifts from every preset) |
| Point the user to `/model` for the main session | Claim the mode changed the main-loop model |
| Keep haiku on mechanical rows in every preset | "Upgrade" verify-script runs to an expensive model |
| Let `auto` judge in-session at dispatch time | Rewrite `model-mode.md` per task or auto-switch presets |
| Print the dispatch plan (Work · Task type · Model · Why) before the first spawn of a batch | Spawn silently, or stop for a confirmation the user did not ask for |
| Leave `handoff.md` / `docs/project-context/` alone | Record the switch in `decisions.md` (it's config, not history) |

## Verification Checklist

- [ ] `.claude/state/model-mode.md` has a `Current mode: **easy|default|god|auto**` line
- [ ] Fixed preset: the table's non-mechanical rows match that preset's column
      exactly · `auto`: the table matches the auto template's rules verbatim
- [ ] The two mechanical rows still say `haiku`
- [ ] The "Show the dispatch plan before the first spawn" bullet is present
- [ ] No other file was touched
