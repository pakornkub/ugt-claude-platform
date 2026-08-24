# Model Mode

<!-- Owned by /ugt-model-mode — switch with `/ugt-model-mode easy|default|god|auto`, never edit by hand. -->

Current mode: **default**

When dispatching a subagent or spawning a teammate (superpowers pipeline,
Agent tool, or Agent Teams), pass `model:` by task type:

| Task type | Model |
| --- | --- |
| Plan / analyze / understand requirements | fable |
| Write code (feature work) | sonnet |
| Review code | fable |
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
- Dispatched work only — the main session model is the user's `/model`; never switch it.
- Task type not listed → omit `model:` (the subagent inherits the session model).
