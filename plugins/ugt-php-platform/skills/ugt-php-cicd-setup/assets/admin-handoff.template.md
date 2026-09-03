# คำขอตั้งค่าระบบ — __PROJECT_DISPLAY_NAME__ (`__PROJECT_NAME__`)

> **เอกสารส่งต่อทีม Admin / DevOps** · สร้างอัตโนมัติเมื่อ __DATE__
> ผู้ขอ: __REQUESTER__ · โปรเจค: __REPO_URL__
> ทำเสร็จแล้วกรุณา**กรอกหัวข้อสุดท้าย "ค่าที่ต้องส่งกลับ" แล้วส่งไฟล์นี้คืน**ทีมพัฒนา
>
> ชื่อทุกตัวในเอกสารนี้ถูก generate ให้ตรงกับค่าที่ตั้งไว้ในโปรเจคแล้ว —
> **กรุณาใช้ชื่อตามนี้เป๊ะ ๆ** (ต่างแม้ตัวเดียว pipeline จะไม่ทำงาน)

## ภาพรวม 1 นาที — ต้องทำอะไรบ้าง

| # | ระบบ | งาน | ใช้เวลาโดยประมาณ |
| --- | --- | --- | --- |
| 1 | Jenkins | สร้าง credentials __N_CREDS__ ตัว + pipeline job + webhook | ~15 นาที |
| 2 | SonarQube | สร้าง 2 projects + ผูก Quality Gate + webhook | ~10 นาที |

<!-- ลบแถว/หัวข้อของระบบที่โปรเจคนี้ไม่ใช้ออกทั้งหัวข้อ — อย่าปล่อยค้างไว้ -->
<!-- ถ้า Jenkins server นี้เคยตั้งโปรเจคอื่นแล้ว งานระดับ server (plugins, tools,
     nvd credential, NOTIFY_EMAIL, docker group) ทำไปแล้ว — ทำเฉพาะระดับโปรเจคด้านล่าง
     ถ้าเป็นโปรเจคแรกของ server ดูภาคผนวกท้ายไฟล์ -->

---

## 1. Jenkins

### 1.1 สร้าง Credentials (Manage Jenkins → Credentials → Global)

| ชื่อ credential (ID) | ชนิด | ใส่อะไร |
| --- | --- | --- |
| `env-__PROJECT_NAME__` | **Secret file** | ไฟล์ `.env` ของ **prod** (ทีมพัฒนาแนบให้ / นัดส่งช่องทางปลอดภัย) |
| `env-__PROJECT_NAME__-dev` | **Secret file** | ไฟล์ `.env` ของ **dev** — ห้ามใช้ไฟล์เดียวกับ prod (คนละ DATABASE_URL คนละ secret) |

### 1.2 สร้าง Pipeline job

1. New Item → ชื่อ `__PROJECT_NAME__` → เลือก **Multibranch Pipeline**
2. Branch Sources → GitHub → repo `__REPO_URL__` → discover branches `main` และ `develop`
3. **สำคัญ**: ปิด "Lightweight checkout" (ถ้าเปิดไว้ stage แรกจะพัง)

### 1.3 ตั้ง Webhook ที่ GitHub repo

- Settings → Webhooks → Add: URL `http://__JENKINS_HOST__:8080/github-webhook/` · event: **push เท่านั้น**

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

## ✅ ค่าที่ต้องส่งกลับให้ทีมพัฒนา (กรอกแล้วส่งไฟล์นี้คืน)

| ค่า | มาจากไหน | กรอกตรงนี้ |
| --- | --- | --- |
| **→ `APP_PORT` (prod)** | Host port ที่จัดสรรให้บน server จริง | **จำเป็น — ทีมพัฒนาใช้ `8081` เป็นค่า placeholder ไว้ก่อน จนกว่าจะได้ค่านี้** (เลี่ยง `8080` ที่ชนกับ Jenkins เองบน host) |
| **→ `APP_PORT` (dev)** | Host port ที่จัดสรรให้บน server dev | **จำเป็น — ทีมพัฒนาใช้ `8082` เป็นค่า placeholder ไว้ก่อน จนกว่าจะได้ค่านี้** (ต้องคนละพอร์ตกับ prod — สอง container อยู่บน host เดียวกันได้) |
| ยืนยัน Jenkins job สร้างแล้ว | ลิงก์ job | |
| ยืนยัน SonarQube projects + webhook แล้ว | ลิงก์ project | |

