---
type: llm
focus: { source: file, path: tests/test_smoke.py }
---
PASS only if the smoke test imports the real application module (app.main or app) and contains at least one assertion; no __X__ placeholder remains.
