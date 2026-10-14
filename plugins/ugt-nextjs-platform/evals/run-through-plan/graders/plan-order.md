---
type: regex
pattern: '\b(ugt-nextjs-)?database(-setup)?\W+(ugt-nextjs-)?(test-lint|quality)(-setup)?\W+(ugt-nextjs-)?design(-setup)?\W+(ugt-nextjs-)?auth(-setup)?\W+(ugt-nextjs-)?(cicd|ci)(-setup)?\b|(^|\n)\W*1\W+(ugt-nextjs-)?database(-setup)?[^\n]*\n\W*2\W+(ugt-nextjs-)?(test|quality)(-setup)?[^\n]*\n\W*3\W+(ugt-nextjs-)?design(-setup)?[^\n]*\n\W*4\W+(ugt-nextjs-)?auth(-setup)?[^\n]*\n\W*5\W+(ugt-nextjs-)?(cicd|ci\b|jenkins)'
flags: i
match: contains
target: last_message
---
The plan states the §3 install order database → test-lint → design → auth → CI, either as an arrow chain or as five consecutive numbered rows/items that each START with the module name (a row's "why" column names other modules). An llm judge voted 3×FAIL on a plan whose numbered table had exactly this order — 2026-10-14.
