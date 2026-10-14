---
type: regex
pattern: '^(?=[\s\S]*(reset-password|ลืมรหัสผ่าน|password reset))(?=[\s\S]*(after-login|ยังไม่มีบทบาท|without a role|no role))'
target: last_message
---
The closing message says §4.6 switched on both auth mails — password reset (Local) and the "signed in without a role" admin notice (SSO/LDAP).
