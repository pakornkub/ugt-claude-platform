# Hardening — authorization scope, guarded jobs, DTO boundaries

## 1. Server-side scope enforcement — never trust a client-supplied identifier

Any route/action that accepts a record-owner identifier (employee code, user
id) from the client must enforce scope on the server. UI hiding is not a
security boundary — the incident was an authenticated user reading another
employee's rows by editing a query param.

Pattern for a "view own unless privileged" route:

1. Load permissions for the session user.
2. Has the read-all permission → use the client-supplied identifier.
3. Otherwise → **ignore/override** it with the session user's own linked
   identifier; if the account has no linked identifier, return `403` with an
   explicit code.
4. Reuse the central `PERMISSIONS.*` constants — never hardcode permission
   strings.

Projects installed by `ugt-nextjs-auth-setup` get this as `lib/scope.ts`
(`resolveDataScope` → `isEmpCodeAllowed` for one record, `scopeWhere` for a
list). Use it rather than re-deriving the rule per route — the incident above
happened because two sibling routes derived it separately and one was missed.

Before shipping a new scoped route, diff it against an existing enforced one —
the bug shipped because one sibling route had the check and the new one didn't.

## 2. Ownership is an identity match — never "lacks the broader permission"

`isSelf` must mean `session.identifier === record.identifier` — **never**
`!canViewAll`. Deriving "own record" from the absence of a wider read
permission strips self-service capabilities from privileged users (a read-all
user lost the edit buttons on their *own* record). A wider read scope must
never remove a capability. The UI flag is convenience; the server action's
own-record guard is the boundary.

## 3. Gates fail closed; batches explain skips

- An eligibility/authorization gate that depends on master data (hire date,
  linked account, config row) must **fail closed** when that data is missing —
  a missing value silently passing the gate is how ineligible records slipped
  through.
- A batch job may skip incomplete records, but every skipped record must appear
  in the result with an explicit per-record reason. Silent skips are
  indistinguishable from "processed fine".
- Append-style logs written per entity per run must be **deduped
  latest-per-key at read time** — otherwise every re-run displays stale
  entries beside fresh ones and looks like the fix didn't work.

## 4. Destructive scheduled jobs need an in-code date guard

A cron whose job is "wipe/cut something on date X" must check the date **in
code** (pure helper, unit-tested), not rely on the scheduler being configured
to fire exactly once:

- Cron path passes `{ enforceDeadline: true }` → no-op until the deadline.
- Admin manual path omits it → runs immediately (behind an irreversible
  confirm).

The incident: a daily-scheduled cutoff wiped carry-forward balances months
early because the guard existed only in the JSDoc. If a comment says the code
"checks X", the code must actually check X.

Related pipeline blind spot: any step that "exits 0 when it finds no input"
(migrate deploy, seed, sync) can go green forever while doing nothing — when
adding such a step, read its log for evidence of real work, not the stage
status.

## 5. DTO boundaries — literal unions, not `string`

Fields that correspond to a `z.enum()` must be typed as the literal union in
every DTO/action type that carries them — widening to `string` breaks
assignability against the Zod-inferred type, and a `string`-typed fallback
invites values outside the enum:

- Copy the union from the schema; make defaults a **valid member**.
- Prisma returns `string` for non-native enum columns → cast
  (`as 'A' | 'B'`) once at the DB→DTO mapping layer (the DB constraint makes
  it safe).
- Keep helper-function signatures in step when a DTO narrows.

## 6. Edit forms pre-fill the current effective value

When a record has both a raw/original value and an override (manual entry,
edited value), the edit dialog must seed its inputs from the **current
effective** value, and show the raw value separately read-only. Keep them as
two fields on the dialog's target type — overloading one nullable field for
both is how re-opening an edited record showed blank/stale inputs and silently
discarded the previous edit.

## 7. i18n enforcement checklist

Models hardcode UI strings constantly — enforce on every feature:

- [ ] Every user-visible string goes through `t()` —
      `getTranslations` (server) / `useTranslations` (client); no literal Thai
      or English in JSX
- [ ] Every new key exists in **both** `messages/en.json` and
      `messages/th.json`
- [ ] No literal `{`/`}` in any message (see Quick Rules — ICU)
