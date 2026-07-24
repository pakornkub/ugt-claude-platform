# Jenkins One-Time Setup (ทำครั้งเดียวต่อ server / ต่อ project)

สิ่งที่ต้องให้ admin เตรียมฝั่ง Jenkins ก่อน pipeline จะรันผ่าน แบ่งเป็น
**ระดับ server** (ครั้งเดียวต่อ Jenkins instance) และ **ระดับ project**
(ทำใหม่ทุก project)

---

## A. ระดับ server (ครั้งเดียว)

### A1. Plugins ที่ต้องติดตั้ง

Manage Jenkins → Plugins → Available:

| Plugin                   | ใช้กับ                                    |
| ------------------------ | ----------------------------------------- |
| NodeJS Plugin            | `tools { nodejs 'NodeJS-22' }`            |
| SonarQube Scanner        | `withSonarQubeEnv` + `waitForQualityGate` |
| OWASP Dependency-Check   | `dependencyCheck` + `dependencyCheckPublisher` |
| JUnit Plugin             | publish `test-results/junit.xml`          |
| HTML Publisher           | publish coverage HTML report              |
| Email Extension          | `emailext` (HTML email — `mail` ธรรมดาไม่รองรับ HTML) |
| Pipeline                 | Declarative Pipeline core                 |
| Git Plugin               | `checkout scm`                            |

### A2. Tools (ชื่อต้องตรงกับ Jenkinsfile เป๊ะ ๆ)

Manage Jenkins → Tools:

| Tool type         | Name (exact)        | Version   |
| ----------------- | ------------------- | --------- |
| NodeJS            | `NodeJS-22`         | Node 22.x |
| SonarQube Scanner | `SonarQube-Scanner` | Latest    |
| Dependency-Check  | `Dependency-Check`  | Latest (Install automatically) |

> ชื่อ tool ผิด capitalization = `sonar-scanner: command not found` /
> dependencyCheck step หา installation ไม่เจอ

### A3. SonarQube server config

Manage Jenkins → System → SonarQube servers → Add:

- Name: `SonarQube` (ต้องตรงกับ `withSonarQubeEnv('SonarQube')` ใน Jenkinsfile)
- Server URL: `http://<sonarqube-host>:9000`
- Server authentication token: credential ประเภท Secret Text ที่เก็บ
  **Global Analysis Token** ของ SonarQube (ดู `sonarqube-setup.md`)

### A4. Global environment variables

Manage Jenkins → System → Global properties → Environment variables:

| Variable       | ค่า                                      |
| -------------- | ---------------------------------------- |
| `NOTIFY_EMAIL` | ผู้รับ email แจ้งผล pipeline             |
| `SMTP_FROM`    | from address ของ email (ใช้ใน `emailext`) |

พร้อมตั้ง SMTP ที่ Manage Jenkins → System → Extended E-mail Notification

### A5. Docker บน Jenkins host — ⚠️ snap Docker gotcha

ถ้า Docker บน host ติดตั้งผ่าน **snap** (พบบน Ubuntu Core 24) การ bind-mount
`/usr/bin/docker` เข้า Jenkins container **ใช้ไม่ได้** — snap sandbox binary
ของตัวเอง ต้อง build custom Jenkins image ที่มี Docker CLI ในตัว:

```dockerfile
# jenkins/Dockerfile — build ครั้งเดียวบน Jenkins host
FROM jenkins/jenkins:lts

USER root
RUN apt-get update && \
    apt-get install -y docker.io && \
    rm -rf /var/lib/apt/lists/*

# CRITICAL: GID ของ group docker ใน container ต้องตรงกับของ HOST
# เช็คบน host: getent group docker | cut -d: -f3
RUN groupmod -g <host-docker-gid> docker && \
    usermod -aG docker jenkins

USER root
```

```bash
docker build -t jenkins-custom:latest ./jenkins/
docker run -d \
  --name jenkins \
  --restart unless-stopped \
  -p 8080:8080 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins-custom:latest
```

**ทำไมต้อง match GID:** `/var/run/docker.sock` บน host เป็นของ group `docker`
ที่มี GID เฉพาะ ถ้า GID ใน container ไม่ตรง → Docker CLI ได้
"permission denied" บน socket ทั้งที่ mount แล้ว

### A6. NVD data strategy (`--noupdate` ใน pipeline)

Jenkinsfile template รัน dependency-check ด้วย `--noupdate` = สแกนจาก
**NVD cache บนเครื่องเท่านั้น** ไม่ download update ระหว่าง pipeline
(เร็ว + กัน rate limit) — แปลว่าต้องมีข้อมูล NVD ในเครื่องอยู่ก่อน ไม่งั้น
first run บน Jenkins ใหม่ = สแกนกับ DB ว่างเปล่า (ผ่านหมดแบบหลอก ๆ)
เลือกอย่างใดอย่างหนึ่ง:

1. **แนะนำ:** สร้าง Jenkins job แยก (freestyle/pipeline, cron เช่น
   `H 2 * * *`) รัน `dependency-check --updateonly` (ใส่ NVD API key จาก
   credential `nvd` ผ่าน `--nvdApiKey`) — update cache ทุกคืน ให้ pipeline
   หลักใช้ `--noupdate` ได้ตลอด
2. หรือ **ลบ `--noupdate` ออกชั่วคราว** ใน first run เพื่อ download NVD
   เต็มชุด (⚠️ 60–90 นาที — timeout 90 นาทีใน stage เผื่อไว้แล้ว)
   เสร็จแล้วใส่กลับ

### A7. docker-compose v1 vs v2

