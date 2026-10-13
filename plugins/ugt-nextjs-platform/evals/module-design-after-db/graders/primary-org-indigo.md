---
type: regex
pattern: '--primary:\s*oklch\(0\.488 0\.243 264\.4\)'
match: contains
target: { source: file, path: app/globals.css }
---
No brand given → globals.css carries the org indigo primary (interview ข้อ 2 default).
