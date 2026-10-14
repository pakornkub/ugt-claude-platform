---
type: regex
pattern: 'sign-in/email[\s\S]{0,300}isOrgEmail|isOrgEmail[\s\S]{0,300}sign-in/email'
target: { source: file, path: lib/auth.ts }
---
lib/auth.ts hooks.before refuses Local sign-in with an org email on /sign-in/email (covers legacy rows and direct API calls).
