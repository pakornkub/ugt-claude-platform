# คำขอตั้งค่าระบบ — __PROJECT_DISPLAY_NAME__ (`__PROJECT_NAME__`)

> **เอกสารส่งต่อทีม Admin / DevOps** · สร้างอัตโนมัติเมื่อ __DATE__
> ผู้ขอ: __REQUESTER__ · โปรเจค: __REPO_URL__
> ทำเสร็จแล้วกรุณา**กรอกหัวข้อสุดท้าย "ค่าที่ต้องส่งกลับ" แล้วส่งไฟล์นี้คืน**ทีมพัฒนา
>
> ชื่อทุกตัวในเอกสารนี้ถูก generate ให้ตรงกับค่าที่ตั้งไว้ในโปรเจคแล้ว —
> **กรุณาใช้ชื่อตามนี้เป๊ะ ๆ** (ต่างแม้ตัวเดียว pipeline/login จะไม่ทำงาน)

## ภาพรวม 1 นาที — ต้องทำอะไรบ้าง

| # | ระบบ | งาน | ใช้เวลาโดยประมาณ |
| --- | --- | --- | --- |
| 1 | Jenkins | สร้าง credentials __N_CREDS__ ตัว + pipeline job + webhook | ~15 นาที |
| 2 | SonarQube | สร้าง 2 projects + ผูก Quality Gate + webhook | ~10 นาที |
| 3 | Keycloak | สร้าง client 1 ตัว (SSO) | ~10 นาที |

<!-- ลบแถว/หัวข้อของระบบที่โปรเจคนี้ไม่ใช้ออกทั้งหัวข้อ — อย่าปล่อยค้างไว้ -->
<!-- ถ้า Jenkins server นี้เคยตั้งโปรเจคอื่นแล้ว งานระดับ server (plugins, tools,
     nvd credential, NOTIFY_EMAIL) ทำไปแล้ว — ทำเฉพาะระดับโปรเจคด้านล่าง
     ถ้าเป็นโปรเจคแรกของ server ดูภาคผนวกท้ายไฟล์ -->

---

## 1. Jenkins

### 1.1 สร้าง Credentials (Manage Jenkins → Credentials → Global)

| ชื่อ credential (ID) | ชนิด | ใส่อะไร |
| --- | --- | --- |
| `env-__PROJECT_NAME__` | **Secret file** | ไฟล์ `.env` ของ **prod** (ทีมพัฒนาแนบให้ / นัดส่งช่องทางปลอดภัย) |
| `env-__PROJECT_NAME__-dev` | **Secret file** | ไฟล์ `.env` ของ **dev** — ห้ามใช้ไฟล์เดียวกับ prod (คนละ DATABASE_URL คนละ secret) |
| `sentry-dsn-__PROJECT_NAME__` | **Secret text** | Sentry DSN <!-- ลบแถวนี้ถ้าโปรเจคไม่ใช้ Sentry --> |

### 1.2 สร้าง Pipeline job

1. New Item → ชื่อ `__PROJECT_NAME__` → เลือก **Multibranch Pipeline**
2. Branch Sources → GitHub → repo `__REPO_URL__` → discover branches `main` และ `develop`
3. **สำคัญ**: ปิด "Lightweight checkout" (ถ้าเปิดไว้ stage แรกจะพัง)

### 1.3 ตั้ง Webhook ที่ GitHub repo

- Settings → Webhooks → Add: URL `http://__JENKINS_HOST__:8080/github-webhook/` · event: **push เท่านั้น**

<!-- ถ้าโปรเจคใช้ basePath: -->
### 1.4 Reverse proxy (dev)

เพิ่ม location block ใน nginx ของเครื่อง dev:

```nginx
location __BASE_PATH_DEV__ { proxy_pass http://127.0.0.1:__PORT_DEV__; proxy_set_header Host $host; }
```

`__PORT_DEV__` ด้านบนเป็นแค่ค่า default ที่เสนอไป (`3000`/`3001`) — ถ้า port จริงที่จัดสรรให้ต่างไป ใช้ค่าจริงแทน และแจ้งกลับตามหัวข้อ "ค่าที่ต้องส่งกลับ" ท้ายเอกสาร

