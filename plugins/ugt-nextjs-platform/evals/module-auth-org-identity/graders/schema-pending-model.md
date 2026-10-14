---
type: regex
pattern: 'model\s+pendingRoleAssignment\s*\{[^}]*empCode[^\n]*@unique[^}]*loginName[^\n]*@unique[^}]*@@map\("PendingRoleAssignments"\)'
target: { source: file, path: prisma/schema.prisma }
---
HR view installed + SSO/LDAP → the pendingRoleAssignment model is pasted with EmpCode and LoginName both @unique (org-identity.md §2).
