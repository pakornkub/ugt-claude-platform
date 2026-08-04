# App-Patterns Audit — remaining unported knowledge in ugt-hrms

**Date:** 2026-07-29 (curation pass added same day)
**Purpose:** decide whether the knowledge still living only in `ugt-hrms` justifies a new
feature-development skill in `plugins/ugt-nextjs-platform`. Report only — no skill was
created or modified.

> **Status:** Buckets 1–4 below are the full first-pass inventory (kept as the audit record).
> The binding conclusion is the **Curation pass** + **Recommendation** sections at the end:
> proposed skill name **`ugt-nextjs-pitfalls`**, ~15 core items + ~12 Quick Rules rows,
> 3 reference files.

**Sources audited (in `D:\Project_2026\ugt-hrms`):**

| Short | File |
| --- | --- |
| FC | `.github/instructions/feature-conventions.instructions.md` (393 lines) |
| HFC | `.github/instructions/ugt-hrms-feature-conventions.instructions.md` |
| FS | `.github/instructions/feature-scaffolding.instructions.md` |
| PF | `.github/instructions/pitfalls.instructions.md` (349 lines) |
| BF | `.github/instructions/ugt-hrms-bug-fixes.instructions.md` (1524 lines) |
| PP | `.github/skills/project-patterns/SKILL.md` §5–6 only |

**Dedupe basis:** all 7 SKILL.md files in `plugins/ugt-nextjs-platform/skills/` plus their
`references/` (auth-flows.md, rbac.md, audit-logging.md, keycloak-client.md,
naming-conventions.md, migrations.md, raw-sql-and-sp.md, sonarqube-setup.md, docker-deploy.md)
and key assets (`proxy.ts`, `lib-auth.ts`, `vitest.server-only-stub.js`, Jenkinsfile/Dockerfile).

---

## Bucket 1 — Org-generic app patterns (candidate content for `ugt-nextjs-app-patterns`)

These apply to any org Next.js project. UX/UI conventions are excluded (see Bucket 2).
Grouped by theme; each item is production-proven (shipped fix or enforced convention in ugt-hrms).

### 1a. Data fetching & client-state (React Query / Server Actions)

| Item | Source | Notes |
| --- | --- | --- |
| `revalidatePath` does NOT refresh React Query caches — mutations shown via React Query must `queryClient.invalidateQueries` (prefix key); beware long `staleTime` | BF RT-014 (:904) | Strong; nothing client-data-related exists in the platform plugin |
| Filters that change the *dataset* (year/month) must re-fetch server-side (`useQuery(['x', year, month])`) — never client-filter data the server already scoped; badge/count and list queries must share one where-builder | BF RT-022 (:1294) + follow-up (:1320) | Includes the "shared where-builder across surfaces" rule |
| `invalidateQueries` with **prefix** keys when handlers are `useCallback` with incomplete deps (stale-closure-safe) | BF RT-022 (:1310) | |
| Arrays passed as `data` props consumed by effects must be `useMemo`-stable — fresh identity every render → infinite loop ("Maximum update depth exceeded" pointing at an innocent Radix child); `'use no memo'` does not disable manual memo needs | BF RT-024 (:1381) | |
| Tables with row selection + swappable data must pass `getRowId` (real id, not index), esp. with `keepPreviousData` | BF RT-022 follow-up (:1323) | |
| Error state must not swallow the toolbar — error banner renders *above* content so recovery controls stay reachable | BF RT-022 follow-up (:1324) | Borderline UX, kept here because it's about recoverability, not styling |
| Reset state on prop change via adjust-during-render pattern, not `useEffect`+`setState` (lint `react-hooks/set-state-in-effect`) | BF RT-011 (:580) | Documented React pattern, enforced by the org lint config |

### 1b. Dates, timezones, MSSQL binding (the largest proven cluster)

