---
type: regex
pattern: 'sendResetPassword\s*:'
target: { source: file, path: lib/auth.ts }
---
§4.6: Local login is installed → the password-reset pieces come back now that mail exists (sendResetPassword in lib/auth.ts).
