---
type: regex
pattern: '<DetailDialogShell\b[\s\S]*<DetailSection\b'
target: { source: file, path: components/audit-logs-table.tsx }
---
The audit-log row detail is read-only → detail-dialog-shell + DetailSection (4.97.0), not a raw Dialog with a "รายละเอียด" title.
