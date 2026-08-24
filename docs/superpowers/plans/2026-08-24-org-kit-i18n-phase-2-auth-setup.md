# Auth-Setup i18n (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Thai UI string, validation message, and server-returned error in `ugt-nextjs-auth-setup`'s assets renders through the `auth` message catalog (`useTranslations`/`getTranslations`), so a project running th+en shows English on every auth/admin-users/admin-roles/audit-log/password screen when the user switches locale — closing phase 2 of `docs/superpowers/specs/2026-08-24-org-kit-i18n-design.md` (166 strings, §6.2).

**Architecture:** Add one catalog file pair (`messages/auth.th.ts` / `auth.en.ts`, same shape as the existing `messages/kit.th.ts` / `kit.en.ts` from phase 0+1) registered into the project's `i18n/messages.ts` under a new `auth` top-level key. Client components call `useTranslations('auth.<namespace>')`; the two Server Component pages call `getTranslations('auth.<namespace>')`. Before any UI string moves, Task 1 closes the **error-code contract**: every Server Action that currently returns `{ error: 'ข้อความไทย' }` or `{ error: 'English prose' }` is rewritten to return `{ code: 'SCREAMING_SNAKE_CASE' }`, and every consumer that reads `result.error` (directly rendering it, or — the actual bug this plan exists to fix — pattern-matching its text) is rewritten to read `result.code` and look up display text via a shared `auth.errors` namespace. This removes `admin-user-actions.tsx:82`'s `/อีเมล|email/i.test(result.error)` routing hack entirely in favor of the `field` the action now returns alongside the code.

**Tech Stack:** Next.js 15 (App Router), next-intl (already wired by phase 0+1 — `i18n/request.ts`, `NextIntlClientProvider`, `next.config.ts` plugin registration), react-hook-form + `@hookform/resolvers/zod`, zod, Prisma/SQL Server, Better Auth.

**Spec:** `docs/superpowers/specs/2026-08-24-org-kit-i18n-design.md` — this plan implements §6.2 phase 2 (166 strings) and closes mission 2.6 (§5, §2 table row 2.6) for auth-setup's slice of bucket 4.

## Global Constraints

- **`.ts` catalogs, never `.json`** (spec มติ 2.4) — `check-kit-freshness.mjs` and `stamp-kit-assets.mjs` both filter `/\.tsx?$/`; a `.json` catalog is invisible to kit-sync.
- **One code, one wording, used everywhere that rule is checked.** When the same validation rule is enforced both client-side (a zod schema behind `zodResolver`) and server-side (defense-in-depth re-validation in a Server Action), both call sites use the **identical** error code and the code appears **once** in the catalog. This generalizes the rule `lib/password-policy.ts` already states for itself ("ถ้าสามที่นี้ตรวจกันคนละแบบ ผู้ใช้จะเจอกฎที่เปลี่ยนไปตามหน้าจอ") to the whole skill. Task 1 defines the canonical code list; later tasks reuse codes from it, they never invent a second code for a rule that already has one.
- **Server Actions return `{ code }`, never `{ error: '<prose>' }`.** Zod schema messages inside `'use server'` files are themselves codes (e.g. `.min(1, 'USER_NAME_REQUIRED')`), forwarded via `parsed.error.issues[0]?.message` — the action does **not** translate before returning. Translation happens once, client-side, in the `auth.errors` namespace.
- **Zod schemas whose messages are user-facing text must not live at client-component module scope.** A schema declared at module scope (outside any component) cannot call `useTranslations`. Where a schema's messages must become catalog codes displayed through `<FieldError>`, either the schema is moved inside the component/hook, or (preferred, less duplication) the schema keeps CODE strings as its zod messages and the component translates the RHF `FieldError.message` at render time via the `useFieldErrorText()` helper Task 1 creates — the same trick already used for Server Action codes, applied at the field level.
- **Regression gate stays green after every task.** `node <ugt-nextjs-design-setup skill dir>/scripts/check-i18n.mjs <project-root>` must report the same or a growing "converted files" count and zero Thai-outside-comments hits after every task's changes are copied into a scratch project (see each task's Step "Verify").
- **Server Components use `getTranslations`, Client Components use `useTranslations`.** Only two files in this plan are Server Components (no `'use client'`): `app/(admin)/admin/audit-logs/page.tsx` and `app/(admin)/admin/users/page.tsx` (Task 14). Every other file is `'use client'` already.
- **Don't touch comments.** 845 lines of Thai docblocks/comments across the kit are explicitly out of scope (spec §8) — only Thai inside string literals / JSX text nodes moves.
- **Out of scope for this plan** (spec §8): `scripts/create-first-user.ts` (CLI stdout, not UI — its `console.log`/`console.error` Thai stays as-is), `lib/scope.test.ts` (test titles, not UI).

## Execution Order

Tasks are numbered by namespace/file, not by dependency order. Run them **1, 2, 3, 8, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14** — Task 1 gates everything, and Task 8 (`lib/password-policy.ts`) must land before Task 4 (`admin-user-actions.tsx`) because Task 4's create-user and set-password forms both consume the schema Task 8 rewrites. Every other task depends only on Task 1.

---

## Namespace Map

All namespaces live under the top-level `auth` key (`auth.<namespace>.<key>`), catalog files `messages/auth.th.ts` / `messages/auth.en.ts`.

| Namespace | Owning file(s) | Task |
| --- | --- | --- |
| `errors` | shared — every Server Action + every zod schema in this skill | 1 |
| `passwordPolicy` | `lib/password-policy.ts` | 1 (hint text), 8 (schema codes) |
| `login` | `components/login-form.tsx` | 2 |
| `rolesManager` | `components/roles-manager.tsx` | 3 |
| `adminUserActions` | `components/admin-user-actions.tsx` | 4 |
| `auditLogsTable` | `components/audit-logs-table.tsx` | 5 |
| `forgotPassword` | `components/forgot-password-dialog.tsx` | 6 |
| `changePassword` | `components/change-password-dialog.tsx` | 8 |
| `resetPassword` | `components/reset-password-form.tsx` | 8 |
| `roleForm` | `components/role-form.tsx` | 9 |
| `usersTable` | `components/users-table.tsx` | 10 |
| `adminSetup` | `components/admin-setup-form.tsx` | 11 |
| `navUser` | `components/nav-user.tsx` | 12 |
| `adminNav` | `components/admin-nav.tsx` | 13 |
| `userRoleSelect` | `components/user-role-select.tsx` | 14 |
| `adminUsersPage` | `app/(admin)/admin/users/page.tsx` | 14 |
| `adminAuditLogsPage` | `app/(admin)/admin/audit-logs/page.tsx` | 14 |

---

### Task 1: Error-code contract + auth catalog scaffolding

This is the task every other task depends on (spec mission 2.6). It touches five Server Action files, four of their consumers, and creates the catalog. No other task may run before this one lands, because every later task's "server-returned" strings assume `result.code` already exists.

