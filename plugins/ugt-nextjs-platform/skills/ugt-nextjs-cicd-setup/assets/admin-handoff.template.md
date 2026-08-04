# คำขอตั้งค่าระบบ — {{PROJECT_DISPLAY_NAME}} (`{{PROJECT_NAME}}`)

> **เอกสารส่งต่อทีม Admin / DevOps** · สร้างอัตโนมัติเมื่อ {{DATE}}
> ผู้ขอ: {{REQUESTER}} · โปรเจค: {{REPO_URL}}
> ทำเสร็จแล้วกรุณา**กรอกหัวข้อสุดท้าย "ค่าที่ต้องส่งกลับ" แล้วส่งไฟล์นี้คืน**ทีมพัฒนา
>
> ชื่อทุกตัวในเอกสารนี้ถูก generate ให้ตรงกับค่าที่ตั้งไว้ในโปรเจคแล้ว —
> **กรุณาใช้ชื่อตามนี้เป๊ะ ๆ** (ต่างแม้ตัวเดียว pipeline/login จะไม่ทำงาน)

## ภาพรวม 1 นาที — ต้องทำอะไรบ้าง

| # | ระบบ | งาน | ใช้เวลาโดยประมาณ |
| --- | --- | --- | --- |
| 1 | Jenkins | สร้าง credentials {{N_CREDS}} ตัว + pipeline job + webhook | ~15 นาที |
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
| `env-{{PROJECT_NAME}}` | **Secret file** | ไฟล์ `.env` ของ **prod** (ทีมพัฒนาแนบให้ / นัดส่งช่องทางปลอดภัย) |
| `env-{{PROJECT_NAME}}-dev` | **Secret file** | ไฟล์ `.env` ของ **dev** — ห้ามใช้ไฟล์เดียวกับ prod (คนละ DATABASE_URL คนละ secret) |
| `sentry-dsn-{{PROJECT_NAME}}` | **Secret text** | Sentry DSN <!-- ลบแถวนี้ถ้าโปรเจคไม่ใช้ Sentry --> |

### 1.2 สร้าง Pipeline job

1. New Item → ชื่อ `{{PROJECT_NAME}}` → เลือก **Multibranch Pipeline**
2. Branch Sources → GitHub → repo `{{REPO_URL}}` → discover branches `main` และ `develop`
3. **สำคัญ**: ปิด "Lightweight checkout" (ถ้าเปิดไว้ stage แรกจะพัง)

### 1.3 ตั้ง Webhook ที่ GitHub repo

- Settings → Webhooks → Add: URL `http://{{JENKINS_HOST}}:8080/github-webhook/` · event: **push เท่านั้น**

<!-- ถ้าโปรเจคใช้ basePath: -->
### 1.4 Reverse proxy (dev)

เพิ่ม location block ใน nginx ของเครื่อง dev:

```nginx
location {{BASE_PATH_DEV}} { proxy_pass http://127.0.0.1:{{PORT_DEV}}; proxy_set_header Host $host; }
```

---

## 2. SonarQube

### 2.1 สร้าง Projects (Administration → Projects → Create)

| Project Key | Display name |
| --- | --- |
| `{{PROJECT_NAME}}` | {{PROJECT_DISPLAY_NAME}} |
| `{{PROJECT_NAME}}-dev` | {{PROJECT_DISPLAY_NAME}} (Dev) |

### 2.2 ผูก Quality Gate

- ใช้ gate มาตรฐานองค์กร (ถ้ายังไม่มี ดูภาคผนวก) → assign ให้**ทั้งสอง** projects ข้างบน

### 2.3 Webhook กลับไป Jenkins (Administration → Configuration → Webhooks)

- URL: `http://{{JENKINS_HOST}}:8080/sonarqube-webhook/`
- **ถ้าไม่ตั้งข้อนี้ pipeline จะค้างตลอดไป** ที่ขั้นรอผล Quality Gate

---

## 3. Keycloak (SSO)

สร้าง client ใหม่ใน realm กลางขององค์กร (**1 client ต่อ 1 โปรเจค** — ห้ามใช้ร่วมกับโปรเจคอื่น):

| การตั้งค่า | ค่า |
| --- | --- |
| Client type | OpenID Connect |
| Client ID | `{{PROJECT_NAME}}` |
| Client authentication | **On** (confidential) |
| Standard flow (Authorization Code) | **On** |
| Direct access grants / Implicit / Service accounts | **Off ทั้งหมด** |
| PKCE (Advanced → Proof Key for Code Exchange) | **S256** |
| Web origins | `+` |

**Valid redirect URIs — ลงทะเบียนให้ตรงทุกตัวอักษร:**

```
{{APP_URL_DEV}}/api/auth/oauth2/callback/keycloak
{{APP_URL_PROD}}/api/auth/oauth2/callback/keycloak
```

(ไม่ต้องตั้ง post-logout redirect — ระบบ logout ผ่านหลังบ้าน)

---

## ✅ ค่าที่ต้องส่งกลับให้ทีมพัฒนา (กรอกแล้วส่งไฟล์นี้คืน)

| ค่า | มาจากไหน | กรอกตรงนี้ |
| --- | --- | --- |
| `KEYCLOAK_ISSUER` | `https://<keycloak-host>/realms/<realm>` (ตรวจว่าเปิด `<issuer>/.well-known/openid-configuration` ได้) | |
| `KEYCLOAK_CLIENT_SECRET` | Keycloak → client `{{PROJECT_NAME}}` → Credentials | **ส่งช่องทางปลอดภัย อย่ากรอกในไฟล์นี้** |
| ยืนยัน Jenkins job สร้างแล้ว | ลิงก์ job | |
| ยืนยัน SonarQube projects + webhook แล้ว | ลิงก์ project | |

## เช็คก่อนปิดงาน (ฝั่ง Admin)

- [ ] ชื่อทุกตัวตรงกับตารางเป๊ะ (โดยเฉพาะ credential ID และ Client ID)
- [ ] redirect URI ตรงทุกตัวอักษรรวม path
- [ ] webhook ทั้งสองฝั่ง (GitHub→Jenkins, SonarQube→Jenkins) ตั้งแล้ว
- [ ] กรอก "ค่าที่ต้องส่งกลับ" + ส่ง secret ช่องทางปลอดภัยแล้ว

---

<!-- ภาคผนวก: ใส่เฉพาะเมื่อเป็นโปรเจคแรกบน server (server-level setup) —
     ถ้าไม่ใช่ ลบทิ้ง · เนื้อหาสรุปจาก jenkins-one-time-setup.md §A + sonarqube-setup.md:
     plugins ที่ต้องลง, tool names NodeJS-22/SonarQube-Scanner/Dependency-Check,
     credential nvd, global NOTIFY_EMAIL/SMTP_FROM, การสร้าง org Quality Gate -->