---

## 2. SonarQube

### 2.1 สร้าง Projects (Administration → Projects → Create)

| Project Key | Display name |
| --- | --- |
| `__PROJECT_NAME__` | __PROJECT_DISPLAY_NAME__ |
| `__PROJECT_NAME__-dev` | __PROJECT_DISPLAY_NAME__ (Dev) |

### 2.2 ผูก Quality Gate

- ใช้ gate มาตรฐานองค์กร (ถ้ายังไม่มี ดูภาคผนวก) → assign ให้**ทั้งสอง** projects ข้างบน

### 2.3 Webhook กลับไป Jenkins (Administration → Configuration → Webhooks)

- URL: `http://__JENKINS_HOST__:8080/sonarqube-webhook/`
- **ถ้าไม่ตั้งข้อนี้ pipeline จะค้างตลอดไป** ที่ขั้นรอผล Quality Gate

---

## 3. Keycloak (SSO)

สร้าง client ใหม่ใน realm กลางขององค์กร (**1 client ต่อ 1 โปรเจค** — ห้ามใช้ร่วมกับโปรเจคอื่น):

| การตั้งค่า | ค่า |
| --- | --- |
| Client type | OpenID Connect |
| Client ID | `__PROJECT_NAME__` |
| Client authentication | **On** (confidential) |
| Standard flow (Authorization Code) | **On** |
| Direct access grants / Implicit / Service accounts | **Off ทั้งหมด** |
| PKCE (Advanced → Proof Key for Code Exchange) | **S256** |
| Web origins | `+` |

**Valid redirect URIs — ลงทะเบียนให้ตรงทุกตัวอักษร:**

```
__APP_URL_DEV__/api/auth/oauth2/callback/keycloak
__APP_URL_PROD__/api/auth/oauth2/callback/keycloak
```

(ไม่ต้องตั้ง post-logout redirect — ระบบ logout ผ่านหลังบ้าน)

<!-- [AUTH] — ลบ section นี้เมื่อโปรเจคไม่ได้ติดตั้ง ugt-nextjs-auth-setup -->

<!-- [AUTH: SSO or LDAP] — ลบ section นี้เมื่อโปรเจคเป็น local-only (ไม่ได้
     เลือก SSO หรือ LDAP ตอน interview) -->
## 4. TLS ภายในองค์กร (เฉพาะ SSO/LDAP)

