---
type: llm
focus: { source: file, path: Jenkinsfile }
---
PASS only if ALL hold: (1) these 10 stages appear in order: Checkout, Install, Code Quality, Unit Tests, Build, OWASP Dependency Check, SonarQube Analysis, Quality Gate, Docker Build, Deploy; (2) Install, Code Quality and Unit Tests each run inside docker.image('leave-request-ci').inside (the CI image built from Dockerfile.ci) — no Jenkins Global Tool PHP; (3) waitForQualityGate has abortPipeline: true; (4) no __SOMETHING__ placeholder remains (the PHP magic constant __DIR__ does not count); (5) the [DB] block in Deploy is KEPT and runs artisan migrate --force with the env file passed through (--env-file); (6) the [VOLUME] mkdir -p line includes the uploads subdirectory under /home/docker02/appdata/<project> before chown -R; (7) the count of { equals the count of }.
