---
type: regex
pattern: 'db_ddladmin'
match: contains
target: { source: file, path: docs/admin-db-setup.sql }
---
"สิทธิ์มาตรฐาน" rendered the [RWX] set (db_datareader/db_datawriter/db_ddladmin/GRANT EXECUTE), not db_owner.
