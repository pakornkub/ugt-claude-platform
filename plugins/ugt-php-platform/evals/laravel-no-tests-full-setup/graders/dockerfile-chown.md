---
type: regex
pattern: "chown -R www-data:www-data /var/www/html"
flags: "m"
match: contains
target: trace
---
Ownership of /var/www/html is set to www-data:www-data.
