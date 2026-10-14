---
type: regex
pattern: '"name":"(Write|Edit)","input":\{[^\n]*?(deviation[^\n]{0,400}PendingRoleAssignments|PendingRoleAssignments[^\n]{0,400}deviation)'
target: trace
---
The PendingRoleAssignments exemption (no IsActive/IsDeleted) is recorded as a ⚠ deviation line (schema-and-env.md §Auth-table exception). Matched on a Write/Edit tool_use line of the trace, wherever it lands — the fixture has no docs/project-context/architecture.md, and a run recorded it as a schema.prisma comment (Read results of the reference carry the same words, hence tool inputs only).
