# Project Notes

<!-- These 3 sections are fixed — never add or remove sections. Updated via /ugt-handoff.
     This file is committed with the repo: never put secrets or .env values here. -->

## Error Patterns

Symptom → cause → fix, for problems that already cost real time, so the next
session doesn't rediscover them.

<!-- Example format:
- **`npx prisma generate` reports P1012 after adding a field** → forgot to migrate first
  → `npx prisma migrate dev --name <name>` then `npx prisma generate` (2026-01-15)
-->

_(none yet)_

## Deviations

Places where this project **intentionally** differs from the `ugt-*` standards,
with the reason — unrecorded deviations look like mistakes, and the next person
(or a verify script) will "fix" them back.

<!-- Example:
- Table `LegacyEmp` has no audit columns — it is a view dumped from the legacy system; schema can't change (2026-02-03)
-->

_(none yet)_

## Open Questions

Unanswered questions currently blocking work + who owes the answer.

<!-- Example:
- Is the prod basePath `/hr` or `/hrms`? — waiting on IT (asked 2026-02-10)
-->

_(none yet)_
