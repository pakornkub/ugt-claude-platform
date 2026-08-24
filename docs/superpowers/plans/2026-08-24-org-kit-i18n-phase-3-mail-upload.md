# Mail/Upload-Setup i18n (Phase 3, final) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Thai UI string, toast, and server-returned error in `ugt-nextjs-mail-setup`'s admin UI (`/admin/mail-templates`) and all of `ugt-nextjs-upload-setup` (upload/download route handlers + `FileUpload`) renders through a message catalog (`useTranslations`/`getTranslations`), so a th+en project shows English on the mail-template editor and the file-attachment widget after switching locale — closing **phase 3 (final)** of `docs/superpowers/specs/2026-08-24-org-kit-i18n-design.md` (§6.2: 36 + 16 = 52 strings) and, with it, the whole spec.

**Architecture:** Two new catalog pairs, same shape as phase 0-2's (`messages/kit.*.ts`, `messages/auth.*.ts`): `messages/mail.th.ts`/`mail.en.ts` and `messages/upload.th.ts`/`upload.en.ts`, each registered into the project's `i18n/messages.ts` under a new top-level key (`mail`, `upload`). Client components call `useTranslations('mail.<ns>' | 'upload.<ns>')`; the one Server Component (`app/(admin)/admin/mail-templates/page.tsx`) calls `getTranslations`. Mission 2.6 (error-code contract) is extended to both skills: `lib/actions/admin-mail-templates.ts`'s Server Actions stop returning `{ error: 'ข้อความไทย' }` (and, for two call sites, already-hardcoded **English** prose `'Unauthorized'`/`'Forbidden'`/`'Unknown template'` — hardcoded English is invisible to `check-i18n.mjs`'s Thai-character scan, so it must be caught by reading the code, not by the gate) in favor of `{ code: 'SCREAMING_SNAKE_CASE' }`; `app/api/files/route.ts` and `app/api/files/[id]/route.ts` already return `{ error: { code, message } }` — the `code` half is kept, the Thai `message` half is dropped, and the client (`file-upload.tsx`) translates the code.

`lib/types/mail-templates.ts`'s `MAIL_TEMPLATE_DEFINITIONS` array sits at module scope (outside any component), so its `menu`/`label`/`description` fields — which the admin UI displays as literal text today — cannot call `useTranslations` directly. They become CODE strings (`menuKey`/`labelKey`/`descriptionKey`) and are translated once, at the boundary, by the Server Component `page.tsx` (`getTranslations('mail.templates')`) when it builds the `items` array handed to the client `MailTemplatesManager` — the same "codes in, resolved strings out at a boundary" trick Task 1 of phase 2 used for `useFieldErrorText()`, applied to a data array instead of a zod schema.

**Out of scope, deliberately not touched (spec §8, มติ 2.3):** the 32 EMAIL BODY strings in `lib/types/mail-templates.ts` — `GREETING`, `EMAIL_FOOTER`, every `heading`, every `previewSample` value, and all of `DEFAULT_MAIL_TEMPLATES`'s `subject`/`html`. These are content sent to end users, not UI chrome, and mission 2.3 blocks translating them until a `locale` column exists on `user` and there is a UI for an admin to maintain two template sets. **Because of this, `lib/types/mail-templates.ts` can never be added to `check-i18n.mjs`'s Thai-outside-comments file list** — it will legitimately hold Thai forever until that future work lands. This is the one file in this plan where "no Thai outside comments" does not apply, and Task 3 states that explicitly so a future reader doesn't file it as a gate bug.

**Tech Stack:** Next.js 15 (App Router), next-intl (wired since phase 0+1), Prisma/SQL Server, Better Auth (guard order via `ugt-nextjs-auth-setup`), sonner (toast), react-hook-form is **not** used by either skill's converted files (mail/upload have no zod-validated forms — `mail-templates-manager.tsx` uses plain `useState`, so there is no `useFieldErrorText()`-equivalent needed here).

**Spec:** `docs/superpowers/specs/2026-08-24-org-kit-i18n-design.md` — this plan implements §6.2 phase 3 (52 strings: mail-setup admin UI 36, upload-setup 16) and extends mission 2.6 (§5, §2 table row 2.6) to both skills' server-returned buckets.

## Global Constraints

- **`.ts` catalogs, never `.json`** (spec มติ 2.4) — `check-kit-freshness.mjs` / `stamp-kit-assets.mjs` filter `/\.tsx?$/`; a `.json` catalog is invisible to kit-sync.
- **Server Actions/Route Handlers return `{ code }`, never `{ error: '<prose>' }`** (mission 2.6). Translation happens once, at the consumer boundary — client-side via `useTranslations`, or in the one Server Component via `getTranslations`.
- **One code, one wording.** A code defined in a catalog's `errors` namespace is referenced, never redefined, by every call site that needs it.
- **Server Components use `getTranslations`, Client Components use `useTranslations`.** Only `app/(admin)/admin/mail-templates/page.tsx` is a Server Component in this plan (no `'use client'`) — every other file already has `'use client'`.
- **Don't touch comments.** Only Thai inside string literals / JSX text nodes moves. Thai inside `//`, `/* */`, and docblocks is out of scope everywhere, including inside files this plan otherwise converts.
- **Email body content is out of scope for the whole plan** (spec §8, มติ 2.3) — `GREETING`, `EMAIL_FOOTER`, every `heading`, every `previewSample` value, and `DEFAULT_MAIL_TEMPLATES` in `lib/types/mail-templates.ts` are never touched. Only the `menu`/`label`/`description` fields (admin-UI chrome, not email content) convert.
- **Regression gate stays green after every task.** `node <ugt-nextjs-design-setup skill dir>/scripts/check-i18n.mjs <scratch-project-root>` must report the same-or-growing converted-files count and zero Thai-outside-comments hits after each task, run against a scratch fixture holding the real, edited `assets/` trees.
- **Version bump happens before any asset is touched**, not in the last task — phase 2 bumped it last and 15 assets got stamped with the previous version, and the stamper cannot self-correct once content hash matches (see `docs/backlog.md` §8). Task 1 Step 1 does the bump.

## File Structure

| File | Responsibility |
| --- | --- |
| `ugt-nextjs-mail-setup/assets/messages/mail.th.ts` / `mail.en.ts` | New. `mail` catalog: `errors` (server-returned codes), `templates` (admin-UI chrome for the 4 template definitions), `page` (Server Component page chrome), `manager` (client editor UI). |
| `ugt-nextjs-mail-setup/assets/lib/types/mail-templates.ts` | Modify. `menu`/`label`/`description` fields on `MailTemplateDefinition` become `menuKey`/`labelKey`/`descriptionKey` (CODE strings); email-body fields untouched. |
| `ugt-nextjs-mail-setup/assets/lib/actions/admin-mail-templates.ts` | Modify. Drop `ERROR_TH` + hardcoded `'Unauthorized'`/`'Forbidden'`/`'Unknown template'`; `ActionResult` becomes `{ success: true } \| { success: false; code: string }`. |
| `ugt-nextjs-mail-setup/assets/app/(admin)/admin/mail-templates/page.tsx` | Modify. `getTranslations('mail.page')` for chrome, `getTranslations('mail.templates')` to resolve each definition's `menuKey`/`labelKey`/`descriptionKey` into the `items` array (`MailTemplateItem`'s shape is unchanged — still literal `menu`/`label`/`description` strings, now resolved server-side instead of hardcoded). |
| `ugt-nextjs-mail-setup/assets/components/mail-templates-manager.tsx` | Modify. All literal Thai UI text → `useTranslations('mail.manager')`; error handling reads `result.code` and translates via `useTranslations('mail.errors')`. |
| `ugt-nextjs-upload-setup/assets/messages/upload.th.ts` / `upload.en.ts` | New. `upload` catalog: `errors` (server-returned codes, shared by both route handlers and the client), `fileUpload` (client UI strings). |
| `ugt-nextjs-upload-setup/assets/app/api/files/route.ts` | Modify. Every `NextResponse.json({ error: { code, message } }, …)` drops `message`; `FILE_TOO_LARGE` adds a `maxMb` field for client-side interpolation. |
| `ugt-nextjs-upload-setup/assets/app/api/files/[id]/route.ts` | Modify. Same: drop `message`, keep `code`. |
| `ugt-nextjs-upload-setup/assets/components/file-upload.tsx` | Modify. Reads `payload.error.code` (not `.message`), translates via `useTranslations('upload.errors')`; UI text via `useTranslations('upload.fileUpload')`. |
| `ugt-nextjs-design-setup/scripts/check-i18n.mjs` | Modify. Add mail/upload's now-fully-Thai-free files to `OPTIONAL_CONVERTED_FILES`. `lib/types/mail-templates.ts` is deliberately **not** added (see Architecture). |
| `ugt-nextjs-mail-setup/SKILL.md`, `ugt-nextjs-upload-setup/SKILL.md` | Modify. Add the same "i18n wiring" paragraph phase 2 added to `ugt-nextjs-auth-setup/SKILL.md` §5.2, adapted to each skill's own copy-assets section, plus a verification-checklist line. |
| `plugins/ugt-nextjs-platform/.claude-plugin/plugin.json`, `CHANGELOG.md` | Modify. Version bump (Task 1 Step 1) + final entry (Task 6). |

