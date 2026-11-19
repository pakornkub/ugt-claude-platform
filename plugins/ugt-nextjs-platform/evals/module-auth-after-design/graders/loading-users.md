---
type: regex
pattern: 'export default function Loading\b'
target: { source: file, path: app/(admin)/admin/users/loading.tsx }
---
Every route ships a loading.tsx (DESIGN.md §6); /admin/users gets the kit's one (4.97.0). Content not pinned: a project without ui/page-skeleton may compose it from ui/skeleton instead, as the mail eval did.