| Item | Source | Notes |
| --- | --- | --- |
| **Never pass a JS `Date` as a `$queryRaw`/SP date parameter on linked-server/card DB** — `@prisma/adapter-mssql` binds Dates as UTC (−7h on TH servers) → wrong day; always bind `'YYYY-MM-DD'` strings via one shared `toLocalYmd` helper in `lib/utils` | BF RT-020b (:1211, incl. driver-level confirmation :1245) | **Not covered anywhere** in the platform plugin; sibling of but distinct from the `TIME(0)` gotcha in `raw-sql-and-sp.md` §6 |
| Getters must match the Date's anchor: SQL `DATE` (UTC-midnight) → UTC getters; locally-parsed Date → local getters; never `.toISOString().slice(0,10)` on a local-midnight Date | BF RT-018 (:1132), RT-017b date-key rule (:1125) | Generalizes `raw-sql-and-sp.md` §6 from TIME to DATE |
| Classify wall-clock vs instant before formatting: `@db.Date` columns → UTC-parts formatter; `createdAt`-style instants → local formatter with HH:MM; diagnostic = "date shifts −1 only at night" | BF RT-016 (:999) | |
| Writing wall-clock times back: construct with `Date.UTC(...)`, prefer `<input type="time">` + explicit assembly over `datetime-local` | BF RT-005-time fix 3 (:409) | Extends the read-side rule in raw-sql-and-sp.md §6 |
| Buddhist-era display: store CE everywhere; convert only at the UI edge via central `displayYear`/`inputToCEYear` helpers (BE_OFFSET in one place); never `+543` inline or filter DB by BE year | BF RT-020a (:1186), RT-019 rule (:1178) | Org-generic for any Thai-org app |
| A loop mutating a `Date` must not alias its bound (`const end = cond ? cur : ...` → near-infinite loop) | BF RT-013 (:812) | |

### 1c. Forms (React Hook Form + Zod)

| Item | Source | Notes |
| --- | --- | --- |
| Org standard `useForm` config: `mode: 'onSubmit'` + `reValidateMode: 'onChange'`; schema factory + `superRefine` for conditional validation | FC §7.1 (:179), PF (:82) | |
| Manual `setError` requires paired `clearErrors` in the field's `onChange`; prefer moving validation into Zod | FC §7.2 (:199), PF (:97) | |
| `<SelectItem value="">` throws at runtime — use `'__none__'` sentinel mirrored in value/onValueChange | PF (:111), FS POST (:58) | |
| DTO fields backing a `z.enum()` must be literal unions, not `string`; defaults must be union members; cast at DB→DTO and shadcn `onValueChange` boundaries | BF TS-001 (:20) | |
| Binding shadcn `Select` `onValueChange` to a `useState` setter: type state as `string`, narrow at use — literal-union state breaks `(value: string) => void` | BF RT-007 (:445) | |
| Pre-fill edit dialogs with the current *effective* value, not the raw/original source; keep "read-only source display" and "editable seed" as separate fields | BF RT-010 (:511) | |

### 1d. i18n (next-intl)

| Item | Source | Notes |
| --- | --- | --- |
| All user-visible text via `t()` — `getTranslations` (server) / `useTranslations` (client); never hardcoded strings | FC §2 (:48) | |
| Every new key must exist in **both** `messages/en.json` and `messages/th.json` | FS POST (:62) | |
| Literal `{`/`}` in any message breaks ICU parsing at runtime — quote-escape or reword | BF RT-008 (:466) | |
| Sub-components rendered inside another component must call `useTranslations` themselves | PF (:71) | Generic rule wearing HRMS clothes (SsoForm example) |
| TanStack `getPageCount()`/API `totalPages` return 0 on empty data → `Math.max(1, …)` + a dedicated zero-items message key | PF (:58) | Half table-gotcha, half i18n |

### 1e. Routing, basePath, envelope, architecture

