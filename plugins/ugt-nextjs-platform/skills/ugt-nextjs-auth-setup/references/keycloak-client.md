# Keycloak Client — requesting/creating a client for a new project

The org runs **one shared Keycloak server** with a central realm synced to the
corporate directory (LDAP federation). **Each project gets its own OIDC client**
inside that realm — never reuse another project's client (separate secret,
separate redirect URIs, separate audit trail).

## What to request from the Keycloak admin (or create yourself)

| Setting | Value |
| --- | --- |
| Client type | OpenID Connect |
| Client ID | `__PROJECT_NAME__` (the app slug — conventionally the same as the basePath slug) |
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
<BETTER_AUTH_URL>__BASE_PATH__/api/auth/callback/keycloak
```

Register one entry per environment, e.g.:

```
http://localhost:3000/__BASE_PATH__/api/auth/callback/keycloak   (dev)
https://__APP_HOST__/__BASE_PATH__/api/auth/callback/keycloak      (prod)
```

This exact URI must also be passed as `redirectURI` in `lib/auth.ts` — Keycloak
rejects the login with *"Invalid parameter: redirect_uri"* on any mismatch
(trailing slash included).

## Env vars to collect

| Var | Where it comes from |
| --- | --- |
| `KEYCLOAK_ISSUER` | `https://__KEYCLOAK_HOST__/realms/__REALM__` — verify by opening `<issuer>/.well-known/openid-configuration` in a browser |
| `KEYCLOAK_CLIENT_ID` | the Client ID created above |
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

## TLS gotcha (internal CA)

If the shared Keycloak uses a certificate from the org's internal CA, Node.js
inside the app container cannot verify it and the SSO button fails with
"Invalid OAuth configuration" (or a `fetch failed` / `UNABLE_TO_VERIFY_LEAF_SIGNATURE`
server log — same root cause). Preferred fix: mount the CA cert and set
`NODE_EXTRA_CA_CERTS=/path/to/org-ca.pem`. Last resort (internal networks
only): `NODE_TLS_REJECT_UNAUTHORIZED=0` in the container environment. This is
an admin/infra decision, not something a project defaults silently — cicd-setup's
`docs/admin-handoff.md` §4 ("TLS ภายในองค์กร") is where the admin confirms
which one and the deploy compose is where it actually gets set (never in the
Jenkins Secret File credential).

## Checklist before wiring the app

- [ ] Client created in the org realm with Client ID = `__PROJECT_NAME__`
- [ ] Client authentication ON; secret copied to `KEYCLOAK_CLIENT_SECRET`
- [ ] PKCE method S256 set
- [ ] Redirect URI(s) registered exactly as `<BETTER_AUTH_URL>__BASE_PATH__/api/auth/callback/keycloak`
- [ ] `KEYCLOAK_ISSUER` verified via `/.well-known/openid-configuration`
- [ ] App host can reach the Keycloak host over the network (curl the issuer from the server)
