# Changelog — ugt-nextjs-standard-mattpocock

## 1.0.0 (2026-08-31)

- First release: bundle of `ugt-nextjs-platform` +
  `mattpocock-skills@claude-plugins-official` (in place of `superpowers`) +
  `skill-creator@claude-plugins-official` + `frontend-design@claude-plugins-official`.
- **This reverses a prior decision.** `ugt-nextjs-standard` 1.3.0 evaluated
  and rejected `mattpocock-skills` — the disqualifying reason was that
  installing it *alongside* superpowers duplicated ~21 skill descriptions
  into every session's context, colliding with superpowers on `tdd`,
  `code-review`, `diagnosing-bugs`. That reason doesn't apply here: this
  bundle installs mattpocock-skills **instead of** superpowers, never both,
  so there is no description collision to duplicate. The other 1.3.0
  observation (`grilling` is a strict subset of `brainstorming`) still
  holds — it's not a reason to reject a cheaper alternative pipeline, only
  a reason it isn't a *strictly better* one. See
  `docs/superpowers/specs/2026-08-31-pipeline-bundle-choice-design.md`
  decision 2.10 for the full reasoning, and decision 2.11 for how this
  bundle's knowledge files (`CONTEXT.md`, `docs/adr/`, written by
  `grill-with-docs`/`domain-modeling`) relate to the org's
  `docs/project-context/` — they're separate, cross-referenced homes, not
  merged.
