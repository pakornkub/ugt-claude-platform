---
name: ugt-nextjs-mail-setup
description: >
  Use when a project needs to send email — "ส่งอีเมลแจ้งเตือน", "ตั้ง SMTP",
  "แจ้งเตือนหัวหน้าตอนมีคำขอ", "ทำ workflow อนุมัติแล้วต้องมีเมลแจ้ง",
  "อยากให้แก้ข้อความอีเมลได้เองโดยไม่ต้อง deploy" — installing nodemailer over
  the org SMTP relay, the admin-editable template system (subject + body stored
  as an `AppSettings` override, in-code defaults so it works before anyone
  edits anything), the fixed email chrome, and **dev mode**: a tester holding
  `dev-mode:enable` receives the mail themselves instead of the real
  recipients, so an approval flow can be exercised end to end without spamming
  anyone.
  Reach for it too on these symptoms: mail that silently never arrives (SMTP
  relay defaulting to localhost:25), a relay rejecting the sender
  (`SMTP_FROM` not authorised), links in email pointing at a path that 404s
  (missing basePath), or an approval that fails because the mail step threw.
  Needs the database (AppSettings) and auth (the actor + permission) already
  installed. Not for the Jenkins build-result emails (→ ugt-nextjs-cicd-setup,
  which uses `emailext` and its own `NOTIFY_EMAIL`).
---

# UGT Mail Setup — workflow email over the org SMTP relay

## 1. Overview

> **ต้องติดตั้งก่อน**: `ugt-nextjs-database-setup` (ตาราง `AppSettings` ที่เก็บ
> template) → `ugt-nextjs-auth-setup` (หน้า `/admin/mail-templates` อยู่ในกลุ่ม
> `(admin)` ของ auth และใช้ guard + audit ของมัน) → `ugt-nextjs-design-setup`
> (หน้า admin ใช้ชุด component ของ kit) · ขาดตัวไหนให้หยุดแล้วไปติดตั้งก่อน

Extracted from `ugt-hrms`, where this exact code sends every approval email in
production. Three pieces:

| Piece | File | What it decides |
| --- | --- | --- |
| Transport | `lib/email.ts` | how mail reaches the relay · dev-mode redirect |
| Rendering | `lib/mail-templates.ts` | token substitution + escaping |
| Content | `lib/types/mail-templates.ts` | keys, allowed tokens, fixed chrome, defaults |

The split matters: **an admin can edit wording, never layout**. The card frame,
header, greeting, status banner, CTA button and the "do not reply" footer are
assembled in code at send time; only the inner prose is stored and editable.

## 2. Org Standards

1. **`sendTemplatedMail` is the only entry point** for workflow mail. Direct
   `sendMail` is for one-off system mail; a fresh nodemailer transport is never
   correct.
2. **Dev mode is mandatory, not optional.** Every call passes `actor`
   (`email` + `hasDevMode`). A tester with `dev-mode:enable` gets the mail
   themselves, CC dropped, `[DEV] ` on the subject, and a banner naming the real
   recipients.
3. **Mail must never fail the work.** Send after the transaction commits, inside
   `try/catch`, and log the failure. An approval that succeeded must stay
   succeeded when SMTP is down.
4. **Every interpolated value is HTML-escaped.** The only bypass is
   `htmlVariables`, reserved for server-built HTML; a user-controlled value in
   that list is an injection hole.
5. **Missing `SMTP_HOST` throws.** Never let nodemailer fall back to
   `localhost:25` — mail vanishes with no error.
6. **`SMTP_FROM` must be an address the relay may send as**, otherwise the
   relay rejects the message and nothing arrives.
7. **Templates fail open**: a corrupt or schema-invalid stored override falls
   back to the in-code default rather than blocking the email.

## 3. Interview — one batch

1. **SMTP host / port** and does the relay need auth? (internal relays usually
   do not — leave `SMTP_USER`/`SMTP_PASS` blank)
2. **Sender address** (`SMTP_FROM`) the relay is allowed to send as
3. **Support contact** for the email footer (team name or address)
4. **Header colour** — hex for the email header/CTA (email clients cannot read
   CSS variables, so it is a literal). Default: the project's primary from
   `docs/DESIGN.md` converted to hex.
5. Which workflows send mail? (drives the template keys; the shipped three are
   a request/approve/reject example to rename)

## 4. Setup steps

### 4.1 Dependencies

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

### 4.2 Copy assets

Assets mirror their destination — copy the tree, then substitute:

| Asset | Destination |
| --- | --- |
| `assets/lib/email.ts` | `lib/email.ts` |
| `assets/lib/mail-templates.ts` | `lib/mail-templates.ts` |
| `assets/lib/types/mail-templates.ts` | `lib/types/mail-templates.ts` |
| `assets/lib/actions/admin-mail-templates.ts` | `lib/actions/admin-mail-templates.ts` — needs auth-setup installed (guard + audit) |
| `assets/app/(admin)/admin/mail-templates/page.tsx` | `app/(admin)/admin/mail-templates/page.tsx` — inside auth-setup's `(admin)` group so its guard + permission sync apply |
| `assets/components/mail-templates-manager.tsx` | `components/mail-templates-manager.tsx` — needs the design kit (`ConfirmActionDialog`, `page-shell`, `textarea` from the base set) |
| `assets/prisma/schema-mail.prisma` | paste INTO `prisma/schema.prisma` |
| `assets/env.example` | append to `.env.example` (+ real values in `.env.local`) |
| `assets/rules/ugt-nextjs-mail.md` | `.claude/rules/ugt-nextjs-mail.md` (whole-file overwritable) |

