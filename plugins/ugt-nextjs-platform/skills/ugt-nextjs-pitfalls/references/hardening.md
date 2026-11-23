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

- Cron path (`app/api/cron/<job>/route.ts`, called by the prod compose `cron`
  service — the only scheduler allowed; never a host crontab, `node-cron` or
  `setInterval`, cicd `scheduled-jobs.md`)
  passes `{ enforceDeadline: true }` → no-op until the deadline.
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
- [ ] Catalogs are **TypeScript, not JSON** — kit keys in
      `messages/kit.th.ts` / `messages/kit.en.ts`, the project's own keys in
      `messages/app.th.ts` / `messages/app.en.ts`. A `messages/*.json` catalog
      is a hard **fail** in design-setup's `scripts/check-i18n.mjs` gate
- [ ] Every new key exists in **both** locales of its namespace (th **and**
      en) — the same gate diffs the key sets and names each missing leaf
- [ ] A new namespace is also registered in `i18n/messages.ts` — copied but
      unregistered means every `t()` in it renders its raw key path on screen
- [ ] No literal `{`/`}` in any message (see Quick Rules — ICU)

## 8. A status check in `update({ where })` is not a guard — double-click wins twice

**Symptom.** Approve / reject / cancel flows ("อ่านสถานะ → ตรวจ → เขียน") let
two near-simultaneous requests both through: quota deducted twice, an override
written for a request that was just cancelled, a "paid" email sent for a claim
someone else rejected.
**Root cause.** `prisma.x.update({ where: { id, status: 'PENDING' } })` looks
atomic but is not on SQL Server: with a non-unique key in `where` Prisma issues
a `SELECT` then an `UPDATE` and never checks the UPDATE's own row count, so the
loser of the race proceeds as if it had written. `updateMany` without reading
`count` guards nothing either, and the array form `$transaction([...])` cannot
roll back on `count === 0`. (Found in ugt-hrms by simulating a driver adapter in
a test.)
**Fix.** Put every field the decision was based on in an `updateMany` `where`,
inside an interactive transaction, assert `count === 1`, and keep the side
effects in that same transaction (or run them only after the guarded write
succeeded). Throw a P2025-shaped error so one handler maps it to a "not
pending" message:

```ts
export function oneRow(res: { count: number }): void {
  if (res.count === 0) throw Object.assign(new Error('lost race'), { code: 'P2025' });
}

await prisma.$transaction(async (tx) => {
  oneRow(
    await tx.leaveRequest.updateMany({
      where: { id, status: 'PENDING', approvalStep: step ?? null }, // ?? null, never undefined
      data: { status: 'APPROVED' },
    })
  );
  await tx.leaveBalance.upsert(/* quota deduction — rolled back if the guard threw */);
});
// catch (e) { if (isRecordNotFound(e)) return { error: t('notPending') }; throw e; }
```

`undefined` in a Prisma `where` means "no filter" — nullable fields (`approvalStep`)
must be `?? null`. When approving many rows, write them one by one inside the
interactive transaction (raise its `timeout`): a lost row rolls the whole batch
back and no email goes out.

**Origin.** ugt-hrms · 2026-11-22

## 9. Every export of a `'use server'` file is a public endpoint — `_name` is not "internal"

**Symptom.** An internal batch writer (`_runAnnualQuotaBatch`,
`_runCarryForwardCutoff`) exported from a `'use server'` file so a cron route
could import it — anyone with a session cookie (or none) could trigger it,
because it had no permission check. Found in an audit, not by a user. The same
audit found 14 exported read actions with no session check at all.
**Root cause.** Next.js turns **every** export of a `'use server'` module into a
Server Action reachable by a client POST. A leading underscore, a "private"
JSDoc or the fact that only a route imports it changes nothing. (Auth-setup
`auth-flows.md` already covers the sibling rule that such files may only export
async functions, and `form-validation.md` says an action is a public endpoint —
this is the consequence for functions that were never meant to be actions.)
**Fix.**

- A writer that has no guard of its own lives in `lib/services/*` (no
  `'use server'`). The cron route and the guarded action both import from
  there; the action adds session → permission → audit around it.
- Every exported **read** action calls `requireSession()` (at least) before
  touching the DB — reads leak data too.
- Pin it with tests: one that reads the actions file and asserts the internal
  names are not exported, one that runs every read action with a null session
  and a prisma mock that throws on any access.

```ts
// lib/actions/leave-balance.ts  ('use server')  → only guarded exports
// lib/services/leave-quota-batch.ts (no directive) → runAnnualQuotaBatchUnchecked
it('lib/actions/leave-balance.ts exports no unchecked batch writer', () => {
  const src = readFileSync('lib/actions/leave-balance.ts', 'utf8');
  expect(src).toMatch(/^'use server'/);
  expect(src).not.toMatch(/export\s+(async\s+)?function\s+(_run|\w+Unchecked)/);
});
```

**Origin.** ugt-hrms · 2026-11-22