| Item | Source | Notes |
| --- | --- | --- |
| Client-side `fetch` must prefix `${env.NEXT_PUBLIC_BASE_PATH}/api/...` — bare `/api/...` silently works in dev, 404s in every deployed env | BF RT-001 (:97), FS POST (:53) | auth-setup covers proxy/auth URLs but **not** general client fetches |
| RSC by default; `"use client"` only for events/hooks/browser APIs/client-only libs | FC §1 (:18) | |
| API envelope: always `{ success: true, data }` / `{ success: false, error: { code, message } }`, camelCase properties | FC §4 (:93) | |
| Client `fetch` of data routes must check `response.ok` before `.json()` | BF DB-001 rule (:151) | |
| Canonical-glossary terminology rule (variables/keys/components match `requirements/glossary.md`; no synonyms) | FC §8 (:232) | Thin — the *practice* is generic, the glossary is per-project |

### 1f. Error handling, security, jobs

| Item | Source | Notes |
| --- | --- | --- |
| Never `catch {}` → return empty/default from a DB helper — empty result must mean "no rows", never "query threw"; log and rethrow | BF DB-001 (:130) | |
| Employee/user-scoped API routes must enforce scope server-side: without the view-all permission, ignore/override client-supplied identifiers with the session's own; UI hiding is not a boundary | BF SEC-001 (:179) | rbac.md covers guard order but not the scope-override pattern |
| "Owns this record" ≠ "lacks broader view permission" — derive ownership from identity match, never from `!viewAll` | BF RT-009 (:489) | |
| Eligibility/gating on master data must fail **closed** when required data is missing; batch jobs record per-record skip reasons | BF RT-005-leave (:155) | Stated generically; HR specifics dropped |
| Destructive scheduled jobs need an in-code date-guard (`enforceDeadline` flag) — never trust the scheduler alone; separate manual-force from cron paths | BF RT-017a (:1043) | |
| Pipeline steps that "exit 0 with no input" (migrate deploy, seed, sync) are blind spots — verify the log shows real work, not just a green stage | BF BLD-002 rule (:1344) | The `.dockerignore` specifics are covered (see Bucket 3); the *lesson* is not |
| Append-style logs keyed by entity need latest-per-key dedup at read time | BF RT-020b follow-up (:1247) | |

### 1g. Radix/shadcn functional gotchas (not visual)

| Item | Source | Notes |
| --- | --- | --- |
| Searchable combobox inside a Radix Dialog: use Popover+Command (all-Radix); Base UI Combobox portals outside the dialog's layer stack → unfixable dismiss conflicts | BF RT-002 (:253) | |
| Mouse wheel blocked in portalled dropdowns inside dialogs (`react-remove-scroll`) → native wheel listener + `stopPropagation` via `className="contents"` wrapper | BF RT-004 (:346) | |
| Radix enter/exit animations require `data-[state=open]:`/`data-[state=closed]:` — `data-open:` targets a different attribute and never matches; CSS-less libs (NProgress) need explicit styles | BF UI-003 (:940) | Functional (animations never run), not a style preference |
| `useReactTable` needs `'use no memo'` as first directive (React Compiler) | FC §6 (:170), PF (:55), FS POST (:57) | |
| `npx shadcn@latest add` skips existing files — use `--overwrite` when updating | PF (:69) | Minor |
| Sonner: `richColors` must stay on `<Sonner>` (else all toasts render neutral); Sonner v2's injected font style needs an `html [data-sonner-toaster]` override | PF (:25, :27) | Functional wiring, not palette choice |

### 1h. Stack/tooling gotchas

