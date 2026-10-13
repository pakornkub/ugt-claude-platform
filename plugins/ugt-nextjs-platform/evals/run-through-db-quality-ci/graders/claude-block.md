---
type: regex
pattern: '^(?=[\s\S]*<!-- ugt:start 4\.)(?=[\s\S]*<!-- ugt:end -->)(?=[\s\S]*Project `leave-request` · basePath prod `/leave-request` · dev `/leave-request-dev`)(?=[\s\S]*\| Build a feature / fix a bug \|[^\n]*ไม่มี pipeline bundle)(?=[\s\S]*docs/project-context/decisions\.md)(?=[\s\S]*\| Finish work / hand off the session \| `/ugt-handoff`)'
match: contains
target: { source: file, path: CLAUDE.md }
---
CLAUDE.md block between the ugt:start/ugt:end markers, identity substituted, the `[PIPELINE:none]` "Build a feature / fix a bug" row present and decisions.md named as the decision home. Was an llm judge: it voted 3×FAIL on a block that met every point (2026-10-14) — the template's unmarked infra row names superpowers/mattpocock and the judge read that as a bundle instruction.