**Files:**
- Create: `assets/messages/auth.th.ts`
- Create: `assets/messages/auth.en.ts`
- Create: `assets/lib/use-field-error.ts`
- Modify: `assets/lib/actions/auth.ts`
- Modify: `assets/lib/actions/admin-setup.ts`
- Modify: `assets/lib/actions/admin-users.ts`
- Modify: `assets/lib/actions/admin-roles.ts`
- Modify: `assets/lib/actions/password.ts`
- Modify: `assets/components/login-form.tsx` (only the two `setError('root', { message: result.error })` sites + the two module-scope schemas' non-empty-field messages — full string conversion of this file is Task 2)
- Modify: `assets/components/admin-user-actions.tsx` (only the `admin-user-actions.tsx:82` regex fix + the create-user schema's `name`/`email` messages — full conversion is Task 4)
- Modify: `assets/components/admin-setup-form.tsx` (only the `toast.error('ตั้งค่าไม่สำเร็จ', { description: result.error })` site — full conversion is Task 11)
- Modify: `assets/components/user-role-select.tsx` (only the `toast.error('เปลี่ยนบทบาทไม่สำเร็จ', { description: result.error })` site — full conversion is Task 14)
- Modify: (all skill's) `D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-design-setup\scripts\check-i18n.mjs` is **not** touched here — that happens once, in Task 14, after every file this plan converts exists.

All paths below that start with `assets/` are relative to `D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-auth-setup\`.

**Interfaces:**
- Produces: `AuthCatalog` type + `authTh`/`authEn` objects (consumed by every later task and by `i18n/messages.ts`'s `auth: authTh`/`auth: authEn` registration).
- Produces: `useFieldErrorText()` from `lib/use-field-error.ts` — `(error: FieldError | undefined, vars?: Record<string, string | number>) => [{ message: string }] | undefined`, a drop-in replacement for the `errors.<field> ? [errors.<field>] : undefined` pattern used by every `<FieldError errors={...} />` call in this skill. Every later task that touches a `<FieldError>` call imports and uses this.
- Produces: the canonical error-code list below — every later task's zod schemas and `toast`/`Callout` bindings reuse these codes verbatim; they never define a new code for a rule already listed here.

**Canonical `auth.errors` code list** (code → Thai → English — write exactly these into `auth.th.ts`/`auth.en.ts`'s `errors` namespace):

```
UNAUTHORIZED             กรุณาเข้าสู่ระบบ                                    Please sign in to continue.
FORBIDDEN                คุณไม่มีสิทธิ์ทำรายการนี้                            You don't have permission for this action.
INVALID_INPUT            ข้อมูลไม่ถูกต้อง                                    Please check the information you entered.
ALREADY_INITIALIZED      ตั้งค่าผู้ดูแลระบบไปแล้ว                            Admin setup has already been completed.
TOO_MANY_ATTEMPTS        ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่    Too many attempts. Please try again later.
INVALID_AD_CREDENTIALS   ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง                    Invalid username or password.
INVALID_LOCAL_CREDENTIALS อีเมลหรือรหัสผ่านไม่ถูกต้อง                       Invalid email or password.
CANNOT_CHANGE_OWN_ROLE   ไม่สามารถเปลี่ยนบทบาทของตัวเองได้                   You cannot change your own role.
EMAIL_IN_USE             มีผู้ใช้อีเมลนี้อยู่แล้ว                            This email is already in use.
USER_NOT_FOUND           ไม่พบผู้ใช้                                        User not found.
SSO_LDAP_NO_RESET        บัญชีนี้ใช้รหัสผ่านจาก SSO/LDAP เปลี่ยนที่ระบบนั้นแทน This account signs in through SSO/LDAP — change the password there instead.
NO_PASSWORD_SET          บัญชีนี้ไม่มีรหัสผ่านในระบบ                         This account has no password set.
ROLE_NAME_REQUIRED       กรุณากรอกชื่อบทบาท                                  Please enter a role name.
ROLE_NOT_FOUND           ไม่พบบทบาทที่เลือก                                  Role not found.
SYSTEM_ROLE_EDIT_BLOCKED บทบาทระบบไม่สามารถแก้ไขได้                          System roles cannot be edited.
SYSTEM_ROLE_DELETE_BLOCKED บทบาทระบบไม่สามารถลบได้                          System roles cannot be deleted.
RESET_LINK_RATE_LIMITED  ขอลิงก์บ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่          Too many requests. Please wait a moment and try again.
RATE_LIMITED             ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่              Too many attempts. Please wait a moment and try again.
RESET_LINK_INVALID       ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่      This link has expired or was already used. Please request a new one.
SESSION_EXPIRED          เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่                   Your session has expired. Please sign in again.
CHANGE_PASSWORD_FAILED   เปลี่ยนรหัสผ่านไม่สำเร็จ                            Could not change your password.
WRONG_CURRENT_PASSWORD   รหัสผ่านปัจจุบันไม่ถูกต้อง                          Your current password is incorrect.
CURRENT_PASSWORD_REQUIRED กรุณากรอกรหัสผ่านปัจจุบัน                          Please enter your current password.
PASSWORD_TOO_SHORT       รหัสผ่านต้องยาวอย่างน้อย {min} ตัวอักษร             Password must be at least {min} characters.
PASSWORD_TOO_LONG        รหัสผ่านต้องไม่เกิน {max} ตัวอักษร                  Password must be at most {max} characters.
PASSWORD_NEED_LOWER      ต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว                   Must include at least one lowercase letter.
PASSWORD_NEED_UPPER      ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว                   Must include at least one uppercase letter.
PASSWORD_NEED_DIGIT      ต้องมีตัวเลขอย่างน้อย 1 ตัว                        Must include at least one digit.
PASSWORD_MISMATCH        รหัสผ่านทั้งสองช่องไม่ตรงกัน                        The two passwords don't match.
USER_NAME_REQUIRED       กรุณากรอกชื่อ                                      Please enter a name.
EMAIL_REQUIRED           กรอกอีเมล                                          Please enter an email.
EMAIL_INVALID            กรุณากรอกอีเมลให้ถูกต้อง                            Please enter a valid email.
PASSWORD_REQUIRED        กรอกรหัสผ่าน                                       Please enter a password.
AD_USERNAME_REQUIRED     กรอกชื่อผู้ใช้ AD                                   Please enter your AD username.
```

- [ ] **Step 1: Create the catalog files**

`assets/messages/auth.th.ts`:

```ts
// kit: ugt-nextjs-platform 4.47.0 · ugt-nextjs-auth-setup/messages/auth.th.ts
// kit-hash: __STAMPED_BY_stamp-kit-assets.mjs__
// Thai catalog for ugt-nextjs-auth-setup. Keys must match auth.en.ts exactly —
// scripts/check-i18n.mjs fails the build when they drift.
export const authTh = {
  errors: {
    UNAUTHORIZED: 'กรุณาเข้าสู่ระบบ',
    FORBIDDEN: 'คุณไม่มีสิทธิ์ทำรายการนี้',
    INVALID_INPUT: 'ข้อมูลไม่ถูกต้อง',
    ALREADY_INITIALIZED: 'ตั้งค่าผู้ดูแลระบบไปแล้ว',
    TOO_MANY_ATTEMPTS: 'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
    INVALID_AD_CREDENTIALS: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    INVALID_LOCAL_CREDENTIALS: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    CANNOT_CHANGE_OWN_ROLE: 'ไม่สามารถเปลี่ยนบทบาทของตัวเองได้',
    EMAIL_IN_USE: 'มีผู้ใช้อีเมลนี้อยู่แล้ว',
    USER_NOT_FOUND: 'ไม่พบผู้ใช้',
    SSO_LDAP_NO_RESET: 'บัญชีนี้ใช้รหัสผ่านจาก SSO/LDAP เปลี่ยนที่ระบบนั้นแทน',
    NO_PASSWORD_SET: 'บัญชีนี้ไม่มีรหัสผ่านในระบบ',
    ROLE_NAME_REQUIRED: 'กรุณากรอกชื่อบทบาท',
    ROLE_NOT_FOUND: 'ไม่พบบทบาทที่เลือก',
    SYSTEM_ROLE_EDIT_BLOCKED: 'บทบาทระบบไม่สามารถแก้ไขได้',
    SYSTEM_ROLE_DELETE_BLOCKED: 'บทบาทระบบไม่สามารถลบได้',
    RESET_LINK_RATE_LIMITED: 'ขอลิงก์บ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
    RATE_LIMITED: 'ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
    RESET_LINK_INVALID: 'ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่',
    SESSION_EXPIRED: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    CHANGE_PASSWORD_FAILED: 'เปลี่ยนรหัสผ่านไม่สำเร็จ',
    WRONG_CURRENT_PASSWORD: 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
    CURRENT_PASSWORD_REQUIRED: 'กรุณากรอกรหัสผ่านปัจจุบัน',
    PASSWORD_TOO_SHORT: 'รหัสผ่านต้องยาวอย่างน้อย {min} ตัวอักษร',
    PASSWORD_TOO_LONG: 'รหัสผ่านต้องไม่เกิน {max} ตัวอักษร',
    PASSWORD_NEED_LOWER: 'ต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว',
    PASSWORD_NEED_UPPER: 'ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว',
    PASSWORD_NEED_DIGIT: 'ต้องมีตัวเลขอย่างน้อย 1 ตัว',
    PASSWORD_MISMATCH: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน',
    USER_NAME_REQUIRED: 'กรุณากรอกชื่อ',
    EMAIL_REQUIRED: 'กรอกอีเมล',
    EMAIL_INVALID: 'กรุณากรอกอีเมลให้ถูกต้อง',
    PASSWORD_REQUIRED: 'กรอกรหัสผ่าน',
    AD_USERNAME_REQUIRED: 'กรอกชื่อผู้ใช้ AD',
  },
  passwordPolicy: {
    hint: 'อย่างน้อย {min} ตัวอักษร และต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลข',
  },
} as const;
```

`assets/messages/auth.en.ts` (same keys, English values — `Record<keyof typeof authTh[ns], string>` per namespace, mirroring `kit.en.ts`'s shape):

```ts
// kit: ugt-nextjs-platform 4.47.0 · ugt-nextjs-auth-setup/messages/auth.en.ts
// kit-hash: __STAMPED_BY_stamp-kit-assets.mjs__
import type { authTh } from './auth.th';

export const authEn: { [K in keyof typeof authTh]: Record<keyof (typeof authTh)[K], string> } = {
  errors: {
    UNAUTHORIZED: 'Please sign in to continue.',
    FORBIDDEN: "You don't have permission for this action.",
    INVALID_INPUT: 'Please check the information you entered.',
    ALREADY_INITIALIZED: 'Admin setup has already been completed.',
    TOO_MANY_ATTEMPTS: 'Too many attempts. Please try again later.',
    INVALID_AD_CREDENTIALS: 'Invalid username or password.',
    INVALID_LOCAL_CREDENTIALS: 'Invalid email or password.',
    CANNOT_CHANGE_OWN_ROLE: 'You cannot change your own role.',
    EMAIL_IN_USE: 'This email is already in use.',
    USER_NOT_FOUND: 'User not found.',
    SSO_LDAP_NO_RESET: 'This account signs in through SSO/LDAP — change the password there instead.',
    NO_PASSWORD_SET: 'This account has no password set.',
    ROLE_NAME_REQUIRED: 'Please enter a role name.',
    ROLE_NOT_FOUND: 'Role not found.',
    SYSTEM_ROLE_EDIT_BLOCKED: 'System roles cannot be edited.',
    SYSTEM_ROLE_DELETE_BLOCKED: 'System roles cannot be deleted.',
    RESET_LINK_RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
    RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
    RESET_LINK_INVALID: 'This link has expired or was already used. Please request a new one.',
    SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
    CHANGE_PASSWORD_FAILED: 'Could not change your password.',
    WRONG_CURRENT_PASSWORD: 'Your current password is incorrect.',
    CURRENT_PASSWORD_REQUIRED: 'Please enter your current password.',
    PASSWORD_TOO_SHORT: 'Password must be at least {min} characters.',
    PASSWORD_TOO_LONG: 'Password must be at most {max} characters.',
    PASSWORD_NEED_LOWER: 'Must include at least one lowercase letter.',
    PASSWORD_NEED_UPPER: 'Must include at least one uppercase letter.',
    PASSWORD_NEED_DIGIT: 'Must include at least one digit.',
    PASSWORD_MISMATCH: "The two passwords don't match.",
    USER_NAME_REQUIRED: 'Please enter a name.',
    EMAIL_REQUIRED: 'Please enter an email.',
    EMAIL_INVALID: 'Please enter a valid email.',
    PASSWORD_REQUIRED: 'Please enter a password.',
    AD_USERNAME_REQUIRED: 'Please enter your AD username.',
  },
  passwordPolicy: {
    hint: 'At least {min} characters, including lowercase, uppercase, and a digit.',
  },
};
```

Note: `auth.en.ts` imports `authTh`'s type only (`import type`) — same trick `kit.en.ts` does not currently need (it hand-writes `Record<...>` inline) but is used here because `authEn`'s mapped type must stay in lockstep with `authTh`'s namespace/key shape without duplicating it. This is intentional and matches mission 2.4's "type safety แถม" rationale: add a key to `auth.th.ts` and forget `auth.en.ts` → red squiggly at type-check time, not a runtime `check-i18n.mjs` failure days later.

- [ ] **Step 2: Register the `auth` catalog in `i18n/messages.ts`**

This file is **owned by `ugt-nextjs-design-setup`** and already lives in every th+en project (phase 0+1). Auth-setup does not ship its own copy — it edits the project's existing one. Document this as an install step (already partly staged for Task 14's SKILL.md update); for this task, apply the edit directly to a scratch project copy to prove it type-checks (see Step 6).

The edit (exactly the "one import + one spread" the file's own header comment describes):

```ts
// added imports
import { authEn } from '@/messages/auth.en';
import { authTh } from '@/messages/auth.th';

// KitCatalog type stays; add a sibling AuthCatalog type the same way
type AuthCatalog = {
  [Namespace in keyof typeof authTh]: Record<keyof (typeof authTh)[Namespace], string>;
};

export const messages: Record<AppLocale, { kit: KitCatalog; auth: AuthCatalog }> = {
  th: { kit: kitTh, auth: authTh },
  en: { kit: kitEn, auth: authEn },
};
```

- [ ] **Step 3: Create `lib/use-field-error.ts`**

```ts
'use client';
// kit: ugt-nextjs-platform 4.47.0 · ugt-nextjs-auth-setup/lib/use-field-error.ts
// kit-hash: __STAMPED_BY_stamp-kit-assets.mjs__

// Every zod schema in this skill that validates user input uses a CODE
// (e.g. 'EMAIL_REQUIRED') as its message, not prose — see auth.errors in
// messages/auth.th.ts. react-hook-form puts that code straight into
// `formState.errors.<field>.message`. This hook translates it at render
// time, right before it reaches <FieldError>, so the schema itself never
// needs access to `useTranslations` (module-scope schemas can't call hooks).
import { useTranslations } from 'next-intl';
import type { FieldError } from 'react-hook-form';

export function useFieldErrorText() {
  const t = useTranslations('auth.errors');
  return (error: FieldError | undefined, vars?: Record<string, string | number>) =>
    error ? [{ ...error, message: t(error.message as Parameters<typeof t>[0], vars) }] : undefined;
}
```

- [ ] **Step 4: Rewrite the five Server Action files to return codes**

`lib/actions/auth.ts` defines its own server-side re-validation schemas,
`ldapSchema`/`localSchema` (lines 20–29) — distinct from `login-form.tsx`'s
client-side `ldapLoginSchema`/`localLoginSchema` (Task 2). Both currently use
**English prose**, not Thai (which is why this file didn't show up in the
Thai-line scan) — but prose is still not a code, so it must convert too:

```ts
// CURRENT (English prose — not a code, must still change):
//   const ldapSchema = z.object({
//     username: z.string().min(1, 'Username is required'),
//     password: z.string().min(1, 'Password is required'),
//   });
//   const localSchema = z.object({
//     email: z.email(),                                    // no message at all
//     password: z.string().min(1, 'Password is required'),
//   });

// REPLACE WITH:
const ldapSchema = z.object({
  username: z.string().min(1, 'AD_USERNAME_REQUIRED'),
  password: z.string().min(1, 'PASSWORD_REQUIRED'),
});
const localSchema = z.object({
  email: z.email('EMAIL_INVALID'),
  password: z.string().min(1, 'PASSWORD_REQUIRED'),
});
```

Then replace both actions' error returns:

```ts
export async function ldapLoginAction(values: {
  username: string;
  password: string;
}): Promise<{ code: string } | void> {
  const parsed = ldapSchema.safeParse(values);
  if (!parsed.success) {
    return { code: parsed.error.issues[0]?.message ?? 'INVALID_INPUT' };
  }
  const { username, password } = parsed.data;
  const { ip, userAgent } = await getRequestMeta();
  if (!checkRateLimit(`ldap:${ip}`, 10, 15 * 60 * 1000)) {
    return { code: 'TOO_MANY_ATTEMPTS' };
  }
  let ldapUser;
  try {
    ldapUser = await ldapBind(username, password);
  } catch {
    await logAuthEvent('login.failed', 'anonymous', { authType: 'ldap', username, ip, userAgent });
    return { code: 'INVALID_AD_CREDENTIALS' };
  }
  // ...unchanged below this point...
}

export async function localLoginAction(values: {
  email: string;
  password: string;
}): Promise<{ code: string } | void> {
  const parsed = localSchema.safeParse(values);
  if (!parsed.success) {
    return { code: parsed.error.issues[0]?.message ?? 'INVALID_INPUT' };
  }
  const { ip, userAgent } = await getRequestMeta();
  if (!checkRateLimit(`local:${ip}`, 10, 15 * 60 * 1000)) {
    return { code: 'TOO_MANY_ATTEMPTS' };
  }
  const result = await auth.api.signInEmail({
    body: { email: parsed.data.email, password: parsed.data.password },
    asResponse: true,
  });
  if (!result.ok) {
    await logAuthEvent('login.failed', 'anonymous', {
      authType: 'local', email: parsed.data.email, ip, userAgent,
    });
    return { code: 'INVALID_LOCAL_CREDENTIALS' };
  }
  // ...unchanged below this point...
}
```

`lib/actions/admin-setup.ts`:

```ts
export async function initializeAdminAction(): Promise<{ code: string } | void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { code: 'UNAUTHORIZED' };
  const alreadyDone = await isAdminInitialized();
  if (alreadyDone) return { code: 'ALREADY_INITIALIZED' };
  // ...unchanged below this point...
}
```

`lib/actions/admin-roles.ts` — `requirePermission`'s own `error: 'Unauthorized'/'Forbidden'` becomes `error: 'UNAUTHORIZED'/'FORBIDDEN'` (still under the `error` key internally — it is a private helper, not returned to the client directly; each caller re-wraps it, see below), and every `ActionResult`'s `error` field becomes `code`:

```ts
type ActionResult = { success: true } | { success: false; code: string };

async function requirePermission(key: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false as const, code: 'UNAUTHORIZED' };
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(key)) return { ok: false as const, code: 'FORBIDDEN' };
  return { ok: true as const, session };
}

