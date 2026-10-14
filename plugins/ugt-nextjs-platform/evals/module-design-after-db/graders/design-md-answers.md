---
type: regex
pattern: '^(?=[\s\S]*\*\*dark mode\*\*:[\s*]*ไม่มี)(?=[\s\S]*\*\*Shell\*\*:[\s*]*sidebar)(?=[\s\S]*\*\*ภาษา UI\*\*:[\s*]*(ไทยล้วน|ไทยอย่างเดียว|ไทยเท่านั้น|th\b))(?=[\s\S]*Landing page:[\s*]*ไม่มี)(?=[\s\S]*\*\*primary\*\*:[^\n]*0\.488 0\.243 264\.4)'
flags: i
match: contains
target: { source: file, path: docs/DESIGN.md }
---
DESIGN.md records the given answers on the template's own labels: dark mode ไม่มี · Shell sidebar · ภาษา UI ไทยล้วน · Landing page ไม่มี · primary = org indigo. (Was an llm judge — a 300-line Thai file is where judges false-negative; the labels are fixed template text.)
