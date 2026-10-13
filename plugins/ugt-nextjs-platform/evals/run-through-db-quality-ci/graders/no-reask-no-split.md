---
type: llm
focus: last_message
---
Judge only the final message. Every interview answer was in the prompt and the user asked for one straight run. FAIL only if the message asks the user a question the prompt already answered, or proposes splitting the install into chunks / sessions / a later run. Telling the user which commands they must run themselves, listing decisions the agent made on points the prompt did not cover, or reporting what the environment blocked is NOT asking and NOT splitting — PASS in those cases.
