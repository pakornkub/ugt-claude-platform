---
type: regex
pattern: '(?<![\s\S])(?=[\s\S]*KEYCLOAK_CLIENT_ID="?leave-request-dev"?(\r?\n|$))(?=[\s\S]*KEYCLOAK_ISSUER="?https://apps\.ugt\.local/keycloak/realms/ugt"?(\r?\n|$))(?=[\s\S]*BETTER_AUTH_URL="?http://localhost:3000"?(\r?\n|$))(?=[\s\S]*BETTER_AUTH_TRUSTED_ORIGINS="?http://localhost:3000"?(\r?\n|$))'
target: { source: file, path: .env.local }
---
Section 3 of .env.local is filled from the interview (env-files.md): dev client leave-request-dev, issuer <domain>/keycloak/realms/ugt, Better Auth on http://localhost:3000.
