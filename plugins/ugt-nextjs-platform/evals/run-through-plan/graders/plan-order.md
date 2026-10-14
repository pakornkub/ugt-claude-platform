---
type: regex
pattern: '\b(ugt-nextjs-)?database(-setup)?\W+(ugt-nextjs-)?(test-lint|quality)(-setup)?\W+(ugt-nextjs-)?design(-setup)?\W+(ugt-nextjs-)?auth(-setup)?\W+(ugt-nextjs-)?(cicd|ci)(-setup)?\b|(^|\n)\W*1\W+(ugt-nextjs-)?database(-setup)?[\s\S]*?\n\W*2\W+(ugt-nextjs-)?(test|quality)(-setup)?[\s\S]*?\n\W*3\W+(ugt-nextjs-)?design(-setup)?[\s\S]*?\n\W*4\W+(ugt-nextjs-)?auth(-setup)?[\s\S]*?\n\W*5\W+(ugt-nextjs-)?(cicd|ci\b|jenkins)'
flags: i
match: contains
target: last_message
---
The plan states the §3 install order database → test-lint → design → auth → CI, either as an arrow chain or as five numbered rows/items 1–5 that each START with the module name, in order (bullets may sit between items; a row's "why" column names other modules).
