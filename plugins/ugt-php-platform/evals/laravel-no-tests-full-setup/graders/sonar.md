---
type: llm
focus: { source: file, path: sonar-project.properties }
---
PASS only if: sonar.projectKey / sonar.projectName are set for leave-request (no __X__); sonar.php.coverage.reportPaths=clover.xml; sonar.php.tests.reportPath=test-results/junit.xml; sonar.sources / sonar.tests name paths that exist in this project.
