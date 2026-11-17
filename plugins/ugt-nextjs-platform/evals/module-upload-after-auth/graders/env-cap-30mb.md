---
type: regex
pattern: 'UPLOAD_MAX_BYTES\s*=\s*31457280'
target: { source: file, path: .env.example }
---
.env.example section 5 carries the interviewed cap (30 MB = 31457280 bytes), not the 25 MB default.
