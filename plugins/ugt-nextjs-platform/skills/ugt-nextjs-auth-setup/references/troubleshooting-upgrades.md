# Troubleshooting — better-auth version bumps, schema drift, peer deps, kit re-syncs

Symptom → root cause → fix for failures that appear after a dependency bump,
a schema the library changed underneath, or an install made from an older kit
asset. Standing rule (SKILL.md §7): after **any** `better-auth` bump, diff
`node_modules/better-auth/dist/plugins/*/schema.mjs` against
`prisma/schema.prisma` and migrate the delta.

Contents: better-auth 1.7 migration note · Dependencies and schema table ·
twoFactor lockout columns · Account.issuer · Kit re-syncs

## better-auth 1.7 migration note

**Why the version is pinned (`^1.7.1` at the time; the floor is now `^1.7.4` —
§Account.issuer below):** better-auth 1.7.0
deleted `genericOAuthClient` from `better-auth/client/plugins` in a MINOR bump
— present through 1.6.14, gone in 1.7.0, so a caret range like `^1.6.0` floats
straight into the broken line. This was a deliberate rewrite, not a
regression: generic OAuth (the Keycloak SSO button) became a first-class
social provider — `authClient.signIn.social({ provider: 'keycloak' })`
replaces the removed `signIn.oauth2()`, no client plugin needed, and the
callback route moved from `/api/auth/oauth2/callback/:id` to
`/api/auth/callback/:id`. Every asset in this skill is already written for
≥1.7 — never pin below 1.7.1.

## Dependencies and schema

| Symptom | Root cause | Fix |
| --- | --- | --- |
| `npm ci` dies with `ERESOLVE` on Jenkins / in `docker build` (works on the installer's machine) | better-auth's optional peer `vitest ^2–^4` vs the kit's vitest 5 — the `--legacy-peer-deps` flag was never persisted | Commit `.npmrc` with `legacy-peer-deps=true` (SKILL.md §5.1) |
| `Unknown argument 'id'` from Better Auth rate limit | `rateLimit` model used `key` as `@id` | `id String @id` + nullable `key` (see schema template) |

## twoFactor lockout columns (better-auth ≥1.6.24)

**Symptom:** Email OTP (twoFactor plugin) always fails right after a
`better-auth` bump — the login form says "expired" although the code is
fresh; `verify-otp` returns 400 `TWO_FACTOR_NOT_ENABLED`; the `2fa-otp-*` rows
in `Verification` are never consumed.

**Root cause:** better-auth ≥1.6.24 added account lockout:
`verifyTwoFactorOTP` does `findOne twoFactor where userId` **before**
consuming the OTP and throws when no row exists, and it writes `verified` /
`failedVerificationCount` / `lockedUntil` on every attempt. Projects that
enable 2FA by flagging `user.twoFactorEnabled` directly (admin-created users,
no `enableTwoFactor` endpoint) never had that row, and the plugin schema
change ships with no migration.

**Fix:** Add the three columns to `twoFactor`, backfill a placeholder row
(`secret ''`, `backupCodes ''`, `verified false`) for every `twoFactorEnabled`
user, and create/upsert that row wherever the flag is set. Map OTP errors by
`error.code`, never by HTTP status — 400 now covers three different codes.
**After every better-auth bump, diff
`node_modules/better-auth/dist/plugins/*/schema.mjs` against
`prisma/schema.prisma`** — Better Auth never generates migrations and the
failure surfaces as an unrelated 400/500. Seen in ugt-customer-portal
2026-09-15 (fix `d551298`).

## Account.issuer (better-auth 1.7.0–1.7.2 only)

**Symptom:** SSO login ends with "เข้าสู่ระบบไม่สำเร็จ (internal_server_error)"
(Keycloak redirects back fine, no session is created); the server log shows a
Prisma error mentioning `issuer` / `Issuer` on `Account`.

**Root cause:** better-auth **1.7.0–1.7.2** scoped account identity by issuer
and read/wrote `account.issuer`; **1.7.4+ removed it again**
(`@better-auth/core` `schema-diff` now warns that a required `issuer` column
"Better Auth never writes … every insert fails"). So: a project on 1.7.0–1.7.2
without the column fails, and a project that added a NOT NULL `Issuer` and
then upgraded fails too.

**Fix:** Upgrade to `better-auth@^1.7.4` (SKILL.md §5.1 floor) and keep the kit
schema (no `issuer`). If an `Issuer` column was already migrated:
`ALTER COLUMN [Issuer] NVARCHAR(450) NULL` (or drop it and its unique index)
per the [1.7 upgrade guide](https://www.better-auth.com/docs/guides/1-7-upgrade-guide)
— a NOT NULL column Better Auth never writes fails every insert. Seen in
ugt-voice-platform 2026-10-09 on 1.7.2; platform 4.74.0 shipped the column by
mistake and 4.77.0 removed it.

## Kit re-syncs

Bugs fixed in a later kit asset keep reproducing in projects that installed
the older copy — re-sync with `ugt-nextjs-kit-sync`.

| Symptom | Root cause | Fix |
| --- | --- | --- |
| Opening the profile menu (sidebar footer ⋮) kills the page — "This page couldn’t load", console `Base UI error #31` | `DropdownMenuLabel` outside `DropdownMenuGroup` in `nav-user.tsx` | Fixed in the asset 4.69.0 — re-sync old installs |
| SSO `PROVIDER_NOT_FOUND` after one deploy | see `troubleshooting-sso.md` | `lib/auth.ts` 4.72.0 — re-sync |
| Stale-cookie `/` ↔ `/login` loop | see `troubleshooting-session.md` §Stale cookie loop | `proxy.ts` 4.74.0 — re-sync, plus the login-page check |