Server บางเครื่องมีเฉพาะ **`docker-compose`** (v1 standalone) ไม่มี
`docker compose` (v2 plugin) — Jenkinsfile template ใช้ `docker-compose`
(v1) เป็นค่าตั้งต้น เช็คก่อนด้วย:

```bash
docker-compose version   # v1 standalone
docker compose version   # v2 plugin
```

ถ้ามีเฉพาะ v2 ให้แก้ Deploy stage เป็น `docker compose` (เว้นวรรค)

---

## B. ระดับ project (ทำใหม่ทุก project)

### B1. Credentials

Manage Jenkins → Credentials → (global) → Add Credentials:

| Credential ID               | Type        | ค่า                                                                                          |
| --------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `nvd`                       | Secret text | NVD API key (ขอฟรีที่ nvd.nist.gov) — ไม่มี = OWASP DC ช้ามาก (rate limit 5 req/30s)         |
| `env-__PROJECT_NAME__`      | Secret file | upload ไฟล์ `.env.production` — Deploy stage จะ `cp` เป็น `.env`                            |
| `env-__PROJECT_NAME__-dev`  | Secret file | upload `.env.development` — โครงเดียวกับ prod แต่ **DATABASE_URL แยก DB + auth secret ใหม่** |
| `sentry-dsn-__PROJECT_NAME__` | Secret text | ค่า `NEXT_PUBLIC_SENTRY_DSN` (ถ้า project ใช้ Sentry) — prod/dev ใช้ DSN เดียวกัน แยก environment ด้วย `SENTRY_ENVIRONMENT` runtime var |

> `nvd` เป็น credential ระดับ server ใช้ร่วมกันได้ทุก project —
> สร้างครั้งเดียวพอ

**ข้อห้ามเรื่อง secret ใน Jenkinsfile:** เวลาใช้ secret ใน `sh` ให้ shell
เป็นคน expand (`"$VAR"` ใน single-quoted Groovy string) — **ห้าม** interpolate
ผ่าน Groovy (`"${VAR}"` ใน double-quoted string) เพราะค่าจะโผล่ใน build log
และ Jenkins จะเตือน "secret passed via Groovy String interpolation"
ไฟล์ชั่วคราวที่มี secret (เช่น `dc-nvd.properties`) ต้องลบใน `post { always }`

### B2. Pipeline job config

- สร้าง job แบบ Pipeline (หรือ Multibranch Pipeline) ชี้ repo + branch
  `main` และ `develop`
- **ปิด "Lightweight checkout"** — Configure → Pipeline → SCM → uncheck
  ไม่งั้น Jenkins fetch เฉพาะ Jenkinsfile → stage อื่นเจอ workspace ไม่ครบ /
  pipeline รันโค้ดเก่า
- Branch detection ใน Jenkinsfile รองรับทั้งสองแบบอยู่แล้ว:
  `def br = (env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last())`
  (Multibranch ให้ `BRANCH_NAME` ตรง ๆ · Pipeline ธรรมดาให้ `GIT_BRANCH` =
  `origin/main` ต้อง strip prefix)

### B3. GitHub webhook

GitHub repo → Settings → Webhooks → Add webhook:

| Field        | ค่า                                             |
| ------------ | ----------------------------------------------- |
| Payload URL  | `http://<jenkins-host>:8080/github-webhook/`    |
| Content type | `application/json`                              |
| Events       | Just the push event                             |

ถ้า Jenkins อยู่ internal network ที่ GitHub เข้าไม่ถึง → ใช้
`pollSCM('H/5 * * * *')` ใน `triggers {}` แทน

### B4. Reverse proxy (nginx) สำหรับ dev environment

เพิ่ม `location` block บน Docker host ให้ dev container:

```nginx
location __BASE_PATH_DEV__ {
    proxy_pass http://127.0.0.1:__PORT_DEV__;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

---

## C. Pitfalls ที่เจอบ่อย

| อาการ                                            | สาเหตุ                                                       | แก้                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `docker: command not found` ใน Jenkins           | Docker CLI ไม่มีใน Jenkins container                         | custom image (ข้อ A5)                                                           |
| `permission denied /var/run/docker.sock`         | GID group docker ไม่ตรง host                                 | `groupmod -g <host-gid> docker` ใน custom image                                 |
| `waitForQualityGate` ค้างไม่จบ                   | SonarQube webhook ไม่ได้ตั้ง                                 | SonarQube → Administration → Webhooks → `http://<jenkins-host>:8080/sonarqube-webhook/` |
| Quality Gate ผ่านตลอดทั้งที่มี issue             | `sonar.sources` path ผิด                                     | เช็ค path relative จาก workspace root                                           |
| OWASP DC ช้ามาก (ชั่วโมง+)                       | ไม่มี NVD API key / first run                                | สร้าง credential `nvd` · first run ยอมรอ (cache แล้วรอบถัดไป ~5 นาที)          |
| CVE ที่ suppress แล้วยัง fail build              | ใช้ grep XML ดิบ (จับ `<suppressedVulnerabilities>` ด้วย)    | ใช้ `dependencyCheckPublisher` เท่านั้น — นับเฉพาะ CVE ที่ไม่ถูก suppress       |
| Jenkinsfile ไม่อัปเดต / pipeline รันโค้ดเก่า     | Lightweight checkout เปิดอยู่                                | ปิดตาม B2                                                                       |
| `cleanWs` ลบไฟล์กลางคัน                          | วางไว้ใน stage                                               | วางเฉพาะ `post { always {} }` ระดับ pipeline                                    |
