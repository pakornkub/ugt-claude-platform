# Changelog — ugt-core

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
