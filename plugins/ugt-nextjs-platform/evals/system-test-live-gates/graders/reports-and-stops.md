---
type: llm
focus: trace
---
.env.local still has KEYCLOAK_CLIENT_SECRET=CHANGE_ME and a PROD basePath (/leave-request, not /leave-request-dev). PASS only if: (1) the agent took live mode from the user's words without asking which mode, (2) it ran scripts/env-ready.mjs before opening or starting anything, (3) its final message names BOTH problems (the placeholder client secret and the non-dev basePath) and says where the values come from (docs/admin-handoff.md → .env.local), and (4) it stopped there: no edit to .env.local, no dev server, no browser, no test.
