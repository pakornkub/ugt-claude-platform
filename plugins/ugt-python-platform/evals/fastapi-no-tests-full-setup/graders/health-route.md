---
type: llm
focus: { source: file, path: app/main.py }
---
PASS only if app/main.py wires a health endpoint for /api/health — `app.include_router(...)` of a router imported from app/health.py, or an equivalent route defined inline — with no auth dependency on it. The response body lives in app/health.py (graded separately); do not FAIL this file for not showing it.
