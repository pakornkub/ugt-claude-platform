---
type: regex
pattern: '(?<![\s\S])(?=[\s\S]*^\s+SMTP_HOST:\s*\$\{SMTP_HOST\})(?![\s\S]*^\s*#\s*SMTP_)'
flags: m
target: { source: file, path: docker-compose.yml }
---
docker-compose.yml: every [MAIL] line uncommented (SMTP_HOST present, no commented SMTP_* left).
