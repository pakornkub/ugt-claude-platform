---
type: regex
pattern: 'function\s+applyPendingRole\b(?:(?!\n\})[\s\S])*?\bemail\s*:'
match: not_contains
target: { source: file, path: lib/after-login.ts }
---
applyPendingRole matches the pending row by EmpCode / AD login only — no `email:` key anywhere in the function (org-identity.md §2).
