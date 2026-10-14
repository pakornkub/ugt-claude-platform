---
type: regex
pattern: '<LoginShell\b[\s\S]{0,120}hero=\{'
target: { source: file, path: app/(auth)/login/page.tsx }
---
The login page renders the two-column hero via <LoginShell hero={…}> (login-page.md §1).
