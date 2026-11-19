---
type: regex
pattern: 'import\s*\{[^}]*\bADMIN_NAV_ITEMS\b[^}]*\}\s*from\s*[''"]@/components/admin-nav-items[''"]'
target: { source: file, path: components/app-nav.tsx }
---
This fixture has its own shell, so §5.6 merges the admin menu into `useShellNav` in components/app-nav.tsx (the file's own comment says so). The import must come from `@/components/admin-nav-items`, never from the 'use client' `admin-nav.tsx` (4.98.0).
