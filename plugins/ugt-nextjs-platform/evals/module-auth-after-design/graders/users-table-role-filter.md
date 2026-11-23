---
type: regex
pattern: 'filterValueOf:\s*\(u(?::\s*UserRow)?\)\s*=>\s*u\.roleId\s*\?\?\s*NO_ROLE[\s\S]*t\(.usersTable\.noRole.\)|filterValueOf[\s\S]{0,300}(?:4\.8[0-7]|≥\s*4\.88|kit-sync)'
match: contains
target: { source: file, path: components/users-table.tsx }
---
The /admin/users role column filters by ticking roles in its header (4.99.0, PR 84): `meta.filterValueOf` maps a user to its roleId or the NO_ROLE sentinel, and the options start with the "ไม่มีบทบาท" entry (`usersTable.noRole`). Also passes when the project's `ui/data-table` predates 4.88.0 (this fixture ships 4.81.0, which ignores filterValueOf) and the file says the filter was left out for that reason — silently dropping it fails.
