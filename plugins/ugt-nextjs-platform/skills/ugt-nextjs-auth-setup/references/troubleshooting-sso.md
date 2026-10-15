# Troubleshooting — SSO (Keycloak / genericOAuth) and LDAP sign-in

Symptom → root cause → fix for sign-in failures through Keycloak or AD. How
the flows work is in `login-flows.md` (§SSO login flow, §LDAP login flow);
creating the Keycloak client is in `keycloak-client.md`. Cookie/redirect-loop
symptoms are in `troubleshooting-session.md`.

## Keycloak / genericOAuth

| Symptom | Root cause | Fix |
| --- | --- | --- |
| SSO button → "ไม่สามารถเชื่อมต่อระบบ SSO ได้", `POST /api/auth/sign-in/social` 404 `PROVIDER_NOT_FOUND`, `/api/health` green — after one deploy only | genericOAuth discovery fetch failed at startup and the provider was dropped for the process (`login-flows.md` §SSO login flow, "Explicit endpoints") | Fixed in `lib/auth.ts` 4.72.0 (`keycloakEndpoints`) — re-sync; restart the container to recover an old install |
| Keycloak rejects the redirect URI | Client's valid redirect URIs missing the basePath-qualified callback | Register `<BETTER_AUTH_URL>/__BASE_PATH__/api/auth/callback/keycloak` exactly, slashes included (`keycloak-client.md` §Redirect URI pattern) |
| Build crashes with `SKIP_ENV_VALIDATION=1` | `keycloak()` helper runs `.replace()` on undefined issuer | Conditional plugin registration guard |
| SSO shows "Invalid OAuth configuration", or server log has `fetch failed` / `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | Node can't verify internal CA cert on Keycloak host | `NODE_TLS_REJECT_UNAUTHORIZED=0` missing — it is org standard in compose and `.env.local` section 1; put it back |
| SSO fails `unable_to_create_user` for users that already exist | AD email drifted from stored email (e.g. `@company.com` in AD vs `@company.co.th` in the row) → Better Auth "creates" and hits a unique constraint | Resolve the existing row by `ldapUsername` in `mapProfileToUser`; its email wins — **shipped in `lib/auth.ts` since 4.21.0** |
| SSO fails `unable_to_create_user` on a genuinely new user | Keycloak profile has no email (client missing the `email` scope, or the AD account has no mail attribute) — or the DB write itself failed | `mapProfileToUser` throws a findable message for the no-email case (4.21.0); for the rest, the real cause is in `onAPIError.onError`'s log — read `docker logs <container>` first, never guess |
| SSO fails `account_not_linked` despite `trustedProviders` | Local user has `emailVerified: false` (created by sync/upsert) — better-auth ≥1.6.11 blocks implicit linking into unverified rows (nOAuth fix) | `accountLinking.requireLocalEmailVerified: false` — safe here only because self-registration is closed and nothing pre-creates rows (มติ 2026-08-11, amended 2026-10-14) and `mapProfileToUser` links only into the same AD username; shipped in `lib/auth.ts` since 4.21.0 |
| SSO lands on the login page with `sso_refused` and the log says `[auth] SSO login refused: "<user>": <email> already belongs to user <id>`; LDAP says `ORG_ACCOUNT_CONFLICT` | Another row holds this mailbox (any `ORG_EMAIL_DOMAINS` spelling) and is not linked to this Keycloak subject — usually a Local account made on the employee's org email, sometimes another AD identity sharing the mail. Linking would let two people share one account | Intended refusal (`org-identity.md` §5, clean-up in `org-identity-migration.md`): delete that row's `credential` account or the row itself, or move it to a non-org email — then the employee logs in normally |
| SSO lands on the login page with `sso_refused` and the log says `the Keycloak profile has no preferred_username/sub` | The Keycloak client does not send the `profile` scope — or, on Keycloak 25+, the `basic` scope that carries `sub` (or a mapper removed `preferred_username`) — without the AD login there is no identity to key on | Give the client the `profile` (and on 25+ `basic`) default client scopes in Keycloak (Clients → the client → Client scopes); the kit never falls back to the email |
| An SSO user has no HR fields / their pre-assigned role never applies; log says `AD login "<x>" is already held by another user` | Another `User` row already has that `LdapUsername` (an old LDAP row, or a legacy SSO row filled from the email) — the session hook will not steal it, so this login runs with no AD login (fail closed) | Find the other row (`SELECT Id, Email FROM [User] WHERE LdapUsername = '<x>'`), merge or fix it, then sign in again |
| Auth error shows a bare proxy 404 (`/api/auth/error` Not Found) instead of any message | Better Auth's default error page URL is computed WITHOUT the Next.js basePath — same trap as redirectURI and the reset link | `onAPIError.errorURL: `${NEXT_PUBLIC_BASE_PATH}/login`` — the login page maps `?error=<code>` to a Thai toast; shipped in `lib/auth.ts` since 4.21.0 |

SSO login ending in `internal_server_error` with a Prisma error on
`Account.issuer` is a better-auth version problem — `troubleshooting-upgrades.md`
§Account.issuer.

## LDAP / AD bind

| Symptom | Root cause | Fix |
| --- | --- | --- |
| LDAP always "Invalid username or password" on prod, works in dev | An `ldaps://`-only guard throws before the bind attempt | Allow plain `ldap://` for private-network AD; let the bind itself decide |