export async function createRoleAction(input: RoleInput): Promise<ActionResult> {
  const gate = await requirePermission(PERMISSIONS.ROLES_CREATE);
  if (!gate.ok) return { success: false, code: gate.code };
  if (!input.name.trim()) return { success: false, code: 'ROLE_NAME_REQUIRED' };
  // ...unchanged below this point...
}

export async function updateRoleAction(roleId: string, input: RoleInput): Promise<ActionResult> {
  const gate = await requirePermission(PERMISSIONS.ROLES_UPDATE);
  if (!gate.ok) return { success: false, code: gate.code };
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { isSystem: true } });
  if (!role) return { success: false, code: 'ROLE_NOT_FOUND' };
  if (role.isSystem) return { success: false, code: 'SYSTEM_ROLE_EDIT_BLOCKED' };
  if (!input.name.trim()) return { success: false, code: 'ROLE_NAME_REQUIRED' };
  // ...unchanged below this point...
}

export async function deleteRoleAction(roleId: string): Promise<ActionResult> {
  const gate = await requirePermission(PERMISSIONS.ROLES_DELETE);
  if (!gate.ok) return { success: false, code: gate.code };
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { isSystem: true, name: true } });
  if (!role) return { success: false, code: 'ROLE_NOT_FOUND' };
  if (role.isSystem) return { success: false, code: 'SYSTEM_ROLE_DELETE_BLOCKED' };
  // ...unchanged below this point...
}
```

`lib/actions/admin-users.ts` — this is where the actual bug (`admin-user-actions.tsx:82`) gets its fix: `createLocalUserAction` now returns `code` **and** `field` (from the zod issue's own `path`, not from text-matching), and `createLocalUserSchema`'s messages become the shared codes (unifying with `admin-user-actions.tsx`'s client-side create-user schema per the Global Constraint):

```ts
type ActionResult = { success: true } | { success: false; code: string; field?: string };

const createLocalUserSchema = z.object({
  name: z.string().min(1, 'USER_NAME_REQUIRED').max(255),
  email: z.email('EMAIL_INVALID').max(255),
  password: passwordSchema, // codes come from Task 8's password-policy.ts rewrite
  roleId: z.string().nullable(),
});

export async function assignUserRoleAction(userId: string, roleId: string | null): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, code: 'UNAUTHORIZED' };
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_UPDATE)) return { success: false, code: 'FORBIDDEN' };
  if (userId === session.user.id) return { success: false, code: 'CANNOT_CHANGE_OWN_ROLE' };
  // ...unchanged below this point...
}

export async function createLocalUserAction(values: {
  name: string; email: string; password: string; roleId: string | null;
}): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, code: 'UNAUTHORIZED' };
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_CREATE)) return { success: false, code: 'FORBIDDEN' };

  const parsed = createLocalUserSchema.safeParse(values);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { success: false, code: issue?.message ?? 'INVALID_INPUT', field: issue?.path[0]?.toString() };
  }
  const { name, email, password, roleId } = parsed.data;
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return { success: false, code: 'EMAIL_IN_USE', field: 'email' };
  }
  // ...unchanged below this point (transaction, audit log, revalidatePath, return { success: true })...
}

export async function setUserPasswordAction(values: {
  userId: string; newPassword: string;
}): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, code: 'UNAUTHORIZED' };
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_RESET_PASSWORD)) return { success: false, code: 'FORBIDDEN' };

  const parsed = setPasswordSchema.safeParse(values);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { success: false, code: issue?.message ?? 'INVALID_INPUT', field: issue?.path[0]?.toString() };
  }
  const { userId, newPassword } = parsed.data;
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { authType: true } });
  if (!target) return { success: false, code: 'USER_NOT_FOUND' };
  if (target.authType !== 'local') return { success: false, code: 'SSO_LDAP_NO_RESET' };

  const updated = await prisma.account.updateMany({
    where: { userId, providerId: 'credential' },
    data: { password: await hashPassword(newPassword) },
  });
  if (updated.count === 0) return { success: false, code: 'NO_PASSWORD_SET' };
  // ...unchanged below this point...
}
```

`lib/actions/password.ts`:

```ts
const forgotSchema = z.object({ email: z.email() }); // unused message — unchanged, see note below

export async function forgotPasswordAction(values: {
  email: string;
}): Promise<{ ok: true } | { code: string }> {
  const parsed = forgotSchema.safeParse(values);
  if (!parsed.success) return { ok: true }; // unchanged — enumeration defense, zod message is discarded either way
  const { ip, userAgent } = await getRequestMeta();
  if (!checkRateLimit(`forgot:${ip}`, 3, 15 * 60 * 1000)) {
    return { code: 'RESET_LINK_RATE_LIMITED' };
  }
  // ...unchanged below this point (all remaining paths already return { ok: true })...
}

const resetSchema = z.object({ token: z.string().min(1), password: passwordSchema });

export async function resetPasswordAction(values: {
  token: string; password: string;
}): Promise<{ ok: true } | { code: string }> {
  const parsed = resetSchema.safeParse(values);
  if (!parsed.success) {
    return { code: parsed.error.issues[0]?.message ?? 'INVALID_INPUT' };
  }
  const { ip, userAgent } = await getRequestMeta();
  if (!checkRateLimit(`reset:${ip}`, 10, 15 * 60 * 1000)) {
    return { code: 'RATE_LIMITED' };
  }
  try {
    await auth.api.resetPassword({ body: { token: parsed.data.token, newPassword: parsed.data.password } });
  } catch {
    return { code: 'RESET_LINK_INVALID' };
  }
  return { ok: true };
}

const changeSchema = z.object({
  currentPassword: z.string().min(1, 'CURRENT_PASSWORD_REQUIRED'),
  newPassword: passwordSchema,
});

