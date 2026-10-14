---
type: regex
pattern: '^(?=[\s\S]*isOrgEmail)(?=[\s\S]*ORG_EMAIL_NOT_LOCAL)'
target: { source: file, path: lib/actions/admin-users.ts }
---
createLocalUserAction refuses an org-domain email (ORG_EMAIL_NOT_LOCAL).
