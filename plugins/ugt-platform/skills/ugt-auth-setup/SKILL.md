---
name: ugt-auth-setup
description: >
  Use when adding a login system to a project — SSO (Keycloak), AD/LDAP login,
  or local email/password via Better Auth; when setting up session cookies,
  protected routes (proxy/middleware guard), RBAC roles/permissions, or the
  first-admin bootstrap flow. Also use when debugging login redirect loops,
  cookie-name mismatches, or Keycloak client configuration.
  Don't use for DB wiring (→ ugt-database-setup) or CI (→ ugt-cicd-setup).
  Requires database set up first.
---

# UGT Auth Setup — SSO / LDAP / Local + RBAC

## 1. Overview

Skill นี้ติดตั้งระบบ login มาตรฐานองค์กรให้โปรเจกต์ที่ยังไม่มี auth
(รวมถึงโปรเจกต์ที่ AI generate มา) ผู้ติดตั้ง **เลือกวิธี login ได้**:

| Method | กลไก | Default |
| --- | --- | --- |
| **SSO** | Keycloak (OIDC + PKCE) ผ่าน Better Auth `genericOAuth` | ✅ เปิด |
| **LDAP** | bind ตรงกับ AD ผ่าน `ldapts` + สร้าง session เอง (HMAC-signed) | เลือกได้ |
| **Local** | email/password ของ Better Auth (`signInEmail`) | เลือกได้ |

ทุกวิธีลงเอยที่ **session เดียวกันของ Better Auth + Prisma** พร้อม RBAC
(role → permission) และหน้า first-admin bootstrap (`/admin/setup`)

โค้ดจริงอยู่ใน `assets/` — ปรับ placeholder แล้ว copy เข้าโปรเจกต์ได้เลย
รายละเอียดเชิงลึกอยู่ใน `references/`:

- `references/auth-flows.md` — ทุก flow + gotcha ที่เคย debug มาแล้ว (**อ่านก่อนแก้โค้ด auth เสมอ**)
- `references/rbac.md` — data model, guard pattern, bootstrap, การเพิ่ม permission ภายหลัง
- `references/audit-logging.md` — action naming, write pattern, กฎ payload (PDPA), retention, viewer API
- `references/keycloak-client.md` — วิธีขอ/สร้าง Keycloak client สำหรับโปรเจกต์ใหม่

## 2. Org Standards

กติกากลางขององค์กร:

1. **Keycloak เครื่องเดียวทั้งองค์กร** — realm กลาง sync กับ AD;
   **แต่ละโปรเจกต์มี client ของตัวเอง** (Client ID = ชื่อโปรเจกต์) ห้ามใช้ client ร่วมกัน
2. **OIDC Authorization Code + PKCE (S256)** เท่านั้น — ไม่ใช้ implicit / direct access grants
3. **Session: อายุ 8 ชั่วโมง, refresh เมื่อเหลือ 30 นาที** (`expiresIn: 8h`, `updateAge: 30m`)
4. **Audit log ทุกครั้ง**: `login.success` / `login.failed` / `logout` / `logout.sso`
   ลงตาราง ActivityLogs (non-blocking — ห้าม throw จน login พัง)
   และทุก privileged mutation ต้องเขียน audit log หลังสำเร็จ
   — กฎครบ (action naming, payload ที่ห้ามเก็บ, retention) อยู่ใน `references/audit-logging.md`
5. **RBAC shape**: `user (1)──(0..1) role (1)──(M:N) permission` —
   permission key รูปแบบ `resource:action`, role ที่ `isSystem: true` ลบไม่ได้,
   guard ทุก mutation ตามลำดับ **session → permission → action → audit log**
6. **Cookie-prefix rule**: เมื่อหลายแอป deploy ใต้โดเมนเดียวกัน (shared domain + basePath)
   ชื่อ session cookie ต้อง unique ต่อแอป — derive prefix จาก basePath
   ไม่งั้น cookie ชนกัน → `ERR_TOO_MANY_REDIRECTS`
7. **SSO logout = ลบ session local + backchannel logout ไปที่ Keycloak** (POST พร้อม refresh_token)
   — browser ไม่ต้อง redirect ผ่าน Keycloak

## 3. Interview — ถามผู้ติดตั้งก่อนเริ่ม (ถามรวบเป็นชุดเดียว)