---

## Namespace Map

| Namespace | Owning file(s) | Task |
| --- | --- | --- |
| `mail.errors` | `lib/actions/admin-mail-templates.ts` | 1 |
| `mail.templates` | `lib/types/mail-templates.ts` (keys), `app/(admin)/admin/mail-templates/page.tsx` (resolves) | 1, 2 |
| `mail.page` | `app/(admin)/admin/mail-templates/page.tsx` | 2 |
| `mail.manager` | `components/mail-templates-manager.tsx` | 2 |
| `upload.errors` | `app/api/files/route.ts`, `app/api/files/[id]/route.ts`, `components/file-upload.tsx` | 4 |
| `upload.fileUpload` | `components/file-upload.tsx` | 4, 5 |

---

### Task 1: `mail` catalog scaffolding + error-code contract + template definitions

**Files:**
- Modify: `D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\.claude-plugin\plugin.json` (version bump — do this first)
- Create: `D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-mail-setup\assets\messages\mail.th.ts`
- Create: `D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-mail-setup\assets\messages\mail.en.ts`
- Modify: `D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-mail-setup\assets\lib\actions\admin-mail-templates.ts`
- Modify: `D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-mail-setup\assets\lib\types\mail-templates.ts`

**Interfaces:**
- Produces: `MailCatalog` shape via `mailTh`/`mailEn` (consumed by Task 2's components and by `i18n/messages.ts`'s `mail: mailTh`/`mail: mailEn` registration, documented in Task 3).
- Produces: the canonical `mail.errors` code list below — Task 2 references these verbatim, never invents a new one for an existing rule.
- Produces: `MailTemplateDefinition.menuKey: string`, `.labelKey: string`, `.descriptionKey: string` (replacing the old `.menu: string`, `.label: string`, `.description: string` Thai literals) — Task 2's `page.tsx` change is the only consumer.

**Canonical `mail.errors` code list** (code → current source text → English):

```
UNAUTHORIZED       (was hardcoded English 'Unauthorized')   Please sign in to continue.
FORBIDDEN          (was hardcoded English 'Forbidden')      You don't have permission for this action.
UNKNOWN_TEMPLATE   (was hardcoded English 'Unknown template') Unknown template.
VALIDATION_FAILED  ข้อมูลไม่ถูกต้อง (fallback)                Please check the information you entered.
SUBJECT_REQUIRED   กรอกหัวข้ออีเมล                            Please enter an email subject.
SUBJECT_TOO_LONG   หัวข้อยาวเกิน 300 ตัวอักษร                  Subject must be at most 300 characters.
BODY_REQUIRED      กรอกเนื้อหาอีเมล                            Please enter the email body.
BODY_TOO_LONG      เนื้อหายาวเกิน 20,000 ตัวอักษร               Body must be at most 20,000 characters.
```

**`mail.templates` string table** (from `lib/types/mail-templates.ts` — the 10 admin-UI-chrome strings in scope; the other 32 in this file are email body content, out of scope):

| Definition | Field | Line | Thai | Key | English |
| --- | --- | ---: | --- | --- | --- |
| (shared) | `MENU_REQUEST` const | 95 | คำขอ/อนุมัติ | `templates.menuRequest` | Requests/Approvals |
| `request.submitted` | `menu` | 100 | (= `MENU_REQUEST`) | `templates.menuRequest` | Requests/Approvals |
| `request.submitted` | `label` | 101 | แจ้งผู้อนุมัติ: มีคำขอใหม่ | `templates.requestSubmittedLabel` | Notify approver: new request |
| `request.submitted` | `description` | 102 | ส่งถึงผู้อนุมัติเมื่อมีคำขอใหม่เข้ามา | `templates.requestSubmittedDescription` | Sent to the approver when a new request comes in |
| `request.approved` | `menu` | 109 | (= `MENU_REQUEST`) | `templates.menuRequest` | Requests/Approvals |
| `request.approved` | `label` | 110 | แจ้งผู้ขอ: คำขอได้รับอนุมัติ | `templates.requestApprovedLabel` | Notify requester: request approved |
| `request.approved` | `description` | 111 | ส่งกลับถึงผู้ยื่นคำขอเมื่อได้รับอนุมัติ | `templates.requestApprovedDescription` | Sent back to the requester once approved |
| `request.rejected` | `menu` | 120 | (= `MENU_REQUEST`) | `templates.menuRequest` | Requests/Approvals |
| `request.rejected` | `label` | 121 | แจ้งผู้ขอ: คำขอถูกปฏิเสธ | `templates.requestRejectedLabel` | Notify requester: request rejected |
| `request.rejected` | `description` | 122 | ส่งกลับถึงผู้ยื่นคำขอเมื่อถูกปฏิเสธ | `templates.requestRejectedDescription` | Sent back to the requester once rejected |
| `auth.password-reset` | `menu` | 131 | บัญชีผู้ใช้ | `templates.menuAccount` | User Account |
| `auth.password-reset` | `label` | 132 | ลิงก์ตั้งรหัสผ่านใหม่ | `templates.passwordResetLabel` | Password reset link |
| `auth.password-reset` | `description` | 133-134 | ส่งเมื่อผู้ใช้กด "ลืมรหัสผ่าน" · ลิงก์ใช้ได้ครั้งเดียวและหมดอายุตาม resetPasswordTokenExpiresIn ใน lib/auth.ts | `templates.passwordResetDescription` | Sent when a user clicks "Forgot password" — the link is single-use and expires per resetPasswordTokenExpiresIn in lib/auth.ts |

**`heading`, `previewSample`, `banner`, `cta.label` on every definition, and everything in `DEFAULT_MAIL_TEMPLATES`/`GREETING`/`EMAIL_FOOTER` stay exactly as-is — do not touch them (email body content, out of scope).**

- [ ] **Step 1: Bump the plugin version.** Open `plugins/ugt-nextjs-platform/.claude-plugin/plugin.json` and bump `"version"` from `4.47.2` to `4.48.0` (minor: new catalogs + behavior change, not a fix). This must land before any asset file below is edited — the stamper (`scripts/stamp-kit-assets.mjs`) reads this version when it stamps a changed asset's `// kit: ugt-nextjs-platform X.Y.Z · …` header comment, and it does not update the stamp on a file whose content hash it has already seen at the old version.

- [ ] **Step 2: Create `assets/messages/mail.th.ts`**

