# Changelog — ugt-core

## 1.1.0 (2026-07-30)

New skill **`ugt-mode`** — per-task-type model routing for subagents via a
committed `.claude/state/mode.md` (presets `easy`/`default`/`god`; e.g.
default: plan/review/diagnose = fable, code/fix = sonnet, mechanical = haiku).
Invariants: planner/reviewer never weaker than the coder · diagnose and fix are
separate rows · verify-script runs stay haiku in every preset. Applies to
subagent dispatch only — the main session model remains the user's `/model`.

- `contracts/harness.md` — `mode.md` added to the file-ownership table
  (created once with `default`, rewritten only via `/ugt-mode`)
- The skeleton asset + CLAUDE-block import ship with `ugt-nextjs-platform`
  2.2.0 (its step 4); existing projects can just run `/ugt-mode default` once

Evals (skill-creator loop, 2026-07-30): trigger boundary
`evals/trigger-evals.json` — 20 queries × 3 judges = **60/60 primary** on
iteration 0 (all keyword traps held: "model รถยนต์" → pitfalls, "ประหยัด token
เวลาคุย" → none, "เปลี่ยน model หลัก" → /model). Functional
`evals/evals.json` — with-skill **9/9 assertions**; baseline also 9/9 *because
the fixture already contained the self-documenting `mode.md`* (the harness
asset carrying the knowledge is the design working as intended — baseline
matched the god preset only by inference, and took ~1.8× longer on the switch
case). The skill's value is guaranteeing exact preset tables + the /model
boundary without relying on that inference.

## 1.0.0 (2026-07-29)

First release — extracted from `ugt-nextjs-platform` v1.0.0 per
`docs/multi-stack-proposal.md` §1. Everything here moved verbatim or was
extracted from existing normative text; nothing was newly invented.

### Runtime pieces (installed, active)

- `skills/ugt-checkpoint/` — team-state handoff skill (moved verbatim; its
  name was deliberately left stack-unqualified in v1 for exactly this move)
- `hooks/hooks.json` + `scripts/audit-log.mjs` — metadata-only audit trail on
  `PostToolUse` / `PostToolUseFailure` / `InstructionsLoaded` (moved verbatim)

### Normative contracts (authoring-time — not loaded into any session)

- `contracts/database.md` — DB naming, audit columns, read-only/override rules
- `contracts/delivery.md` — 10-stage pipeline, branch model, Quality Gate
  thresholds, credential naming, secret rules
- `contracts/identity.md` — Keycloak realm/client policy, session policy,
  RBAC shape, guard order, mandatory audit events
- `contracts/harness.md` — the CLAUDE.md marker-block / rules / state /
  settings-merge mechanism
- `contracts/org-managed-settings.md` — IT hard-boundary deployment guide
  (moved from ugt-nextjs-setup/references/)

Stack platforms deliberately duplicate contract text inside their own skills
(self-containment rule); these files are the canonical source to diff against
when standards change.
