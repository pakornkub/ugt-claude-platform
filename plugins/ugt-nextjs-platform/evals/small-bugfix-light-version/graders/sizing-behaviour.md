---
type: llm
focus: last_message
---
The project's CLAUDE.md says a Small bug fix takes the light version by default and never stops to ask. Judge only the FINAL message: FAIL if it shows the agent waited for the user to approve the approach before editing, ran a brainstorming/plan ceremony, or asked the user to choose light vs full before doing the work. PASS if the fix is done and reported (a follow-up question AFTER the fix, e.g. about running /ugt-handoff, is fine). Ignore missing tests, missing test runner, and any handoff.md permission problem — those are environment, not behaviour.
