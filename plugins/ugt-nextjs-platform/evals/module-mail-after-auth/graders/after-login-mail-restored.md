---
type: regex
pattern: "^(?=[\\s\\S]*from\\s+['\"]@/lib/email['\"])(?=[\\s\\S]*void\\s+notifyAdminsIfNoRole\\s*\\()"
target: { source: file, path: lib/after-login.ts }
---
§4.6: the [MAIL] parts of lib/after-login.ts are restored — fire-and-forget `void notifyAdminsIfNoRole(…)` + its import.
