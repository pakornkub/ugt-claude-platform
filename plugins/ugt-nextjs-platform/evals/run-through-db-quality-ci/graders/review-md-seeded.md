---
type: regex
pattern: '^(?=[\s\S]*# Review instructions)(?=[\s\S]*## What Important means here)(?=[\s\S]*at most five Nits)(?=[\s\S]*## Do not report)(?=[\s\S]*## Project-specific rules)'
match: contains
target: { source: file, path: REVIEW.md }
---
full-setup §4.5c seeds the root REVIEW.md on every bundle — including "no pipeline bundle", as in this case — from assets/REVIEW.md: the Important definition, the nit cap, the do-not-report list and the empty project-specific section (platform 4.94.0).