```ts
// kit: ugt-nextjs-platform 4.48.0 · ugt-nextjs-mail-setup/messages/mail.th.ts
// kit-hash: (stamped by scripts/stamp-kit-assets.mjs)
// Thai catalog for ugt-nextjs-mail-setup's admin UI. Keys must match
// mail.en.ts exactly — scripts/check-i18n.mjs fails the build when they drift.
// Email BODY content (GREETING, EMAIL_FOOTER, every `heading`, every
// `previewSample` value, DEFAULT_MAIL_TEMPLATES) is NOT here and never will
// be until a `locale` column exists on `user` — spec มติ 2.3.
export const mailTh = {
  errors: {
    UNAUTHORIZED: 'กรุณาเข้าสู่ระบบ',
    FORBIDDEN: 'คุณไม่มีสิทธิ์ทำรายการนี้',
    UNKNOWN_TEMPLATE: 'ไม่พบเทมเพลตนี้',
    VALIDATION_FAILED: 'ข้อมูลไม่ถูกต้อง',
    SUBJECT_REQUIRED: 'กรอกหัวข้ออีเมล',
    SUBJECT_TOO_LONG: 'หัวข้อยาวเกิน 300 ตัวอักษร',
    BODY_REQUIRED: 'กรอกเนื้อหาอีเมล',
    BODY_TOO_LONG: 'เนื้อหายาวเกิน 20,000 ตัวอักษร',
  },
  templates: {
    menuRequest: 'คำขอ/อนุมัติ',
    menuAccount: 'บัญชีผู้ใช้',
    requestSubmittedLabel: 'แจ้งผู้อนุมัติ: มีคำขอใหม่',
    requestSubmittedDescription: 'ส่งถึงผู้อนุมัติเมื่อมีคำขอใหม่เข้ามา',
    requestApprovedLabel: 'แจ้งผู้ขอ: คำขอได้รับอนุมัติ',
    requestApprovedDescription: 'ส่งกลับถึงผู้ยื่นคำขอเมื่อได้รับอนุมัติ',
    requestRejectedLabel: 'แจ้งผู้ขอ: คำขอถูกปฏิเสธ',
    requestRejectedDescription: 'ส่งกลับถึงผู้ยื่นคำขอเมื่อถูกปฏิเสธ',
    passwordResetLabel: 'ลิงก์ตั้งรหัสผ่านใหม่',
    passwordResetDescription:
      'ส่งเมื่อผู้ใช้กด "ลืมรหัสผ่าน" · ลิงก์ใช้ได้ครั้งเดียวและหมดอายุตาม resetPasswordTokenExpiresIn ใน lib/auth.ts',
  },
  page: {
    title: 'เทมเพลตอีเมล',
    description:
      'แก้หัวข้อและเนื้อหาอีเมลของระบบได้โดยไม่ต้อง deploy — โครงอีเมล (หัว/ปุ่ม/ท้าย) ล็อกไว้ แก้ได้เฉพาะข้อความ',
  },
  manager: {
    navLabel: 'รายการเทมเพลต',
    overriddenBadge: 'แก้แล้ว',
    subjectLabel: 'หัวข้ออีเมล',
    bodyLabel: 'เนื้อหา (HTML)',
    variablesHint: 'ตัวแปรที่ใช้ได้ (แทนค่าตอนส่งจริง · ค่าถูก escape เสมอ):',
    resetButton: 'กลับใช้ค่าเริ่มต้น',
    previewButton: 'ดูตัวอย่าง',
    saveButton: 'บันทึก',
    previewLabel: 'ตัวอย่างอีเมล',
    resetDialogTitle: 'กลับใช้ค่าเริ่มต้น — {label}',
    resetDialogDescription: 'ข้อความที่แก้ไว้จะถูกลบ และอีเมลฉบับถัดไปจะใช้ข้อความเริ่มต้นของระบบ',
    resetDialogSuccessMessage: 'กลับไปใช้ค่าเริ่มต้นแล้ว',
    saveFailedTitle: 'บันทึกไม่สำเร็จ',
    saveSuccessMessage: 'บันทึกเทมเพลตแล้ว — อีเมลฉบับถัดไปใช้ข้อความนี้',
    previewFailedTitle: 'สร้างตัวอย่างไม่สำเร็จ',
  },
} as const;
```

- [ ] **Step 3: Create `assets/messages/mail.en.ts`**

```ts
// kit: ugt-nextjs-platform 4.48.0 · ugt-nextjs-mail-setup/messages/mail.en.ts
// kit-hash: (stamped by scripts/stamp-kit-assets.mjs)
// English catalog for ugt-nextjs-mail-setup's admin UI. Keys must match
// mail.th.ts exactly — scripts/check-i18n.mjs fails the build when they drift.
export const mailEn = {
  errors: {
    UNAUTHORIZED: 'Please sign in to continue.',
    FORBIDDEN: "You don't have permission for this action.",
    UNKNOWN_TEMPLATE: 'Unknown template.',
    VALIDATION_FAILED: 'Please check the information you entered.',
    SUBJECT_REQUIRED: 'Please enter an email subject.',
    SUBJECT_TOO_LONG: 'Subject must be at most 300 characters.',
    BODY_REQUIRED: 'Please enter the email body.',
    BODY_TOO_LONG: 'Body must be at most 20,000 characters.',
  },
  templates: {
    menuRequest: 'Requests/Approvals',
    menuAccount: 'User Account',
    requestSubmittedLabel: 'Notify approver: new request',
    requestSubmittedDescription: 'Sent to the approver when a new request comes in',
    requestApprovedLabel: 'Notify requester: request approved',
    requestApprovedDescription: 'Sent back to the requester once approved',
    requestRejectedLabel: 'Notify requester: request rejected',
    requestRejectedDescription: 'Sent back to the requester once rejected',
    passwordResetLabel: 'Password reset link',
    passwordResetDescription:
      'Sent when a user clicks "Forgot password" — the link is single-use and expires per resetPasswordTokenExpiresIn in lib/auth.ts',
  },
  page: {
    title: 'Email templates',
    description:
      "Edit the system's email subject and body without a deploy — the email frame (header/button/footer) is locked; only the text is editable.",
  },
  manager: {
    navLabel: 'Template list',
    overriddenBadge: 'Edited',
    subjectLabel: 'Email subject',
    bodyLabel: 'Body (HTML)',
    variablesHint: 'Available variables (substituted at send time · values are always escaped):',
    resetButton: 'Reset to default',
    previewButton: 'Preview',
    saveButton: 'Save',
    previewLabel: 'Email preview',
    resetDialogTitle: 'Reset to default — {label}',
    resetDialogDescription:
      'Your edits will be deleted, and the next email sent will use the system default text.',
    resetDialogSuccessMessage: 'Reset to default.',
    saveFailedTitle: 'Save failed',
    saveSuccessMessage: 'Template saved — the next email sent will use this text.',
    previewFailedTitle: 'Could not generate preview',
  },
} as const;
```

- [ ] **Step 4: Rewrite `lib/actions/admin-mail-templates.ts`'s error contract**

Replace the `ActionResult` type, `ERROR_TH` map, and every `error:` site:

```ts
type ActionResult = { success: true } | { success: false; code: string };

function isTemplateKey(key: string): key is MailTemplateKey {
  return (MAIL_TEMPLATE_KEYS as readonly string[]).includes(key);
}

async function requirePermission(key: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false as const, code: 'UNAUTHORIZED' };
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(key)) return { ok: false as const, code: 'FORBIDDEN' };
  return { ok: true as const, session };
}
```

`saveMailTemplateAction` and `previewMailTemplateAction` (both call `mailTemplateSchema.safeParse`) replace their validation-failure branch:

```ts
const parsed = mailTemplateSchema.safeParse(input);
if (!parsed.success) {
  const code = parsed.error.issues[0]?.message ?? '';
  const known = ['SUBJECT_REQUIRED', 'SUBJECT_TOO_LONG', 'BODY_REQUIRED', 'BODY_TOO_LONG'];
  return { success: false, code: known.includes(code) ? code : 'VALIDATION_FAILED' };
}
```

and `mailTemplateSchema` in `lib/types/mail-templates.ts` switches its zod messages to the same codes (it currently uses lowerCamel codes `subjectRequired`/etc. — Task uses the SCREAMING_SNAKE_CASE codes above instead, matching the auth-setup convention):

```ts
export const mailTemplateSchema = z.object({
  subject: z.string().min(1, 'SUBJECT_REQUIRED').max(300, 'SUBJECT_TOO_LONG'),
  html: z.string().min(1, 'BODY_REQUIRED').max(20000, 'BODY_TOO_LONG'),
});

export type MailTemplateErrorCode =
  | 'SUBJECT_REQUIRED'
  | 'SUBJECT_TOO_LONG'
  | 'BODY_REQUIRED'
  | 'BODY_TOO_LONG';
```

