# Contract — Identity, auth & RBAC (stack-agnostic)

> **Maintenance:** editing this file? `grep` the stack platforms for restated
> text and update it too — currently `ugt-nextjs-platform`'s
> `ugt-nextjs-auth-setup` (primary) and `ugt-nextjs-full-setup` (summary). Bump
> the relevant plugin's `plugin.json` version and CHANGELOG when you do —
> ugt-core when the contract text changes, the stack platform when its restated
> copy changes.

## Keycloak

- **One shared Keycloak server** with a central realm federated to the
  corporate directory (LDAP)
- **One OIDC client per project** — Client ID = the project slug; clients are
  never shared between projects (separate secret, redirect URIs, audit trail)
- **Authorization Code + PKCE (S256) only** — no implicit flow, no direct
  access grants, no service-account login for user auth
- Redirect URIs registered exactly, including any basePath; logout uses
  **backchannel logout** (server-side POST with the refresh token) — the
  browser is never redirected through Keycloak

## Session policy

- Lifetime **8 hours**, refreshed when **30 minutes** remain
- Server-side sessions revocable at the database; on logout both the cookie
  and the stored session are destroyed
- On shared domains, session cookie names are **unique per app** (derived from
  the app's base path), never a library default

## RBAC shape

```
user (1) ── (0..1) role (1) ── (M:N) permission
```

- Permission keys are **`resource:action`**, declared as constants — never
  free strings
- Roles flagged `isSystem` cannot be deleted through any code path
- UI hides what the user lacks permission for, but UI checks are UX only — the
  **server-side guard is the security boundary**

## Guard order (every privileged mutation)

```
1. session     → absent: Unauthorized
2. permission  → check fails: Forbidden
3. action      → domain validation, then the work
4. audit log   → written AFTER success, non-blocking
```

## Mandatory audit events

`login.success` · `login.failed` · `logout` · `logout.sso` — written
non-blocking (an audit failure must never break login), plus an audit entry
after every privileged mutation.

Audit log table is **append-only** (no UPDATE/DELETE from app code). Actions
are dot-namespaced `<resource>.<verb>` constants. The `detail` payload never
contains passwords, secrets, tokens, or PII broader than its readers should
see; a retention window is defined per project and enforced both by a
scheduled cleanup job and in the viewer query.

## First-admin bootstrap

Every project ships a first-run bootstrap page: the first authenticated user
claims the Administrator role in one click; the page refuses once an admin
exists.

## Service-to-service auth

Not yet standardized. Interim rule: internal services stay on the internal
network, unexposed by the reverse proxy and never called by a browser — the app
of record enforces the guard order and proxies server-to-server.
