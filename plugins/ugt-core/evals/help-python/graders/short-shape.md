---
type: llm
focus: last_message
---
Judge only the FINAL message. PASS if it is in Thai, short (roughly under 25 lines), states the project's current state, names one next step (two at most) as something the user can type, and separates what runs by itself from what the user must ask for (it must name /ugt-handoff as something to ask for). FAIL if it walks through the whole skill catalogue (more than about 8 different skill names), is a long manual, or asks the user to choose among many options instead of naming the next step.