Every `return { success: false, error: gate.error }` becomes `return { success: false, code: gate.code }`; every `return { success: false, error: 'Unknown template' }` becomes `return { success: false, code: 'UNKNOWN_TEMPLATE' }`. `previewMailTemplateAction`'s return type annotation changes from `{ success: false; error: string }` to `{ success: false; code: string }` to match `ActionResult`.

- [ ] **Step 5: Rewrite `lib/types/mail-templates.ts`'s `MailTemplateDefinition` + `MAIL_TEMPLATE_DEFINITIONS`**

```ts
export interface MailTemplateDefinition {
  key: MailTemplateKey;
  /** i18n key under `mail.templates` — resolved to display text by the
   *  Server Component page (`getTranslations('mail.templates')`), never
   *  read directly as UI text. */
  menuKey: string;
  labelKey: string;
  descriptionKey: string;
  variables: string[];
  htmlVariables?: readonly string[];
  previewSample?: Record<string, string>;
  heading: string;
  banner?: MailBannerSpec;
  cta?: MailCtaSpec;
}

export const MAIL_TEMPLATE_DEFINITIONS: MailTemplateDefinition[] = [
  {
    key: 'request.submitted',
    menuKey: 'menuRequest',
    labelKey: 'requestSubmittedLabel',
    descriptionKey: 'requestSubmittedDescription',
    heading: 'คำขอรออนุมัติ',
    variables: ['appName', 'recipientName', 'requesterName', 'itemName', 'detailUrl'],
    cta: { label: 'ดูรายการรออนุมัติ →', urlToken: 'detailUrl' },
  },
  {
    key: 'request.approved',
    menuKey: 'menuRequest',
    labelKey: 'requestApprovedLabel',
    descriptionKey: 'requestApprovedDescription',
    heading: 'ผลการพิจารณาคำขอ',
    variables: ['appName', 'recipientName', 'itemName', 'status', 'detailUrl'],
    previewSample: { status: 'อนุมัติแล้ว' },
    banner: { token: 'status', tone: 'success' },
    cta: { label: 'เปิดดูรายละเอียด →', urlToken: 'detailUrl' },
  },
  {
    key: 'request.rejected',
    menuKey: 'menuRequest',
    labelKey: 'requestRejectedLabel',
    descriptionKey: 'requestRejectedDescription',
    heading: 'ผลการพิจารณาคำขอ',
    variables: ['appName', 'recipientName', 'itemName', 'status', 'rejectReason', 'detailUrl'],
    previewSample: { status: 'ไม่อนุมัติ', rejectReason: 'ข้อมูลไม่ครบถ้วน' },
    banner: { token: 'status', tone: 'danger' },
    cta: { label: 'เปิดดูรายละเอียด →', urlToken: 'detailUrl' },
  },
  {
    key: 'auth.password-reset',
    menuKey: 'menuAccount',
    labelKey: 'passwordResetLabel',
    descriptionKey: 'passwordResetDescription',
    heading: 'ตั้งรหัสผ่านใหม่',
    variables: ['appName', 'recipientName', 'resetUrl', 'expiresInMinutes'],
    previewSample: { resetUrl: '__APP_URL_PROD__/reset-password?token=…', expiresInMinutes: '60' },
    cta: { label: 'ตั้งรหัสผ่านใหม่ →', urlToken: 'resetUrl' },
  },
  // EXTENSION POINT: add this project's templates here — menuKey/labelKey/
  // descriptionKey must have matching entries in messages/mail.{th,en}.ts's
  // `templates` namespace, or check-i18n's key-parity check won't help you
  // (these are looked up dynamically, not statically referenced).
];
```

`MENU_REQUEST` const, `DEFAULT_MAIL_TEMPLATES`, `GREETING`, `EMAIL_FOOTER`, `bannerHtml`, `ctaHtml`, `composeEmail` — **unchanged**.

- [ ] **Step 6: Verify against a scratch fixture.** Copy the edited `assets/lib/types/mail-templates.ts`, `assets/lib/actions/admin-mail-templates.ts`, and the two new `assets/messages/mail.*.ts` files into a scratch directory, then:

```bash
node "D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-design-setup\scripts\check-i18n.mjs" "<scratch-dir>"
```

Expect `catalog key parity across locales` to pass for the new `mail` namespace (nothing else is wired yet, so other checks are not yet meaningful).

- [ ] **Step 7: Commit**

```bash
git add plugins/ugt-nextjs-platform/.claude-plugin/plugin.json \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-mail-setup/assets/messages/mail.th.ts \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-mail-setup/assets/messages/mail.en.ts \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-mail-setup/assets/lib/actions/admin-mail-templates.ts \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-mail-setup/assets/lib/types/mail-templates.ts
git commit -m "feat(mail-setup): mail catalog + error-code contract (auth.errors phase 3, i18n mission 2.6)

New messages/mail.{th,en}.ts. admin-mail-templates.ts returns {code} instead
of {error: prose} (including two hardcoded-English sites the Thai scan
can't see). MailTemplateDefinition.menu/label/description become
menuKey/labelKey/descriptionKey, resolved by the Server Component page in
Task 2. Email body content untouched (spec มติ 2.3)."
```

---

### Task 2: `app/(admin)/admin/mail-templates/page.tsx` + `components/mail-templates-manager.tsx`

**Files:**
- Modify: `assets/app/(admin)/admin/mail-templates/page.tsx`
- Modify: `assets/components/mail-templates-manager.tsx`

**Interfaces:**
- Consumes: `mailTh`/`mailEn` shape and the `menuKey`/`labelKey`/`descriptionKey` fields from Task 1.
- Produces: nothing new — this is the last stop for the `mail` namespace's UI-facing strings.

**Step 1: `page.tsx` — Server Component, `getTranslations`**

```ts
import { getTranslations } from 'next-intl/server';
// … existing imports unchanged …

export default async function AdminMailTemplatesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.MAIL_TEMPLATES_MANAGE)) redirect('/');

  const t = await getTranslations('mail');
  // … rows / overrideByKey unchanged …

  const items = MAIL_TEMPLATE_DEFINITIONS.map((def) => {
    const override = overrideByKey.get(mailTemplateSettingKey(def.key));
    const fallback = DEFAULT_MAIL_TEMPLATES[def.key];
    return {
      key: def.key,
      menu: t(`templates.${def.menuKey}` as Parameters<typeof t>[0]),
      label: t(`templates.${def.labelKey}` as Parameters<typeof t>[0]),
      description: t(`templates.${def.descriptionKey}` as Parameters<typeof t>[0]),
      variables: def.variables,
      subject: (override ?? fallback).subject,
      html: (override ?? fallback).html,
      defaultSubject: fallback.subject,
      defaultHtml: fallback.html,
      isOverridden: override !== undefined,
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader>
        <PageHeaderText>
          <PageTitle>{t('page.title')}</PageTitle>
          <PageDescription>{t('page.description')}</PageDescription>
        </PageHeaderText>
      </PageHeader>
      <MailTemplatesManager items={items} />
    </div>
  );
}
```

`MailTemplateItem`'s shape in `mail-templates-manager.tsx` is **unchanged** (`menu`/`label`/`description` are still plain `string`) — only where those strings come from changes.

**Step 2: `mail-templates-manager.tsx` — translate every literal, read `result.code`**

