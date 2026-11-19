---
type: regex
pattern: '^(?=[\s\S]*## Code review)(?=[\s\S]*read `REVIEW\.md` first)(?=[\s\S]*never approves it)'
match: contains
target: { source: file, path: CLAUDE.md }
---
The CLAUDE.md block carries the unmarked "Code review" section: only Claude Code Review reads REVIEW.md by itself, so every other reviewer prompt must say to read it first, and the author never approves its own change (platform 4.94.0).
