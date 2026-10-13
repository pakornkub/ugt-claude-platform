---
type: regex
pattern: 'https://apps\.ugt\.local/leave-request(-dev)?/api/auth/callback/keycloak'
match: contains
target: { source: file, path: docs/admin-handoff.md }
---
The Keycloak request carries the exact redirect URI (better-auth ≥1.7 core `callback/:id` route under the basePath — keycloak-client.md).
