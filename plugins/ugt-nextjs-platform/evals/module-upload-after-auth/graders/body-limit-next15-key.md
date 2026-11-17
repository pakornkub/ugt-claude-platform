---
type: regex
pattern: '(?<![\s\S])(?=[\s\S]*middlewareClientMaxBodySize\s*:\s*(?:[''"`]30\s*mb[''"`]|31457280|31_457_280))(?![\s\S]*proxyClientMaxBodySize\s*:)'
flags: i
target: { source: file, path: next.config.ts }
---
next.config.ts raises the body limit to the 30 MB cap under the Next 15 key (middlewareClientMaxBodySize) — the project is on next 15.5 with middleware.ts, where proxyClientMaxBodySize is silently ignored (SKILL §4.4). A comment naming proxyClientMaxBodySize is fine; only setting it as a key fails (first run 2026-11-17: the agent was right, the grader wasn't).
