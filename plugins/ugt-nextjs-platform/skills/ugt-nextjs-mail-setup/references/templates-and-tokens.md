# Templates and tokens — adding, editing, and the escaping trap

## Adding a template key

Three edits in `lib/types/mail-templates.ts`. Miss one and either TypeScript
complains or — worse — the mail goes out empty.

1. **`MAIL_TEMPLATE_KEYS`** — add the string. Naming: `<domain>.<event>`
   (`leave.approved`, `ot.plan.request`). The key is also the `AppSettings`
   row key, so renaming one orphans an admin's stored override.
2. **`MAIL_TEMPLATE_DEFINITIONS`** — the editor metadata:
   - `menu` groups the selector · `label` / `description` are what the admin reads
   - `heading` is the h1 in the fixed header
   - `variables` — every token this template may use. The editor lists them as
     hints and the preview fills them; a token not listed still renders, but no
     one editing the template will know it exists.
   - `banner` (success/danger) and `cta` are optional chrome
   - `previewSample` overrides the base sample for this template only
3. **`DEFAULT_MAIL_TEMPLATES`** — subject + inner HTML. Keep it to `<p>` and
   `<strong>`: the chrome supplies the frame, and heavy markup is what breaks in
   Outlook.

## What an admin can and cannot change

| Editable at `/admin/mail-templates` | Fixed in code |
| --- | --- |
| Subject line | Card frame, width, fonts |
| Inner prose (intro + detail lines) | Header (brand line + heading) |
| Which listed tokens appear, and where | Greeting line |
| | Status banner, CTA button |
| | Divider + "do not reply" footer |

That boundary is the point: wording changes without a deploy, but nobody can
delete the disclaimer or break the layout from an admin screen.

## The escaping trap

Every token value is HTML-escaped when substituted into the body. A user typing
`<script>alert(1)</script>` as a rejection reason arrives as visible text.

**`htmlVariables` is the only bypass**, and it exists for one case: HTML the
server built itself, e.g. a multi-row table where each cell was escaped as it
was assembled.

```ts
// ✅ items is built server-side, each cell escaped during the build
htmlVariables: ['items'],

// ❌ NEVER — rejectReason comes from a user typing into a form
htmlVariables: ['rejectReason'],
```

The subject line is rendered **unescaped** because it is plain text — an email
client does not parse HTML there. Do not paste HTML into a subject.

## Tokens that are always available

`appName` (from `NEXT_PUBLIC_APP_NAME`) and `recipientName` (used by the fixed
greeting) are expected by the chrome — always pass them, or emails greet
"เรียนคุณ ," with a blank.

## Links

Email opens outside the app, so relative paths are dead links. Build every URL
from the full app URL in env, including the basePath:

```ts
const detailUrl = `${env.NEXT_PUBLIC_APP_URL}/requests/${id}`;
```

The same value feeds the CTA button through its `urlToken`.

## Testing a change without mailing anyone

Grant yourself `dev-mode:enable` and run the real flow. The mail arrives at your
own address with `[DEV] ` on the subject and a banner naming the recipients it
would have gone to — including CC, which is dropped in dev mode. This is the
supported way to test; do not add a "test recipient" override to the code.

## When a stored override goes bad

`getMailTemplate` validates the stored JSON against `mailTemplateSchema`. A
corrupt row or a schema mismatch falls back to the in-code default and the email
still goes out. Removing the `AppSettings` row is therefore a safe way to reset a
template to its default.
