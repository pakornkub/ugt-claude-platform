---
type: regex
pattern: 'ORG_EMAIL_DOMAINS'
target: { source: file, path: lib/env.ts }
---
lib/env.ts declares ORG_EMAIL_DOMAINS — otherwise env.ORG_EMAIL_DOMAINS is undefined and nothing is normalized.