## เช็คก่อนปิดงาน (ฝั่ง Admin)

- [ ] ชื่อทุกตัวตรงกับตารางเป๊ะ (โดยเฉพาะ credential ID)
- [ ] webhook ทั้งสองฝั่ง (GitHub→Jenkins, SonarQube→Jenkins) ตั้งแล้ว
- [ ] กรอก "ค่าที่ต้องส่งกลับ" + ส่ง secret ช่องทางปลอดภัยแล้ว
- [ ] `APP_PORT` (prod/dev) ส่งกลับแล้ว ไม่ใช่แค่ placeholder `8081`/`8082`
- [ ] `/home/docker02/appdata` เตรียมไว้แล้ว (ดูภาคผนวกถ้ายังไม่เคยทำ) — ต้องเขียนได้ก่อน Deploy stage รันครั้งแรก
- [ ] Jenkins user อยู่ใน `docker` group แล้ว (ดูภาคผนวกถ้ายังไม่เคยทำ) — ไม่งั้นทุก stage ที่ใช้ `docker.image().inside` จะพัง
- [ ] **ปลั๊กอิน Docker Pipeline (`docker-workflow`) ติดตั้งแล้ว** — คนละเรื่องกับ `docker` group ข้างบน ถ้าขาดตัวนี้ pipeline ตายตั้งแต่ stage แรก (ดูภาคผนวก)
- [ ] Docker network `proxy-network` สร้างแล้วบน host (compose ทั้งสองไฟล์ประกาศเป็น `external: true`)
- [ ] **คอนเทนเนอร์ต่อถึง DB ได้** — ไม่ใช่แค่ตัว host ต่อได้ · คอนเทนเนอร์ใช้ DNS ของ Docker จึงมัก resolve ชื่อสั้น (`SQLSRV01`) ไม่ได้ · ถ้าเป็นแบบนั้นกรุณาแจ้ง **FQDN หรือ IP ของ DB** กลับมาให้ทีมพัฒนา (หรือ IP ของ DNS server องค์กร)
- [ ] host มี `docker compose` (v2, ไม่มีขีด) — เช็คด้วย `docker compose version` · Jenkinsfile ที่ส่งมาเรียก v2 ซึ่งเป็นค่ามาตรฐาน **ถ้า host มีแต่ `docker-compose` (v1) ตัวเก่า กรุณาแจ้งทีมพัฒนา** ให้แก้สเตจ Deploy หนึ่งบรรทัด (v1 EOL ตั้งแต่กลางปี 2023)

---

<!-- ภาคผนวก: ใส่เฉพาะเมื่อเป็นโปรเจคแรกบน server (server-level setup) —
     ถ้าไม่ใช่ ลบทั้งหัวข้อทิ้งได้เลย -->

## ภาคผนวก — Server-level setup (ทำครั้งเดียวต่อ server)

ข้ามทั้งหัวข้อได้ถ้า Jenkins/SonarQube server นี้เคยตั้งโปรเจคที่ใช้มาตรฐาน
เดียวกันมาก่อนแล้ว

### ก. ปลั๊กอิน Jenkins ที่ต้องมี

Manage Jenkins → Plugins → Available:

| Plugin | ใช้ทำอะไรใน pipeline |
| --- | --- |
| **Docker Pipeline** (`docker-workflow`) | ให้ global variable `docker` — สเตจ PHP ทุกตัวรันใน `docker.image('<project>-ci').inside{}` |
| SonarQube Scanner | `withSonarQubeEnv` + `waitForQualityGate` |
| OWASP Dependency-Check | `dependencyCheck` + `dependencyCheckPublisher` |
| JUnit | publish `test-results/junit.xml` |
| HTML Publisher | publish coverage HTML |
| Email Extension | `emailext` (เมล HTML — `mail` ธรรมดาไม่รองรับ) |
| Pipeline · Git | Declarative Pipeline core + `checkout scm` |