| Item | Source | Notes |
| --- | --- | --- |
| Tailwind v4: `bg-gradient-to-*` → `bg-linear-to-*`; no `tailwind.config.ts` (CSS-only config) | PF (:20) | |
| Prisma `createMany` + `skipDuplicates` unsupported on SQL Server — pre-filter with a `Set` | PF (:156) | Only an asset comment mentions this today; no rule anywhere |
| Turbopack persistent dev cache serves stale chunks in worktrees — "page matches last commit, ignores edits" = delete `.next`, not browser cache | BF RT-021 (:1251) | |
| First `import 'server-only'` requires `npm install server-only` (not a Next built-in); vitest catches it, dev server may not | BF DEP-001 (:966) | quality-setup ships the stub but not this install rule |
| Typed mocks: `satisfies Session` + full-shape factory helpers for Prisma model mocks — partial literals break when generated types drift | BF TS-003 (:73) | |
| Test fixtures for external master data must be verified against the live source before asserting output (a fixture can lock in a bug); piped/redirected test runs report the pipe's exit code — read the real summary | BF RT-015 rules (:894), RT-013 rule (:847) | |
| Conflict resolution: "take incoming for all" is dangerous when both sides edited the same function — read every conflicted hunk, then run `tsc --noEmit` + the file's tests before push | BF RT-023 (:1350) | Stack-agnostic; possible future `ugt-core` material |
| SonarLint auto-regenerates the user-level `mcp.json` — never hand-edit it; use a differently-named project-level server entry | PF (:273) | Dev-env workflow; could also live in cicd references |
| Column shown in search-result labels must also be in the `WHERE` of the search query | BF RT-003 (:317) | Minor |

**Bucket 1 count: ~35 substantive items**, of which ~28 are non-minor and none are covered by
the existing plugin.

---

## Bucket 2 — UX/UI/design conventions (raw material for the future design plugin; OUT of app-patterns scope)

| Item | Source | Notes |
| --- | --- | --- |
| Design-system-first principle: `requirements/design-system.md` defines the visual outcome; framework defaults are overridden, never the reverse; override at call site or `globals.css` | FC §9 (:252) | The *mechanism* is design-plugin material |
| shadcn/ui-first decision order (primitive → compose → custom Tailwind-only); Tailwind utilities only, no raw CSS/CSS-in-JS/inline styles except truly dynamic values; `globals.css` allowed only for tokens/`@layer`/inexpressible patterns | FC §10 (:287) | |
| `FormDialog*` compound components (`FormDialogContent/Header/Body/Footer`), default classes, `height` prop variants (`fluid`/`auto`/`fill`), AlertDialog exempt | FC §11 (:330), FS PRE (:34) | Explicitly named in the audit brief |
| `DataTable<TData>` reuse rule — no ad-hoc `<table>` HTML in pages | FC §6 (:151) | Component-structure convention (the `'use no memo'` sub-rule is Bucket 1) |
| Icon allowlist: only `Plus`/`Pencil`/`Trash2`/`MoreHorizontal`/`CheckCircle2` | FS PRE (:33) | |
| Row actions: `DropdownMenu` with `MoreHorizontal` trigger, not inline ghost buttons | FS PRE (:35) | |
| Toast type semantics (success/error/warning/info mapping; never `toast.error` for warnings) | PF (:37) | |
| Design-token values: color tokens (`--primary #0071e3` light / `#2997ff` dark, etc.), typography scale (17px body, 14px cells), radius scale (8/11/12px, pill), elevation rules, shadcn override checklist (Button 8px, Input/Select 11px, Card borderless, Dialog rounded-xl) | HFC §2 (:54) | Concrete values are HRMS's Apple-flavored system; the *structure* (token table + override checklist) is the design plugin's skeleton |
| `Button variant="field"` for popover triggers that stand in for form inputs (datepicker/combobox) — matches `Input`/`SelectTrigger` surface | BF UI-001 (:534) | |
| `StatusBadge` (tone + icon) for status/severity; plain `Badge` for labels/counts/chips; never inline status color classes; icon is the accessibility-redundant signal | BF UI-002 (:556) | |
| Scrollbar visibility override for `CommandList` (`no-scrollbar` default) | BF RT-004 fix 1 (:363) | Styling half of an otherwise-functional fix |

**Size estimate for the design-plugin decision:** ~11 items ≈ 350–400 source lines. Two natural
halves: (a) a token/override system (FC §9–10 + HFC §2) and (b) component-usage conventions
(FormDialog*, DataTable, StatusBadge, `variant="field"`, icons, row actions, toast semantics).
That is enough for one design-conventions skill, but only (a) generalizes as-is — (b) presumes
the org adopts HRMS's shared components (`form-dialog.tsx`, `status-badge.tsx`, `data-table.tsx`)
as an org UI kit, which is the real decision the design plugin forces.

