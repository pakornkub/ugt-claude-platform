# Contract — Harness mechanism (stack-agnostic)

The mechanism every `ugt-<stack>-setup` skill installs into a target project so
org knowledge survives the session that installed it. The *content* is per
stack; this mechanism is shared.

> **Maintenance:** editing this file? `grep` the stack platforms for restated
> text and update it too — currently `ugt-nextjs-platform`'s
> `ugt-nextjs-setup` (installs the harness: CLAUDE-block, state assets,
> verify.mjs) and `ugt-core`'s own `ugt-mode`/`ugt-checkpoint` skills (own the
> `mode.md`/`checkpoint.md` rows). Bump the relevant plugin's `plugin.json`
> version and CHANGELOG when you do.

## Files and ownership

| File | Owner | Update rule |
| --- | --- | --- |
| `CLAUDE.md` — block between `<!-- ugt:start -->` … `<!-- ugt:end -->` | the stack platform | replaced wholesale on plugin update; **project content lives outside the markers and is never touched** |
| `.claude/rules/ugt-<stack>-*.md` | the stack platform | replaced wholesale; carry `paths:` frontmatter so the runtime loads them only when matching files are touched |
| `.claude/rules/<project>-*.md` | the project | never touched by the platform |
| `.claude/state/checkpoint.md`, `.claude/state/project-notes.md` | the team | **created once, never overwritten** — updated via `/ugt-checkpoint` |
| `.claude/state/mode.md` | the team | **created once** with the `default` preset — rewritten only via `/ugt-mode` |
| `.claude/settings.json` | shared | key-merge only (`extraKnownMarketplaces`, `enabledPlugins`, `permissions`); never rewritten |
| `.claude/logs/` | audit hooks | gitignored; `.claude/state/` is committed — never ignore `.claude/` wholesale |

## Rules

- `CLAUDE.md` stays under ~200 lines; the block imports team state via
  `@.claude/state/checkpoint.md` so it loads every session; path-bound content
  goes to rules files, not the block
- State files: `checkpoint.md` has fixed sections (In progress / Done / Next /
  Decisions-with-reasons); `project-notes.md` has exactly three (Error
  Patterns / Deviations / Open Questions); entries are dated; decisions carry
  the rejected alternative; no secrets (the files are committed)
- Committed state outranks Claude's machine-local auto memory on conflict
- `mode.md` routes **dispatched-work** model choice per task type — subagents
  and Agent Teams teammates alike (presets: `easy`/`default`/`god`, plus
  `auto` which judges per task at dispatch time); the main-loop model is the
  user's `/model` and is never switched by a skill

## Knowledge triage (3-way)

| Knowledge | Destination |
| --- | --- |
| True only for this project | `project-notes.md`, or a `.claude/rules/<project>-*.md` if path-bound |
| True for every project on the stack | PR to the platform repo → version bump → teams update |
| Personal preference | Claude's auto memory (machine-local) |

Never edit installed skill files (plugin cache is disposable), and never create
a `.claude/skills/` entry shadowing a platform skill name — extend under a new
name.

## Skill-authoring rules for stack platforms

- Skills are **self-contained**: no `${CLAUDE_PLUGIN_ROOT}` inside SKILL.md,
  no cross-plugin or cross-skill file references; verify scripts anchor at
  `process.cwd()` and fail (never pass) when expected files are missing
- Contract text from this directory is deliberately duplicated into stack
  skills, rendered in stack terms — these files are the canonical diff target;
  a repo-level drift check greps stack skills for the contract's threshold
  values
