---
type: regex
pattern: 'BETTER_AUTH_SECRET="?CHANGE_ME[^\r\n]*(\r?\n|$)'
match: contains
target: { source: file, path: .env.local }
---
The eval sandbox has no shell (Windows: no Bash/PowerShell), so `openssl` / `node -e randomBytes` cannot run — BETTER_AUTH_SECRET must stay the CHANGE_ME dummy with the command listed. Any "random-looking" value here was typed by the model (eval 2026-11-18: `q7Vt3LmZ9x…`) and is guessable. On a runner WITH a shell this grader needs a tool_used check instead.
