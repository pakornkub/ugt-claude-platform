---
type: regex
pattern: 'font-size:\s*clamp\(\s*100%\s*,\s*50%\s*\+\s*0\.52vw\s*,\s*125%\s*\)'
match: contains
target: { source: file, path: app/globals.css }
---
globals.css carries the fluid root font size on `html` (4.99.0, PR 76): ≤1536px stays 16px, wide screens scale the whole rem-based app up to 125%. A fixed 16px base leaves 1920/2K screens with small text and empty margins.