```ts
'use client';
import { useTranslations } from 'next-intl';
// … existing imports unchanged …

export function MailTemplatesManager({ items }: Readonly<{ items: MailTemplateItem[] }>) {
  const t = useTranslations('mail.manager');
  const errT = useTranslations('mail.errors');
  // … existing useState/useTransition unchanged …

  function handleSave() {
    startTransition(async () => {
      const result = await saveMailTemplateAction(selectedKey, {
        subject: draft.subject,
        html: draft.html,
      });
      if (!result.success) {
        toast.error(t('saveFailedTitle'), { description: errT(result.code as Parameters<typeof errT>[0]) });
        return;
      }
      patchDraft({ isOverridden: true });
      toast.success(t('saveSuccessMessage'));
    });
  }

  function handlePreview() {
    startTransition(async () => {
      const result = await previewMailTemplateAction(selectedKey, {
        subject: draft.subject,
        html: draft.html,
      });
      if (!result.success) {
        toast.error(t('previewFailedTitle'), { description: errT(result.code as Parameters<typeof errT>[0]) });
        return;
      }
      setPreview({ subject: result.subject, html: result.html });
      setPreviewOpen(true);
    });
  }

  // … groups unchanged …

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <nav aria-label={t('navLabel')} className="space-y-4">
        {[...groups.entries()].map(([menu, groupItems]) => (
          <div key={menu}>
            <p className="mb-1 px-3 text-xs font-medium text-muted-foreground">{menu}</p>
            <ul className="space-y-0.5">
              {groupItems.map((item) => (
                <li key={item.key}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start gap-2 font-normal',
                      item.key === selectedKey && 'bg-muted font-medium'
                    )}
                    onClick={() => setSelectedKey(item.key)}
                  >
                    <span className="truncate">{item.label}</span>
                    {drafts[item.key]?.isOverridden && (
                      <Badge variant="outline" className="ml-auto shrink-0">
                        {t('overriddenBadge')}
                      </Badge>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>{selected.label}</CardTitle>
          <CardDescription>{selected.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mail-subject">
              {t('subjectLabel')}<span className="text-destructive">*</span>
            </Label>
            <Input
              id="mail-subject"
              value={draft.subject}
              onChange={(e) => patchDraft({ subject: e.target.value })}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mail-html">
              {t('bodyLabel')}<span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="mail-html"
              value={draft.html}
              onChange={(e) => patchDraft({ html: e.target.value })}
              disabled={isPending}
              rows={10}
              className="font-mono text-xs"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              {t('variablesHint')}{' '}
              {selected.variables.map((v) => (
                <code key={v} className="mr-1 rounded bg-muted px-1 py-0.5 font-mono">
                  {`{{${v}}}`}
                </code>
              ))}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!draft.isOverridden || isPending}
              onClick={() => setResetOpen(true)}
            >
              <RotateCcw className="mr-2 size-4" strokeWidth={2} />
              {t('resetButton')}
            </Button>
            <Button type="button" variant="outline" disabled={isPending} onClick={handlePreview}>
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={2} />
              ) : (
                <Eye className="mr-2 size-4" strokeWidth={2} />
              )}
              {t('previewButton')}
            </Button>
            <Button type="button" disabled={isPending} onClick={handleSave}>
              {t('saveButton')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="truncate">{preview?.subject ?? t('previewLabel')}</SheetTitle>
          </SheetHeader>
          <iframe
            title={t('previewLabel')}
            sandbox=""
            srcDoc={preview?.html ?? ''}
            className="min-h-0 flex-1 w-full border-t bg-white"
          />
        </SheetContent>
      </Sheet>

      <ConfirmActionDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t('resetDialogTitle', { label: selected.label })}
        description={t('resetDialogDescription')}
        confirmLabel={t('resetButton')}
        successMessage={t('resetDialogSuccessMessage')}
        action={async () => {
          const result = await resetMailTemplateAction(selectedKey);
          if (!result.success) return { error: errT(result.code as Parameters<typeof errT>[0]) };
          patchDraft({
            subject: selected.defaultSubject,
            html: selected.defaultHtml,
            isOverridden: false,
          });
          return { ok: true };
        }}
      />
    </div>
  );
}
```

Note `ConfirmActionDialog.action` (from `ugt-nextjs-design-setup/assets/ui/confirm-action-dialog.tsx:40`) has the signature `() => Promise<{ ok: true } | { error: string }>` — it toasts `result.error` directly with no translation step of its own, so the `error` handed to it here must already be the resolved English/Thai string (`errT(result.code)`), matching how every other kit consumer of this dialog behaves.

- [ ] **Step 3: Verify against a scratch fixture** — copy the full edited `mail-setup` `assets/` tree (both files from this task, both from Task 1) into a scratch project alongside `messages/kit.{th,en}.ts` and `messages/mail.{th,en}.ts`, then:

```bash
node "D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-design-setup\scripts\check-i18n.mjs" "<scratch-dir>"
```

`converted files carry no Thai outside comments` won't count these two files yet (Task 3 adds them to the list) — confirm manually instead: `grep -P '[\x{0E00}-\x{0E7F}]' <scratch-dir>/app/\(admin\)/admin/mail-templates/page.tsx <scratch-dir>/components/mail-templates-manager.tsx` outside of `//`/`/* */` comments returns nothing.

- [ ] **Step 4: Commit**

```bash
git add "plugins/ugt-nextjs-platform/skills/ugt-nextjs-mail-setup/assets/app/(admin)/admin/mail-templates/page.tsx" \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-mail-setup/assets/components/mail-templates-manager.tsx
git commit -m "feat(mail-setup): translate mail-templates admin page + manager (mail.page/mail.manager namespaces)"
```

---

### Task 3: mail-setup regression gate + SKILL.md wiring

**Files:**
- Modify: `D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-design-setup\scripts\check-i18n.mjs`
- Modify: `D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-mail-setup\SKILL.md`

- [ ] **Step 1: Add mail-setup's converted files to `OPTIONAL_CONVERTED_FILES`** — and add a one-line comment explaining why `lib/types/mail-templates.ts` is deliberately absent (otherwise a future reader "closes the gap" and breaks mission 2.3):

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
  // ugt-nextjs-mail-setup (phase 3, 2026-08-24) — optional, same reason.
  // lib/types/mail-templates.ts is intentionally NOT listed here: it holds
  // email BODY content (GREETING, EMAIL_FOOTER, heading, previewSample,
  // DEFAULT_MAIL_TEMPLATES) that stays Thai until a `locale` column exists
  // on `user` (spec มติ 2.3) — adding it would make this gate permanently red.
  'components/mail-templates-manager.tsx',
  'app/(admin)/admin/mail-templates/page.tsx',
  'lib/actions/admin-mail-templates.ts',
];
```

- [ ] **Step 2: Prove the updated gate against a scratch fixture** — build a scratch project with `messages/kit.{th,en}.ts` + `messages/mail.{th,en}.ts` plus the 3 files above, registered in `i18n/messages.ts` (see Step 4), then:

```bash
node "D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-design-setup\scripts\check-i18n.mjs" "<scratch-dir>"
```

Expect `3 passed · 0 failed` with the converted-files line reading a count that includes the 3 new mail entries.

- [ ] **Step 3: Break the gate once, on purpose** — add one Thai character into a scratch copy of `mail-templates-manager.tsx` and re-run; expect `✘ converted files carry no Thai outside comments` naming that file. Remove the injected string afterward.

- [ ] **Step 4: Update `ugt-nextjs-mail-setup/SKILL.md` §4.2** (right after the copy-assets table) with the same i18n-wiring paragraph phase 2 added to `ugt-nextjs-auth-setup/SKILL.md` §5.2, adapted:

```markdown
**i18n wiring (every project, since `ugt-nextjs-design-setup` 4.46.0):**
every project already has `messages/`, `i18n/request.ts` and
`i18n/messages.ts` from design-setup. Since this phase, both converted
mail-setup assets (`mail-templates-manager.tsx`, the `/admin/mail-templates`
page) call `useTranslations()`/`getTranslations()` unconditionally, so the
`mail` catalog **must** be registered before either renders:

1. Copy `assets/messages/mail.th.ts` and `assets/messages/mail.en.ts` to the
   project's `messages/` directory.
2. Edit the project's `i18n/messages.ts` (owned by `ugt-nextjs-design-setup`
   — its own header comment says *"A skill that adds its own catalog (auth,
   mail, upload) registers it here"*):

   ```ts
   import { mailEn } from '@/messages/mail.en';
   import { mailTh } from '@/messages/mail.th';

   type MailCatalog = {
     [Namespace in keyof typeof mailTh]: Record<keyof (typeof mailTh)[Namespace], string>;
   };

   export const messages: Record<AppLocale, { kit: KitCatalog; mail: MailCatalog /* + auth, upload if installed */ }> = {
     th: { kit: kitTh, mail: mailTh },
     en: { kit: kitEn, mail: mailEn },
   };
   ```

