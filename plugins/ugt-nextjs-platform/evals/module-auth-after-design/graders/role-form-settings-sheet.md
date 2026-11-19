---
type: regex
pattern: '<SettingsSheetContent\b[\s\S]*<SettingsSection\b[\s\S]*<SheetFooter\b'
target: { source: file, path: components/role-form.tsx }
---
The role form is the 4.97.0 asset: the whole panel from ui/settings-sheet (SettingsSheetContent → SettingsSection → SheetFooter). Before 4.97.0 it was a bare form with a hand-made sticky footer — the layout two side-by-side apps showed as different.
