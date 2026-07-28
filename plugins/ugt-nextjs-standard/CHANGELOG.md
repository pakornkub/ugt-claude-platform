# Changelog — ugt-nextjs-standard

## 1.1.0 (2026-07-28)

- Add `skill-creator@claude-plugins-official` as a third dependency, so every
  machine that installs the bundle can build project-local skills
  (`.claude/skills/<new-name>/`) to the same standard the platform itself was
  built and evaluated with. Project skills must not shadow `ugt-*` names — see
  the knowledge-triage table in the installed CLAUDE.md block.

## 1.0.0 (2026-07-27)

- First release: bundle of `ugt-nextjs-platform` +
  `superpowers@claude-plugins-official`.
