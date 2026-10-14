---
type: regex
pattern: 'leaveRequest\.create\b[\s\S]*try\s*\{[\s\S]*sendTemplatedMail\s*\([\s\S]*catch'
target: { source: file, path: lib/actions/leave-requests.ts }
---
The new-request mail is sent after the row is created, through sendTemplatedMail, inside try/catch (mail must never fail the work).
