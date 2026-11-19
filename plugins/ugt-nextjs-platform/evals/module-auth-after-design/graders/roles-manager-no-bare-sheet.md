---
type: regex
pattern: '<SheetContent\b'
match: not_contains
target: { source: file, path: components/roles-manager.tsx }
---
roles-manager only owns the <Sheet> (open state + dirty-close guard); RoleForm draws the panel. A bare <SheetContent> here means the pre-4.97.0 copy, or a re-wrap that hides the settings-sheet anatomy.
