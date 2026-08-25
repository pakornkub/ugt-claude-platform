# i18n wiring — registering the `auth` message catalog

Every project — th-only or th+en — already has `messages/`, `i18n/request.ts`
and `i18n/messages.ts` from `ugt-nextjs-design-setup` (มติ 2.2: next-intl is a
dependency of every project, not just th+en, so th-only projects don't skip
the machinery, they just never exercise a second locale). Since design-setup
4.46.0, every converted auth-setup asset (`login-form.tsx`, the
`/admin/users` · `/admin/roles` · `/admin/audit-logs` pages, both password
dialogs, etc.) calls `useTranslations()` unconditionally — so the `auth`
catalog **must** be registered before any of these render, in every project,
not only ones that answered th+en at the design-setup interview.

## Steps

1. Copy `assets/messages/auth.th.ts` and `assets/messages/auth.en.ts` to the
   project's `messages/` directory (same copy step as the kit's own
   `messages/kit.{th,en}.ts`).
2. Edit the project's `i18n/messages.ts` — this file is **owned by
   `ugt-nextjs-design-setup`**, and its own header comment already says the
   quiet part out loud: *"A skill that adds its own catalog (auth, mail,
   upload) registers it here — one import + one spread."* This is that
   registration, not an auth-setup-specific quirk:

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

   `DEFAULT_LOCALE` and everything else in the file is untouched — this is
   purely additive (one import pair + one type + two object keys).

## Skipping step 2 fails silently — this is the dangerous one

The project still builds and still boots (the import paths exist once the
catalog files are copied). But `i18n/request.ts` sets no `getMessageFallback`,
so next-intl falls back to its default: it **renders the key path itself**.
Every login/admin/password screen then shows `auth.login.submit` and
`auth.errors.UNAUTHORIZED` where text should be — no exception, no red
screen, just an app that looks broken to whoever opens it, with the real
error only in the server console. There is no fallback to Thai prose either,
because none of these files carry hardcoded Thai anymore (this phase moved
all of it into the catalog).

`check-i18n.mjs` fails on this (`every catalog in messages/ is registered in
i18n/messages.ts`) — so run design-setup's `verify.mjs`, which delegates to
it, before calling an install done.
