# Keycloak Client — requesting/creating a client for a new project

The org runs **one shared Keycloak server** with a central realm synced to the
corporate directory (LDAP federation). **Each project gets its own OIDC client**
inside that realm — never reuse another project's client (separate secret,
separate redirect URIs, separate audit trail).

## What to request from the Keycloak admin (or create yourself)

| Setting | Value |
| --- | --- |
| Client type | OpenID Connect |
| Client ID | **two clients**: `__PROJECT_NAME__` (prod) and `__PROJECT_NAME__-dev` (dev deploy + `next dev` on localhost) — the app slug, same as the basePath slug |
| Client authentication | **On** (confidential client — a client secret is issued) |
| Standard flow (Authorization Code) | **On** |
| Direct access grants / implicit flow / service accounts | Off (not used) |
| PKCE (Proof Key for Code Exchange) | **S256** — set *Advanced → Proof Key for Code Exchange Code Challenge Method* to `S256`; the Better Auth config uses `pkce: true` |
| Valid redirect URIs | see below |
| Web origins | the app origin(s), e.g. `https://__APP_HOST__` (or `+` to mirror redirect URIs) |

## Redirect URI pattern

Better Auth's generic OAuth (Keycloak) is a first-class social provider since
better-auth 1.7, so its callback lives under the core `callback/:id` route
(not the old `oauth2/callback/:id`). When the app is deployed under a
basePath the URI must include it:

```
<BETTER_AUTH_URL>/__BASE_PATH__/api/auth/callback/keycloak
```

⚠️ Copy the slashes exactly as written — Keycloak compares the redirect URI as a
literal string, so one missing or extra `/` (or a trailing one) is rejected the
same way a wrong host would be.

Register per client, e.g. (`ugtweb.ube.co.th`, project `expense-portal`):

```
client expense-portal       https://ugtweb.ube.co.th/expense-portal/api/auth/callback/keycloak
client expense-portal-dev   https://ugtweb.ube.co.th/expense-portal-dev/api/auth/callback/keycloak
                            http://localhost:3000/expense-portal-dev/api/auth/callback/keycloak
```

This exact URI must also be passed as `redirectURI` in `lib/auth.ts` — Keycloak
rejects the login with *"Invalid parameter: redirect_uri"* on any mismatch
(trailing slash included).

## Env vars to collect

| Var | Where it comes from |
| --- | --- |
| `KEYCLOAK_ISSUER` | `https://__KEYCLOAK_HOST__/realms/__REALM__` — org: `<domain>/keycloak/realms/ugt` (e.g. `https://ugtweb.ube.co.th/keycloak/realms/ugt`); verify by opening `<issuer>/.well-known/openid-configuration` in a browser |
| `KEYCLOAK_CLIENT_ID` | `__PROJECT_NAME__` in `.env` · `__PROJECT_NAME__-dev` in `.env.dev` / `.env.local` |
| `KEYCLOAK_CLIENT_SECRET` | Keycloak → client → *Credentials* tab |

If Keycloak is served under a path prefix, the prefix is part of the issuer
(e.g. `https://__KEYCLOAK_HOST__/<prefix>/realms/__REALM__`). Always copy the issuer
from the well-known document, not from memory.

## Logout

No extra client configuration is needed for the org's logout pattern: the app
performs a **backchannel logout POST** to
`{KEYCLOAK_ISSUER}/protocol/openid-connect/logout` with
`client_id + client_secret + refresh_token` (see `ssoLogoutAction` in
`assets/lib/actions/auth.ts`). The browser is never redirected through
Keycloak, so *Valid post logout redirect URIs* can stay empty.

> **Note (2026-08-25): this is Keycloak's legacy logout format, kept on
> purpose.** Keycloak's own docs describe the `POST … /logout` with
> `client_id + client_secret + refresh_token` as a non-standard legacy
> endpoint; the standards-track path is the OIDC RP-initiated
> `end_session_endpoint`. It still works and is what the shipped
> `ssoLogoutAction` does — **do not redesign the flow as part of an install**.
> For a future migration, better-auth ≥1.7 exposes `endSessionEndpoint` (and
> `disableProviderLogout` to turn its own call off) on the provider config, so
> the switch is a config change plus registering *Valid post logout redirect
> URIs* in the client — one coordinated change across all projects, not a
> per-project decision.

## TLS gotcha (internal CA)

If the shared Keycloak uses a certificate from the org's internal CA, Node.js
inside the app container cannot verify it and the SSO button fails with
"Invalid OAuth configuration" (or a `fetch failed` / `UNABLE_TO_VERIFY_LEAF_SIGNATURE`
server log — same root cause). Org standard: `NODE_TLS_REJECT_UNAUTHORIZED=0`
is always on — section 1 of `.env.example`/`.env.local` and both compose files
(the servers are a closed intranet). Seeing this error means that line went
missing; put it back. Never put it in the Jenkins Secret File credential.

## Checklist before wiring the app

- [ ] Clients `__PROJECT_NAME__` and `__PROJECT_NAME__-dev` created in the org realm
- [ ] Client authentication ON; each secret copied to `KEYCLOAK_CLIENT_SECRET` of its own env file
- [ ] PKCE method S256 set
- [ ] Redirect URI(s) registered exactly as `<BETTER_AUTH_URL>/__BASE_PATH__/api/auth/callback/keycloak` (slashes included)
- [ ] `KEYCLOAK_ISSUER` verified via `/.well-known/openid-configuration`
- [ ] App host can reach the Keycloak host over the network (curl the issuer from the server)
