---
type: regex
pattern: '/admin/setup'
match: contains
target: { source: file, path: docs/admin-handoff.md }
---
docs/admin-handoff.md states that the first person to log in claims Administrator via /admin/setup (auth-setup §3 Q5 / §5.5 step 5).
