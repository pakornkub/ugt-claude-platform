# Placeholders used across the assets

| Placeholder | Meaning | Example |
| --- | --- | --- |
| `__PROJECT_NAME__` | app slug / Keycloak Client ID — **also hidden in a fallback string in `login-form.tsx` (flagged with a ⚠️ PLACEHOLDER comment — grep for it; line numbers drift); don't miss it** | `expense-portal` |
| `__BASE_PATH__` | Next.js basePath (no leading `/` when used as a cookie prefix) | `expense-portal` |
| `__KEYCLOAK_HOST__` | the org's central Keycloak host | — |
| `__REALM__` | the org's central realm | — |
| `__LDAP_HOST__` | AD server hostname | — |
| `__AD_BASE_DN__` | full AD base DN (one `DC=` per label) | `DC=example,DC=com` |
| `__COMPANY_DOMAIN__` | org email/UPN domain | `company.co.th` |
| `__APP_HOST__` | the host the app actually deploys to | — |
| `__LINKED_SERVER__` · `__HR_DB__` · `__HR_EMPLOYEE_VIEW__` | the four-part name of the org employee view in `lib/directory.ts` (same `__LINKED_SERVER__` as ugt-nextjs-database-setup) | `thsrv01` · `HRPortal` · `vwEmployee` |
| `__HR_AUTHORIZE_VIEW__` | the approval-chain view in `lib/approval-chain.ts` — **a different object** from the employee view | `HR_AuthorizeEmployee_ms` |

## กติกาการแทนค่า

- **ห้ามเขียน token พวกนี้ลงในคอมเมนต์ของ asset** — ตัวตรวจ placeholder ไม่แยก
  คอมเมนต์กับโค้ด มันจะฟ้อง ✘ ใส่ไฟล์ที่ถูกอยู่แล้ว แล้วคนติดตั้งจะไปแก้ของที่
  ไม่ได้เสีย · คอมเมนต์ที่ต้องยกตัวอย่าง basePath ให้ใช้ค่าจริงสมมติ เช่น
  `expense-portal`
- **`env.example`/`.env.local`/`.env` ต้องแทน token ด้วยค่าจริงเหมือนกัน** —
  ตัวตรวจ (`scripts/verify.mjs` §"No `__*__` placeholders left") สแกนทั้งสาม
  ไฟล์นี้ด้วย ไม่ได้จำกัดแค่ `.ts` / `.tsx` / `.prisma`
