# Password reset flow — [METHOD: LOCAL], needs mail

Request-link / set-new-password / change-own-password for Local accounts on Better Auth — moved out of `auth-flows.md`.

Verified against **better-auth 1.5.4** (`dist/api/routes/password.mjs`); the
endpoint names moved, so older recipes do not apply:

| What | API | Note |
| --- | --- | --- |
| Ask for a link | `auth.api.requestPasswordReset({ body: { email, redirectTo } })` | the old `forgetPassword` name is **gone** in 1.5.x |
| Set the new password | `auth.api.resetPassword({ body: { token, newPassword } })` | token is deleted on success — single use |
| Change own password | `auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions }, headers })` | needs the session headers |

Config in `lib/auth.ts` → `emailAndPassword`: `sendResetPassword` (required —
without it Better Auth answers `RESET_PASSWORD_DISABLED`),
`resetPasswordTokenExpiresIn` (seconds, default 3600), `onPasswordReset`
(post-success hook, the only place that still knows the user) and
`revokeSessionsOnPasswordReset: true`.

**Build the link yourself from `token`, not from the `url` Better Auth hands
you.** Its URL points at `${baseURL}/reset-password/:token?callbackURL=…`,
computed **without the Next.js basePath** — the same trap as the Keycloak
`redirectURI`. Under a basePath the mailed link 404s, and it 404s only in
production, where the basePath exists:

```ts
const resetUrl = `${env.BETTER_AUTH_URL}${env.NEXT_PUBLIC_BASE_PATH}/reset-password?token=${token}`;
```

Three rules the flow depends on:

- **Same answer for every email.** Existing, unknown, malformed — all return
  the same "if this email exists…". Anything else turns the form into a way to
  enumerate who has an account. Better Auth even burns matching time on a
  missing user to keep the timing equal; don't undo that by answering earlier.
- **SSO/LDAP accounts are refused** (logged as `password.reset.refused`).
  Their password lives in the directory; letting the app set one would create a
  second credential that bypasses it.
- **`/reset-password` must be public** in `proxy.ts` — someone who cannot log
  in cannot reach a protected page.
