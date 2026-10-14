---
type: regex
pattern: "^(?=[\\s\\S]*APIError\\(\\s*'FOUND')(?=[\\s\\S]*sso_refused)"
target: { source: file, path: lib/auth.ts }
---
SSO refusals throw APIError('FOUND') to /login?error=sso_refused — a plain Error is a bare 500 on the OAuth callback.
