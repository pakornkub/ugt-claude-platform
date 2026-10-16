---
type: regex
pattern: '^(?![ \t]*(?://|\*|/\*)).*sendResetPassword\s*[:(]'
flags: m
match: not_contains
target: { source: file, path: lib/auth.ts }
---
Local without mail → install auth without the reset pieces (§3 Q7, two-pass order) — no sendResetPassword handler in lib/auth.ts (comment lines are ignored, so a note saying it is deferred is fine).
