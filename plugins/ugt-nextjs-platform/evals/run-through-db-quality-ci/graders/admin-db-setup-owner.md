---
type: regex
pattern: '(?<![\s\S])(?=[\s\S]*ALTER ROLE \[db_owner\] ADD MEMBER)(?=[\s\S]*DEFAULT_DATABASE = \[LeaveRequest_DEV\])(?![\s\S]*db_ddladmin)'
target: { source: file, path: docs/admin-db-setup.sql }
---
"สิทธิ์มาตรฐาน" rendered the org default [OWNER] (db_owner, มติ 2026-11-18), not the [RWX] set, and the login's DEFAULT_DATABASE is the dev database.