export async function changePasswordAction(values: {
  currentPassword: string; newPassword: string;
}): Promise<{ ok: true } | { code: string }> {
  const parsed = changeSchema.safeParse(values);
  if (!parsed.success) {
    return { code: parsed.error.issues[0]?.message ?? 'INVALID_INPUT' };
  }
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return { code: 'SESSION_EXPIRED' };
  const { ip, userAgent } = await getRequestMeta();
  if (!checkRateLimit(`change:${session.user.id}`, 5, 15 * 60 * 1000)) {
    return { code: 'RATE_LIMITED' };
  }
  let result: Response;
  try {
    result = await auth.api.changePassword({
      body: { currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword, revokeOtherSessions: true },
      headers: requestHeaders, asResponse: true,
    });
  } catch {
    return { code: 'CHANGE_PASSWORD_FAILED' };
  }
  if (!result.ok) {
    await logAuthEvent('password.change.failed', session.user.id, { ip, userAgent });
    return { code: 'WRONG_CURRENT_PASSWORD' };
  }
  // ...unchanged below this point...
}
```

- [ ] **Step 5: Fix the four consumers that read `result.error`**

`components/login-form.tsx` — both `setError('root', { message: result.error })` sites become:

```ts
const t = useTranslations('auth.errors'); // add inside LdapSection / LocalSection
// ...
if (result?.code) {
  setError('root', { message: t(result.code as Parameters<typeof t>[0]) });
  return;
}
```

`components/admin-user-actions.tsx` — delete the regex entirely; use `result.field`. The original code's non-field-specific branch renders `errors.root` through a `<Callout>` already on screen (line 117), **not** a toast — keep that:

```ts
// DELETE:
//   if (/อีเมล|email/i.test(result.error)) setError('email', { message: result.error });
//   else setError('root', { message: result.error });
// REPLACE with:
const t = useTranslations('auth.errors'); // add inside CreateUserDialog
// ...
if (!result.success) {
  const text = t(result.code as Parameters<typeof t>[0]);
  if (result.field === 'email') setError('email', { message: text });
  else if (result.field === 'name') setError('name', { message: text });
  else setError('root', { message: text });
  return;
}
```

`components/admin-setup-form.tsx` — `toast.error('ตั้งค่าไม่สำเร็จ', { description: result.error })` becomes (namespace text `'ตั้งค่าไม่สำเร็จ'` itself is Task 11's job — for this task, only fix the `description` source):

```ts
const tErrors = useTranslations('auth.errors');
// ...
toast.error('ตั้งค่าไม่สำเร็จ', { description: tErrors(result.code as Parameters<typeof tErrors>[0]) });
```

`components/user-role-select.tsx` — same shape:

```ts
const tErrors = useTranslations('auth.errors');
// ...
if (!result.success) toast.error('เปลี่ยนบทบาทไม่สำเร็จ', { description: tErrors(result.code as Parameters<typeof tErrors>[0]) });
```

`components/roles-manager.tsx` — the client-side wrapper around `deleteRoleAction` (currently `return { error: 'ไม่พบบทบาทที่เลือก' }` / `return { error: result.error ?? 'ลบไม่สำเร็จ' }`) becomes:

```ts
if (!deleteTarget) return { code: 'ROLE_NOT_FOUND' as const };
return result.success ? { ok: true } : { code: result.code };
```

(The `<ConfirmActionDialog>` that renders this result's error is fully converted in Task 3 — for this task, only make the shape carry a `code`, not prose.)

- [ ] **Step 6: Verify — type-check + prove the contract against a scratch project**

```bash
cd D:\Project_2026\ugt-claude-platform
node -e "require('./plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/lib/actions/auth.ts')" 2>&1 | head -5
```

(that direct `require` will fail on TS syntax — it's only there to confirm the file parses; the real check is copying the five action files + `login-form.tsx`/`admin-user-actions.tsx`/`admin-setup-form.tsx`/`user-role-select.tsx`/`roles-manager.tsx` into a real Next.js project that already has phase 0+1 installed, then running `npx tsc --noEmit`.) Since no live consuming project is available in this repo, the practical check for this task is:

```bash
node "D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-design-setup\scripts\check-i18n.mjs" "D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-auth-setup\assets"
```

Expect the "catalog key parity" check to now pass for `auth.th.ts`/`auth.en.ts` (0 problems). The "converted files" check still reports the design-setup file list only — Task 14 adds auth-setup's files to it.

Also grep to confirm no remaining raw-Thai `error:` returns in the five action files:

```bash
grep -n "error: '" "D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-auth-setup\assets\lib\actions\"*.ts
```

Expect zero matches (the only remaining `error:` should be TypeScript type annotations like `error: string` if any were intentionally left — there should be none after this task; every action's result type uses `code`).

- [ ] **Step 7: Commit**

```bash
git add plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/messages/auth.th.ts \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/messages/auth.en.ts \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/lib/use-field-error.ts \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/lib/actions/auth.ts \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/lib/actions/admin-setup.ts \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/lib/actions/admin-users.ts \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/lib/actions/admin-roles.ts \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/lib/actions/password.ts \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/components/login-form.tsx \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/components/admin-user-actions.tsx \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/components/admin-setup-form.tsx \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/components/user-role-select.tsx \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/components/roles-manager.tsx
git commit -m "feat(auth-setup): error-code contract — server actions return codes, not prose

