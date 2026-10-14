---
type: regex
pattern: 'mail:\s*mailTh'
target: { source: file, path: i18n/messages.ts }
---
The mail catalog is registered in i18n/messages.ts — otherwise /admin/mail-templates renders raw key paths.
