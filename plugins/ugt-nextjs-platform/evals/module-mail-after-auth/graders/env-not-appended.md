---
type: regex
pattern: '# ─── 5\.[\s\S]*SMTP_'
match: not_contains
target: { source: file, path: .env.example }
---
No SMTP_* key below section 5 — the mail block is filled in place, never appended at the bottom.