> ⚠️ **Docker Pipeline เป็นข้อที่พลาดกันบ่อยที่สุด** — ขาดตัวนี้แล้ว pipeline ตาย
> ตั้งแต่สเตจ Install ด้วย `groovy.lang.MissingPropertyException: No such
> property: docker` ซึ่งอ่านไม่ออกเลยว่าแปลว่า "ไม่ได้ลงปลั๊กอิน" (ยืนยันจาก
> โปรเจค pilot 2026-08) · **คนละเรื่องกับการมี Docker CLI บนเครื่อง** — `sh
> 'docker …'` ใช้ CLI ได้อยู่แล้วโดยไม่ต้องมีปลั๊กอิน แต่ syntax
> `docker.image().inside{}` พึ่งปลั๊กอินตัวนี้โดยเฉพาะ
> เช็คว่าลงแล้วหรือยัง: Manage Jenkins → Plugins → Installed → ค้นหา "Docker Pipeline"

### ข. Tools (ชื่อต้องตรงเป๊ะ — Jenkinsfile อ้างชื่อตรง ๆ)

Manage Jenkins → Tools: `SonarQube-Scanner` · `Dependency-Check` (Install automatically)
Manage Jenkins → System → SonarQube servers: เพิ่ม server ชื่อ `SonarQube` พร้อม token

> ชื่อผิดตัวพิมพ์เดียว = `sonar-scanner: command not found` หรือ `dependencyCheck`
> หา installation ไม่เจอ · **ไม่ต้องตั้ง Global Tool ของ PHP/composer** — สเตจ
> ทั้งหมดรันใน CI image ที่ build จาก `Dockerfile.ci` เอง และ Jenkinsfile ใช้
> `agent any` ไม่ต้องมี node label พิเศษ

### ค. Credential ระดับ server

| ID | ชนิด | ใส่อะไร |
| --- | --- | --- |
| `nvd` | Secret text | NVD API key (ฟรีที่ nvd.nist.gov) — ใช้ร่วมกันทุกโปรเจคบน server นี้ ไม่มีแล้ว OWASP DC ช้ามาก (rate limit 5 req/30s) |

### ง. Global environment variables

Manage Jenkins → System → Global properties: `NOTIFY_EMAIL`, `SMTP_FROM`
แล้วตั้ง SMTP ที่ Manage Jenkins → System → Extended E-mail Notification

### จ. Docker group ของ Jenkins user

```bash
sudo usermod -aG docker jenkins
```

แล้ว **restart Jenkins service** ให้ group มีผล — ไม่งั้นทุกสเตจที่เรียก
`docker.image().inside` จะ fail ด้วย permission denied ต่อ `/var/run/docker.sock`

### ฉ. Docker network สำหรับ reverse proxy

```bash
docker network create proxy-network
```

compose ทั้ง prod และ dev ประกาศ `proxy-network` เป็น `external: true` —
ไม่มี network นี้ `docker compose up` จะ fail ทันทีตอน Deploy

### ช. `/home/docker02/appdata` (ข้อมูลถาวร)

```bash
sudo mkdir -p /home/docker02/appdata && sudo chown jenkins:jenkins /home/docker02/appdata
```

โฟลเดอร์ย่อยรายโปรเจคสร้างเองในสเตจ Deploy

### ซ. NVD data strategy (`--noupdate` ใน pipeline)

Jenkinsfile รัน dependency-check ด้วย `--noupdate` = สแกนกับ local NVD cache
เท่านั้น ไม่โหลดกลาง pipeline — แปลว่า **ต้องมีข้อมูล NVD บนเครื่องอยู่ก่อน**
ไม่งั้นรอบแรกบน Jenkins ใหม่จะสแกนกับ DB ว่าง (ผ่านหมดแบบหลอก ๆ) เลือกทางใดทางหนึ่ง:

1. **แนะนำ** — สร้าง job แยก (cron เช่น `H 2 * * *`) รัน
   `dependency-check --updateonly` พร้อม `--nvdApiKey` จาก credential `nvd`
   แล้ว pipeline หลักคง `--noupdate` ไว้ตลอดไป
2. หรือ **ถอด `--noupdate` ชั่วคราว** สำหรับรอบแรกเพื่อโหลด NVD ทั้งชุด
   (⚠️ 60–90 นาที — timeout 90 นาทีของสเตจเผื่อไว้แล้ว) แล้วใส่กลับ

### ฌ. SonarQube Quality Gate มาตรฐานองค์กร (ถ้ายังไม่มี)

สร้าง Quality Gate ที่มีเงื่อนไข `new_violations = 0` ·
`new_duplicated_lines_density ≤ 3%` · `new_coverage ≥ 60%` ·
`new_security_hotspots_reviewed = 100%` แล้ว assign ให้ทุกโปรเจคใหม่
