# Form validation — RHF × zod, two layers on purpose, limits defined once

**Architecture context:** every form on this stack validates **twice**, and
that is not duplication. The browser layer (react-hook-form + zod) exists for
UX — instant feedback under the field. The Server Action layer exists for
security — an action is a **public HTTP endpoint**; anyone can call it with
anything, no form involved, and TypeScript types are erased at runtime.
Skipping the server layer because "the form already validates" is the classic
hole. HRMS runs this pattern at 48 action boundaries.

## 1. The form side — one schema factory per form

One file per feature under `lib/validations/`, exporting a **factory** that
takes the translated messages:

```ts
// lib/validations/role.ts
export function createRoleFormSchema(msgs: Readonly<RoleFormMessages>) {
  return z.object({
    name: z.string().trim().min(1, msgs.nameRequired).max(NAME_MAX, msgs.nameMax),
    description: z.string().max(DESCRIPTION_MAX, msgs.descriptionMax),
    permissionIds: z.array(z.string()),
  });
}
export type RoleFormValues = z.infer<ReturnType<typeof createRoleFormSchema>>;
```

- **Messages are injected, never hardcoded** — the schema stays testable
  without next-intl, and the component owns the wording. (A th-only project
  may inline Thai messages; the factory shape still pays off in tests.)
- Wire with `useForm({ resolver: zodResolver(schema) })`.
- **Do not set `mode` / `reValidateMode`** — RHF's defaults (validate on
  submit, then re-validate per field) are already the org behavior. An earlier
  "org standard" restating them was just noise; the real rule is one line:
  don't override them.
- `.trim()` on user-typed strings at the schema, not in the submit handler.

## 2. The boundary side — the action re-validates, always

```ts
export async function createRoleAction(values: CreateRoleInput) {
  const parsed = createRoleSchema.safeParse(values);   // ← the real gate
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  // …session → permission → action → audit log (auth contract order)
}
```

- `safeParse`, never `parse` — an exception here becomes an opaque 500.
- The action's schema may be **narrower** than the form's (server-only checks:
  uniqueness, referential rules) but never *looser*.
- **Choice values are literal unions** — `z.enum(['MAX_WEEKLY_HOURS', …])`,
  never `z.string()` — so a fabricated value dies at the boundary instead of
  landing in the database as a status nothing renders.
- Anything path-like, id-like, or identifier-like gets a format check even
  when it is "just passed through" (see `hardening.md` and the
  `IDENTIFIER` regexes in the auth kit) — a malformed value reaching a raw
  query means something upstream skipped validation; fail here, loudly.

## 3. The rule that prevents the real bug — define limits ONCE

Two schemas of the same data drift. HRMS documents the risk in its own
comment: *"ขอบเขตความยาวตรงกับ createRoleSchema/updateRoleSchema ใน
lib/actions/roles.ts"* — a promise kept by hand. When the form allows 100
chars and the action allows 50, the user passes the form and gets rejected at
save with no field highlighted.

So: **numbers, regexes and enums live in one module; both schemas import it.**

```ts
// lib/validations/role.ts (or a shared constants module)
export const ROLE_NAME_MAX = 100;

// form schema:    .max(ROLE_NAME_MAX, msgs.nameMax)
// action schema:  .max(ROLE_NAME_MAX)
```

The kit already ships the canonical example: `lib/password-policy.ts` is one
schema consumed by the reset form, the change-password dialog **and** the
admin create-user action — three surfaces, one definition, drift impossible.
`lib/actions/admin-users.ts` shows the boundary side consuming it.

## Quick table

| DO ✅ | DON'T ❌ |
| --- | --- |
| Schema factory in `lib/validations/`, messages injected | Hardcode messages inside the schema (untestable, i18n leaks in) |
| Validate again in the Server Action with `safeParse` | Trust the form — the action is a public endpoint |
| Limits/enums defined once, imported by both schemas | Two hand-synced copies (the form-passes-save-fails bug) |
| `z.enum([...])` for choice values | `z.string()` for something with 3 legal values |
| RHF defaults for `mode`/`reValidateMode` | Restating or overriding them |
| Action schema narrower than the form's | Action schema looser than the form's |
