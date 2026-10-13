---
type: regex
pattern: 'function (LdapSection|LocalSection)\b|ldapLoginAction|localLoginAction|__[A-Z][A-Z0-9_]*__'
match: not_contains
target: { source: file, path: components/login-form.tsx }
---
SSO only → the LDAP/Local sections and their actions are deleted from login-form.tsx, and no __PLACEHOLDER__ is left (4.77.2 run left `__PROJECT_NAME__` there).
