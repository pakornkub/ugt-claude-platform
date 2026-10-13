---
type: regex
pattern: "title:[^\\n]{0,6}ระบบคำขอลา"
match: contains
target: trace
---
metadata.title was set to "ระบบคำขอลา" (the Edit call carries the new string; an llm judge
on the file voted FAIL on a byte-identical-except-title file — 2026-10-11).
