---
type: llm
focus: last_message
---
PASS only if the closing message tells the user that the first migration must be created with `--create-only` and hand-edited so User.LdapUsername gets a FILTERED unique index (`WHERE [LdapUsername] IS NOT NULL`) instead of Prisma's plain unique constraint — or says it already wrote that edited migration. Any wording (Thai or English) counts as long as the filtered index on LdapUsername is the point. FAIL if the migration step is given as a plain `npx prisma migrate dev` with no mention of the filtered index.
