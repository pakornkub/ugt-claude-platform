---
name: ugt-nextjs-pitfalls
description: >
  Use when writing or editing feature code (dates, queries, fetches, forms,
  tables) on the org's Next.js + Prisma/MSSQL + React Query + next-intl stack,
  and especially on these symptoms — each one has a documented production root
  cause here: a date shifting by one day ("วันที่เลื่อน −1", "วันเพี้ยน", off only at
  night or only on the server), OT/attendance windows reading the wrong day,
  data not refreshing after a save ("บันทึกแล้วหน้าไม่อัปเดต", stale list until
  reload), a fetch that 404s only in production, "Maximum update depth
  exceeded" pointing at a Radix component, pagination showing "หน้า 1 จาก 0",
  a Select crashing on an empty value, or Thai text showing the wrong Buddhist
  year. Loads itself via paths on app/components/lib edits.
  Don't use for SonarQube/Quality-Gate violations (→ ugt-nextjs-clean-code) or
  installing infrastructure (→ the ugt-nextjs-*-setup skills).
paths:
  - "app/**/*.{ts,tsx}"
  - "components/**/*.{ts,tsx}"
  - "lib/**/*.{ts,tsx}"
---

# UGT Pitfalls — production-bug lessons for feature code

Every rule in this skill traces to a real incident that shipped and was
debugged in an org project. The cheapest bug is the one not re-shipped — read
the matching reference **before** writing the code, not after the symptom
appears.

## Which reference, when

| You are about to… | Read |
| --- | --- |
| Bind a date/time into `$queryRaw`/an SP, format a DB date, show a Thai year | `references/dates-timezones.md` |
| Fetch or mutate data shown in a table/list, add a filter, call an API from the client | `references/data-fetching.md` |
| Guard a route/action, build a batch/cron job, shape a DTO, pre-fill an edit form | `references/hardening.md` |

Symptom → likely file: date wrong by 1 day / hours → dates-timezones · stale UI
after save, infinite render loop, prod-only 404 → data-fetching · a user seeing
another user's rows, a cron wiping data early → hardening.

## Quick Rules — DO / DON'T

These are one-line traps; the rationale lives in the references or in the
upstream library docs.

| DO ✅ | DON'T ❌ |
| --- | --- |
| Keep RHF defaults (`mode: 'onSubmit'`, `reValidateMode: 'onChange'` **are** the defaults) | Override `mode`/`reValidateMode` — `onChange`/`onBlur` modes break `SearchableSelect` UX |
| Pair every manual `form.setError` with `clearErrors` in that field's `onChange` — better: move the check into Zod `superRefine` | Leave a manual error on screen after the user fixes the value |
| `"__none__"` sentinel for a clear/no-selection option, mapped back to `undefined` in `onValueChange` | `<SelectItem value="">` — Radix throws at runtime |
| Escape literal braces in next-intl messages with quotes (`'{'`) or reword | Put `{` / `}` (e.g. a `{{token}}` example) in any translated string — ICU parse error at runtime |
| `Math.max(1, table.getPageCount())` and a dedicated zero-items message | Render `getPageCount()` / API `totalPages` raw — shows "หน้า 1 จาก 0" and "1–0" ranges on empty data |
| Log-and-rethrow in DB helpers; check `response.ok` before `.json()` | `catch { return []; }` — masks schema/connection errors as "no data" |
| `'use no memo'` first line inside every `useReactTable` component | Assume React Compiler handles TanStack Table |
| Pass `getRowId` (real id) to any selectable table | Let selection ride on row index — wrong rows selected after a data swap |
| Invalidate React Query with **prefix** keys (`['feature']`) | Specific keys captured in stale `useCallback` closures |
| Reset state on prop change with the render-phase compare pattern (react.dev) | `useEffect` + `setState` — blocked by `react-hooks/set-state-in-effect` anyway |
| Tailwind v4: `bg-linear-to-*`, config in CSS only | `bg-gradient-to-*` / adding `tailwind.config.ts` |
| Pre-filter duplicates with a `Set` before `createMany` | `skipDuplicates: true` — not supported on SQL Server |
| "Page matches the last commit but ignores my edits" in a worktree → delete `.next`, restart dev | Hard-reloading the browser repeatedly — it's the Turbopack build cache, not the browser |
| Type test mocks with `satisfies` + full-shape factory helpers | Partial mock literals — they stop compiling when generated types drift |

## Verification

Run the greppable checks (cwd = project root; by default checks only files
changed vs HEAD, `--all` for the whole project):

```bash
node <skill-dir>/scripts/verify.mjs
```

It flags: bare `fetch('/api/...')`, `SelectItem value=""`, swallow-catches,
`.toISOString().slice(0, 10)` (verify the Date's anchor), inline `±543`
year math outside a central helper, and selectable `DataTable`s missing
`getRowId`. Everything else in this skill is judgment — the references say
what to check by hand.
