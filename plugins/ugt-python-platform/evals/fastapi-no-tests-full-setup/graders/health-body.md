---
type: llm
focus: { source: file, path: app/health.py }
---
PASS only if the /api/health handler needs no login, answers 200 with status "healthy" or 503 with "degraded", and puts no version, commit hash or other build detail in the response.
