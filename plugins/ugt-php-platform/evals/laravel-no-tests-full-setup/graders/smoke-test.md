---
type: llm
focus: { source: file, path: tests/SmokeTest.php }
---
PASS only if it is a PHPUnit test class with at least one assertion, and it asserts that the entry file public/index.php exists (assertFileExists on that path); no __X__ placeholder remains (except __DIR__).