Fixes admin-user-actions.tsx:82's /อีเมล|email/i.test(result.error) trap: the
create-user action now returns the offending zod field via `field`, so the
client routes the error without pattern-matching translated text. Every
Server Action in auth-setup now returns { code } instead of { error: '<Thai
or English prose>' }, closing spec mission 2.6 for this skill."
```

---

### Task 2: `components/login-form.tsx`

**Files:**
- Modify: `assets/components/login-form.tsx`

**Interfaces:**
- Consumes: `auth.errors` (Task 1), `useFieldErrorText()` (Task 1).
- Produces: `auth.login` namespace.

**String table** (line numbers from the pre-Task-1 file; add each key to `auth.th.ts`/`auth.en.ts` under `login`):

| Line(s) | Thai | Key | English |
| --- | --- | --- | --- |
| 57 | ไม่สามารถเชื่อมต่อระบบ SSO ได้ กรุณาลองใหม่อีกครั้ง | `login.ssoConnectFailed` | Couldn't connect to SSO. Please try again. |
| 65 | เข้าสู่ระบบด้วยบัญชีองค์กร (Single Sign-On) | `login.ssoTitle` | Sign in with your organization account (Single Sign-On) |
| 71 | กำลังเชื่อมต่อ... | `login.ssoConnecting` | Connecting... |
| 76, 145, 225 | เข้าสู่ระบบ | `login.submit` | Sign in |
| 132, 200 | รหัสผ่าน (label) | `login.passwordLabel` | Password |
| 186 | อีเมล (label) | `login.emailLabel` | Email |
| 211 | ลืมรหัสผ่าน? | `login.forgotPasswordLink` | Forgot password? |
| 257 | เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง | `login.sessionExpiredBanner` | Your session has expired. Please sign in again. |
| 239 | เข้าสู่ระบบสำเร็จ แต่สร้างบัญชีผู้ใช้ไม่สำเร็จ กรุณาแจ้งผู้ดูแลระบบ (unable_to_create_user) | `login.ssoErrorUnableToCreateUser` | Signed in, but the account could not be created. Please contact your administrator. (unable_to_create_user) |
| 241 | บัญชีนี้ยังเชื่อมกับระบบไม่ได้ กรุณาแจ้งผู้ดูแลระบบ (account_not_linked) | `login.ssoErrorAccountNotLinked` | This account isn't linked yet. Please contact your administrator. (account_not_linked) |
| 263 | เข้าสู่ระบบไม่สำเร็จ กรุณาแจ้งผู้ดูแลระบบ ({ssoError}) | `login.ssoErrorGeneric` (with `{code}` var) | Sign-in failed. Please contact your administrator. ({code}) |
| 271 | เข้าสู่ระบบเพื่อใช้งาน | `login.subtitle` | Sign in to continue |
| 282 | หรือ | `login.orSeparator` | or |
| 291 | บัญชี AD | `login.tabAd` | AD account |
| 294 | อีเมล (tab label) | `login.tabEmail` | Email |

Zod schema messages (both `ldapLoginSchema` and `localLoginSchema`, module scope in this file — NOT `lib/actions/auth.ts`): replace `'กรอกชื่อผู้ใช้ AD'` → `'AD_USERNAME_REQUIRED'`, `'กรอกรหัสผ่าน'` (both occurrences) → `'PASSWORD_REQUIRED'`, `'กรอกอีเมล'` → `'EMAIL_REQUIRED'`, `'รูปแบบอีเมลไม่ถูกต้อง'` → `'EMAIL_INVALID'` (these are codes already defined in Task 1's `auth.errors` — do not add new keys for them).

- [ ] **Step 1: Add the `login` namespace entries to `auth.th.ts` and `auth.en.ts`** using the table above.

- [ ] **Step 2: Convert `SsoSection`**

```tsx
'use client';
import { useTranslations } from 'next-intl';
// ...
function SsoSection() {
  const t = useTranslations('auth.login');
  // ...
  } catch {
    toast.error(t('ssoConnectFailed'));
    setIsLoading(false);
  }
  // ...
  <h2>{t('ssoTitle')}</h2> {/* replace the literal JSX text at line 65 */}
  {isLoading ? t('ssoConnecting') : /* existing non-loading label, unchanged */}
```

- [ ] **Step 3: Convert `LdapSection`** — move `ldapLoginSchema` inside the component (it must be inside to call `useTranslations`, OR keep it module-scope with CODE messages and translate via `useFieldErrorText()` — **use the second approach**, consistent with the Global Constraint and with Task 1's `use-field-error.ts`):

```tsx
import { useFieldErrorText } from '@/lib/use-field-error';

const ldapLoginSchema = z.object({
  username: z.string().trim().min(1, 'AD_USERNAME_REQUIRED'),
  password: z.string().min(1, 'PASSWORD_REQUIRED'),
});

function LdapSection() {
  const router = useRouter();
  const t = useTranslations('auth.login');
  const tErrors = useTranslations('auth.errors');
  const fieldError = useFieldErrorText();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LdapValues>({
    resolver: zodResolver(ldapLoginSchema),
    defaultValues: { username: '', password: '' },
  });
  const onSubmit = handleSubmit(async (values) => {
    const result = await ldapLoginAction(values);
    if (result?.code) {
      setError('root', { message: tErrors(result.code as Parameters<typeof tErrors>[0]) });
      return;
    }
    router.push('/');
  });
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {errors.root?.message && <Callout tone="danger">{errors.root.message}</Callout>}
      <Field data-invalid={!!errors.username}>
        <FieldLabel htmlFor="ldap-username">
          Username (AD)<span className="text-destructive">*</span>
        </FieldLabel>
        <Input id="ldap-username" autoComplete="username" aria-invalid={!!errors.username} {...register('username')} />
        <FieldError errors={fieldError(errors.username)} />
      </Field>
      <Field data-invalid={!!errors.password}>
        <FieldLabel htmlFor="ldap-password">
          {t('passwordLabel')}<span className="text-destructive">*</span>
        </FieldLabel>
        <Input id="ldap-password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register('password')} />
        <FieldError errors={fieldError(errors.password)} />
      </Field>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {t('submit')}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Convert `LocalSection`** — same pattern as Step 3, plus the "ลืมรหัสผ่าน?" button:

```tsx
const localLoginSchema = z.object({
  email: z.string().trim().min(1, 'EMAIL_REQUIRED').email('EMAIL_INVALID'),
  password: z.string().min(1, 'PASSWORD_REQUIRED'),
});
// inside LocalSection, alongside the LdapSection changes:
<FieldLabel htmlFor="local-email">{t('emailLabel')}<span className="text-destructive">*</span></FieldLabel>
<FieldError errors={fieldError(errors.email)} />
// ...
<FieldLabel htmlFor="local-password">{t('passwordLabel')}<span className="text-destructive">*</span></FieldLabel>
<Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground" onClick={() => setForgotOpen(true)}>
  {t('forgotPasswordLink')}
</Button>
<FieldError errors={fieldError(errors.password)} />
// ...
{t('submit')}
```

- [ ] **Step 5: Convert `SSO_ERROR_MESSAGES` and the exported `LoginForm`'s banner logic**

```tsx
export function LoginForm({ className, sessionExpired = false, ssoError }: Readonly<{...}>) {
  const t = useTranslations('auth.login');
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? '__PROJECT_NAME__';
  const banner = sessionExpired
    ? { tone: 'warning' as const, text: t('sessionExpiredBanner') }
    : ssoError
      ? {
          tone: 'danger' as const,
          text:
            ssoError === 'unable_to_create_user' ? t('ssoErrorUnableToCreateUser') :
            ssoError === 'account_not_linked' ? t('ssoErrorAccountNotLinked') :
            t('ssoErrorGeneric', { code: ssoError }),
        }
      : null;
  // ...
  <p className="text-sm text-balance text-muted-foreground">{t('subtitle')}</p>
  // ...
  <span className="relative z-10 bg-background px-2 text-muted-foreground">{t('orSeparator')}</span>
  // ...
  <TabsTrigger value="ad">{t('tabAd')}</TabsTrigger>
  <TabsTrigger value="email">{t('tabEmail')}</TabsTrigger>
```

(Delete the module-scope `SSO_ERROR_MESSAGES` object — its two keys became the two ternary branches above.)

- [ ] **Step 6: Verify**

```bash
node "D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-design-setup\scripts\check-i18n.mjs" "D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-auth-setup\assets"
```

Manually grep the file for the Thai character range to confirm zero code-side hits remain (comments still legitimately contain Thai — that's fine):

```bash
node "C:\Users\pakornwo\AppData\Local\Temp\claude\D--Project-2026-ugt-claude-platform\778163ab-06b0-4bd9-b446-245315698820\scratchpad\thai-extract.mjs" "D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-auth-setup\assets\components\login-form.tsx"
```

Expect no output (the script prints one line per Thai code-line found; empty output = clean). If this scratchpad script is unavailable in a later session, re-derive it from `check-i18n.mjs`'s `stripComments` function (same character-by-character comment stripper) or just visually confirm no `'...'`/`"..."`/`` `...` `` in the file contains Thai characters outside a `//` or `/* */` block.

- [ ] **Step 7: Commit**

```bash
git add plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/components/login-form.tsx \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/messages/auth.th.ts \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/assets/messages/auth.en.ts
git commit -m "feat(auth-setup): translate login-form.tsx (auth.login namespace)"
```

---

### Task 3: `components/roles-manager.tsx`

**Files:**
- Modify: `assets/components/roles-manager.tsx`

**Interfaces:**
- Consumes: `auth.errors` (Task 1) — this file's delete-confirmation error path already returns `{ code }` from Task 1 Step 5.
- Produces: `auth.rolesManager` namespace.

**String table:**

| Line(s) | Thai | Key | English |
| --- | --- | --- | --- |
| 59, 75, 78, 93 (col headers, `mobileLabel`) | บทบาท / สิทธิ์ / จัดการ | `rolesManager.colRole`, `rolesManager.colPermissions`, `rolesManager.colActions` | Role / Permissions / Actions |
| 66 | ระบบ (badge on system roles) | `rolesManager.systemBadge` | System |
| 72 | คำอธิบาย (col header) | `rolesManager.colDescription` | Description |
| 98 | บทบาทระบบ — แก้ไขไม่ได้ / แก้ไข | `rolesManager.editSystemBlocked`, `rolesManager.edit` | This is a system role — cannot be edited / Edit |
| 108 | บทบาทระบบ — ลบไม่ได้ / ลบ | `rolesManager.deleteSystemBlocked`, `rolesManager.delete` | This is a system role — cannot be deleted / Delete |
| 129 | บทบาทและสิทธิ์ | `rolesManager.pageTitle` | Roles & Permissions |
| 130 | สิทธิ์ทั้งหมดของระบบจับคู่เข้ากับบทบาทที่หน้านี้ | `rolesManager.pageDescription` | Every permission in the system is mapped to a role here |
| 136 | สร้างบทบาท | `rolesManager.create` | Create role |
| 142 | ค้นหาบทบาท... | `rolesManager.searchPlaceholder` | Search roles... |
| 148 | แก้ไขบทบาท / สร้างบทบาท (sheet title) | `rolesManager.editTitle`, `rolesManager.createTitle` | Edit role / Create role |
| 168 | ลบบทบาท "{name}" | `rolesManager.deleteConfirmTitle` (var `{name}`) | Delete role "{name}" |
| 169 | ผู้ใช้ที่มีบทบาทนี้จะกลายเป็น "ไม่มีบทบาท" และใช้งานได้เฉพาะหน้าทั่วไปจนกว่าจะได้รับบทบาทใหม่ | `rolesManager.deleteConfirmDescription` | Users with this role will become "unassigned" and can only access general pages until given a new role |
| 170 | ลบบทบาท (confirm button) | `rolesManager.deleteConfirmButton` | Delete role |
| 171 | ลบบทบาทแล้ว (success toast) | `rolesManager.deleteSuccess` | Role deleted |

- [ ] **Step 1: Add `rolesManager` keys to both catalog files.**
- [ ] **Step 2: Replace every literal above with `t('rolesManager.<key>')`** (add `const t = useTranslations('auth.rolesManager');` and, for the error path, `const tErrors = useTranslations('auth.errors');`) — the delete handler becomes:

```tsx
if (!deleteTarget) return { code: 'ROLE_NOT_FOUND' as const };
const result = await deleteRoleAction(deleteTarget.id);
return result.success ? { ok: true } : { error: tErrors(result.code as Parameters<typeof tErrors>[0]) };
```

(`ConfirmActionDialog` expects `{ error: string }` on failure per its existing contract — that prop shape is unchanged; only the source of the string moves from a Thai literal to a translated lookup.)

- [ ] **Step 3: Verify** — same two commands as Task 2 Step 6, target `components/roles-manager.tsx`.
- [ ] **Step 4: Commit** — `feat(auth-setup): translate roles-manager.tsx (auth.rolesManager namespace)`

---

### Task 4: `components/admin-user-actions.tsx`

**Files:**
- Modify: `assets/components/admin-user-actions.tsx`

**Interfaces:**
- Consumes: `auth.errors`, `useFieldErrorText()` (Task 1 already rewired the `result.code`/`result.field` dispatch here — this task only does the remaining UI-label strings and the create-user schema's shared codes were already applied in Task 1 Step 4).
- Produces: `auth.adminUserActions` namespace.

**String table:**

| Line(s) | Thai | Key | English |
| --- | --- | --- | --- |
| 87 | สร้างผู้ใช้แล้ว — แจ้งรหัสผ่านตั้งต้นให้เจ้าตัวและให้เปลี่ยนทันที | `adminUserActions.createSuccess` | User created — tell them the initial password and have them change it right away |
| 96, 108 | เพิ่มผู้ใช้ local | `adminUserActions.addLocalUser` | Add local user |
| 110 | บัญชี SSO/AD ไม่ต้องเพิ่ม — เกิดเองเมื่อเจ้าตัวเข้าสู่ระบบครั้งแรก | `adminUserActions.addUserHintSso` | SSO/AD accounts don't need to be added — they're created automatically on first sign-in |
| 111 | แล้วค่อยกำหนดบทบาทจากตาราง | `adminUserActions.addUserHintRole` | Assign a role from the table afterward |
| 121 | ชื่อ (label) | `adminUserActions.nameLabel` | Name |
| 129 | อีเมล (label) | `adminUserActions.emailLabel` | Email |
| 143 | รหัสผ่านตั้งต้น (label) | `adminUserActions.initialPasswordLabel` | Initial password |
| 158 | บทบาท (label) | `adminUserActions.roleLabel` | Role |
| 168 | ยังไม่กำหนด | `adminUserActions.noRoleOption` | Not assigned |
| 184, 272 | ยกเลิก | `adminUserActions.cancel` | Cancel |
| 188 | สร้าง | `adminUserActions.createSubmit` | Create |
| 223 | ตั้งรหัสผ่านใหม่แล้ว — แจ้งเจ้าตัวและให้เปลี่ยนเองทันทีที่เข้าระบบ | `adminUserActions.setPasswordSuccess` | Password set — tell them to change it themselves as soon as they sign in |
| 231 | ตั้งรหัสผ่าน (icon action label) | `adminUserActions.setPasswordAction` | Set password |
| 244 | ตั้งรหัสผ่านใหม่ (dialog title) | `adminUserActions.setPasswordTitle` | Set new password |
| 246 | {userName} — ทุกอุปกรณ์ที่เขาเข้าระบบค้างไว้จะถูกออกจากระบบทันที | `adminUserActions.setPasswordDescription` (var `{userName}`) | {userName} — every device they're signed in on will be signed out immediately |
| 255 | รหัสผ่านใหม่ (label) | `adminUserActions.newPasswordLabel` | New password |
| 276 | ตั้งรหัสผ่าน (submit button) | `adminUserActions.setPasswordSubmit` | Set password |

This file has **two** `<FieldDescription>{PASSWORD_POLICY_HINT}</FieldDescription>` sites (the create-user dialog's password field, line 152, and the set-password dialog's field, line 264) plus a `setPasswordFormSchema`/create-user password field both backed by `passwordSchema` from `lib/password-policy.ts` — **this task depends on Task 8 having already rewritten that file.** Run Task 8 before this task, not after.

- [ ] **Step 1: Add `adminUserActions` keys to both catalog files.**
- [ ] **Step 2: Replace every literal with `t('adminUserActions.<key>')`.** Add `const tPolicy = useTranslations('auth.passwordPolicy');` and `const fieldError = useFieldErrorText();` (Task 1) to the component, then at both password-hint sites:

```tsx
import { PASSWORD_MIN_LENGTH } from '@/lib/password-policy'; // replaces the PASSWORD_POLICY_HINT import
// ...
<FieldDescription>{tPolicy('hint', { min: PASSWORD_MIN_LENGTH })}</FieldDescription>
<FieldError errors={fieldError(errors.password, { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })} />
```

(import `PASSWORD_MAX_LENGTH` alongside `PASSWORD_MIN_LENGTH` — both interpolation vars are needed even though only `min` appears in the hint text, because the underlying `passwordSchema` can also raise `PASSWORD_TOO_LONG`.)

- [ ] **Step 3: Verify + Step 4: Commit** — same pattern as Task 3.

---

### Task 5: `components/audit-logs-table.tsx`

**Files:**
- Modify: `assets/components/audit-logs-table.tsx`

**Interfaces:**
- Produces: `auth.auditLogsTable` namespace.

**String table:**

| Line(s) | Thai | Key | English |
| --- | --- | --- | --- |
| 101 | เวลา (col header) | `auditLogsTable.colTime` | Time |
| 106 | ผู้กระทำ (col header) | `auditLogsTable.colActor` | Actor |
| 107 | การกระทำ (col header) | `auditLogsTable.colAction` | Action |
| 110 | รายละเอียด (col header) | `auditLogsTable.colDetail` | Detail |
| 136 | ค้นหาชื่อผู้ใช้หรืออีเมล... | `auditLogsTable.searchPlaceholder` | Search by name or email... |
| 143 | ตั้งแต่ | `auditLogsTable.fromLabel` | From |
| 144 | ถึง | `auditLogsTable.toLabel` | To |
| 155, 158 | ทุก action | `auditLogsTable.allActions` | All actions |
| 178 | รายละเอียด (dialog title) | `auditLogsTable.detailDialogTitle` | Detail |

- [ ] **Step 1: Add keys. Step 2: Replace literals with `t('auditLogsTable.<key>')`. Step 3: Verify. Step 4: Commit** — `feat(auth-setup): translate audit-logs-table.tsx (auth.auditLogsTable namespace)`.

---

### Task 6: `components/forgot-password-dialog.tsx`

**Files:**
- Modify: `assets/components/forgot-password-dialog.tsx`

**Interfaces:**
- Consumes: `auth.errors` (`EMAIL_REQUIRED`, `EMAIL_INVALID` — reused, do not redefine), `useFieldErrorText()`.
- Produces: `auth.forgotPassword` namespace.

**String table:**

| Line(s) | Thai | Key | English |
| --- | --- | --- | --- |
| 77 | ลืมรหัสผ่าน (dialog title) | `forgotPassword.title` | Forgot password |
| 79 | กรอกอีเมลของบัญชี ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้ | `forgotPassword.description` | Enter your account email and we'll send a password reset link |
| 88 | หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้แล้ว | `forgotPassword.sentMessage` | If this email is registered, we've sent a password reset link |
| 89 | ลิงก์ใช้ได้ครั้งเดียวและหมดอายุใน 60 นาที | `forgotPassword.sentHint` | The link is single-use and expires in 60 minutes |
| 93 | ปิด | `forgotPassword.close` | Close |
| 103 | อีเมล (label) | `forgotPassword.emailLabel` | Email |
| 118 | ยกเลิก | `forgotPassword.cancel` | Cancel |
| 122 | ส่งลิงก์ | `forgotPassword.submit` | Send link |

Zod schema (line 34): `email: z.string().min(1, 'EMAIL_REQUIRED').email('EMAIL_INVALID')` — codes reused from Task 1, no new catalog keys.

**Result handling** — Task 1 changed `forgotPasswordAction`'s return type to `{ ok: true } | { code: string }`. This file's `onSubmit` must switch on that (the plan's earlier draft omitted this — added during task review):

```tsx
const t = useTranslations('auth.forgotPassword');
const tErrors = useTranslations('auth.errors');
const fieldError = useFieldErrorText();
// ...
const onSubmit = handleSubmit(async (values) => {
  const result = await forgotPasswordAction(values);
  if ('code' in result) {
    setError('root', { message: tErrors(result.code as Parameters<typeof tErrors>[0]) });
    return;
  }
  setSent(true); // or whatever local state currently flips the dialog into its "sent" view
});
// JSX: {errors.root?.message && <Callout tone="danger">{errors.root.message}</Callout>}
```

(Read the actual current file first — `forgotPasswordAction`'s only pre-Task-1 failure path was the rate-limit case, so check whether the dialog already renders an `errors.root` Callout for it. If not, add one, following the same pattern as `login-form.tsx`'s `LdapSection`.)

- [ ] **Step 1: Add keys. Step 2: Convert schema to codes + wire `useFieldErrorText()` for the email field + wire the result-handling block above + replace JSX literals. Step 3: Verify. Step 4: Commit.**

---

### Task 7: `components/role-form.tsx`

**Files:**
- Modify: `assets/components/role-form.tsx`

**Interfaces:**
- Consumes: `auth.errors.ROLE_NAME_REQUIRED` (reused from Task 1 — unifies with `admin-roles.ts`'s server-side check per the Global Constraint), `useFieldErrorText()`.
- Produces: `auth.roleForm` namespace.

**String table:**

| Line(s) | Thai | Key | English |
| --- | --- | --- | --- |
| 83 | แก้ไขบทบาทแล้ว / สร้างบทบาทแล้ว | `roleForm.editSuccess`, `roleForm.createSuccess` | Role updated / Role created |
| 93 | ชื่อบทบาท (label) | `roleForm.nameLabel` | Role name |
| 105 | คำอธิบาย (label) | `roleForm.descriptionLabel` | Description |
| 123 | สิทธิ์การใช้งาน (label) | `roleForm.permissionsLabel` | Permissions |
| 147 | เลือกทั้งกลุ่ม {group} (aria-label) | `roleForm.selectGroupAria` (var `{group}`) | Select all in {group} |
| 194 | ยกเลิก | `roleForm.cancel` | Cancel |
| 198 | บันทึก | `roleForm.save` | Save |

Zod schema (line 31): `name: z.string().trim().min(1, 'ROLE_NAME_REQUIRED')` — **reuse the code Task 1 defined for `admin-roles.ts`'s server check**, do not invent a new one.

**Result handling** — Task 1 changed `createRoleAction`/`updateRoleAction`'s return type to `{ success: true } | { success: false; code: string }`. This file's `onSubmit` (shared between create and edit — read the actual file to see which action it calls based on whether `role` prop is set) must switch on `result.code`, not `result.error` (the plan's earlier draft omitted this — added during task review):

```tsx
const t = useTranslations('auth.roleForm');
const tErrors = useTranslations('auth.errors');
const fieldError = useFieldErrorText();
// ...
const onSubmit = handleSubmit(async (values) => {
  const result = role
    ? await updateRoleAction(role.id, { name: values.name, description: values.description, permissionIds: values.permissionIds })
    : await createRoleAction({ name: values.name, description: values.description, permissionIds: values.permissionIds });
  if (!result.success) {
    setError('root', { message: tErrors(result.code as Parameters<typeof tErrors>[0]) });
    return;
  }
  toast.success(role ? t('editSuccess') : t('createSuccess'));
  // ...existing close/reset logic...
});
// JSX: {errors.root?.message && <Callout tone="danger">{errors.root.message}</Callout>}
```

(Match the actual parameter names/shape `RoleInput` expects in `lib/actions/admin-roles.ts` — read the file, do not assume the field names above are exact. Add the `errors.root` Callout if the file doesn't already render one.)

- [ ] **Step 1: Add keys. Step 2: Convert schema + wire `useFieldErrorText()` + wire the result-handling block above + replace literals. Step 3: Verify. Step 4: Commit.**

---

### Task 8: `lib/password-policy.ts` + `components/change-password-dialog.tsx` + `components/reset-password-form.tsx`

These three ship together: `password-policy.ts` is a shared library both components import directly, so a schema-shape change here without updating both consumers in the same commit leaves the build broken.

**Files:**
- Modify: `assets/lib/password-policy.ts`
- Modify: `assets/components/change-password-dialog.tsx`
- Modify: `assets/components/reset-password-form.tsx`

**Interfaces:**
- Consumes: `auth.errors` codes `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`, `PASSWORD_NEED_LOWER`, `PASSWORD_NEED_UPPER`, `PASSWORD_NEED_DIGIT`, `PASSWORD_MISMATCH`, `CURRENT_PASSWORD_REQUIRED` (all defined in Task 1 — this task only wires the schema and the two consumers, it does not add new `errors` keys), `auth.passwordPolicy.hint` (Task 1), `useFieldErrorText()`.
- Produces: `auth.changePassword`, `auth.resetPassword` namespaces. `password-policy.ts` itself gains no new namespace — it only emits codes.

**`lib/password-policy.ts` rewrite:**

```ts
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
// PASSWORD_POLICY_HINT deleted — the hint text now lives at auth.passwordPolicy.hint
// (Task 1), interpolated with PASSWORD_MIN_LENGTH by each consumer:
//   t('passwordPolicy.hint', { min: PASSWORD_MIN_LENGTH })

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, 'PASSWORD_TOO_SHORT')
  .max(PASSWORD_MAX_LENGTH, 'PASSWORD_TOO_LONG')
  .regex(/[a-z]/, 'PASSWORD_NEED_LOWER')
  .regex(/[A-Z]/, 'PASSWORD_NEED_UPPER')
  .regex(/\d/, 'PASSWORD_NEED_DIGIT');

const newPasswordFields = z.object({ password: passwordSchema, confirmPassword: z.string() });
const confirmMatches = (v: { password: string; confirmPassword: string }) => v.password === v.confirmPassword;
const confirmMismatch = { message: 'PASSWORD_MISMATCH', path: ['confirmPassword'] as const };

export const newPasswordSchema = newPasswordFields.refine(confirmMatches, confirmMismatch);
export type NewPasswordValues = z.infer<typeof newPasswordFields>;

export const changePasswordFormSchema = newPasswordFields
  .extend({ currentPassword: z.string().min(1, 'CURRENT_PASSWORD_REQUIRED') })
  .refine(confirmMatches, confirmMismatch);
export type ChangePasswordValues = z.infer<typeof newPasswordFields> & { currentPassword: string };

export const setPasswordFormSchema = z.object({ password: passwordSchema });
export type SetPasswordValues = z.infer<typeof setPasswordFormSchema>;
```

(Every zod `.min`/`.max`/`.regex`/`.refine` message above is now one of Task 1's `auth.errors` codes — none of these are new keys.)

**`components/change-password-dialog.tsx`** namespace `auth.changePassword`:

| Line(s) | Thai | Key | English |
| --- | --- | --- | --- |
| 62 | เปลี่ยนรหัสผ่านเรียบร้อย อุปกรณ์อื่นที่ค้างไว้ถูกออกจากระบบแล้ว | `changePassword.success` | Password changed — other signed-in devices have been signed out |
| 77 | เปลี่ยนรหัสผ่าน (dialog title) | `changePassword.title` | Change password |
| 79 | หลังเปลี่ยนสำเร็จ อุปกรณ์อื่นที่ยังเข้าระบบค้างไว้จะถูกออกจากระบบทั้งหมด | `changePassword.description` | Once changed, all other signed-in devices will be signed out |
| 91 | รหัสผ่านปัจจุบัน (label) | `changePassword.currentPasswordLabel` | Current password |
| 105 | รหัสผ่านใหม่ (label) | `changePassword.newPasswordLabel` | New password |
| 120 | ยืนยันรหัสผ่านใหม่ (label) | `changePassword.confirmPasswordLabel` | Confirm new password |
| 136 | ยกเลิก | `changePassword.cancel` | Cancel |
| 140 | เปลี่ยนรหัสผ่าน (submit) | `changePassword.submit` | Change password |

```tsx
import { useTranslations } from 'next-intl';
import { useFieldErrorText } from '@/lib/use-field-error';
import { changePasswordFormSchema } from '@/lib/password-policy';
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '@/lib/password-policy';
import { changePasswordAction } from '@/lib/actions/password';

export function ChangePasswordDialog(...) {
  const t = useTranslations('auth.changePassword');
  const tErrors = useTranslations('auth.errors');
  // `passwordPolicy` is a sibling namespace of `errors`, not nested under it —
  // a separate hook call, same pattern as every other namespace in this plan.
  const tPolicy = useTranslations('auth.passwordPolicy');
  const fieldError = useFieldErrorText();
  // ...
  const onSubmit = handleSubmit(async (values) => {
    const result = await changePasswordAction({ currentPassword: values.currentPassword, newPassword: values.password });
    if ('code' in result) {
      setError('root', { message: tErrors(result.code as Parameters<typeof tErrors>[0]) });
      return;
    }
    toast.success(t('success'));
    reset();
    onOpenChange(false);
  });
  // JSX:
  <DialogTitle>{t('title')}</DialogTitle>
  <DialogDescription>{t('description')}</DialogDescription>
  <FieldLabel htmlFor="current-password">{t('currentPasswordLabel')}<span .../></FieldLabel>
  <FieldError errors={fieldError(errors.currentPassword)} />
  <FieldLabel htmlFor="change-new-password">{t('newPasswordLabel')}<span .../></FieldLabel>
  <FieldDescription>{tPolicy('hint', { min: PASSWORD_MIN_LENGTH })}</FieldDescription>
  <FieldError errors={fieldError(errors.password, { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })} />
  <FieldLabel htmlFor="change-confirm-password">{t('confirmPasswordLabel')}<span .../></FieldLabel>
  <FieldError errors={fieldError(errors.confirmPassword)} />
  <Button ...>{t('cancel')}</Button>
  <Button ...>{t('submit')}</Button>
}
```

Import both `PASSWORD_MIN_LENGTH` and `PASSWORD_MAX_LENGTH` from `@/lib/password-policy` (the earlier draft only imported `PASSWORD_MIN_LENGTH` — the `max` interpolation var needs the real constant too, not a hardcoded `128`).

**`components/reset-password-form.tsx`** namespace `auth.resetPassword`:

| Line(s) | Thai | Key | English |
| --- | --- | --- | --- |
| 45 | ตั้งรหัสผ่านใหม่เรียบร้อย กรุณาเข้าสู่ระบบอีกครั้ง | `resetPassword.success` | Password set — please sign in again |
| 53 | ลิงก์นี้ไม่ถูกต้องหรือไม่สมบูรณ์ กรุณาขอลิงก์ใหม่จากหน้าเข้าสู่ระบบ | `resetPassword.invalidLink` | This link is invalid or incomplete. Please request a new one from the sign-in page |
| 54 | กลับไปหน้าเข้าสู่ระบบ | `resetPassword.backToLogin` | Back to sign-in |
| 65 | รหัสผ่านใหม่ (label) | `resetPassword.newPasswordLabel` | New password |
| 80 | ยืนยันรหัสผ่านใหม่ (label) | `resetPassword.confirmPasswordLabel` | Confirm new password |
| 94 | ตั้งรหัสผ่านใหม่ (submit) | `resetPassword.submit` | Set new password |

This file also imports `PASSWORD_POLICY_HINT` (line 21) and renders it at line 74 — same fix as `change-password-dialog.tsx`:

```tsx
import { newPasswordSchema, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '@/lib/password-policy'; // PASSWORD_POLICY_HINT import removed
import { useFieldErrorText } from '@/lib/use-field-error';
// ...
export function ResetPasswordForm({ token }: Readonly<{ token: string | undefined }>) {
  const t = useTranslations('auth.resetPassword');
  const tErrors = useTranslations('auth.errors');
  const tPolicy = useTranslations('auth.passwordPolicy');
  const fieldError = useFieldErrorText();
  // ...
  const onSubmit = handleSubmit(async (values) => {
    const result = await resetPasswordAction({ token: token!, password: values.password });
    if ('code' in result) {
      setError('root', { message: tErrors(result.code as Parameters<typeof tErrors>[0]) });
      return;
    }
    toast.success(t('success'));
  });
  // if (!token): the existing early-return branch (line 53–54) is a static UI
  // state, not a server response — plain t(), not tErrors():
  //   <Callout tone="danger">{t('invalidLink')}</Callout>
  //   <Button render={<Link href="/login" />}>{t('backToLogin')}</Button>
  // JSX:
  <FieldLabel htmlFor="new-password">{t('newPasswordLabel')}<span .../></FieldLabel>
  <FieldDescription>{tPolicy('hint', { min: PASSWORD_MIN_LENGTH })}</FieldDescription>
  <FieldError errors={fieldError(errors.password, { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })} />
  <FieldLabel htmlFor="confirm-password">{t('confirmPasswordLabel')}<span .../></FieldLabel>
  <FieldError errors={fieldError(errors.confirmPassword)} />
  <Button type="submit" ...>{t('submit')}</Button>
}
```

- [ ] **Step 1: Rewrite `lib/password-policy.ts` per the code block above.**
- [ ] **Step 2: Add `changePassword` + `resetPassword` + `passwordPolicy` keys to both catalog files.**
- [ ] **Step 3: Convert `change-password-dialog.tsx` per the code block above.**
- [ ] **Step 4: Convert `reset-password-form.tsx` per the code block above.**
- [ ] **Step 5: Verify** — run `check-i18n.mjs` plus the Thai-line scan against all three files.
- [ ] **Step 6: Commit** — one commit for all three files (they are one interface change): `feat(auth-setup): translate password-policy schema + change/reset-password forms`

---

### Task 9: `components/users-table.tsx`

**Files:**
- Modify: `assets/components/users-table.tsx`

**Interfaces:**
- Produces: `auth.usersTable` namespace.

**String table:**

| Line(s) | Thai | Key | English |
| --- | --- | --- | --- |
| 38 | ชื่อ (col header) | `usersTable.colName` | Name |
| 39 | อีเมล (col header) | `usersTable.colEmail` | Email |
| 42 | วิธีเข้าสู่ระบบ (col header) | `usersTable.colAuthMethod` | Sign-in method |
| 48, 49 | บทบาท (col header + mobileLabel) | `usersTable.colRole` | Role |
| 66, 67 | รหัสผ่าน (col header + mobileLabel) | `usersTable.colPassword` | Password |
| 84 | ค้นหาชื่อหรืออีเมล... | `usersTable.searchPlaceholder` | Search by name or email... |

- [ ] **Step 1: Add keys. Step 2: Replace literals. Step 3: Verify. Step 4: Commit** — `feat(auth-setup): translate users-table.tsx (auth.usersTable namespace)`.

---

### Task 10: `components/admin-setup-form.tsx`

**Files:**
- Modify: `assets/components/admin-setup-form.tsx`

**Interfaces:**
- Consumes: `auth.errors` (Task 1 already fixed the `result.code` dispatch for this file's toast).
- Produces: `auth.adminSetup` namespace.

**String table:**

| Line(s) | Thai | Key | English |
| --- | --- | --- | --- |
| 21 | ตั้งค่าไม่สำเร็จ (toast title — the `description` was fixed in Task 1) | `adminSetup.setupFailedTitle` | Setup failed |
| 34 | ตั้งค่าผู้ดูแลระบบครั้งแรก (card title) | `adminSetup.title` | First-time admin setup |
| 36 | กดปุ่มด้านล่างเพื่อสร้าง role ผู้ดูแลระบบ (Administrator) | `adminSetup.descriptionLine1` | Click the button below to create the Administrator role |
| 37 | พร้อมสิทธิ์ทั้งหมด และกำหนดให้บัญชีของคุณเป็นผู้ดูแลระบบคนแรก | `adminSetup.descriptionLine2` | with every permission, and make your account the first administrator |
| 45 | กำลังตั้งค่า... | `adminSetup.loading` | Setting up... |
| 48 | เริ่มตั้งค่าผู้ดูแลระบบ | `adminSetup.submit` | Start admin setup |

- [ ] **Step 1: Add keys.**
- [ ] **Step 2: Replace literals** — the toast call becomes:

```tsx
const t = useTranslations('auth.adminSetup');
const tErrors = useTranslations('auth.errors');
// ...
toast.error(t('setupFailedTitle'), { description: tErrors(result.code as Parameters<typeof tErrors>[0]) });
```

- [ ] **Step 3: Verify. Step 4: Commit** — `feat(auth-setup): translate admin-setup-form.tsx (auth.adminSetup namespace)`.

---

### Task 11: `components/nav-user.tsx`

**Files:**
- Modify: `assets/components/nav-user.tsx`

**Interfaces:**
- Produces: `auth.navUser` namespace.

**String table:**

| Line(s) | Thai | Key | English |
| --- | --- | --- | --- |
| 157 | บัญชีผู้ใช้ (menu label) | `navUser.myAccount` | My account |
| 164 | เปลี่ยนรหัสผ่าน (menu item) | `navUser.changePassword` | Change password |
| 183 | ออกจากระบบ | `navUser.signOut` | Sign out |
| 197 | ข้อมูลของฉัน (dialog title) | `navUser.myInfoTitle` | My information |
| 219 | อีเมล (info row label) | `navUser.emailLabel` | Email |
| 227 | วิธี Login ล่าสุด (info row label) | `navUser.lastLoginMethodLabel` | Last sign-in method |

- [ ] **Step 1: Add keys. Step 2: Replace literals. Step 3: Verify. Step 4: Commit** — `feat(auth-setup): translate nav-user.tsx (auth.navUser namespace)`.

---

### Task 12: `components/admin-nav.tsx`

**Files:**
- Modify: `assets/components/admin-nav.tsx`

**Interfaces:**
- Produces: `auth.adminNav` namespace.

**String table:**

| Line(s) | Thai | Key | English |
| --- | --- | --- | --- |
| 35 | ผู้ใช้งาน (nav label) | `adminNav.users` | Users |
| 36 | บทบาทและสิทธิ์ (nav label) | `adminNav.rolesAndPermissions` | Roles & Permissions |
| 37 | บันทึกกิจกรรม (nav label) | `adminNav.auditLogs` | Activity Log |
| 62 | ผู้ดูแลระบบ (fallback app name) | `adminNav.fallbackAppName` | Administration |
| 67 | จัดการระบบ (group label) | `adminNav.systemGroup` | System |

Note: the nav item array (`{ href, label, icon, perm }`) is built at module or render scope with a `label:` field currently holding a Thai literal — this must become `t('adminNav.users')` etc., which means the array construction moves inside the component body (it already must be, since it needs `perm: PERMISSIONS.X` which is a constant — only the `label` values change; if the array is currently declared as a `const` outside the component, move its declaration inside the component function so `t(...)` is in scope).

- [ ] **Step 1: Add keys.**
- [ ] **Step 2: Move the nav-items array inside the component (if not already) and replace `label` values + the two remaining literals.**
- [ ] **Step 3: Verify. Step 4: Commit** — `feat(auth-setup): translate admin-nav.tsx (auth.adminNav namespace)`.

---

### Task 13: `components/user-role-select.tsx` + the two Server Component pages

Grouped because each piece is 2–3 strings — splitting further would be three tasks of one string each, more review overhead than value.

**Files:**
- Modify: `assets/components/user-role-select.tsx`
- Modify: `assets/app/(admin)/admin/users/page.tsx`
- Modify: `assets/app/(admin)/admin/audit-logs/page.tsx`

**Interfaces:**
- Consumes: `auth.errors` (Task 1 already fixed `user-role-select.tsx`'s `result.code` dispatch).
- Produces: `auth.userRoleSelect`, `auth.adminUsersPage`, `auth.adminAuditLogsPage` namespaces.

**`user-role-select.tsx`** (Client Component, `useTranslations`):

| Line | Thai | Key | English |
| --- | --- | --- | --- |
| 29 | เปลี่ยนบทบาทไม่สำเร็จ (toast title) | `userRoleSelect.changeFailedTitle` | Could not change role |
| 36, 39 | ไม่มีบทบาท | `userRoleSelect.noRole` | No role |

```tsx
const t = useTranslations('auth.userRoleSelect');
const tErrors = useTranslations('auth.errors');
// ...
if (!result.success) toast.error(t('changeFailedTitle'), { description: tErrors(result.code as Parameters<typeof tErrors>[0]) });
```

**`app/(admin)/admin/users/page.tsx`** (Server Component — no `'use client'` — use `getTranslations`, `async` function):

| Line | Thai | Key | English |
| --- | --- | --- | --- |
| 48 | ผู้ใช้งาน (page title) | `adminUsersPage.title` | Users |
| 50 | บัญชี SSO/AD เกิดเองตอนเข้าสู่ระบบครั้งแรก — เพิ่มด้วยมือเฉพาะบัญชี local | `adminUsersPage.description` | SSO/AD accounts are created automatically on first sign-in — only local accounts are added manually |

```tsx
import { getTranslations } from 'next-intl/server';

export default async function UsersPage(...) {
  const t = await getTranslations('auth.adminUsersPage');
  // ...
  <PageTitle>{t('title')}</PageTitle>
  <PageDescription>{t('description')}</PageDescription>
}
```

**`app/(admin)/admin/audit-logs/page.tsx`** (Server Component):

| Line | Thai | Key | English |
| --- | --- | --- | --- |
| 107 | บันทึกกิจกรรม (page title) | `adminAuditLogsPage.title` | Activity Log |
| 108 | บันทึกการกระทำทั้งหมด — ไม่มีปุ่มแก้หรือลบที่ไหนเลย | `adminAuditLogsPage.description` | A record of every action — there is no edit or delete button anywhere |

```tsx
const t = await getTranslations('auth.adminAuditLogsPage');
<PageTitle>{t('title')}</PageTitle>
<PageDescription>{t('description')}</PageDescription>
```

- [ ] **Step 1: Add all three namespaces' keys to both catalog files.**
- [ ] **Step 2: Convert `user-role-select.tsx`.**
- [ ] **Step 3: Convert both page.tsx files to `async` Server Components using `getTranslations`** (confirm the page's existing signature is not already `async` for another reason that would conflict — both currently do `await searchParams`/`await` a data fetch already per the file's own comments about DataTable server mode, so the function is very likely already `async`; if so, just add the `getTranslations` call as another awaited line).
- [ ] **Step 4: Verify** — `check-i18n.mjs` plus the Thai-line scan on all three files.
- [ ] **Step 5: Commit** — `feat(auth-setup): translate user-role-select + admin users/audit-logs page shells`.

---

### Task 14: Regression gate + SKILL.md install wiring

This is the task that makes every prior task's work permanent — without it, a future edit can reintroduce Thai into any of these 19 files and nothing will fail.

**Files:**
- Modify: `D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-design-setup\scripts\check-i18n.mjs`
- Modify: `D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-auth-setup\SKILL.md`

**Interfaces:**
- Consumes: the full file list this plan converts (18 files with Thai + `lib/password-policy.ts`, `lib/use-field-error.ts` — the latter two never had Thai in code, only comments, so they don't need to be in the Thai-scan list, but `password-policy.ts` is worth adding anyway since a future edit could reintroduce a Thai zod message there).

- [ ] **Step 1: Add auth-setup's converted files to `check-i18n.mjs`'s `OPTIONAL_CONVERTED_FILES`** (optional, not required — a th+en project might not have auth-setup installed at all, unlike design-setup's own `ui/data-table.tsx` which ships with every design-setup install):

```js
const OPTIONAL_CONVERTED_FILES = [
  'ui/export-menu.tsx', 'ui/date-picker.tsx', 'ui/tiptap-editor.tsx',
  // ugt-nextjs-auth-setup (phase 2, 2026-08-24) — optional because a th+en
  // project may not have auth-setup installed at all.
  'components/login-form.tsx',
  'components/roles-manager.tsx',
  'components/admin-user-actions.tsx',
  'components/audit-logs-table.tsx',
  'components/forgot-password-dialog.tsx',
  'components/change-password-dialog.tsx',
  'components/reset-password-form.tsx',
  'components/role-form.tsx',
  'components/users-table.tsx',
  'components/admin-setup-form.tsx',
  'components/nav-user.tsx',
  'components/admin-nav.tsx',
  'components/user-role-select.tsx',
  'lib/password-policy.ts',
  'lib/actions/auth.ts',
  'lib/actions/admin-setup.ts',
  'lib/actions/admin-users.ts',
  'lib/actions/admin-roles.ts',
  'lib/actions/password.ts',
  'app/(admin)/admin/users/page.tsx',
  'app/(admin)/admin/audit-logs/page.tsx',
];
```

Update the surrounding comment block (the one distinguishing REQUIRED vs OPTIONAL) to note that OPTIONAL now also covers "installed only if this skill is installed," not just "installed only if this feature was selected during interview" — both are valid reasons a file may be absent.

- [ ] **Step 2: Prove the updated gate against a scratch fixture** — copy the real, now-fully-converted `assets/` tree into a scratch directory alongside the design-setup catalog fixture used earlier in this project (or build a minimal one: `messages/kit.th.ts`+`kit.en.ts`+`auth.th.ts`+`auth.en.ts` plus the 19 files under `components/`/`lib/`/`app/`), then run:

```bash
node "D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-design-setup\scripts\check-i18n.mjs" "<scratch-dir>"
```

Expect `2 passed · 0 failed` with the converted-files count now reading `N/N` where N includes the design-setup 2 required + however many of the 3 design-setup optional + 19 auth-setup optional files are present in the fixture.

- [ ] **Step 3: Break the gate on purpose, once, to prove it still catches drift** — add one Thai string into a copy of `login-form.tsx` in the scratch fixture and re-run; expect `✘ converted files carry no Thai outside comments` naming that file and line count. Remove the injected string afterward.

- [ ] **Step 4: Update `ugt-nextjs-auth-setup/SKILL.md` §5.2** — add a new row (or a short paragraph after the existing table, matching its style) instructing: when the project uses th+en (i18n installed by design-setup), copy `assets/messages/auth.th.ts` and `assets/messages/auth.en.ts` to the project's `messages/` directory, then edit the project's `i18n/messages.ts` exactly as shown in Task 1 Step 2 (import `authEn`/`authTh`, extend the `AuthCatalog` type, add `auth: authTh`/`auth: authEn` to the `messages` object). Cross-reference `ugt-nextjs-design-setup`'s own `i18n/messages.ts` header comment ("A skill that adds its own catalog (auth, mail, upload) registers it here") so a reader understands this is the established, expected pattern, not a one-off auth-setup quirk.

- [ ] **Step 5: Update `ugt-nextjs-auth-setup/SKILL.md` §8 Verification Checklist** — add: "th+en projects: `node <ugt-nextjs-design-setup skill dir>/scripts/check-i18n.mjs .` reports 0 failed, and every auth screen (login, /admin/users, /admin/roles, /admin/audit-logs, change/reset/forgot password) shows English text after switching locale."

- [ ] **Step 6: Bump `ugt-nextjs-platform` version and write the CHANGELOG entry** — mirror the 4.46.0/4.46.1 CHANGELOG style: what shipped (166 strings across auth-setup, the error-code contract, the `admin-user-actions.tsx:82` fix), what's still outstanding (phase 3: mail admin UI 36 + upload-setup 16, per spec §6.2).

- [ ] **Step 7: Run the full repo gate chain** (same five checks used for phase 0+1):

```bash
node "D:\Project_2026\ugt-claude-platform\scripts\lint-kit-assets.mjs"
node "D:\Project_2026\ugt-claude-platform\scripts\check-contract-drift.mjs"
node "D:\Project_2026\ugt-claude-platform\scripts\check-doc-status.mjs"
node "D:\Project_2026\ugt-claude-platform\scripts\check-preview-tokens.mjs"
node "D:\Project_2026\ugt-claude-platform\scripts\stamp-kit-assets.mjs" --check
```

All five must pass. If `stamp-kit-assets.mjs --check` fails (expected — new/changed asset files need fresh stamps), run it without `--check` to write stamps, then re-run `--check` to confirm.

- [ ] **Step 8: Commit**

```bash
git add plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/scripts/check-i18n.mjs \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-auth-setup/SKILL.md \
        plugins/ugt-nextjs-platform/.claude-plugin/plugin.json \
        plugins/ugt-nextjs-platform/CHANGELOG.md
git commit -m "feat(auth-setup): regression gate + install wiring for phase 2 i18n

check-i18n.mjs now tracks all 19 converted auth-setup files (optional —
absent when auth-setup isn't installed, not a failure). SKILL.md §5.2
documents the messages.ts registration step; §8 adds the th+en verification
line. Closes phase 2 of the i18n spec (166 strings)."
```

---

## Self-Review Notes

- **Spec coverage:** §6.2 phase 2 scope (auth-setup, 166 strings) — covered by Tasks 2–13 across all 19 files with Thai. §5's trap (`admin-user-actions.tsx:82`) — covered by Task 1 Steps 4–5. §6.3's regression gate — covered by Task 14. §2 mission 2.6 (error-code contract) — covered by Task 1. Out-of-scope items from §8 (CLI/test titles) — explicitly excluded, listed in Global Constraints.
- **Cross-task dependencies called out explicitly:** Task 1 gates everything (must run first). **Task 8 must run before Task 4** — `admin-user-actions.tsx`'s two password-hint sites and its `setPasswordFormSchema` usage both depend on Task 8's rewrite of `lib/password-policy.ts`; despite the numbering, execute in the order 1, 2, 3, 8, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14 (Tasks 5–7 and 9–13 have no ordering constraint among themselves or relative to 4/8 beyond both needing Task 1). Task 8 itself bundles its three files as one atomic change (a shared schema plus both its consumers). Task 14 depends on every prior task's files existing.
- **Code/key consistency check:** `USER_NAME_REQUIRED`, `EMAIL_REQUIRED`, `EMAIL_INVALID`, `PASSWORD_REQUIRED`, `AD_USERNAME_REQUIRED`, `ROLE_NAME_REQUIRED`, and all seven `PASSWORD_*`/`CURRENT_PASSWORD_REQUIRED` codes are defined exactly once (Task 1's canonical list) and only ever *referenced* by later tasks (Tasks 2, 4, 7, 8) — no task redefines them with different wording.
- **No placeholders:** every task's string table gives the exact source line, exact Thai text, exact key, and exact English translation; no task defers translation to "later" or says "similar to Task N" without repeating the actual pattern inline.
