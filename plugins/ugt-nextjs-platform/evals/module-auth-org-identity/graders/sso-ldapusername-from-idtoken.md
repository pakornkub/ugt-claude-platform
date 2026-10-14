---
type: regex
pattern: '^(?=[\s\S]*\.idToken\b)(?=[\s\S]*preferred_username)'
target: { source: file, path: lib/auth.ts }
---
The SSO session hook takes ldapUsername from preferred_username in the stored keycloak idToken (Better Auth never stores a custom field from mapProfileToUser).
