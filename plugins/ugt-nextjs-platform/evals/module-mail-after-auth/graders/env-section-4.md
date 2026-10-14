---
type: regex
pattern: '# ─── 4\. Mail(?:(?!# ─── 5)[\s\S])*\nSMTP_HOST=smtp\.ube\.co\.th\s*\n(?:(?!# ─── 5)[\s\S])*\nSMTP_FROM=noreply-leave@ube\.co\.th\s*\n(?:(?!# ─── 5)[\s\S])*# ─── 5\.'
target: { source: file, path: .env.example }
---
SMTP_HOST / SMTP_FROM filled inside section "4. Mail" of .env.example (canonical layout), before section 5.
