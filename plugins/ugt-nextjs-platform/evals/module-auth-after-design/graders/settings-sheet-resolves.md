---
type: regex
pattern: 'export function SettingsSheetContent\b[\s\S]*export function SettingsSection\b'
target: { source: file, path: components/ui/settings-sheet.tsx }
---
role-form.tsx imports @/components/ui/settings-sheet. This fixture's design kit is 4.81.0 (settings-sheet arrived in 4.82.0), so the import resolves only if the run copied the kit piece in — otherwise the build breaks on the first admin page. (Eval 2026-11-19 copied it verbatim from design-setup.)
