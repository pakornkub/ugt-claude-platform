---
type: regex
pattern: "ugt-nextjs-database-setup[\\s\\S]*ugt-nextjs-test-lint-setup[\\s\\S]*ugt-nextjs-design-setup[\\s\\S]*ugt-nextjs-auth-setup[\\s\\S]*ugt-nextjs-cicd-setup[\\s\\S]*ugt-context"
match: contains
target: trace
---
Child modules in order database → test/lint → design → auth → CI, then the harness layer (ugt-context) — matched over the full trace (Skill calls or reads of each child SKILL.md).
