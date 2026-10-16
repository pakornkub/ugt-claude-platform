---
type: regex
pattern: 'leaveRequest\.create\b[\s\S]*try\s*\{(?:(?!\bcatch\b)[\s\S])*?\b(?:sendTemplatedMail|\w*(?:[Nn]otif|[Mm]ail)\w*)\s*\([\s\S]*?\bcatch\b'
target: { source: file, path: lib/actions/leave-requests.ts }
---
The new-request mail is sent after the row is created, through sendTemplatedMail, inside try/catch (mail must never fail the work). The try may call a local helper (`notify…`/`…Mail…`) that wraps sendTemplatedMail — `send-pattern-judged` checks the helper itself.
