---
type: regex
pattern: "'request\\.(approved|rejected)'"
match: not_contains
target: { source: file, path: lib/types/mail-templates.ts }
---
No approval workflow and the user said to drop unused examples → request.approved / request.rejected are gone (key, definition and default together).