Skipping step 2 fails silently, exactly as it does for `auth` (see
`ugt-nextjs-auth-setup/SKILL.md` §5.2): the page still builds, but every
`t()` renders its raw key path (`mail.page.title`) instead of text.
`check-i18n.mjs`'s `every catalog in messages/ is registered in
i18n/messages.ts` check catches this — run design-setup's `verify.mjs`
before calling an install done.
```

- [ ] **Step 5: Update `ugt-nextjs-mail-setup/SKILL.md`'s Verification Checklist** — add: "th+en projects: `node <ugt-nextjs-design-setup skill dir>/scripts/check-i18n.mjs .` reports 0 failed, and `/admin/mail-templates` (list, editor, preview, reset) shows English text after switching locale."

- [ ] **Step 6: Commit**

```bash
git add plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/scripts/check-i18n.mjs \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-mail-setup/SKILL.md
git commit -m "feat(mail-setup): regression gate + install wiring for phase 3 i18n (mail admin UI)"
```

---

### Task 4: `upload` catalog scaffolding + error-code contract in both route handlers

**Files:**
- Create: `assets/messages/upload.th.ts`
- Create: `assets/messages/upload.en.ts`
- Modify: `assets/app/api/files/route.ts`
- Modify: `assets/app/api/files/[id]/route.ts`

