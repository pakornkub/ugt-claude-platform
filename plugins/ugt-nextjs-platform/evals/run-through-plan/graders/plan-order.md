---
type: regex
pattern: '\bdatabase\W+(test-lint|quality)\W+design\W+auth\W+(cicd|ci)\b|(^|\n)\W*1\W+database[^\n]*\n\W*2\W+(test|quality)[^\n]*\n\W*3\W+design[^\n]*\n\W*4\W+auth[^\n]*\n\W*5\W+(cicd|ci\b|jenkins)'
flags: i
match: contains
target: last_message
---
The plan states the §3 install order database → test-lint → design → auth → CI, either as an arrow chain or as five consecutive numbered rows/items that each START with the module name (a row's "why" column names other modules). An llm judge voted 3×FAIL on a plan whose numbered table had exactly this order — 2026-10-14.
