---
type: regex
pattern: '\$transaction\((?:(?!\n\s*\}\);)[\s\S])*sendTemplatedMail'
match: not_contains
target: { source: file, path: lib/actions/leave-requests.ts }
---
sendTemplatedMail is never called inside a $transaction callback.
