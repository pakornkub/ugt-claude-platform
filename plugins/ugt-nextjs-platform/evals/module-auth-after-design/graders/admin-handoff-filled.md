---
type: regex
pattern: '__[A-Z][A-Z0-9_]*__'
match: not_contains
target: { source: file, path: docs/admin-handoff.md }
---
docs/admin-handoff.md has no __PLACEHOLDER__ left.
