# Changelog — ugt-nextjs-standard

## 2.0.0 (2026-08-09)

- Records the new dependency floor after the v3.0 naming + knowledge-architecture
  release: `ugt-nextjs-platform` 3.0.0 (which depends on `ugt-core` 2.0.0).
  No dependency-list change in this manifest — but the bundle now delivers the
  renamed skills (`ugt-nextjs-full-setup`, `ugt-nextjs-test-lint-setup`,
  `ugt-handoff`, `ugt-model-mode`) plus the new `ugt-context` /
  `docs/project-context/` knowledge base. Existing projects: follow the
  migration steps in ugt-nextjs-platform 3.0.0's CHANGELOG.
- The 1.3.0 note about `domain-modeling` writing to `project-notes.md` now
  reads against `docs/project-context/` (project-notes was dissolved in 3.0.0)
  — the rejection stands for the same one-home-per-knowledge reason.

## 1.3.0 (2026-08-03)

- Add `frontend-design@claude-plugins-official` (Anthropic) as a fourth
  dependency. The stack ships Tailwind but the platform had no guidance on
  design quality, so new UI defaulted to generic AI aesthetics. Nothing in
  the bundle overlaps with it. No `extraKnownMarketplaces` entry needed —
  `claude-plugins-official` is auto-registered.

`mattpocock-skills` was evaluated for `grilling` / `domain-modeling` and
**rejected**, recorded here so it isn't re-proposed:

- `grilling` is a strict subset of superpowers' `brainstorming` — the
  one-question-at-a-time interview is step 3 of brainstorming's 9-step
  checklist, which additionally writes a spec file, self-reviews it, and gates
  implementation behind user approval.
- `domain-modeling` is the one genuine gap, but it writes its glossary and
  decisions to root `CONTEXT.md` + `docs/adr/`, which duplicates the
  `## Deviations` / `## Open Questions` sections this platform already
  installs in `.claude/state/project-notes.md`. Two homes for the same
  knowledge is exactly what the README's triage table forbids.
- The rest of the plugin (~21 skills, all loading their descriptions every
  session) duplicates superpowers on `tdd`, `code-review`, `diagnosing-bugs`
  and `writing-great-skills`.

## 1.2.0 (2026-07-29)

- Records the new dependency floor after the `ugt-core` split:
  `ugt-nextjs-platform` is now v2.0.0 and itself depends on `ugt-core` v1.0.0.
  No dependency change in this manifest — core flows through the platform.

## 1.1.0 (2026-07-28)

- Add `skill-creator@claude-plugins-official` as a third dependency, so every
  machine that installs the bundle can build project-local skills
  (`.claude/skills/<new-name>/`) to the same standard the platform itself was
  built and evaluated with. Project skills must not shadow `ugt-*` names — see
  the knowledge-triage table in the installed CLAUDE.md block.

## 1.0.0 (2026-07-27)

- First release: bundle of `ugt-nextjs-platform` +
  `superpowers@claude-plugins-official`.
