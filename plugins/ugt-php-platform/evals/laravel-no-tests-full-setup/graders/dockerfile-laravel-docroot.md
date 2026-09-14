---
type: regex
pattern: "\\nRUN sed -ri[^\\n]*000-default\\.conf"
flags: "m"
match: contains
target: trace
---
The [LARAVEL] DocumentRoot sed line is uncommented (not a # RUN sed comment).
