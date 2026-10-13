---
type: regex
pattern: '"skill":"[\w-]*:?ugt-nextjs-database-setup"[\s\S]*"skill":"[\w-]*:?ugt-nextjs-test-lint-setup"[\s\S]*"skill":"[\w-]*:?ugt-nextjs-cicd-setup"[\s\S]*"skill":"[\w-]*:?ugt-context"'
match: contains
target: trace
---
Selected modules installed in §3 order database → test-lint → CI, then the harness layer (ugt-context) —
matched on the Skill tool_use inputs only. (The old pattern matched bare skill names, which the
full-setup SKILL.md text loaded into the trace already lists in that order — it could not fail.)
