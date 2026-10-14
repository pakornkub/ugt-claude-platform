---
type: regex
pattern: "^(?=[\\s\\S]*'dev-mode:enable')(?=[\\s\\S]*key:\\s*PERMISSIONS\\.DEV_MODE)(?=[\\s\\S]*key:\\s*PERMISSIONS\\.MAIL_TEMPLATES_MANAGE)"
target: { source: file, path: lib/permissions.ts }
---
DEV_MODE and MAIL_TEMPLATES_MANAGE are added as key + ALL_PERMISSIONS seed together (a key without its seed can never be granted).
