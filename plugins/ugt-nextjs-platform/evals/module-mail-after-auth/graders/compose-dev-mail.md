---
type: regex
pattern: '(?<![\s\S])(?=[\s\S]*^\s+SMTP_HOST:\s*\$\{SMTP_HOST\})(?![\s\S]*^\s*#\s*SMTP_)'
flags: m
target: { source: file, path: docker-compose.dev.yml }
---
docker-compose.dev.yml: every [MAIL] line uncommented.