ถ้า Keycloak หรือ LDAP server ขององค์กรใช้ certificate ที่เซ็นโดย **internal
CA** (ไม่ใช่ public CA อย่าง Let's Encrypt) container ของแอปจะ verify
certificate นี้ไม่ผ่านเอง (SSO ขึ้น "Invalid OAuth configuration" หรือ LDAP
bind ล้มเหลว) — Node.js มี CA store ของตัวเอง ไม่ได้ใช้ของเครื่อง host

**เลือกทางใดทางหนึ่ง แล้วแจ้งกลับทีมพัฒนา (หัวข้อ "ค่าที่ต้องส่งกลับ" ด้านล่าง):**

| ทาง | เมื่อไหร่ควรใช้ | Admin ต้องทำอะไร |
| --- | --- | --- |
| **แนบไฟล์ CA cert** (แนะนำ) | ทุกกรณี โดยเฉพาะถ้า server มีทางออกอินเทอร์เน็ตบ้าง | ส่งไฟล์ certificate ของ internal CA (`.pem`/`.crt`) ให้ทีมพัฒนา |
| **ยืนยัน closed intranet** | เฉพาะ server ที่**ไม่มีทางออกอินเทอร์เน็ตเลย** (ตัดขาดจริง ไม่ใช่แค่ผ่าน proxy) | ยืนยันเป็นลายลักษณ์อักษรว่า server นี้เป็น closed intranet |

⚠️ ทางที่สองปิด TLS verification ของ container **ทั้งตัว** ไม่ใช่แค่ต่อ
Keycloak/LDAP — ถ้า server มีทางออกอินเทอร์เน็ตแม้แต่ทางเดียว (เช่น Windows
Update, npm registry) ห้ามใช้ทางนี้ ทีมพัฒนาจะตั้งค่าที่เลือกไว้ตรงใน
`docker-compose.yml` ของ server นี้เอง (ไม่ใช่ Jenkins Secret File — เป็นการ
ตัดสินใจของ infra ไม่ใช่ secret)

## ผู้ดูแลระบบคนแรก

ระบบ**ไม่มีบัญชี admin ที่ seed ไว้ล่วงหน้า** (บัญชี SSO/AD เกิดเองตอน login
ครั้งแรก จึง seed ล่วงหน้าไม่ได้) — **คนแรกที่ login จะถูกพาไปหน้า
`/admin/setup` และกดปุ่มเดียวเพื่อเป็น Administrator**
เลือกคนที่จะ login คนแรกให้ถูกคน แล้วคนนั้นค่อยกำหนดบทบาทให้คนอื่นจากหน้า
`/admin/users`

---

## ✅ ค่าที่ต้องส่งกลับให้ทีมพัฒนา (กรอกแล้วส่งไฟล์นี้คืน)

| ค่า | มาจากไหน | กรอกตรงนี้ |
| --- | --- | --- |
| **→ `APP_PORT` (prod)** | Host port ที่จัดสรรให้บน server จริง | **จำเป็น — ทีมพัฒนาใช้ `3000` เป็นค่า placeholder ไว้ก่อน จนกว่าจะได้ค่านี้** |
| **→ `APP_PORT` (dev)** | Host port ที่จัดสรรให้บน server dev | **จำเป็น — ทีมพัฒนาใช้ `3001` เป็นค่า placeholder ไว้ก่อน จนกว่าจะได้ค่านี้** |
| `KEYCLOAK_ISSUER` | `https://<keycloak-host>/realms/<realm>` (ตรวจว่าเปิด `<issuer>/.well-known/openid-configuration` ได้) | |
| `KEYCLOAK_CLIENT_SECRET` | Keycloak → client `__PROJECT_NAME__` → Credentials | **ส่งช่องทางปลอดภัย อย่ากรอกในไฟล์นี้** |
| TLS ภายในองค์กร (ดูหัวข้อ 4) | ไฟล์ CA cert หรือคำยืนยัน closed intranet | **จำเป็นถ้าใช้ SSO/LDAP — เลือกทางใดทางหนึ่ง** |
| ยืนยัน Jenkins job สร้างแล้ว | ลิงก์ job | |
| ยืนยัน SonarQube projects + webhook แล้ว | ลิงก์ project | |

## เช็คก่อนปิดงาน (ฝั่ง Admin)

- [ ] ชื่อทุกตัวตรงกับตารางเป๊ะ (โดยเฉพาะ credential ID และ Client ID)
- [ ] redirect URI ตรงทุกตัวอักษรรวม path
- [ ] webhook ทั้งสองฝั่ง (GitHub→Jenkins, SonarQube→Jenkins) ตั้งแล้ว
- [ ] กรอก "ค่าที่ต้องส่งกลับ" + ส่ง secret ช่องทางปลอดภัยแล้ว
- [ ] `APP_PORT` (prod/dev) ส่งกลับแล้ว ไม่ใช่แค่ placeholder `3000`/`3001`
- [ ] TLS ภายในองค์กร (SSO/LDAP): ส่งไฟล์ CA cert แล้ว หรือยืนยัน closed intranet แล้ว

---

<!-- ภาคผนวก: ใส่เฉพาะเมื่อเป็นโปรเจคแรกบน server (server-level setup) —
     ถ้าไม่ใช่ ลบทิ้ง · เนื้อหาสรุปจาก jenkins-one-time-setup.md §A + sonarqube-setup.md:
     plugins ที่ต้องลง, tool names NodeJS-22/SonarQube-Scanner/Dependency-Check,
     credential nvd, global NOTIFY_EMAIL/SMTP_FROM, การสร้าง org Quality Gate,
     สร้าง `/home/docker02/appdata` ครั้งเดียว (ครั้งแรกของ server):
     `sudo mkdir -p /home/docker02/appdata && sudo chown jenkins:jenkins /home/docker02/appdata` —
     โปรเจคย่อยข้างใน Deploy stage สร้างเอง -->
