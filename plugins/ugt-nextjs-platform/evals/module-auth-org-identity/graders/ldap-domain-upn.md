---
type: regex
pattern: '^LDAP_DOMAIN=ube\.co\.th\s*$'
flags: m
target: { source: file, path: .env.example }
---
The prompt says "domain UBE" (NetBIOS) — the bind is user@LDAP_DOMAIN, so LDAP_DOMAIN must be the UPN suffix ube.co.th (SKILL.md §3 Q4). The 2026-10-14 run caught this itself and said so in the close-out.