Placeholders: `__SMTP_HOST__` · `__SMTP_FROM__` · `__SUPPORT_CONTACT__` ·
`__EMAIL_HEADER_COLOR__` · `__PROJECT_DISPLAY_NAME__` · `__APP_URL_PROD__`

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

### 4.3 Wire the env schema

Add to `lib/env.ts` (server block) — all optional so a build without a relay
still passes, with the runtime guard in `sendMail` as the real check:

```ts
SMTP_HOST: z.string().optional(),
SMTP_PORT: z.string().default('25'),
SMTP_SECURE: z.enum(['true', 'false']).default('false'),
SMTP_USER: z.string().optional(),
SMTP_PASS: z.string().optional(),
SMTP_FROM: z.string().optional(),
```

### 4.4 Add the permissions — key + seed ALWAYS in pairs

In `lib/permissions.ts` (from `ugt-nextjs-auth-setup`) add **both the keys and
their `ALL_PERMISSIONS` entries together** — a key without its seed can never
be granted (shipped once as permanently-403 uploads, 4.25.0):

```ts
DEV_MODE: 'dev-mode:enable',
MAIL_TEMPLATES_MANAGE: 'mail-templates:manage',
```

seeds: `{ key: DEV_MODE, label: 'โหมดทดสอบอีเมล', group: 'ระบบ' }` and
`{ key: MAIL_TEMPLATES_MANAGE, label: 'แก้ไขเทมเพลตอีเมล', group: 'ระบบ' }`.
Grant `dev-mode:enable` to testers/developers only — it silently redirects
mail away from real recipients, which is exactly what you do not want on a
normal account. The sync in auth's `(admin)` layout seeds both keys to the
database the next time anyone opens an admin page.

### 4.5 Wire `/admin/mail-templates` into the admin section

The page ships in §4.2; two wires make it reachable:

1. `components/admin-nav.tsx` (auth-setup) — add to `ADMIN_NAV_ITEMS`:

   ```ts
   { href: '/admin/mail-templates', label: 'เทมเพลตอีเมล', icon: Mail, perm: PERMISSIONS.MAIL_TEMPLATES_MANAGE },
   ```

   (import `Mail` from lucide; projects with their own sidebar merge this item
   the same way as the rest — auth SKILL.md §5.6.)
2. `app/(admin)/layout.tsx` — add `PERMISSIONS.MAIL_TEMPLATES_MANAGE` to
   `ADMIN_SECTION_PERMISSIONS`, so a user whose only admin permission is
   template editing can enter the section.

### 4.6 [Local login only] Hand the password-reset template back to auth

`auth.password-reset` ships in `MAIL_TEMPLATE_KEYS` because the reset email is
an ordinary editable template. It is **used from `lib/auth.ts`**
(`sendResetPassword`), not from here — so when the project has local login, go
back to `ugt-nextjs-auth-setup` §5.5 and install the reset pieces now that
`lib/email.ts` exists. Projects with no local login should delete the key, its
definition and its default together.

### 4.7 Migrate + send a test

```bash
npx prisma migrate dev --name add-app-settings && npx prisma generate
```

Then trigger one workflow as a user **with** `dev-mode:enable` and one
**without**, and confirm the difference (see the checklist).

## 5. Adding a template

Three places, or it breaks: `MAIL_TEMPLATE_KEYS` → `MAIL_TEMPLATE_DEFINITIONS`
(label, heading, `variables`, optional banner/CTA) → `DEFAULT_MAIL_TEMPLATES`.
Details, token rules and the escaping trap → `references/templates-and-tokens.md`.

## 6. Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| `sendTemplatedMail` for workflow mail | `sendMail` directly, or a new transport per call site |
| Pass `actor` on every call | Omit it — dev mode dies silently and testers mail real people |
| Send after commit, in `try/catch` | Let a mail failure roll back the approval |
| User input as a plain `{{token}}` | Add a user-controlled token to `htmlVariables` |
| Full URLs from env in links | Relative paths — email is opened outside the app |
| Edit chrome in `lib/types/mail-templates.ts` | Let the admin editor own layout or the disclaimer |
| Leave `SMTP_USER`/`PASS` blank for an internal relay | Invent credentials the relay does not want |

## 7. Verification Checklist

Run the script first (cwd = project root):

```bash
node <skill-dir>/scripts/verify.mjs
```

- [ ] `npm run build` passes with no SMTP values set (env vars are optional)
- [ ] Missing `SMTP_HOST` → `sendMail` throws, and nothing is sent to localhost
- [ ] Tester **with** `dev-mode:enable`: mail arrives at their own address,
      subject starts `[DEV] `, banner lists the real Receiver/CC
- [ ] User **without** it: mail reaches the real recipients, no banner, no `[DEV]`
- [ ] A `<script>` or `<b>` typed into a reason field arrives as visible text,
      not markup
- [ ] Editing a template at `/admin/mail-templates` changes the next email;
      deleting the override falls back to the in-code default
- [ ] th+en projects: `node <ugt-nextjs-design-setup skill dir>/scripts/check-i18n.mjs .`
      reports 0 failed, and `/admin/mail-templates` (list, editor, preview, reset)
      shows English text after switching locale
- [ ] Stopping the SMTP host mid-flow: the approval still succeeds and the
      failure appears in the logs
- [ ] Links in a received email open the right page through the reverse proxy
