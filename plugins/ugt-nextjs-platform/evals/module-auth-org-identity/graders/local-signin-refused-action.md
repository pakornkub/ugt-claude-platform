---
type: regex
pattern: 'ORG_EMAIL_USE_SSO'
target: { source: file, path: lib/actions/auth.ts }
---
localLoginAction checks first so the user sees ORG_EMAIL_USE_SSO.
