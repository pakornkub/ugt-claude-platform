---
type: regex
pattern: "providerId:\\s*'keycloak',\\s*accountId\\b"
target: { source: file, path: lib/auth.ts }
---
mapProfileToUser's email-clash check requires the same Keycloak subject (accountId = sub), not merely any Keycloak account (4.79.0 review fix).
