# Review instructions

<!-- Seeded once by ugt-nextjs-full-setup — the team owns this file from here on;
     edit it freely, the platform never overwrites it.
     Review behaviour only (what to flag, how severe, what to skip) — project
     context belongs in CLAUDE.md.
     Claude Code Review (GitHub app) reads this file by itself, from the
     protected default branch. Every other reviewer (superpowers' code reviewer,
     mattpocock /code-review, the built-in /code-review, a review subagent) is
     told to read it by the ugt block in CLAUDE.md. -->

## What Important means here

Important = the change would break behaviour for a user, leak or corrupt data,
let someone act without permission, or block a deploy or rollback.
Naming, style and structure preferences are Nit at most.

## Review in three passes, in this order

1. **Bugs** — logic and edge cases: empty/null values, Thai text, dates and
   times in `Asia/Bangkok`, error paths that silently drop data, race
   conditions on approve/submit actions.
2. **Security** — every privileged Server Action or route runs
   session → permission → action → audit log, in that order · no
   `$queryRawUnsafe` / `$executeRawUnsafe` with user input · no secret or real
   credential anywhere in the diff (`.env*`, compose files, Jenkinsfile, tests)
   · uploaded files are served only through the permission-guarded download route.
3. **Org compliance** — new tables/columns follow the database rules (PascalCase
   `@@map`/`@map`, full audit columns, delete via `IsDeleted`, no T-SQL reserved
   word) · app code reads env through `@/lib/env`, never `process.env` · UI uses
   the kit components and `docs/DESIGN.md` tokens, not ad-hoc colours or spacing.

## Always check

- A migration that drops or renames a column holding data → Important; ask for
  the data-preserving path.
- A new page, route or Server Action with no permission check → Important.
- A behaviour change with no test that would fail on the old code → Important.
- The diff departs from the plan or spec it was built from → say where, and
  whether the departure looks intended.

## Cap the nits

Report at most five Nits per review. List findings most severe first, each with
a `file:line` citation.

## Do not report

- Anything the pipeline already enforces: ESLint, Prettier, `tsc`, the SonarQube
  Quality Gate (violations, duplication, coverage), the OWASP dependency check.
- Lockfiles, `.next/`, the generated Prisma client, and the formatting of
  generated migration SQL (its effect — drops, renames — is covered above).
- Kit files carrying a `// kit:` stamp that the diff does not change.

## Project-specific rules

<!-- Add this project's own review rules below. When the same review finding
     comes up twice, add it here so the next review catches it first time. -->
