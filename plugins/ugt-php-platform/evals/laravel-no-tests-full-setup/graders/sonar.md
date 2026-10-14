---
type: regex
pattern: '^(?=[\s\S]*^sonar\.projectKey=leave-request\s*$)(?=[\s\S]*^sonar\.projectName=\S)(?=[\s\S]*^sonar\.php\.coverage\.reportPaths=clover\.xml\s*$)(?=[\s\S]*^sonar\.php\.tests\.reportPath=test-results/junit\.xml\s*$)(?=[\s\S]*^sonar\.sources=)(?=[\s\S]*^sonar\.tests=)(?![\s\S]*__[A-Z][A-Z0-9_]*__)'
flags: m
match: contains
target: { source: file, path: sonar-project.properties }
---
sonar-project.properties: projectKey leave-request, a projectName, clover.xml coverage, test-results/junit.xml tests report, sources + tests set, no __X__ placeholder. (Was an llm judge — split FAIL/PASS/FAIL on a correct file 2026-10-14; whether the paths exist is verify.mjs's job in a real run.)
