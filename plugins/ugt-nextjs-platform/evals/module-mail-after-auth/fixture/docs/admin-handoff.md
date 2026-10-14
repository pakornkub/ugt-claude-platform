# ระบบคำขอลา (leave-request) — สิ่งที่ต้องให้ผู้ดูแลระบบทำ / ตรวจ

> ไฟล์นี้ส่งต่อให้ทีม infra / ผู้ดูแล Keycloak ได้ทั้งไฟล์ · อัปเดตล่าสุด 2026-10-14
> (ugt-nextjs-auth-setup) · ส่วน CI/CD จะถูกเติมโดย ugt-nextjs-cicd-setup

## Keycloak — ตรวจ client `leave-request` ที่มีอยู่แล้ว

Client มีแล้ว — ขอให้ตรวจว่าตั้งค่าตรงตารางนี้ทุกข้อ (redirect URI ผิดแม้แต่ `/` เดียว
Keycloak จะตอบ *Invalid parameter: redirect_uri*)

| ค่าที่ต้องเป็น | ค่า |
| --- | --- |
| Client type | OpenID Connect |
| Client ID | `leave-request` |
| Client authentication | **On** (confidential — มี client secret) |
| Standard flow | **On** |
| Direct access grants / Implicit / Service accounts | Off |
| PKCE code challenge method | **S256** (Advanced → Proof Key for Code Exchange) |
| Client scopes | `openid` `profile` `email` (Keycloak 25+ ต้องมี `basic` ด้วย — ใช้ส่ง `sub`) |
| Valid post logout redirect URIs | ว่างได้ (แอปใช้ backchannel logout) |
| Web origins | `https://apps.ugt.local` · `http://localhost:3000` |

**Valid redirect URIs** — คัดลอกตามนี้ทุกตัวอักษร ไม่มี `/` ท้าย:

```
https://apps.ugt.local/leave-request/api/auth/callback/keycloak
https://apps.ugt.local/leave-request-dev/api/auth/callback/keycloak
http://localhost:3000/api/auth/callback/keycloak
```

(บรรทัดสุดท้ายสำหรับนักพัฒนารันบนเครื่อง — `NEXT_PUBLIC_BASE_PATH` ว่าง)

### ส่งกลับ (ใส่ใน `.env.local` / Jenkins Secret File ของแต่ละ environment)

| ตัวแปร | ได้จากไหน |
| --- | --- |
| `KEYCLOAK_ISSUER` | `https://<keycloak-host>/realms/<realm>` — ยืนยันโดยเปิด `<issuer>/.well-known/openid-configuration` ได้ |
| `KEYCLOAK_CLIENT_ID` | `leave-request` |
| `KEYCLOAK_CLIENT_SECRET` | Keycloak → client → แท็บ *Credentials* |

## AD / LDAP (ทางสำรองตอน Keycloak ล่ม)

| ตัวแปร | ค่า |
| --- | --- |
| `LDAP_URL` | `ldaps://ad.ube.co.th:636` |
| `LDAP_BASE_DN` | `DC=ube,DC=co,DC=th` |
| `LDAP_DOMAIN` | `ube.co.th` — แอป bind แบบ UPN (`username@ube.co.th`) จึงใช้ชื่อโดเมน DNS ไม่ใช่ชื่อ NetBIOS `UBE` |

- เครื่องที่รัน container ต้องต่อ `ad.ube.co.th:636` ได้
- ใบรับรอง AD ออกโดย CA ภายใน — `NODE_TLS_REJECT_UNAUTHORIZED=0` เป็นมาตรฐานองค์กรอยู่แล้ว
  (ส่วนที่ 1 ของ `.env.local` และ compose ทั้งสองไฟล์)

## ฐานข้อมูล

- Login ของแอปต้อง **SELECT** ได้บน linked server `HRLINK` → `HRLINK.HRMS.dbo.vw_EmployeeAll`
  (อ่านอย่างเดียว — ใช้เติมรหัสพนักงาน/ตำแหน่ง/หน่วยงาน และค้นพนักงานตอนตั้งบทบาทล่วงหน้า)
  ถ้า linked server ล่ม ทุกคนยัง login ได้ แค่ข้อมูลพนักงานไม่อัปเดตรอบนั้น

## หลังระบบขึ้นแล้ว

- **คนแรกที่ login จะถูกพาไปหน้า `/admin/setup` และกดปุ่มเดียวเพื่อเป็น Administrator —
  เลือกคนที่จะ login คนแรกให้ถูกคน** (ไม่มีบัญชีแอดมินที่สร้างไว้ล่วงหน้า — ตั้งใจออกแบบแบบนี้)
- แอดมินตั้งบทบาทให้พนักงานล่วงหน้าได้ที่ `/admin/users` → แท็บ "ตั้งล่วงหน้า (รอเข้าระบบ)"
  (ค้นจากฐาน HR — ไม่ได้สร้างบัญชี บทบาทถูกใส่ให้ตอนเจ้าตัว login ครั้งแรกด้วย SSO/AD)
- คนที่ login แล้วแต่ยังไม่มีบทบาท ดูได้ที่แท็บ "ยังไม่มีบทบาท" + ตัวเลขท้ายเมนู "ผู้ใช้งาน"
  (เมลแจ้งแอดมินจะมาเมื่อติดตั้งระบบอีเมลแล้ว)
- ผู้รับเหมาภายนอก (ไม่มีบัญชี AD) — แอดมินสร้างบัญชี local ที่ `/admin/users` → "เพิ่มผู้ใช้ local"
  ต้องใช้อีเมล **นอก** `ube.co.th` / `ube.com` · ลืมรหัสผ่าน = แอดมินกด "ตั้งรหัสผ่าน" ให้
  (ปุ่ม "ลืมรหัสผ่าน?" บนหน้า login ยังไม่มีจนกว่าจะลงระบบอีเมล)

## สำหรับนักพัฒนา — migration ครั้งแรก (SQL Server)

`User.LdapUsername` เป็น unique ที่ว่างได้ — SQL Server ยอมให้ NULL แถวเดียวต่อ unique
constraint ทำให้บัญชี local / SSO ใหม่คนที่สองพัง (`P2002` / `unable_to_create_user`)
ต้องเปลี่ยนเป็น filtered index ด้วยมือ:

```bash
npx prisma migrate dev --name auth-rbac --create-only
```

ใน `prisma/migrations/<timestamp>_auth_rbac/migration.sql`:

1. ลบบรรทัด `CONSTRAINT [User_LdapUsername_key] UNIQUE NONCLUSTERED ([LdapUsername])`
   ออกจาก `CREATE TABLE [dbo].[User]` (ระวัง comma ของบรรทัดก่อนหน้า)
2. ต่อท้ายไฟล์:

   ```sql
   -- ชื่อเดียวกับที่ Prisma ตั้ง — migrate diff ครั้งหน้าจะเจอ unique ที่คาดไว้และไม่สร้างซ้ำ
   CREATE UNIQUE NONCLUSTERED INDEX [User_LdapUsername_key]
     ON [dbo].[User]([LdapUsername]) WHERE [LdapUsername] IS NOT NULL;
   ```

```bash
npx prisma migrate dev
npx prisma generate
```

ทุกครั้งที่ `migrate dev` ต่อจากนี้ ถ้า diff เสนอให้ drop/สร้าง `User_LdapUsername_key` ใหม่ ให้ลบบรรทัดนั้นทิ้ง
