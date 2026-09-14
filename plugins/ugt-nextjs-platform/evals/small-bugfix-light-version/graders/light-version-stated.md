---
type: regex
pattern: "(light[- ](version|path)|ฉบับย่อ|แบบย่อ)"
flags: i
match: contains
target: trace
---
Says it is taking the light version/path (bare "light" would also match the fixture CLAUDE.md echoed in a Read result).
