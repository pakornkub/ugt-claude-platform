---
type: llm
focus: { source: file, path: routes/api.php }
---
PASS only if routes/api.php defines a /api/health (or /health under the api prefix) route that needs no login and returns only healthy/degraded — no version or commit hash.
