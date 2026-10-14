---
type: regex
pattern: '^(?=[\s\S]*actor\s*:)(?=[\s\S]*(PERMISSIONS\.DEV_MODE|dev-mode:enable))'
target: { source: file, path: lib/actions/leave-requests.ts }
---
The call passes an actor whose hasDevMode comes from the dev-mode:enable permission — a tester gets the mail instead of HR.
