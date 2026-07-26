---
paths:
  - "lib/auth.ts"
  - "lib/auth-client.ts"
  - "lib/ldap.ts"
  - "lib/permissions.ts"
  - "lib/get-user-permissions.ts"
  - "lib/actions/**"
  - "proxy.ts"
  - "app/api/auth/**"
  - "components/login-form.tsx"
---

<!-- ไฟล์นี้ ugt-auth-setup เป็นเจ้าของ — เขียนทับได้ทั้งไฟล์ตอน /plugin update -->

# กฎ Auth / RBAC (โหลดเมื่อแตะไฟล์ auth, guard, server action)

## Cookie prefix — จุดที่พังบ่อยที่สุด

ชื่อ session cookie ต้อง unique ต่อแอปเมื่อหลายแอปอยู่โดเมนเดียวกัน
derive จาก `NEXT_PUBLIC_BASE_PATH` แล้วใช้ **ให้ตรงกันทั้ง 3 ไฟล์**:

| ไฟล์ | ใช้ทำอะไร |
| --- | --- |
| `lib/auth.ts` | `advanced.cookiePrefix` (Better Auth เขียน cookie ด้วยชื่อนี้) |
| `proxy.ts` | `getSessionCookie(request, { cookiePrefix })` |
| `lib/actions/auth.ts` | `SESSION_COOKIE_NAME` สำหรับ LDAP set cookie + logout ทั้งสองแบบ |

ไม่ตรงกัน = `ERR_TOO_MANY_REDIRECTS` บน production (local ไม่เจอเพราะ http ไม่มี `__Secure-`)

- `BETTER_AUTH_URL` เป็น `https://` → Better Auth เติม `__Secure-` ให้เอง โค้ดเราต้องคำนวณชื่อเดียวกัน
- **ห้าม hardcode** ชื่อ cookie

## API ของ Better Auth ที่เรียกผิดบ่อย

- `auth.api.signInEmail(...)` — **ไม่มี** `auth.api.signIn.email(...)`
- logout: `cookieStore.set(name, '', { maxAge: 0, secure })` — **ห้าม** `cookieStore.delete()`
  เพราะมันไม่ส่ง `Secure` flag แล้ว browser ปฏิเสธการลบ `__Secure-` cookie (เจอเฉพาะบน https)
- ลบ DB session ต้อง strip signature ออกจาก token ก่อน (`lastIndexOf('.')`) — DB เก็บ raw token
- `decodeURIComponent` ค่า cookie จาก `Set-Cookie` ก่อน `cookieStore.set` (ไม่งั้น double-encode → 404)
- register Keycloak plugin ต้อง guard `env.KEYCLOAK_* &&` ไม่งั้น build ด้วย `SKIP_ENV_VALIDATION=1` crash
- auth-client: ไม่ส่ง `baseURL`, ส่ง path ผ่าน option `basePath` และอ่าน
  `process.env.NEXT_PUBLIC_BASE_PATH` ตรง ๆ (อ่านผ่าน `createEnv()` แล้วจะ undefined ใน client bundle)

## proxy.ts

- `url.pathname = '/login'` (app-relative) — `clone()` พา basePath มาให้แล้ว ต่อเองจะซ้ำ
- ต้อง bypass `/_next/` (ไม่งั้น static asset ได้ HTML redirect → `Unexpected token '<'`)
  และ `/api/health` (ไม่งั้น healthcheck ถูกเด้งไป `/login` → container ไม่ healthy)
- ที่ edge ใช้ `getSessionCookie()` (เช็คว่ามี cookie เท่านั้น) — `auth.api.getSession()` ต้องใช้ DB ใช้ที่ edge ไม่ได้

## Server Action ที่มีสิทธิ์ — ลำดับตายตัว

```
1. session   → ไม่มี session ตอบ Unauthorized
2. permission → hasPermission(perms, PERMISSIONS.X) ไม่ผ่านตอบ Forbidden
3. action     → domain check แล้วทำงานจริง
4. audit log  → เขียนหลังสำเร็จ (ไม่ใช่ก่อน) แบบ non-blocking `.catch(() => {})`
```

- permission key เป็น `resource:action` และมาจาก constant ใน `lib/permissions.ts` เท่านั้น
- โหลด permission ฝั่ง server แล้วส่งเป็น props — ห้ามเรียก `getUserPermissions` จาก Client Component
- UI ให้ **ซ่อน** ปุ่มที่ไม่มีสิทธิ์ (ไม่ใช่ disable) แต่ UI เป็นแค่ UX — guard ที่ action คือขอบเขตความปลอดภัยจริง
- role ที่ `isSystem: true` ลบไม่ได้ทุกเส้นทาง

## Audit log

- action เป็น `<resource>.<verb>` จาก constant · **ห้ามเก็บ password/secret/token หรือ PII
  ที่ไม่ควรกว้างใน `detail`** (สิทธิ์อ่าน log มักกว้างกว่าสิทธิ์อ่านข้อมูลต้นทาง)
- `ActivityLogs` เป็น append-only — ห้าม UPDATE/DELETE จาก app code
- login/logout ต้องเขียนแบบ non-blocking เสมอ (audit ล้มแล้ว login พังคือความล้มเหลวที่แย่กว่า)

## LDAP

- ใช้ `ldapts` (ห้าม `ldapjs` — deprecated ไม่มี types)
- bind เป็น UPN (`user@DOMAIN`) และ escape filter ตาม RFC 4515 (backslash ก่อน)
- session ที่สร้างเองต้อง HMAC-sign ด้วย Web Crypto ก่อน set cookie ไม่งั้น Better Auth reject → redirect loop
