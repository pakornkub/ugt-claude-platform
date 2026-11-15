---
type: regex
pattern: 'leaveRequest\.create\b[\s\S]*try\s*\{(?:(?!\bcatch\b)[\s\S])*?\b(?:sendTemplatedMail|\w*(?:[Nn]otif|[Mm]ail)\w*)\s*\([\s\S]*?\bcatch\b|function\s+(\w*(?:[Nn]otif|[Mm]ail)\w*)\b[^{]*\{\s*try\s*\{(?:(?!\bcatch\b)[\s\S])*?\bsendTemplatedMail\s*\([\s\S]*?\bcatch\b[\s\S]*?leaveRequest\.create\b[\s\S]*?\b\1\s*\('
target: { source: file, path: lib/actions/leave-requests.ts }
---
The new-request mail is sent after the row is created, through sendTemplatedMail, inside try/catch (mail must never fail the work). Two accepted shapes: a try right after `create` (it may call a local `notify…`/`…Mail…` helper), or a `notify…`/`…Mail…` helper declared above whose body is `try { sendTemplatedMail(…) } catch`, called after `create` (the 2026-11-16 run wrote this and the old pattern missed it). Send before `create` or without try/catch still fails.