ถามคำถามทั้งหมดนี้ **ในข้อความเดียว** แล้วค่อยลงมือ:

1. **เปิดวิธี login ไหนบ้าง?** SSO / LDAP / Local (default: SSO อย่างเดียว)
2. **Deploy ใต้ basePath / shared domain ไหม?** ถ้าใช่ → basePath คืออะไร (เช่น `/<base-path>`)
3. **[ถ้าเปิด SSO] มี Keycloak client แล้วหรือยัง?**
   - มีแล้ว → ขอ `KEYCLOAK_ISSUER` / `CLIENT_ID` / `CLIENT_SECRET`
   - ยังไม่มี → เดินตาม `references/keycloak-client.md` (ต้องรู้ redirect URI ก่อนขอ)
4. **[ถ้าเปิด LDAP] รายละเอียด AD server?** `LDAP_URL` (ldaps:// ไหม), `LDAP_BASE_DN`, `LDAP_DOMAIN`
5. **ใครเป็น first admin?** (คนแรกที่ login แล้วจะเข้า `/admin/setup` กดปุ่มเดียวเป็น Administrator)

## 4. Prerequisite

**Database ต้องพร้อมก่อน** — ผ่าน `ugt-database-setup` (Prisma client + `lib/prisma.ts`
singleton + migrate ใช้งานได้) เพราะ Better Auth เก็บ user/session/account ใน Prisma
ถ้ายังไม่มี ให้หยุดและทำ database ก่อน

## 5. Setup steps

### 5.1 Dependencies

```bash
npm i better-auth zod
npm i ldapts          # [METHOD: LDAP] เท่านั้น — ห้ามใช้ ldapjs (deprecated, ไม่มี types)
npx shadcn@latest init    # เฉพาะโปรเจกต์ที่ยังไม่มี shadcn — สร้าง components.json + lib/utils.ts (cn() ที่ login-form ใช้)
npx shadcn@latest add button input label tabs card sonner   # UI ของ login/setup form
```

จากนั้น mount `<Toaster richColors />` (จาก sonner) ใน root layout (`app/layout.tsx`)
— ไม่งั้น `toast.*()` ใน login-form จะไม่แสดงผลเลย

### 5.2 Copy templates → ตำแหน่งในโปรเจกต์

| Template | ปลายทาง | เมื่อไร |
| --- | --- | --- |
| `assets/lib-auth.ts` | `lib/auth.ts` | เสมอ |
| `assets/lib-auth-client.ts` | `lib/auth-client.ts` | เสมอ |
| `assets/lib-actions-auth.ts` | `lib/actions/auth.ts` | เสมอ (ลบ action ของ method ที่ไม่เปิด) |
| `assets/lib-ldap.ts` | `lib/ldap.ts` | เฉพาะ LDAP |
| `assets/route.ts` | `app/api/auth/[...all]/route.ts` | เสมอ |
| `assets/proxy.ts` | `proxy.ts` (root) | เสมอ — Next.js 16 ใช้ `proxy.ts` ไม่ใช่ `middleware.ts` |
| `assets/login-form.tsx` | `components/login-form.tsx` | เสมอ (ลบ section ตาม method ที่เลือก) |
| `assets/lib-permissions.ts` | `lib/permissions.ts` | เสมอ |
| `assets/lib-get-user-permissions.ts` | `lib/get-user-permissions.ts` | เสมอ |
| `assets/admin-setup/layout.tsx` | `app/(admin-setup)/layout.tsx` | เสมอ |
| `assets/admin-setup/page.tsx` | `app/(admin-setup)/admin/setup/page.tsx` | เสมอ |
| `assets/admin-setup/admin-setup-form.tsx` | `components/admin-setup-form.tsx` | เสมอ |
| `assets/admin-setup/admin-setup-action.ts` | `lib/actions/admin-setup.ts` | เสมอ |
| `assets/env.example` | merge เข้า `.env.example` + `.env.local` | เสมอ (ตัด var ของ method ที่ไม่เปิด) |

ทุก template มี marker `[METHOD: SSO|LDAP|LOCAL]` — ลบ section ของ method
ที่ไม่ได้เลือกออกให้หมด (import ด้วย)

### 5.3 Schema + migrate

1. Paste `assets/schema-auth.prisma` เข้า `prisma/schema.prisma`
   (แก้ `@db.NVarChar(Max)` ถ้าไม่ใช่ MSSQL)
   > **ข้อยกเว้นกฎตั้งชื่อตาราง**: ตาราง core ของ Better Auth (`User`, `Session`,
   > `Account`, `Verification`, `RateLimit`) map เป็นชื่อ**เอกพจน์**ตาม convention
   > ของ library — เป็นข้อยกเว้นจากกฎองค์กร PascalCase-**plural** อย่าแก้เป็นพหูพจน์
2. เพิ่ม custom field ของโปรเจกต์ที่ `user` model ตาม `// EXTENSION POINT:`
3. `npx prisma migrate dev --name auth-rbac` แล้ว **ต้อง** `npx prisma generate` ต่อทันที

### 5.4 Env schema (`lib/env.ts` หรือเทียบเท่า)

- `BETTER_AUTH_SECRET` → `z.string().min(32)` (required)
- `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS` → optional string
- `KEYCLOAK_ISSUER/CLIENT_ID/CLIENT_SECRET` → required เฉพาะเมื่อเปิด SSO
  (แต่ code ใน `lib/auth.ts` guard `undefined` ไว้แล้วเพื่อรองรับ `SKIP_ENV_VALIDATION=1`)
- `LDAP_URL/LDAP_BASE_DN/LDAP_DOMAIN` → required เฉพาะเมื่อเปิด LDAP
- `NEXT_PUBLIC_BASE_PATH` → `z.string().default('')` — **ต้อง**อยู่ใน `client` block
  ของ t3-env **และ** list ใน `runtimeEnv` ด้วย (ไม่งั้น undefined ตอน runtime)
- `NEXT_PUBLIC_APP_NAME` → optional string (login-form.tsx ใช้แสดงชื่อแอป) —
  อยู่ใน `client` block + `runtimeEnv` เช่นกัน

### 5.5 Wire หน้า login + guard

1. สร้าง `app/(auth)/login/page.tsx` render `<LoginForm sessionExpired={reason === 'session_expired'} />`
2. Layout กลุ่ม protected (`app/(app)/layout.tsx`):
   `auth.api.getSession({ headers: await headers() })` → ไม่มี session → `redirect('/login')`
   (แยก `?reason=session_expired` เมื่อ cookie ยังอยู่ — ดู `references/auth-flows.md`)
3. ปุ่ม logout ใช้ `<form action={logoutAction}>` (SSO ใช้ `ssoLogoutAction`) —
   ไม่เรียก `signOut()` จาก auth-client
4. Deploy ครั้งแรก: login → เข้า `/admin/setup` → กดปุ่ม → ได้ Administrator role

## 6. Placeholders ที่ใช้ในทุกไฟล์

| Placeholder | ความหมาย | ตัวอย่าง |
| --- | --- | --- |
| `<project-name>` | app slug / Keycloak Client ID — **ซ่อนอยู่ใน fallback string ของ `login-form.tsx` (~บรรทัด 181, มี comment ⚠️ PLACEHOLDER กำกับ) ด้วย อย่าลืมแทน** | `expense-portal` |
| `<base-path>` | Next.js basePath (ไม่มี `/` นำหน้าเมื่อเป็น cookie prefix) | `expense-portal` |
| `<keycloak-host>` | host ของ Keycloak กลางองค์กร | — |
| `<realm>` | realm กลางขององค์กร | — |
| `<ldap-host>` | AD server hostname | — |
| `<ad-base-dn>` | base DN เต็มของโดเมน AD (หนึ่ง `DC=` ต่อหนึ่ง label) | `DC=example,DC=com` |
| `<company-domain>` | โดเมนอีเมล/UPN ขององค์กร | `company.co.th` |
| `<app-host>` | host ที่ deploy แอปจริง | — |

## 7. Quick Rules — DO / DON'T

| DO ✅ | DON'T ❌ |
| --- | --- |
| Derive cookie prefix จาก basePath แล้วใช้ **ให้ตรงกัน 3 จุด**: `lib/auth.ts` / `proxy.ts` / `lib/actions/auth.ts` | ปล่อย default `better-auth.` บน shared domain (→ `ERR_TOO_MANY_REDIRECTS`) |
| คำนวณ `SESSION_COOKIE_NAME` จาก `BETTER_AUTH_URL` (https → `__Secure-` prefix) | hardcode ชื่อ cookie |
| Logout ด้วย `cookieStore.set(name, '', { maxAge: 0, secure })` | `cookieStore.delete()` — ไม่ส่ง `Secure` flag, browser ไม่ยอมลบ `__Secure-` cookie |
| Guard การ register Keycloak plugin ด้วย `env.KEYCLOAK_* &&` | เรียก `keycloak()` ตรง ๆ (build พังตอน `SKIP_ENV_VALIDATION=1`) |
| `redirectURI` = `${BETTER_AUTH_URL}${BASE_PATH}/api/auth/oauth2/callback/keycloak` | ปล่อยให้ Better Auth เดา redirect URI เอง (ไม่มี basePath) |
| `auth.api.signInEmail(...)` | `auth.api.signIn.email(...)` (ไม่มี path นี้) |
| `decodeURIComponent` ค่า cookie จาก `Set-Cookie` ก่อน `cookieStore.set` | forward ตรง ๆ (double-encode → 404) |
| LDAP: HMAC-sign token ด้วย Web Crypto ก่อน set cookie | set raw token (Better Auth reject → redirect loop) |
| LDAP: bind เป็น UPN + escape filter ตาม RFC 4515 | ต่อ string filter จาก input ดิบ (LDAP injection) |
| ใช้ `ldapts` | `ldapjs` (deprecated, ไม่มี types) |
| `rateLimit` model: `id String @id` + `key String?` nullable | `key` เป็น `@id` (Better Auth v1 ส่ง `id` → `Unknown argument 'id'`) |
| auth-client: ไม่ส่ง `baseURL`, ส่ง basePath ผ่าน option `basePath` และอ่าน `process.env.NEXT_PUBLIC_BASE_PATH` ตรง ๆ | ส่ง URL ที่มี path เป็น `baseURL` / อ่านผ่าน `createEnv()` ใน client bundle |
| proxy: `url.pathname = '/login'` (app-relative) | `url.pathname = basePath + '/login'` (basePath ซ้ำ) |
| ลบ DB session ด้วย raw token (strip signature ก่อน) | ลบด้วย signed token (ลบไม่เจอ) |

## 8. Verification Checklist

**รันสคริปต์ก่อน** (cwd = root ของโปรเจคปลายทาง):

```bash
node <skill-dir>/scripts/verify.mjs
```

มันตรวจ placeholder ค้าง (รวมตัวที่ซ่อนใน `login-form.tsx`), marker `[METHOD: …]` ที่ยังไม่ถูกลบ,
cookie prefix ทั้ง 3 ไฟล์, schema, และ API ที่เรียกผิดบ่อย — ที่เหลือต้องกดเองตามนี้:

- [ ] `npm run build` ผ่าน (และผ่านด้วย `SKIP_ENV_VALIDATION=1` ถ้าเปิด SSO)
- [ ] Login ได้ครบทุก method ที่เลือก แล้วเข้าหน้า protected ได้
- [ ] Method ที่ไม่ได้เลือกถูกลบออกหมด (section ใน login-form, action, import, env var)
- [ ] Logout แล้ว cookie หาย + DB session หาย + กลับ `/login` (ทดสอบบน https ด้วยถ้าทำได้)
- [ ] [SSO] logout แล้วกด login ใหม่ → ต้องเจอหน้า Keycloak อีกครั้ง (backchannel logout ทำงาน)
- [ ] เข้า `/login` ขณะ login อยู่ → เด้งไป dashboard; เข้าหน้า protected โดยไม่ login → เด้งไป `/login`; API route ไม่มี session → 401 JSON
- [ ] Static assets โหลดได้ (ไม่มี `Unexpected token '<'` ใน console)
- [ ] `/admin/setup` ทำงาน: กดครั้งเดียวได้ Administrator role แล้ว redirect; เข้าซ้ำถูก redirect ออก
- [ ] ActivityLog มีแถว `login.success` / `logout` หลังทดสอบ
- [ ] cookie prefix ตรงกันทั้ง `lib/auth.ts` / `proxy.ts` / `lib/actions/auth.ts` (grep `cookiePrefix\|APP_COOKIE_PREFIX`)
- [ ] ถ้ามี basePath: ชื่อ cookie ใน DevTools ขึ้นต้นด้วย `<base-path>.` (หรือ `__Secure-<base-path>.` บน https)
- [ ] ไม่มี secret / hostname จริงหลุดเข้า git (`.env.local` อยู่ใน `.gitignore`)