---

## Bucket 3 — Already covered in `plugins/ugt-nextjs-platform` (safe to skip)

| Item | Source | Where covered |
| --- | --- | --- |
| Env vars only via `@/lib/env`; new var → `lib/env.ts` + `.env.example` | FC §3, PF (:46) | `ugt-nextjs-database-setup/SKILL.md` critical rule 4 + Quick Rules |
| Audit-log obligation on privileged mutations (session → permission → action → log) | FC §5, FS POST (:54) | `ugt-nextjs-auth-setup/SKILL.md` §2.4–2.5 + `references/audit-logging.md` |
| External/HR tables read-only; override table + join at read time | HFC §1 (generic principle) | `ugt-nextjs-database-setup/SKILL.md` "Read-only rule" + `references/raw-sql-and-sp.md` §2 |
| Prisma `@@map("PascalCasePlural")`, reserved words | PF (:134), FS POST (:56) | database-setup SKILL + `references/naming-conventions.md` |
| `prisma generate` after every migrate/schema change | PF (:138), BF BLD-001 | database-setup critical rule 5 |
| Prisma 7: `url` in `prisma.config.ts` only; `prisma-client-js`; `import type sql from 'mssql'` | PF (:148–155) | database-setup critical rules 1–3 |
| Prisma v7 SQL fragment helpers from `runtime/client` | BF BLD-001 rule (:226) | `raw-sql-and-sp.md` §5 |
| SQL `TIME(0)` wall-clock-in-UTC read pattern (central formatter, UTC getters) | BF RT-005-time (:392) | `raw-sql-and-sp.md` §6 (read side; write side is Bucket 1) |
| `auth.api.signInEmail` not `signIn.email`; rateLimit `id` field | PF (:165) | auth-setup Quick Rules |
| `__Secure-` cookie naming; `cookieStore.set(maxAge:0)` not `.delete()` | PF (:170–195) | `auth-flows.md` cookie-naming + logout sections |
| Keycloak: callbackURL/redirectURI with basePath, `trustedProviders`, `overrideUserInfo`/custom-field sync, `genericOAuthClient`, realm check | PF (:199–213) | `auth-flows.md` SSO flow + Quick Rules + `keycloak-client.md` |
| `ldapts` not `ldapjs`; UPN bind + RFC-4515 escaping | PF (:217) | auth-setup SKILL §5.1 + Quick Rules (the "don't force `ldaps://` on private networks" nuance is only implied by the interview — worth one line in auth-flows.md) |
| proxy basePath: strip-then-match, app-relative redirect pathnames, `/_next/` bypass, health bypass | PF (:227), BF RT-025 (:1414) | `auth-flows.md` "proxy.ts basePath rules" + `assets/proxy.ts` (RT-025's fix is already the shipped asset, lines 47–67) |
| Better Auth drops custom fields at OAuth create; persist via `databaseHooks.session.create.after` | BF RT-027 (:1500) | `auth-flows.md` SSO flow step 6 |
| Filtered unique index for nullable `@unique` on MSSQL (one-NULL limit) | BF RT-027 (:1474) | `migrations.md` §4 (the "resolve identity by username, existing email wins" flow of RT-026 is Bucket-1-adjacent but auth-specific — better as a small addendum to auth-flows.md than app-patterns) |
| Sonar: complexity ≤ 15, no `any`, no `console.*`, unused imports, `Readonly<>` (+ CellContext exception), Zod v4 deprecations, duplication levers (refactor vs `cpd.exclusions`), `cpd.exclusions` ≠ `exclusions`, NOSONAR same-line, multicriteria for multi-line constructs | PF (:238–349), FS POST (:43–49), BF SQ-001..SQ-005 | `ugt-nextjs-clean-code/SKILL.md` §1–3 (SQ-005's Prettier finding is already the stated multicriteria rule) |
| vitest: `server-only` stub file in-repo, never alias into `node_modules/next` | BF DEP-002 (:1273) | quality-setup Quick Rules + `assets/vitest.server-only-stub.js` |
| `.dockerignore` must keep `prisma/migrations/` for the builder image running `migrate deploy` | BF BLD-002 (:1328) | `docker-deploy.md` builder-image contract (:7, :46) — the generic "green no-op stage" lesson is Bucket 1f |
| Route groups `(auth)`/`(app)`/`(admin-setup)` + minimal auth-guard layout | PP §5 (:234) | auth-setup SKILL §5.5 + admin-setup assets |
| Logout via `<form action={logoutAction}>`; login form redirects client-side after action success | PP §6 (:290, :300) | auth-setup SKILL §5.5 item 3 + `assets/login-form.tsx` |

---

## Bucket 4 — HR-specific: drop (one-line reasons)

| Item | Source | Reason |
| --- | --- | --- |
| `HRM_Time*` table names, `thrygsd002` linked server, `vwHR_SC_Employee`, `spHR_SC_GetShiftScheduleActual` specifics | HFC §1, BF DB-001/RT-005/RT-017b/RT-019/RT-020b | Concrete HR schema; the generic principles are extracted in Buckets 1/3 |
| RT-006 · HolidayList B.E. year `+543` lookup | BF (:420) | Superseded by RT-020a's CE migration; only the CE/BE helper pattern survives (Bucket 1b) |
| RT-012 · `isWorkday` must not exclude holidays | BF (:620) | Attendance-domain predicate |
| RT-015 · overnight shift window `FromDay`/`ToDay` math | BF (:853) | Shift-schedule domain (the fixture-verification lesson is in Bucket 1h) |
| RT-017b · consecutive-days/weekly-hours from real scans, not shift plans | BF (:1077) | Attendance/OT domain rules |
| RT-019 · WorkSchedule keyed by D/N not AttnWorkGroup; day-type resolvers | BF (:1157) | OT-calculation domain |
| RT-026 · `.com`/`.co.th` email drift between AD and HR view | BF (:1450) | HRMS dual-source identity detail (the resolve-by-username pattern noted in Bucket 3) |
| `QueryProgress`/NProgress specifics, `radix-mira`-era component inventory, per-file NOSONAR site lists | BF UI-003/SQ-004/SQ-005 file lists | Private UI kit + repo-specific suppression inventory |
| PRE-checklist references to HRMS-local skills (`ugt-nextjs-ui-patterns`, `ugt-nextjs-tables`, `ugt-nextjs-forms`, `ugt-nextjs-data-patterns`) | FS PRE (:21–31) | Those skills live only in ugt-hrms; the platform equivalents would be the new skill's `paths` auto-load |
| Glossary term examples (`empCode` etc.), permission keys (`ACCESS_MONITOR_VIEW_ALL`) | FC §8, BF SEC-001 | Domain vocabulary; generic rules extracted |

---

## Curation pass — Bucket 1 vs Next.js / library best practices

Second pass over Bucket 1: each item checked against official docs and defaults
(Next.js App Router, React, React Hook Form, TanStack Query/Table, next-intl, MDN).
Three verdict groups.

### C1. Framework/library already teaches the correct way → CUT or one line

| Item | Finding |
| --- | --- |
| RSC by default (1e) | Verbatim App Router doc guidance; Next 16.3+ even auto-generates agent docs — free coverage (matches the earlier "no vendor skills" decision). **Cut.** |
| RHF `mode: 'onSubmit'` + `reValidateMode: 'onChange'` (1c) | **These are RHF's library defaults** — the "org standard" restates them. Real rule shrinks to one line: *don't override mode/reValidateMode*. |
| Adjust-during-render instead of `setState`-in-effect (1a) | Official react.dev pattern AND enforced by `react-hooks/set-state-in-effect` lint — lint catches it; keep one line pointing at the fix. |
| `getRowId` for selectable tables (1a) | TanStack Table documented recommendation. One Quick Rules row. |
| Prefix-key invalidation (1a) | Documented TanStack Query partial matching. One row. |
| Sub-component calls `useTranslations` itself (1d) | Basic React hooks rule. **Cut.** |
| Check `response.ok` before `.json()` (1e) | MDN fetch basics. Fold into the catch-swallow row. |

### C2. Documented, but a proven trap in this org → one Quick Rules row each

Manual `setError` needs `clearErrors` (prefer `superRefine`) · `SelectItem value=""` →
`'__none__'` sentinel · ICU literal-brace escape · `getPageCount()`/`totalPages` = 0 on empty
data · never `catch {}` → empty result (+ check `response.ok`) · `'use no memo'` on
`useReactTable` · Tailwind v4 renames / no `tailwind.config.ts` · `createMany` without
`skipDuplicates` on MSSQL · stale Turbopack `.next` cache in worktrees · typed mocks via
`satisfies` + factories.

### C3. Core — org conventions and stack interactions no docs cover (~15 items)

| Cluster | Items | Why no doc covers it |
| --- | --- | --- |
| **Dates × MSSQL** | Date→string binding (`toLocalYmd`), anchor-matched getters, wall-clock vs instant, `Date.UTC` write-back, CE-storage + BE-display helpers | Interaction of `@prisma/adapter-mssql` (tedious/useUTC) × TH server × linked server; BE/CE is a Thai-org convention. The #1 reason this skill should exist. |
| **React Query × Server Actions** | `revalidatePath` ≠ client cache; refetch-on-filter + shared where-builder | Follows from the org's *architecture choice* (React Query for interactive tables instead of pure RSC) — not derivable from either library's docs. |
| **`useMemo` on `data` props** | Stable identity for effect-feeding arrays | React Compiler normally auto-memoizes, but TanStack tables force `'use no memo'` → compiler off → manual memo needed exactly in those files. Three-layer interaction, undocumented. |
| **basePath client fetch** | `${env.NEXT_PUBLIC_BASE_PATH}/api/...` prefix | Next docs cover `next/link` only; silent in dev (`basePath = ''`), 404 in every org deployment. |
| **API envelope** | `{ success, data }` / `{ success, error }`, camelCase | Pure org convention — Next.js has no opinion; cannot be derived. |
| **i18n enforcement** | All text via `t()`; keys in both `en.json` + `th.json` | Generic principle, but models hardcode Thai strings constantly — enforcement rule, cheap to state. |
| **Authorization patterns** | Server-side scope override with session identity; ownership = identity match, never `!viewAll` | OWASP-level principles made concrete with the org's permission model. |
| **Guarded jobs** | Fail-closed on missing master data; in-code date-guards for destructive cron; DTO literal unions; pre-fill effective values | Production lessons with no upstream doc. |

Dropped in curation (beyond C1): glossary rule (per-project practice), Radix portal gotchas
group (real but encounter-driven — optional 4th reference if ever wanted), error-banner
placement (UX → design plugin), minor one-offs (`--overwrite`, `server-only` install,
SELECT/WHERE mismatch), SonarLint `mcp.json` (→ cicd references), merge-conflict discipline
(stack-agnostic → `ugt-core`, which now exists as of 2026-07-29).

---

## Recommendation

**Create the skill — proposed name `ugt-nextjs-pitfalls`** (renamed from the working title
`ugt-nextjs-app-patterns`). Rationale for the name: ~80% of the surviving content is
production-bug lessons, it inherits the identity of the source files
(`pitfalls.instructions.md`, bug-fixes), and "pitfall/กับดัก/เจอบั๊กแปลก" are strong trigger
words. Alternatives considered: `ugt-nextjs-correct-code` (pairs with `clean-code`: clean =
passes the gate, correct = runs right; weaker trigger), `ugt-nextjs-feature-rules` (covers
conventions better; bland), `ugt-nextjs-prod-safety` (captures "silent in dev, breaks in
prod"; sounds ops/security).

Curation leaves **~15 core items + ~12 Quick Rules rows** — smaller than the first pass but
with zero overlap against the existing six skills and against what Next.js 16.3+ ships in its
own agent docs. Folding into existing skills still fails structurally (they are one-shot
installers; this is load-while-coding, and stretching `clean-code` would bury its Sonar focus).

Two items fold elsewhere instead:

- **auth addenda** → `ugt-nextjs-auth-setup/references/auth-flows.md`: RT-026
  resolve-identity-by-username; "don't force `ldaps://` on private networks".
- **RT-023 merge-conflict discipline** → `ugt-core` (exists since 2026-07-29).

### Proposed outline (curated)

```
plugins/ugt-nextjs-platform/skills/ugt-nextjs-pitfalls/
  SKILL.md              # Quick Rules DO/DON'T table (~12 rows, C2 + C1 one-liners)
                        #   + theme index, same shape as clean-code
  references/
    dates-timezones.md  # Date→string binding to MSSQL (toLocalYmd), anchor-matched getters,
                        #   wall-clock vs instant, Date.UTC write-back, CE/BE display helpers
    data-fetching.md    # React Query × Server Actions (org architecture note), invalidation,
                        #   refetch-on-filter + shared where-builder, stable data identities
                        #   ('use no memo' × Compiler nuance), basePath fetch, API envelope
    hardening.md        # scope override with session identity, ownership ≠ !viewAll,
                        #   fail-closed gates, cron date-guards, DTO unions, effective-value
                        #   pre-fill, i18n enforcement checklist
  scripts/verify.mjs    # greppable checks: bare fetch('/api', SelectItem value="",
                        #   catch {} return [], .toISOString().slice on bound params,
                        #   inline ±543, missing getRowId on selectable DataTable
```

Frontmatter (matching the clean-code precedent — the only other `paths` skill):

```yaml
paths:
  - "app/**/*.{ts,tsx}"
  - "components/**/*.{ts,tsx}"
  - "lib/**/*.{ts,tsx}"
```

(Not bare `**/*.{ts,tsx}` — the skill should not fire on `prisma/`, config files, or
scripts, where clean-code still applies but these patterns don't.)

### Bucket 2 sizing (input for the design-plugin decision)

~11 conventions ≈ 350–400 lines of source material, splitting into a generalizable
token/override system and a component-kit half that only works if the org adopts HRMS's
shared components (`form-dialog`, `status-badge`, `data-table`, the `field` button variant)
as an org UI kit shipped with the plugin. That adoption question — assets vs. documentation —
is the design plugin's first decision, and a reason to keep it separate from app-patterns.

---

## Addendum 2026-08-04 — gap ที่พบระหว่างร่าง design skill (สำหรับคนทำ Bucket 1)

การสกัดรอบนี้ (ดู `docs/design-skill-draft.md`) พบว่า audit ฉบับนี้ยังไม่ได้เก็บ
convention เรื่อง **form/state libraries** เลย ทั้งที่ 2 โปรเจคใช้จริง:

| Lib | สถานะใน 2 โปรเจค | คำถามที่ Bucket 1 ต้องตอบ |
| --- | --- | --- |
| react-hook-form + zod (ฟอร์ม) | converge ทั้งคู่ (ผ่าน shadcn `ui/form`) | ฝั่ง UI ถูกเก็บใน design skill แล้ว — Bucket 1 เก็บฝั่ง schema/resolver pattern |
| zod ที่ Server Action / DTO boundary | converge ทั้งคู่ | pattern การ validate ที่ boundary + literal-union DTO (มีบางส่วนใน Bucket 1 แล้ว) |
| @tanstack/react-query | converge ทั้งคู่ | เมื่อไหร่ใช้ react-query vs server component fetch · key convention · invalidation |
| zustand | เฉพาะ gov-boi (HRMS ไม่ใช้) | ยังไม่ converge — อย่าเพิ่งตั้งเป็นมาตรฐาน บันทึกไว้เฉย ๆ |
