---
type: regex
pattern: '^(?=[\s\S]*SMTP_HOST:\s*z\.string\(\)\.optional\(\))(?=[\s\S]*SMTP_FROM)'
target: { source: file, path: lib/env.ts }
---
lib/env.ts declares the SMTP vars, SMTP_HOST optional (build passes without a relay; sendMail is the runtime guard).
