---
type: regex
pattern: ':setvar\s+LoginPassword\s+"CHANGE_ME"'
match: contains
target: { source: file, path: docs/admin-db-setup.sql }
---
docs/admin-db-setup.sql was rendered (one file — prod and dev share a server) and its LoginPassword is left as the CHANGE_ME dummy for the DBA (cicd-setup §4.6).
