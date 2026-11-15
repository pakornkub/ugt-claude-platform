---
type: llm
focus: trace
---
The run happens on a machine without Docker. PASS only if: (1) the agent checked for Docker with `docker info` or `docker version` (and nothing else about the machine), (2) its final message tells the user Docker Desktop (or Rancher Desktop / Podman) must be installed before calling the system test again, and (3) it attempted no test step afterwards — no database, no dev server, no browser, no alternative way to run the app. If the trace shows Docker WAS available, answer FAIL with the reason "invalid environment".
