---
name: ugt-nextjs-clean-code
description: >
  SonarQube clean-code rules for the org's TypeScript/React/Next.js stack —
  write code that passes the Quality Gate on the FIRST scan instead of fixing
  violations after the pipeline goes red. Covers the modern-JS idioms SonarQube
  enforces (S77xx/S65xx/S6xxx), `Readonly<>` props, the duplication strategy
  (refactor vs `sonar.cpd.exclusions`), and correct NOSONAR / `sonar.issue.ignore`
  placement. Load this BEFORE writing or editing any component, server action,
  validation schema, table, or hook — the gate blocks on `new_violations = 0`, so
  a single stray `parseInt` fails the build for the whole team.
  Use it explicitly too when someone says "sonar ไม่ผ่าน", "แก้ violation",
  "Quality Gate แดง", "โค้ดซ้ำเยอะ", or asks how to suppress a finding correctly.
  Don't use for Jenkins/SonarQube server or pipeline config (→ ugt-nextjs-cicd-setup).
paths:
  - "**/*.{ts,tsx}"
---

# UGT Clean Code — pass the Quality Gate on the first scan

The cheapest SonarQube fix is the violation never created — this is a
before-you-write checklist, not an after-the-fact repair manual.

## How the Quality Gate scores (read first)

The gate measures **new code only** (added/changed in this branch), per the org
standard:

| Condition | Threshold | What trips it |
| --- | --- | --- |
| `new_violations` | **= 0** | one small code smell blocks — there is no quota |
| `new_duplicated_lines_density` | **≤ 3%** | copy-paste — **NOSONAR does not work here** |
| `new_coverage` | **≥ 60%** | new code without tests |
| `new_security_hotspots_reviewed` | **= 100%** | hotspots not yet reviewed in the SonarQube UI |

Two of these must be thought about **while writing**, not while fixing:
`new_violations = 0` leaves no room for error, and duplication has no suppress
shortcut — design it out from the start.

## 1. Modern-JS idioms SonarQube enforces

Write the **left** column by default — the right one is what SonarQube flags.

| DO ✅ | DON'T ❌ | Rule |
| --- | --- | --- |
| `str.replaceAll('x', 'y')` | `str.replace(/x/g, 'y')` | S7781 |
| `Number.parseInt(v, 10)` / `Number.parseFloat(v)` | `parseInt(v, 10)` / `parseFloat(v)` | S7773 |
| `globalThis.location` / `globalThis.addEventListener('click', …)` | `window.location` / `self.…` / `global.…` | S7764 |
| `x === undefined` | `typeof x === 'undefined'` | S7741 |
| `arr.at(-1)` | `arr[arr.length - 1]` | S7755 |
| `Math.max(0, x)` | `x > 0 ? x : 0` | S7766 |
| `a ?? b` | `a !== null ? a : b` | S6606 |
| `a \|\| b` (or `a ?? b` when `a` may be `0`/`''`) | `a ? a : b` | S6644 |
| flip the branches → positive condition | `if (!notReady)` in a ternary | S7735 |
| `catch (error)` (nested: `catch (error_)`) | `catch (problem)` / `catch (failure)` — any name outside the allowed set | S7718 |
| remove the assertion | `value as Foo` where TS already narrows | S4325 |
| delete the dead expression | `void someExpr;` | S3735 |

**Two rows people over-apply — don't "fix" what the rule already allows:**

- **S7764** (`unicorn/prefer-global-this`) **exempts `typeof` existence
  checks**: the SSR guard `typeof window !== 'undefined'` is *fine as written*
  — rewriting it to `globalThis.window !== undefined` buys nothing. S7741
  doesn't flag it either (`no-typeof-undefined` leaves global variables alone
  by default). The rule also allows genuinely window-specific APIs
  (`window.innerWidth`/`innerHeight`, `resize`/`load`/`unload` listeners).
- **S7718** (`unicorn/catch-error-name`) wants the name `error`, but its
  default ignore list already permits **`e`, `ex`, anything ending in `err`,
  anything ending in `exception`, `cause`, `reason`, and any `_`-prefixed
  name**. So `catch (e)` and `catch (err)` do **not** raise an issue — only a
  name outside that set does (`catch (problem)`). Write `error` for
  consistency; never open a PR just to rename `e` → `error`.

**Component / type rules:**

| Rule | Requirement |
| --- | --- |
| S6759 | Wrap every function-component prop type in `Readonly<>` — inline objects, named interfaces, and `React.ComponentProps<…>` alike |
| S3863 | Never import twice from the same module — merge into one statement |
| S1874 | No deprecated APIs · Zod v4: `z.flattenError(err)` not `err.flatten()`, `z.iso.datetime()` not `z.string().datetime()` |
| S3776 | Cognitive complexity ≤ 15 — extract helpers from deeply nested/branchy functions |

**S6759 exception**: a TanStack Table cell renderer must use
`Readonly<CellContext<TRow, unknown>>` — the value generic is `unknown` at the
column level.

