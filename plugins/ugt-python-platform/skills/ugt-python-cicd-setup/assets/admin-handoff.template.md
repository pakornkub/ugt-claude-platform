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
| **→ `APP_PORT` (prod)** | Host port ที่จัดสรรให้บน server จริง | **จำเป็น — ทีมพัฒนาใช้ `3000` เป็นค่า placeholder ไว้ก่อน จนกว่าจะได้ค่านี้** |
| **→ `APP_PORT` (dev)** | Host port ที่จัดสรรให้บน server dev | **จำเป็น — ทีมพัฒนาใช้ `3001` เป็นค่า placeholder ไว้ก่อน จนกว่าจะได้ค่านี้** |
| ยืนยัน Jenkins job สร้างแล้ว | ลิงก์ job | |
| ยืนยัน SonarQube projects + webhook แล้ว | ลิงก์ project | |

## เช็คก่อนปิดงาน (ฝั่ง Admin)

- [ ] ชื่อทุกตัวตรงกับตารางเป๊ะ (โดยเฉพาะ credential ID)
- [ ] webhook ทั้งสองฝั่ง (GitHub→Jenkins, SonarQube→Jenkins) ตั้งแล้ว
- [ ] กรอก "ค่าที่ต้องส่งกลับ" + ส่ง secret ช่องทางปลอดภัยแล้ว
- [ ] `APP_PORT` (prod/dev) ส่งกลับแล้ว ไม่ใช่แค่ placeholder `3000`/`3001`
- [ ] `/srv/appdata` เตรียมไว้แล้ว (ดูภาคผนวกถ้ายังไม่เคยทำ) — ต้องเขียนได้ก่อน Deploy stage รันครั้งแรก
- [ ] Jenkins user อยู่ใน `docker` group แล้ว (ดูภาคผนวกถ้ายังไม่เคยทำ) — ไม่งั้นทุก stage ที่ใช้ `docker.image().inside` จะพัง

---

<!-- ภาคผนวก: ใส่เฉพาะเมื่อเป็นโปรเจคแรกบน server (server-level setup) —
     ถ้าไม่ใช่ ลบทิ้ง · เนื้อหาสรุปจาก jenkins-one-time-setup.md §A + sonarqube-setup.md:
     plugins ที่ต้องลง, tool names SonarQube-Scanner/Dependency-Check,
     credential nvd, global NOTIFY_EMAIL/SMTP_FROM, การสร้าง org Quality Gate,

     (ก) สร้าง `/srv/appdata` ครั้งเดียว (ครั้งแรกของ server):
     `sudo mkdir -p /srv/appdata && sudo chown jenkins:jenkins /srv/appdata` —
     โปรเจคย่อยข้างใน Deploy stage สร้างเอง

     (ข) Jenkins user อยู่ใน docker group (stage รันใน docker.image().inside) —
     `sudo usermod -aG docker jenkins` แล้ว restart Jenkins service ให้ group
     มีผล ไม่งั้นทุก stage ที่เรียก docker.image().inside จะ fail ด้วย permission
     denied ต่อ /var/run/docker.sock -->
