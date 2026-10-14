---
type: regex
pattern: "email\\??\\.split\\(\\s*['\"]@"
match: not_contains
target: { source: file, path: lib/auth.ts }
---
The AD login is never derived from the mailbox local part (email.split('@')).
