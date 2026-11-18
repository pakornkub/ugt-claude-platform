---
type: regex
pattern: '\(DEV\)'
match: contains
target: { source: file, path: Jenkinsfile }
---
The Jenkinsfile bakes the dev build's NEXT_PUBLIC_APP_NAME with " (DEV)" (appName per branch) — NEXT_PUBLIC_* come from build args, not .env.dev.
