---
type: tool_used
tool: Bash
input_match: '(?i)sqllocaldb|localdb|sqlcmd|npm run dev|next dev|npx prisma|Get-Service|netstat|where(\.exe)? sql'
min: 0
max: 0
---
No stand-in and no machine survey: the only machine check is `docker info` / `docker version`.
Tool INPUTS only — the loaded SKILL.md itself names LocalDB/npm run dev, so a whole-trace regex
would fail every run. This case must run where Docker is absent (the eval sandbox has none).