**Interfaces:**
- Produces: `uploadTh`/`uploadEn` (consumed by Task 5 and by `i18n/messages.ts`'s `upload: uploadTh`/`upload: uploadEn`, documented in Task 6).
- Produces: the canonical `upload.errors` code list below.

**Canonical `upload.errors` code list:**

```
UNAUTHORIZED         ต้องเข้าสู่ระบบก่อน                          Please sign in first.
FORBIDDEN_UPLOAD      ไม่มีสิทธิ์อัปโหลดไฟล์                       You don't have permission to upload files.
FORBIDDEN_DOWNLOAD   ไม่มีสิทธิ์ดาวน์โหลดไฟล์                      You don't have permission to download files.
BAD_REQUEST          ข้อมูลไม่ครบ                                Missing required information.
FILE_TOO_LARGE       ไฟล์ใหญ่เกิน {max} MB                        File exceeds {max} MB.
FILE_INFECTED        ไฟล์นี้ตรวจพบไวรัส จึงไม่ถูกอัปโหลด            This file was flagged as infected and was not uploaded.
SCANNER_UNAVAILABLE  ระบบตรวจไวรัสไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง The virus scanner is unavailable. Please try again later.
NOT_FOUND            ไม่พบไฟล์                                   File not found.
FILE_NOT_AVAILABLE   ไฟล์นี้ไม่พร้อมใช้งาน                          This file is not available.
UPLOAD_FAILED        อัปโหลดไม่สำเร็จ                             Upload failed.
```

- [ ] **Step 1: Create `assets/messages/upload.th.ts`**

```ts
// kit: ugt-nextjs-platform 4.48.0 · ugt-nextjs-upload-setup/messages/upload.th.ts
// kit-hash: (stamped by scripts/stamp-kit-assets.mjs)
// Thai catalog for ugt-nextjs-upload-setup. Keys must match upload.en.ts
// exactly — scripts/check-i18n.mjs fails the build when they drift.
export const uploadTh = {
  errors: {
    UNAUTHORIZED: 'ต้องเข้าสู่ระบบก่อน',
    FORBIDDEN_UPLOAD: 'ไม่มีสิทธิ์อัปโหลดไฟล์',
    FORBIDDEN_DOWNLOAD: 'ไม่มีสิทธิ์ดาวน์โหลดไฟล์',
    BAD_REQUEST: 'ข้อมูลไม่ครบ',
    FILE_TOO_LARGE: 'ไฟล์ใหญ่เกิน {max} MB',
    FILE_INFECTED: 'ไฟล์นี้ตรวจพบไวรัส จึงไม่ถูกอัปโหลด',
    SCANNER_UNAVAILABLE: 'ระบบตรวจไวรัสไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง',
    NOT_FOUND: 'ไม่พบไฟล์',
    FILE_NOT_AVAILABLE: 'ไฟล์นี้ไม่พร้อมใช้งาน',
    UPLOAD_FAILED: 'อัปโหลดไม่สำเร็จ',
  },
  fileUpload: {
    uploading: 'กำลังอัปโหลด…',
    attachButton: 'แนบไฟล์',
    removeLabel: 'ลบไฟล์แนบ',
    uploadedSuccess: 'อัปโหลดไฟล์แล้ว',
  },
} as const;
```

- [ ] **Step 2: Create `assets/messages/upload.en.ts`**

```ts
// kit: ugt-nextjs-platform 4.48.0 · ugt-nextjs-upload-setup/messages/upload.en.ts
// kit-hash: (stamped by scripts/stamp-kit-assets.mjs)
// English catalog for ugt-nextjs-upload-setup. Keys must match upload.th.ts
// exactly — scripts/check-i18n.mjs fails the build when they drift.
export const uploadEn = {
  errors: {
    UNAUTHORIZED: 'Please sign in first.',
    FORBIDDEN_UPLOAD: "You don't have permission to upload files.",
    FORBIDDEN_DOWNLOAD: "You don't have permission to download files.",
    BAD_REQUEST: 'Missing required information.',
    FILE_TOO_LARGE: 'File exceeds {max} MB.',
    FILE_INFECTED: 'This file was flagged as infected and was not uploaded.',
    SCANNER_UNAVAILABLE: 'The virus scanner is unavailable. Please try again later.',
    NOT_FOUND: 'File not found.',
    FILE_NOT_AVAILABLE: 'This file is not available.',
    UPLOAD_FAILED: 'Upload failed.',
  },
  fileUpload: {
    uploading: 'Uploading…',
    attachButton: 'Attach file',
    removeLabel: 'Remove attachment',
    uploadedSuccess: 'File uploaded.',
  },
} as const;
```

- [ ] **Step 3: `app/api/files/route.ts` — drop `message`, keep `code`, add `maxMb`**

Every `NextResponse.json({ success: false, error: { code: 'X', message: '…' } }, { status })` becomes `NextResponse.json({ success: false, error: { code: 'X' } }, { status })`. The one with a runtime value gets an extra field instead of interpolated Thai:

```ts
if (!session?.user) {
  return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
}

// …

if (!permissions.has(PERMISSIONS.FILES_CREATE)) {
  return NextResponse.json({ success: false, error: { code: 'FORBIDDEN_UPLOAD' } }, { status: 403 });
}

// …

if (!(file instanceof File) || !entityType || !entityId) {
  return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST' } }, { status: 400 });
}

const maxBytes = Number(env.UPLOAD_MAX_BYTES);
if (file.size > maxBytes) {
  return NextResponse.json(
    { success: false, error: { code: 'FILE_TOO_LARGE', maxMb: Math.floor(maxBytes / 1024 / 1024) } },
    { status: 413 }
  );
}

// …

if (scan.status === 'infected') {
  await writeAuditLog({ /* unchanged */ });
  return NextResponse.json({ success: false, error: { code: 'FILE_INFECTED' } }, { status: 422 });
}
if (scan.status === 'error') {
  console.error('virus scan unavailable', scan.message);
  return NextResponse.json({ success: false, error: { code: 'SCANNER_UNAVAILABLE' } }, { status: 503 });
}
```

Every other line in the file (session/permission/scan/storage/audit-log calls, imports) is unchanged.

- [ ] **Step 4: `app/api/files/[id]/route.ts` — same treatment**

```ts
if (!session?.user) {
  return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
}

// …

if (!permissions.has(PERMISSIONS.FILES_READ)) {
  return NextResponse.json({ success: false, error: { code: 'FORBIDDEN_DOWNLOAD' } }, { status: 403 });
}

// …

if (!attachment || !(await canReadAttachment(session.user.id, attachment))) {
  return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
}

if (attachment.scanStatus !== 'clean') {
  return NextResponse.json({ success: false, error: { code: 'FILE_NOT_AVAILABLE' } }, { status: 409 });
}
```

Everything else (the download stream, its headers, the audit log) is unchanged.

- [ ] **Step 5: Verify against a scratch fixture**

```bash
node "D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-design-setup\scripts\check-i18n.mjs" "<scratch-dir>"
```

Confirm `catalog key parity across locales` passes for `upload`, and manually grep both route files for Thai outside comments (returns nothing) — Task 6 wires them into the file list.

- [ ] **Step 6: Commit**

```bash
git add plugins/ugt-nextjs-platform/skills/ugt-nextjs-upload-setup/assets/messages/upload.th.ts \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-upload-setup/assets/messages/upload.en.ts \
        "plugins/ugt-nextjs-platform/skills/ugt-nextjs-upload-setup/assets/app/api/files/route.ts" \
        "plugins/ugt-nextjs-platform/skills/ugt-nextjs-upload-setup/assets/app/api/files/[id]/route.ts"
git commit -m "feat(upload-setup): upload catalog + error-code contract on both route handlers (i18n mission 2.6)

New messages/upload.{th,en}.ts. Both Route Handlers now return {code} only
(no Thai message field) — FILE_TOO_LARGE carries maxMb for client-side
interpolation instead of a pre-formatted string."
```

---

### Task 5: `components/file-upload.tsx`

**Files:**
- Modify: `assets/components/file-upload.tsx`

**Interfaces:**
- Consumes: `uploadTh`/`uploadEn` from Task 4; the `{ code, maxMb? }` shape both route handlers now return.

**String table:**

| Line(s) | Thai | Key | English |
| --- | --- | --- | --- |
| 58 | (fallback) อัปโหลดไม่สำเร็จ | `errors.UPLOAD_FAILED` | Upload failed. |
| 63 | อัปโหลดไฟล์แล้ว | `fileUpload.uploadedSuccess` | File uploaded. |
| 66 | อัปโหลดไม่สำเร็จ | `errors.UPLOAD_FAILED` | Upload failed. |
| 93 | กำลังอัปโหลด… / แนบไฟล์ | `fileUpload.uploading` / `fileUpload.attachButton` | Uploading… / Attach file |
| 113 | ลบไฟล์แนบ | `fileUpload.removeLabel` | Remove attachment |

- [ ] **Step 1: Rewrite the file**

```tsx
'use client';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Paperclip, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { IconAction } from '@/components/ui/icon-action';
import { formatFileSize } from '@/lib/format';

export interface AttachmentSummary {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export function FileUpload({
  entityType,
  entityId,
  items,
  onChange,
  disabled,
}: Readonly<{
  entityType: string;
  entityId: string;
  items: AttachmentSummary[];
  onChange: (next: AttachmentSummary[]) => void;
  disabled?: boolean;
}>) {
  const t = useTranslations('upload.fileUpload');
  const errT = useTranslations('upload.errors');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  async function upload(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('entityType', entityType);
      body.append('entityId', entityId);

      const response = await fetch(`${basePath}/api/files`, { method: 'POST', body });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const code = payload?.error?.code as Parameters<typeof errT>[0] | undefined;
        toast.error(
          code
            ? errT(code, code === 'FILE_TOO_LARGE' ? { max: payload.error.maxMb } : undefined)
            : errT('UPLOAD_FAILED')
        );
        return;
      }
      const payload = await response.json();
      onChange([...items, payload.data as AttachmentSummary]);
      toast.success(t('uploadedSuccess'));
    } catch (error) {
      console.error('upload failed', error);
      toast.error(errT('UPLOAD_FAILED'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        disabled={disabled || busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload strokeWidth={2} aria-hidden />
        {busy ? t('uploading') : t('attachButton')}
      </Button>

      {items.length > 0 && (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs"
            >
              <Paperclip strokeWidth={2} className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <a
                href={`${basePath}/api/files/${item.id}`}
                className="min-w-0 flex-1 truncate underline-offset-2 hover:underline"
              >
                {item.fileName}
              </a>
              <span className="shrink-0 text-muted-foreground">{formatFileSize(item.fileSize)}</span>
              {!disabled && (
                <IconAction
                  label={t('removeLabel')}
                  tone="danger"
                  onClick={() => onChange(items.filter((x) => x.id !== item.id))}
                >
                  <Trash2 strokeWidth={2} aria-hidden />
                </IconAction>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify against a scratch fixture** — copy the edited file into the same scratch project used in Task 4, re-run `check-i18n.mjs`'s Thai-scan manually (Task 6 wires the file list): confirm no Thai outside comments remains.

- [ ] **Step 3: Commit**

```bash
git add plugins/ugt-nextjs-platform/skills/ugt-nextjs-upload-setup/assets/components/file-upload.tsx
git commit -m "feat(upload-setup): translate file-upload.tsx (upload.fileUpload + upload.errors namespaces)"
```

---

### Task 6: upload-setup regression gate + SKILL.md wiring + final version/CHANGELOG + whole-repo gate chain

This is the closing task for the whole spec — every remaining check from `docs/superpowers/specs/2026-08-24-org-kit-i18n-design.md` §6.3 must be green after this task, for both skills touched in this phase.

**Files:**
- Modify: `D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-design-setup\scripts\check-i18n.mjs`
- Modify: `D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-upload-setup\SKILL.md`
- Modify: `D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\CHANGELOG.md`

- [ ] **Step 1: Add upload-setup's converted files to `OPTIONAL_CONVERTED_FILES`** (continuing the same array Task 3 edited):

```js
  // ugt-nextjs-upload-setup (phase 3, 2026-08-24) — optional, same reason:
  // th+en project may not have upload-setup installed at all.
  'components/file-upload.tsx',
  'app/api/files/route.ts',
  'app/api/files/[id]/route.ts',
];
```

(This closes the array opened in Task 3 Step 1 — apply both skills' entries as one edit if executing Tasks 3 and 6 out of order is inconvenient; they touch the same file and the same array.)

- [ ] **Step 2: Prove the fully-updated gate against one combined scratch fixture** — build (or extend the Task 3 fixture with) `messages/upload.{th,en}.ts` plus the 3 upload files, registered in `i18n/messages.ts` alongside `kit`/`mail`, then:

```bash
node "D:\Project_2026\ugt-claude-platform\plugins\ugt-nextjs-platform\skills\ugt-nextjs-design-setup\scripts\check-i18n.mjs" "<scratch-dir>"
```

Expect `3 passed · 0 failed`, converted-files count reading `N/N` for every entry present in the fixture.

- [ ] **Step 3: Break the gate once, on purpose** — add one Thai character into a scratch copy of `file-upload.tsx`, re-run, confirm `✘ converted files carry no Thai outside comments` names it. Remove the injected string.

- [ ] **Step 4: Update `ugt-nextjs-upload-setup/SKILL.md` §4.1** (right after the copy-assets table) with the mail-setup-equivalent i18n-wiring paragraph:

```markdown
**i18n wiring (every project, since `ugt-nextjs-design-setup` 4.46.0):**
`components/file-upload.tsx` and both `app/api/files/**/route.ts` handlers
call `useTranslations()` unconditionally since this phase, so the `upload`
catalog **must** be registered before the widget renders:

1. Copy `assets/messages/upload.th.ts` and `assets/messages/upload.en.ts` to
   the project's `messages/` directory.
2. Edit the project's `i18n/messages.ts`:

   ```ts
   import { uploadEn } from '@/messages/upload.en';
   import { uploadTh } from '@/messages/upload.th';

   type UploadCatalog = {
     [Namespace in keyof typeof uploadTh]: Record<keyof (typeof uploadTh)[Namespace], string>;
   };

   export const messages: Record<AppLocale, { kit: KitCatalog; upload: UploadCatalog /* + auth, mail if installed */ }> = {
     th: { kit: kitTh, upload: uploadTh },
     en: { kit: kitEn, upload: uploadEn },
   };
   ```

