---
name: ugt-eval
description: >
  The project's own eval suite — real tasks from this repo's recent work, each
  run as a headless Claude Code session (`claude -p`) in a throwaway copy of
  the working tree, then checked deterministically (files, final answer,
  commands). Proves that a change to CLAUDE.md, `.claude/rules/`, REVIEW.md, a
  hook or a plugin update did not make Claude worse at this project's real
  work. Use when the user says "/ugt-eval", "ทำ eval ของโปรเจค", "เพิ่ม eval
  case", "รัน eval", "แก้ CLAUDE.md แล้ว Claude ยังทำถูกไหม", "หลังอัปเดต plugin
  เช็คหน่อย", when Claude made the same mistake twice in this project, after a
  production incident is fixed, or when the same review finding shows up
  twice. Not for testing app code (→ the project's unit tests) or evaluating a
  platform plugin (→ `claude plugin eval` in the platform repo).
---

# UGT Eval — the project's real tasks, re-run on every harness change

## Why

CLAUDE.md, rules, skills and hooks change what Claude does — and a change that
fixes one task quietly breaks another. Unit tests can't see that. This suite is
20–50 **real tasks from this project**, re-run whenever the harness changes, so
"Claude still does our work right" is a measurement, not a feeling.

It runs the **real** thing: `claude -p` in a copy of the working tree, so this
repo's CLAUDE.md, `.claude/rules/`, REVIEW.md and the user-scope platform
plugins (skills + hooks) all load exactly as in a developer's session.

## Files

| Path | Owner | Notes |
| --- | --- | --- |
| `evals/claude/run.mjs` | platform (copy of `assets/run.mjs`) | replaced whole on re-install — never edit in the project |
| `evals/claude/cases/<name>.json` | the team | one case per file, committed |
| `evals/claude/results/` | runner | gitignored |

`evals/claude/` is never copied into the run, so the agent can't read the checks.

## Mode 1 — install (no `evals/claude/run.mjs` yet, or it differs from the asset)

1. Copy `assets/run.mjs` (this skill's folder) to `evals/claude/run.mjs` — replace it if it exists.
2. Create `evals/claude/cases/`; copy `assets/example.json.example` there as a
   format reference (the `.example` suffix keeps the runner from running it).
3. Add `evals/claude/results/` to `.gitignore`.
4. Needs Node 18+ and `claude` on PATH. Say so if either is missing — don't install them.
5. Go straight to Mode 2 if the user has a task in mind; an empty suite proves nothing.

## Mode 2 — add a case from real work

A case is worth adding when it came from something that **actually happened**:

| Source | Example |
| --- | --- |
| Claude made the same mistake twice here | read `process.env` directly · put a column name that is a T-SQL reserved word |
| The same review finding came up twice | server action without permission check |
| A production incident was fixed | the dev bar showed on prod after a deploy |
| A rule in CLAUDE.md / REVIEW.md you rely on | soft delete via `IsDeleted` |

Write `evals/claude/cases/<kebab-name>.json`:

```json
{
  "prompt": "<the request in a teammate's words, Thai as they'd type it>",
  "tools": ["Read", "Glob", "Grep", "Write", "Edit"],
  "model": "sonnet",
  "budgetUsd": 2,
  "timeoutSeconds": 900,
  "checks": [
    { "file": "lib/x.ts", "contains": "regex" },
    { "file": "lib/x.ts", "notContains": "regex" },
    { "file": "tmp.txt", "exists": false },
    { "answer": "regex" },
    { "answerNot": "regex" },
    { "run": "npx vitest run lib/x.test.ts" }
  ]
}
```

Only `prompt` and `checks` are required. Rules for checks:

- **Deterministic only** — no LLM judge. A check that sometimes passes on the
  same output is worse than none.
- **Check the outcome, not the wording**: files and commands first; `answer`
  only for things that must be said (a warning, a refused action).
- `notContains` on a file that was never written passes — pair it with a
  `contains` on the same file when the file must exist.
- Regex is JS, multiline (`^`/`$` per line). Prefer `[.]` over `\\.` — JSON
  escaping of backslashes is the commonest broken case.
- `run` executes in the copy after Claude finishes (shell, 5-minute limit,
  `node_modules` is linked from the repo). Exit 0 = pass. Add `"Bash"` to
  `tools` only when the **task** needs a shell, not for the check.
- No secrets anywhere: `.env*` files are gitignored, so the copy never has
  them — a case that needs a live DB/SSO doesn't belong here.

Before committing a new case, **run it once** (Mode 3 with its name) and make
sure it fails for the right reason when you break the rule on purpose — or at
least that every check passes for the right reason.

## Mode 3 — run

```bash
node evals/claude/run.mjs                  # every case
node evals/claude/run.mjs env- auth-       # cases whose name starts with these
node evals/claude/run.mjs --keep           # keep the copies to inspect
node evals/claude/run.mjs --model sonnet   # one model for all cases
```

Run it (with a shell) or tell the user the command (without one). **When**:
after editing CLAUDE.md, `.claude/rules/`, REVIEW.md, a project skill or hook ·
after `/plugin update` · before merging a harness change. Each case is a real
session and costs real money — report the total the runner prints.

Read a failure before blaming the change: open the kept copy (`--keep`) and
the case. A case that fails on an unchanged harness is flaky — fix the check
or delete the case; a flaky suite gets ignored.

## Not in scope

- Running the suite in Jenkins: needs the `claude` CLI and an API key on the
  agent — an admin decision, never set up from here.
- Testing app behaviour — that is the project's unit tests; a `run` check may
  call them, but the case exists to test **Claude**, not the code.
