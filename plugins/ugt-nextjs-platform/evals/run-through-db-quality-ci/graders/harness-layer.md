---
type: llm
focus: last_message
---
The harness layer is .claude/settings.json (enabledPlugins explicitly {} because no bundle is installed — never a guessed bundle), .claude/state/handoff.md (dated, listing the installed modules) and .claude/state/model-mode.md (auto preset), plus each child skill's .claude/rules/*.md. PASS if the closing message either (a) reports these files as written, or (b) reports plainly that writes under .claude/ were denied by the environment AND names where their full content was parked for the user to copy (a docs file), mentioning enabledPlugins as empty/none. FAIL if the harness layer is silently skipped, if a bundle is enabled that the user did not choose, or if the message claims the files exist when they do not.
