---
type: regex
pattern: "EXPOSE 80\\b"
flags: "m"
match: contains
target: trace
---
Dockerfile exposes port 80.
