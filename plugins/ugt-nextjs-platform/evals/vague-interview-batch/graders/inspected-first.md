---
type: llm
focus: trace
---
PASS only if, before asking anything, the agent read package.json and the file layout (Read/Glob calls) and its message states what it found (Next.js App Router scaffold, no database / auth / test tooling / CI present). FAIL if it asked without inspecting.
