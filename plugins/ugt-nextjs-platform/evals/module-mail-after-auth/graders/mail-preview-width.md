---
type: regex
pattern: '<SheetContent\b[^>]*data-\[side=right\]:sm:max-w-5xl'
target: { source: file, path: components/mail-templates-manager.tsx }
---
The email preview Sheet is 5xl (1024px), one of the kit's two widths — before 4.97.0 it was max-w-2xl (672px), outside both, and too narrow for the 760px email chrome anyway.
