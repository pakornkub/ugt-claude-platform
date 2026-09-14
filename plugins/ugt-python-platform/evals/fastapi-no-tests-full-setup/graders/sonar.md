---
type: llm
focus: { source: file, path: sonar-project.properties }
---
PASS only if: sonar.projectKey / sonar.projectName are set for leave-request with no __X__ placeholder; sonar.python.coverage.reportPaths=coverage.xml; sonar.tests points at an existing directory (tests). The shipped asset uses `sonar.sources=.` together with `sonar.exclusions` carrying `**/tests/**` and `**/.venv/**` — that is the org standard and must PASS; do not fail the file for sonar.sources not naming `app` explicitly.
