---
type: regex
pattern: '^(?=[\s\S]*isDevEnvironment\(\))(?=[\s\S]*<DevEnvironmentBar)(?=[\s\S]*\[DEV\] )'
match: contains
target: { source: file, path: app/layout.tsx }
---
Root layout renders <DevEnvironmentBar /> under isDevEnvironment() and the tab title gets the `[DEV] ` prefix (design-setup Step 3.3, 4.76.0).
