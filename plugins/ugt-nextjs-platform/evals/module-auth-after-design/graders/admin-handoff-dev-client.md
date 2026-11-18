---
type: regex
pattern: 'leave-request-dev`?\s*\|'
match: contains
target: { source: file, path: docs/admin-handoff.md }
---
Table G requests the second Keycloak client `leave-request-dev` (Client ID cell), not only `leave-request`.
