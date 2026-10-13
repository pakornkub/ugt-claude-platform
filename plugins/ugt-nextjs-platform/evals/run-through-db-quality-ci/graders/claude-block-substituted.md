---
type: regex
pattern: '__[A-Z][A-Z0-9_]*__|\[PIPELINE|/to-spec|/grill-with-docs|/ask-matt|/wayfinder|\.scratch/|size it\*\*|light version by default'
match: not_contains
target: { source: file, path: CLAUDE.md }
---
No __PLACEHOLDER__, no [PIPELINE marker and none of the superpowers/mattpocock spans' instructions (/to-spec, /grill-with-docs, /ask-matt, /wayfinder, .scratch/, SDD sizing) survive on the no-bundle path.
