---
type: llm
focus: { source: file, path: Dockerfile }
---
PASS only if: it is the web shape (EXPOSE 8000 and a HEALTHCHECK); CMD is a real JSON array running uvicorn on app.main:app (not a leftover __START_CMD_JSON__); requirements-dev.txt is NOT installed into the production image; no __X__ placeholder remains.
