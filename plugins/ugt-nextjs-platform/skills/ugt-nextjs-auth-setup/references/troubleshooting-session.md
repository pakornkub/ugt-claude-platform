# Troubleshooting — session cookies, redirect loops, basePath, proxy.ts

Symptom → root cause → fix for anything that shows up as a redirect loop, a
logout that does not stick, or a 404 caused by the basePath. The mechanisms
behind every row (cookie signing, cookie naming, Return-to-page, the Server
Component session check, `proxy.ts` basePath rules) are explained in
`auth-flows.md`; SSO/LDAP sign-in failures are in `troubleshooting-sso.md`,
version-bump and schema failures in `troubleshooting-upgrades.md`.

## Cookies and redirect loops

| Symptom | Root cause | Fix |
| --- | --- | --- |
| Every page redirects to `/login` after LDAP login | Wrong cookie name (missing `__Secure-`/app prefix) or unsigned token | `SESSION_COOKIE_NAME` derivation + `signSessionToken()` |
| Redirect loop only in production (login works locally but loops in production) | `https://` switched cookie to `__Secure-` name — the secure-cookie + trusted-origin settings differ from the deployed URL | Same derivation, driven by `BETTER_AUTH_URL` (required — SKILL.md §5.4) |
| `ERR_TOO_MANY_REDIRECTS` with two apps on one domain (after deploying behind a shared domain) | Identical cookie names at `path=/` — cookie prefix / basePath mismatch between apps on the same host | `advanced.cookiePrefix` from basePath, mirrored in proxy + actions |
| Logout doesn't stick in production (on https) | `cookieStore.delete()` omits `Secure` flag — the cookie is cleared with a different name/path/flags than it was set with | `set(name, '', { maxAge: 0, secure: true })` |
| Login lands on 404 after local login | Double URL-encoding of cookie value | `decodeURIComponent` before `cookieStore.set` |
| Logout doesn't delete DB session | Deleting by signed token; DB stores raw token | Strip signature via `lastIndexOf('.')` |

### Stale cookie loop — `/` ↔ `/login` in one browser only

**Symptom:** endless 307 between `/` and `/login` (`ERR_TOO_MANY_REDIRECTS`)
for a browser that still holds an expired / revoked session cookie — a fresh
browser or cleared cookies works.

**Root cause:** `proxy.ts` sent `/login` → `/` whenever `getSessionCookie()`
returned something, but the protected layout sends `/` → `/login` when
`auth.api.getSession()` is null. A cookie proves nothing (the session row may
be expired, revoked, or deleted by logout elsewhere), so the two redirects
chase each other.

**Fix:** `proxy.ts` no longer redirects auth-only paths on cookie presence
(the `AUTH_ONLY_PATHS` list only means "no cookie required") — fixed in the
`proxy.ts` asset 4.74.0. The login page — an `async` Server Component — checks
the real session and `redirect('/')`s only when
`auth.api.getSession({ headers: await headers() })` is non-null (SKILL.md §5.5
step 1); a stale cookie then renders the form and the next login overwrites
it. Seen in ugt-voice-platform 2026-10-09.

## basePath and proxy.ts

| Symptom | Root cause | Fix |
| --- | --- | --- |
| Static assets return `Unexpected token '<'` | The route guard in `proxy.ts` matches `_next/static` and serves the login page instead | Keep the `/_next/` early return (`auth-flows.md` §proxy.ts basePath rules) |
| authClient hits `…/__BASE_PATH__/get-session` 404 | `baseURL` passed to `createAuthClient` with a path | No `baseURL`; pass `basePath: `${BASE_PATH}/api/auth`` |
| `NEXT_PUBLIC_BASE_PATH` empty in client bundle | Read through a `createEnv()` wrapper under Turbopack | Read `process.env.NEXT_PUBLIC_BASE_PATH` directly in client files |
| Mailed reset link 404s (production only) | Link built without the basePath — Better Auth's `url` is computed without it (needs ugt-nextjs-mail-setup) | Build the link yourself from `token` (`auth-flows.md` §Password reset flow) |
