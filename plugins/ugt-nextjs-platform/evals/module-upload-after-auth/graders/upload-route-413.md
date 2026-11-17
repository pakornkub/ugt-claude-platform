---
type: regex
pattern: '(?<![\s\S])(?=[\s\S]*content-length)(?=[\s\S]*413)(?=[\s\S]*formData\(\))'
flags: i
target: { source: file, path: app/api/files/route.ts }
---
The upload route is the 4.91.0 kit version: rejects an oversized Content-Length with 413 before parsing, then parses formData().
