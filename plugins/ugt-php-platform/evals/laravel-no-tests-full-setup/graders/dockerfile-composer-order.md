---
type: regex
pattern: "composer install[^\\n]*--no-scripts[^\\n]*--no-autoloader"
flags: "m"
match: contains
target: trace
---
composer install runs with --no-scripts --no-autoloader.
