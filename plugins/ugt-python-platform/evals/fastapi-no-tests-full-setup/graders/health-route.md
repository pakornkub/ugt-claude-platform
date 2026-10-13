---
type: llm
focus: { source: file, path: app/main.py }
---
PASS only if app/main.py wires a health router/endpoint for /api/health (app.include_router(...) from app/health.py or an equivalent route) that needs no login and returns only healthy/degraded — no version or commit hash.
