---
type: regex
pattern: '^ORG_EMAIL_DOMAINS=ube\.co\.th\s*,\s*ube\.com\s*$'
flags: m
target: { source: file, path: .env.example }
---
ORG_EMAIL_DOMAINS filled in .env.example section 3 with the canonical domain first (ube.co.th,ube.com).
