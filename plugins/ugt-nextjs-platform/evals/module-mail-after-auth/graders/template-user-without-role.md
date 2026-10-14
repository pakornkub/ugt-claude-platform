---
type: regex
pattern: "'auth\\.user-without-role'"
target: { source: file, path: lib/types/mail-templates.ts }
---
SSO/LDAP installed → the auth.user-without-role key stays (mail-setup §4.6).
