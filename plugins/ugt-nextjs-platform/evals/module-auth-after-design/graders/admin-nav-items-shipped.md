---
type: regex
pattern: 'export const ADMIN_NAV_ITEMS\b'
target: { source: file, path: components/admin-nav-items.ts }
---
The admin menu data ships in the plain module `components/admin-nav-items.ts` (4.98.0, PR 74). Defined only inside the 'use client' admin-nav.tsx, a Server Component shell that imports it gets a client reference and every page under that shell 500s.
