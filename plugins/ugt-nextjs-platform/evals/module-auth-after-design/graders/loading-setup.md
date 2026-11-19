---
type: regex
pattern: 'export default function Loading\b'
target: { source: file, path: app/(admin-setup)/admin/setup/loading.tsx }
---
The standalone /admin/setup bootstrap card ships a loading.tsx too (4.97.0) — every route, not only the ones inside the admin shell.
