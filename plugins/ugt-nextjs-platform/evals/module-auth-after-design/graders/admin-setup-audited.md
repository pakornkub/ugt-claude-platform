---
type: regex
pattern: '(?<![\s\S])(?=[\s\S]*AUDIT_ACTIONS\.ADMIN_BOOTSTRAP)'
target: { source: file, path: lib/actions/admin-setup.ts }
---
The first-admin bootstrap writes an audit row (AUDIT_ACTIONS.ADMIN_BOOTSTRAP, 4.91.0) — the copied admin-setup.ts is the current kit asset, not an older one rewritten from memory.
