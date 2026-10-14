---
type: regex
pattern: 'pendingRoleAssignment[\s\S]*USERS_PREASSIGN_APPLY'
target: { source: file, path: lib/after-login.ts }
---
lib/after-login.ts applies the pending role and audits it (users.preassign-apply).
