---
type: regex
pattern: '^(?![ \t]*(?://|\*|/\*)).*(?:@/lib/email|notifyAdminsIfNoRole)'
flags: m
match: not_contains
target: { source: file, path: lib/after-login.ts }
---
Mail is not installed → the [MAIL] parts of lib/after-login.ts are removed (an import of @/lib/email would break the build). Comment lines are ignored — a note that mail-setup restores it later is fine.
