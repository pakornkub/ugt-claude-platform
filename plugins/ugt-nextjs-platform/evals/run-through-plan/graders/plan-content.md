---
type: llm
focus: last_message
---
Judge only the final message (an install plan). PASS if it plans the five modules database, test-lint, design, auth, CI plus a harness step (CLAUDE.md / .claude / project-context), leaves out mail and upload (saying they are skipped is fine), and reflects these answers from the prompt somewhere in the plan: SQL Server SQLDEV01 with database LeaveRequest; SSO/Keycloak as the only login method, with the Keycloak client still to be requested; sidebar shell without dark mode; deploy to docker02. Wording may be Thai or English and the answers may appear in tables. FAIL only if a module is missing, mail/upload are planned for installation, or one of the listed answers is absent or contradicted. (Order is checked by the plan-order regex.)
