# Coding standards

<!-- Installed once by ugt-nextjs-full-setup (mattpocock bundle). mattpocock's
     /code-review Standards axis reads only this file / CONTRIBUTING.md — this
     is the pointer that makes the org standards visible to it. -->

The org standards for this stack live in the installed `ugt-nextjs-platform`
plugin and in this repo's path-bound rules. A review against "coding
standards" means all of these:

| Standard | Where |
| --- | --- |
| SonarQube clean-code rules (Quality Gate blocks on `new_violations = 0`) | skill `ugt-nextjs-clean-code` (auto-loads on `.ts`/`.tsx`) |
| Stack pitfalls that break the build | skill `ugt-nextjs-pitfalls` |
| Per-module rules — database, auth, design, CI, mail, upload | `.claude/rules/ugt-nextjs-*.md` (each declares the paths it governs) |
| Rules that break the build every time | `CLAUDE.md` § "Rules that break the build every time" |
| Design agreement (tokens, kit components, layout) | `docs/DESIGN.md` |

Project-specific additions go below this line.