## 2. Duplication — the most frequent blocker, and unsuppressable

About to copy a block? Stop and pick one lever:

**A. Refactor (default — when DRY improves readability):**

- Two Zod schemas share fields/refinements → extract shared field consts +
  predicate functions (type the shared `superRefine` ctx as
  `z.core.$RefinementCtx`) · a `.refine()` options `path` must stay a mutable
  `PropertyKey[]` — no `as const`
- Components differing only in config (endpoint, labels, body) → one component
  taking those as props
- Twin dialogs/forms sharing schema + fields → a shared schema module +
  `<Fields form={form} />`
- Server actions repeating guard/notify/create blocks → extract `loadX`,
  `notifyX`, `createX` helpers

**B. `sonar.cpd.exclusions` (when forcing DRY makes it worse):** type-safe CRUD
tables sharing structure but differing in generic row type, content-only modal
bodies over a shared shell, DataTable variants, per-resource API-route guards —
add the path to `sonar-project.properties` **with a comment explaining why the
duplication is intentional**.

> The line: if unifying the copies needs `any`/casts or a 5-param config object
> harder to read than the copies → exclude. Otherwise → refactor.

## 3. Suppressing genuine false positives correctly

### NOSONAR must sit on the **same line** as the flagged code

```ts
// ✅ same line as the arrow/declaration SonarQube reports
cell: ({ row }) => <RiskCell row={row} />, // NOSONAR typescript:S6478 — TanStack renderer
export function Wizard() { // NOSONAR typescript:S3776 — cohesive state machine

// ❌ next line / JSX block comment → suppresses nothing
header: () => (
  // NOSONAR …          ← wrong: the issue is on the `() => (` line above
{/* NOSONAR … */}       ← wrong: a JSX block comment sits on its OWN line,
                           which is never the line the issue is reported on
```

Two things NOSONAR does **not** do:

- **It is not per-rule.** `// NOSONAR typescript:S106` suppresses **every**
  issue on that line — the rule key is just prose for the next reader, Sonar
  ignores it. If a line carries two findings and you meant to keep one, split
  the line or use `sonar.issue.ignore` instead.
- **It is not a block comment problem.** NOSONAR works fine inside `/* … */`;
  what fails above is *placement* — the marker must land on the same line the
  issue is reported on, and a `{/* … */}` line in JSX never is.

### Systematic false positives → `sonar.issue.ignore.multicriteria`

When one rule fires across a whole file/glob because of a library pattern
(TanStack column renderers, react-day-picker slot overrides, RHF render props),
suppress once in `sonar-project.properties` instead of scattering fragile
per-line NOSONARs:

```properties
sonar.issue.ignore.multicriteria=s6478tables,s4144ot
sonar.issue.ignore.multicriteria.s6478tables.ruleKey=typescript:S6478
sonar.issue.ignore.multicriteria.s6478tables.resourceKey=**/*table*.tsx
sonar.issue.ignore.multicriteria.s4144ot.ruleKey=typescript:S4144
sonar.issue.ignore.multicriteria.s4144ot.resourceKey=**/ot-approval-list.tsx
```

Library false positives worth glob-ignoring: **S6478** (inline component) on
`*table*`, `*-tab`, `*-list`, `calendar` · **S4144** (identical implementation)
on generic-type variant components · **S6848 / S1082** (a11y) on UI primitives
delegating ARIA to a parent.

`console.*` in fire-and-forget catch blocks → `// NOSONAR typescript:S106`
on the same line (the `typescript:S106` half is a comment for humans — the
marker still silences the whole line).

**Before suppressing, check the rule is even active.** Not every rule cited
here ships in the built-in **Sonar way** profile — S106, S4325, S7735 and
S7764 are the ones to verify — so whether a finding blocks the gate depends on
the Quality Profile your SonarQube project uses. Look at
`Project → Quality Profiles` first: a suppression for a rule that never fires
is dead weight, and a rule you assumed was off may be the thing turning the
gate red.

## Verification Checklist

**Run the script first** (cwd = project root) — by default it checks only files
changed vs HEAD, which matches what the gate measures (new code); add `--all`
to scan the whole project:

```bash
node <skill-dir>/scripts/verify.mjs
```

- [ ] No `parseInt` / `.replace(/…/g)` / `typeof … 'undefined'` / `arr[len-1]` / negated ternaries — modern idioms used
- [ ] Every component prop type wrapped in `Readonly<>`
- [ ] No duplicate imports from one module · no deprecated Zod APIs
- [ ] No copy-pasted block ≥ ~10 lines — refactored, or in `sonar.cpd.exclusions` with a reason
- [ ] Every NOSONAR on the **same line** as its issue · systematic FPs via `multicriteria`
- [ ] Tests cover the new code (the gate needs `new_coverage` ≥ 60% on new code)
- [ ] `npx tsc --noEmit` + `npm run lint` clean
