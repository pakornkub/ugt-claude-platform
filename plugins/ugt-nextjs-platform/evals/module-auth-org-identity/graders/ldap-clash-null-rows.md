---
type: regex
pattern: 'ldapUsername:\s*null'
target: { source: file, path: lib/actions/auth.ts }
---
ldapLoginAction's email-clash check includes rows whose ldapUsername is NULL (Prisma's NOT drops NULLs — org-identity.md §5).