Skipping step 2 fails silently — `FileUpload` still builds, but every label
renders its raw key path (`upload.fileUpload.attachButton`). `check-i18n.mjs`
catches it (`every catalog in messages/ is registered in i18n/messages.ts`).
```

- [ ] **Step 5: Update `ugt-nextjs-upload-setup/SKILL.md`'s Verification Checklist** — add: "th+en projects: `node <ugt-nextjs-design-setup skill dir>/scripts/check-i18n.mjs .` reports 0 failed, and the attach/upload widget plus every upload/download error toast shows English text after switching locale."

- [ ] **Step 6: Write the CHANGELOG entry** — mirror the 4.47.0/4.47.1 style, in `plugins/ugt-nextjs-platform/CHANGELOG.md`, above the `4.47.2` entry (version already bumped to `4.48.0` in Task 1 Step 1):

```markdown
## 4.48.0 (2026-08-24)

**เฟส 3 (สุดท้าย) ของ i18n — mail-setup admin UI + upload-setup ทั้งสกิลอ่านจาก
catalog แล้ว** (spec: `docs/superpowers/specs/2026-08-24-org-kit-i18n-design.md`
§6.2, 52 ข้อความ — 36 mail-setup + 16 upload-setup) **ปิดสเปคทั้งฉบับ**

- **catalog ใหม่**: `messages/mail.th.ts`/`mail.en.ts` (namespace `errors` ·
  `templates` · `page` · `manager`) และ `messages/upload.th.ts`/`upload.en.ts`
  (namespace `errors` · `fileUpload`)
- **error-code contract ขยายไปอีกสองสกิล** (มติ 2.6): `admin-mail-templates.ts`
  เลิกคืน `{ error: 'ข้อความไทย' }` **และ** เลิกคืนอังกฤษดิบที่ฝังไว้เดิม
  (`'Unauthorized'`/`'Forbidden'`/`'Unknown template'` — ข้อความอังกฤษที่
  check-i18n.mjs สแกนไม่เห็นเพราะสแกนแต่อักษรไทย พบด้วยการอ่านโค้ด ไม่ใช่ด่าน)
  · ทั้งสอง route handler ของ upload-setup (`app/api/files/route.ts`,
  `app/api/files/[id]/route.ts`) เดิมมี `{ code, message }` อยู่แล้ว —
  ตัด `message` (ไทย) ออก เหลือ `code` ให้ client แปล
- **`lib/types/mail-templates.ts`**: `MailTemplateDefinition.menu/label/
  description` (10 ข้อความ = UI chrome ของหน้าแอดมิน) กลายเป็น
  `menuKey/labelKey/descriptionKey` แปลที่ Server Component
  `page.tsx` (`getTranslations('mail.templates')`) — **เนื้ออีเมล 32 ข้อความ
  ที่เหลือในไฟล์เดียวกัน (GREETING, EMAIL_FOOTER, heading, previewSample,
  DEFAULT_MAIL_TEMPLATES) ไม่แตะ** (มติ 2.3, รอ locale column บน `user`) —
  ไฟล์นี้จึงไม่อยู่ใน `check-i18n.mjs`'s `OPTIONAL_CONVERTED_FILES` โดยเจตนา
  (จะมี Thai เหลืออยู่ถาวรจนกว่าจะทำ mission 2.3)
- **`check-i18n.mjs`**: `OPTIONAL_CONVERTED_FILES` +6 ไฟล์ (3 mail-setup, 3
  upload-setup)
- **`SKILL.md` §i18n wiring**: ทั้ง `ugt-nextjs-mail-setup` และ
  `ugt-nextjs-upload-setup` ได้ย่อหน้าเดียวกับที่ `ugt-nextjs-auth-setup`
  §5.2 มี — copy catalog + ลงทะเบียนใน `i18n/messages.ts` ก่อน render
- **ปิดสเปค `2026-08-24-org-kit-i18n-design.md` ทั้งฉบับ**: เฟส 0-3 ครบ
  256/256 ข้อความในขอบเขต (289 - 33 เนื้ออีเมลนอกขอบเขต) — เนื้ออีเมล,
  ปฏิทิน พ.ศ., CLI/test titles, และคอมเมนต์ 845 บรรทัด ยังอยู่นอกขอบเขตตาม
  §8 เดิม
```

- [ ] **Step 7: Run the full repo gate chain**

```bash
node "D:\Project_2026\ugt-claude-platform\scripts\lint-kit-assets.mjs"
node "D:\Project_2026\ugt-claude-platform\scripts\check-contract-drift.mjs"
node "D:\Project_2026\ugt-claude-platform\scripts\check-doc-status.mjs"
node "D:\Project_2026\ugt-claude-platform\scripts\check-preview-tokens.mjs"
node "D:\Project_2026\ugt-claude-platform\scripts\stamp-kit-assets.mjs" --check
```

All five must pass. If `stamp-kit-assets.mjs --check` fails (expected for new/changed assets), run it without `--check` to write stamps, then re-run `--check` to confirm. Then:

```bash
claude plugin validate --strict plugins/ugt-nextjs-platform
```

- [ ] **Step 8: Whole-branch review** — before committing this task, run a review of every change across all 6 tasks in this phase (the same "final review catches what per-task review misses" step phase 2 used, which caught 1 Critical + 4 Important issues its per-task reviews didn't). Ask specifically: for every new gate/instruction added in this phase, "if someone skips this step, does anything catch it?" — not just "are the instructions complete?" (phase 2's own lesson, §backlog — its per-task reviews confirmed the docs were complete and still missed the unguarded registration step). Fix anything found before proceeding.

- [ ] **Step 9: Commit**

```bash
git add plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/scripts/check-i18n.mjs \
        plugins/ugt-nextjs-platform/skills/ugt-nextjs-upload-setup/SKILL.md \
        plugins/ugt-nextjs-platform/CHANGELOG.md
git commit -m "feat(upload-setup): regression gate + install wiring for phase 3 i18n (upload-setup)

Closes docs/superpowers/specs/2026-08-24-org-kit-i18n-design.md in full —
all four phases (0-3) shipped, 256/256 in-scope strings converted."
```

---

## Self-Review Notes

- **Spec coverage:** §6.2 phase 3 scope (mail-setup admin UI 36, upload-setup 16) — covered by Tasks 1-2 (mail) and 4-5 (upload). §5/§2 mission 2.6 extended to both skills — Task 1 Step 4 (mail, including the two hardcoded-English sites the Thai scan can't see) and Task 4 Steps 3-4 (upload). §6.3's regression gate — Tasks 3 and 6. §8 out-of-scope (email body content, มติ 2.3) — explicitly called out in Architecture, Global Constraints, Task 1's string table, and Task 3 Step 1's gate-file comment, so it cannot silently regress into "just add the missing file to the list" later.
- **Cross-task dependencies called out explicitly:** Task 1 gates Task 2 (catalog + `menuKey`/`labelKey`/`descriptionKey` must exist before `page.tsx` can resolve them). Task 4 gates Task 5 (catalog + route handlers' `{code}` shape must exist before the client reads it). Tasks 3 and 6 both edit `check-i18n.mjs`'s single `OPTIONAL_CONVERTED_FILES` array — Task 6 Step 1 notes this and gives the option to fold both edits together if run out of order. Task 6 depends on every prior task's files existing.
- **Code/key consistency check:** `SUBJECT_REQUIRED`/`SUBJECT_TOO_LONG`/`BODY_REQUIRED`/`BODY_TOO_LONG` are defined once (Task 1's canonical list, used in both `mailTemplateSchema`'s zod messages and `mail.errors`) and only referenced afterward. `FILE_TOO_LARGE`'s `{max}` placeholder is produced by the server (`maxMb` field, Task 4 Step 3) and consumed identically by the client (Task 5 Step 1) — same variable name on both sides.
- **No placeholders:** every task's string table gives the exact source line, exact Thai text, exact key, and exact English translation; every code block is the complete file section being changed, not a "similar to Task N" reference.
- **Version bump ordering:** Task 1 Step 1 bumps `plugin.json` before any other file in this phase is touched, closing the exact gap phase 2 left open (its own CHANGELOG 4.47.0 entry notes the bump landed in the *last* task, stamping 15 assets at the wrong version).
