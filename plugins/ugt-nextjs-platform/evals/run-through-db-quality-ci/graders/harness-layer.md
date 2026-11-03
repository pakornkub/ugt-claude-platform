---
type: regex
pattern: '^(?=[\s\S]*"autoUpdate"\s*:\s*true)(?![\s\S]*@ugt"\s*:\s*true)(?=[\s\S]*state/handoff\.md)(?=[\s\S]*state/model-mode\.md)(?=[\s\S]*rules/ugt-nextjs-database\.md)(?=[\s\S]*rules/ugt-nextjs-ci\.md)'
match: contains
target: { source: file, path: docs/setup-finish.md }
---
The eval sandbox always refuses writes under .claude/, so full-setup §4 must park every harness file (path + full content) in docs/setup-finish.md: settings.json with the ugt marketplace on `"autoUpdate": true` and no `*@ugt` key in enabledPlugins (bundles install at user scope — a committed key creates a project-scope install on every machine, platform 4.85.0), state/handoff.md, state/model-mode.md and the child rules files. (Was an llm judge on the closing message that also demanded the word "enabledPlugins" in chat — FAIL×3 on a run whose parked file was complete, 2026-10-15.)
