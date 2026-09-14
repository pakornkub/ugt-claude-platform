---
type: llm
focus: { source: file, path: Jenkinsfile }
---
PASS only if ALL hold: (1) these 10 stages appear in this order: Checkout, Install, Code Quality, Unit Tests, Build, OWASP Dependency Check, SonarQube Analysis, Quality Gate, Docker Build, Deploy (wording may vary slightly, each must be present and ordered); (2) the Install, Code Quality and Unit Tests stages each run inside docker.image('python:3.12-slim').inside — no Jenkins Global Tool Python is referenced; (3) waitForQualityGate has abortPipeline: true; (4) no __SOMETHING__ placeholder remains; (5) no [DB] block or database-migration step remains (the project has no database); (6) the [VOLUME] mkdir -p line in Deploy includes the uploads subdirectory under /home/docker02/appdata/<project> before the chown -R call; (7) the count of { equals the count of }.
