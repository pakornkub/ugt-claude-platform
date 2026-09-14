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
