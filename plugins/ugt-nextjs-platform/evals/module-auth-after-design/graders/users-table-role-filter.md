---
type: regex
pattern: 'filterValueOf:\s*\(u(?::\s*UserRow)?\)\s*=>\s*u\.roleId\s*\?\?\s*NO_ROLE[\s\S]*t\(.usersTable\.noRole.\)'
match: contains
target: { source: file, path: components/users-table.tsx }
---
The /admin/users role column filters by ticking roles in its header (4.99.0, PR 84): `meta.filterValueOf` maps a user to its roleId or the NO_ROLE sentinel, and the options start with the "ไม่มีบทบาท" entry (`usersTable.noRole`). Without filterValueOf the accessor-less column has nothing to compare.
