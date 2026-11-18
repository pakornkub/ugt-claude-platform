---
type: regex
pattern: ':setvar\s+LoginPassword\s+""'
match: contains
target: { source: file, path: docs/admin-db-setup.sql }
---
docs/admin-db-setup.sql was rendered (one file — prod and dev share a server) and its LoginPassword is left empty for the DBA (cicd-setup §4.6).
