# ugt-python-platform + ugt-php-platform (cicd) + Volume Standard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้าง plugin `ugt-python-platform` และ `ugt-php-platform` (skill ละ 1 ตัว: cicd/deploy) ตาม pattern ของ `ugt-nextjs-platform` พร้อมเพิ่มมาตรฐาน volume กลางใน contract และอัปเดตฝั่ง Next.js ให้สอดคล้อง

**Architecture:** ตาม spec [2026-08-11-python-php-deploy-plugins-design.md](../specs/2026-08-11-python-php-deploy-plugins-design.md) — contract กลางล็อก 10 stages, stack swap เฉพาะคำสั่งใน stage; toolchain ทุกภาษารันใน docker (`docker.image(...).inside`) ไม่แตะ Jenkins Global Tools; skill เป็น self-contained (restate contract ใน SKILL.md ตัวเอง แล้วให้ `scripts/check-contract-drift.mjs` กันเพี้ยน)

**Tech Stack:** Markdown SKILL.md + Groovy Jenkinsfile + Dockerfile + compose YAML + Node `verify.mjs` (มติ D8: verify script เป็น Node เสมอ)

## Global Constraints

- **Self-contained skills:** ห้ามอ้างไฟล์ข้าม plugin ด้วย path — restate contract ใน SKILL.md ของตัวเอง (pattern เดิมของ nextjs)
- **ค่า contract ที่ restate ต้องตรงเป๊ะ** (drift check จับ): `new_violations = 0` · `new_duplicated_lines_density ≤ 3%` · `new_coverage ≥ 60%` · `new_security_hotspots_reviewed = 100%` · `CRITICAL ≥ 1` fail / `HIGH ≥ 1` unstable · credential `env-<project>` / `env-<project>-dev` · วลี `10-stage` หรือ `all 10, in order` · path volume `/srv/appdata/<project>/`
- **Placeholder convention:** `__UPPER_SNAKE__` เหมือน nextjs (`__PROJECT_NAME__`, `__PROJECT_DISPLAY_NAME__`, `__PORT_PROD__`, `__PORT_DEV__`)
- **Optional blocks ติดป้ายคอมเมนต์:** `[DB]` `[VOLUME]` `[WEB]` `[BATCH]` `[WP]` — ลบทั้งบล็อกได้โดย Groovy/YAML ไม่พัง
- **Health endpoint:** `/api/health` ทุก stack · ไม่ต้อง login · ไม่โชว์ version/commit · 200 healthy / 503 degraded · healthcheck ยิง `127.0.0.1` เท่านั้น
- **เวอร์ชัน:** plugin ใหม่ = 0.1.0 (ยังไม่ tag จนผ่าน pilot) · ugt-core 2.2.0 → 2.3.0 · ugt-nextjs-platform 4.12.0 → 4.13.0
- **ทุก task จบแล้ว repo ต้อง green:** `node scripts/check-contract-drift.mjs` exit 0
- **Commit message:** ภาษาไทย conventional-commit ตามแบบ log เดิม (`feat(python): …`, `docs: …`)
- **แต่ละ shape ที่ยังไม่ผ่านโปรเจคจริง** ต้องมีป้าย "ยังไม่ผ่าน pilot" ใน SKILL.md (มติ M2)

---

## Phase 1 — มาตรฐาน volume กลาง (contract + Next.js + drift guard)

### Task 1: เพิ่ม section "Persistent data" ใน contract กลาง

**Files:**
- Modify: `plugins/ugt-core/contracts/cicd.md` (ต่อท้าย ก่อน section "Server names")
- Modify: `plugins/ugt-core/.claude-plugin/plugin.json` (version 2.2.0 → 2.3.0)
- Modify: `plugins/ugt-core/CHANGELOG.md` (entry ใหม่บนสุด ตาม format เดิมในไฟล์)

**Interfaces:**
- Produces: ข้อความ contract ที่ Task 2/10/19 ต้อง restate — ค่า pin คือ `/srv/appdata/<project>/<name>` และ `/srv/appdata/<project>-dev/<name>`

- [ ] **Step 1: เพิ่ม section ใน `contracts/cicd.md`** — แทรกก่อน `## Server names`:

```markdown
## Persistent data (volumes)

Containers are disposable — anything that must survive a deploy (uploads,
SQLite files, `wp-content`, generated reports) uses a **bind mount** under the
org path, never a named or anonymous Docker volume:

```
/srv/appdata/<project>/<name>        # prod
/srv/appdata/<project>-dev/<name>    # dev
```

- Declared in the compose `volumes:` list; the Deploy stage ensures each
  project path exists and is owned by the container's runtime UID before the
  first `up -d` (idempotent). The server admin creates `/srv/appdata` itself
  once, writable by the Jenkins user (see the skill's admin handoff).
- Never store secrets in a volume · never bind-mount code over the image
  (single declared exception: WordPress `wp-content`)
- Host file backup covers `/srv/appdata` once for every project
```

- [ ] **Step 2:** อัปเดต maintenance note หัวไฟล์ `contracts/cicd.md` — เพิ่ม `ugt-python-platform`/`ugt-php-platform` เข้าในรายชื่อ plugin ที่ restate (จะมีจริงใน Phase 2/3 — เขียนล่วงหน้าได้ เพราะ note เป็นคำแนะนำคนแก้ไฟล์)
- [ ] **Step 3:** bump `plugins/ugt-core/.claude-plugin/plugin.json` → `"version": "2.3.0"` และเพิ่ม CHANGELOG entry: หัวข้อ 2.3.0 — "contracts/cicd.md: เพิ่ม section Persistent data (bind mount ใต้ /srv/appdata) — มติ 2026-08-11"
- [ ] **Step 4: ตรวจ** — `node scripts/check-contract-drift.mjs` ต้อง exit 0 (ยังไม่มี check ใหม่ — ต้องไม่พังของเดิม)
- [ ] **Step 5: Commit** — `feat(core): contract Persistent data — bind mount ใต้ /srv/appdata (มติ 2026-08-11)`

### Task 2: อัปเดต `ugt-nextjs-cicd-setup` ให้รองรับ volume

**Files:**
- Modify: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-cicd-setup/SKILL.md`
- Modify: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-cicd-setup/assets/docker-compose.yml`
- Modify: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-cicd-setup/assets/docker-compose.dev.yml`
- Modify: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-cicd-setup/assets/admin-handoff.template.md`
- Modify: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-cicd-setup/scripts/verify.mjs`
- Modify: `plugins/ugt-nextjs-platform/.claude-plugin/plugin.json` (4.12.0 → 4.13.0)
- Modify: `plugins/ugt-nextjs-platform/CHANGELOG.md`

**Interfaces:**
- Consumes: ข้อความ contract จาก Task 1 (path `/srv/appdata/<project>/`)
- Produces: รูปแบบบล็อก `[VOLUME]` และ check ใน verify.mjs ที่ Task 6/11/15/20 ลอกไปใช้

- [ ] **Step 1: SKILL.md** — (ก) เพิ่มข้อ Interview ใหม่เป็นข้อ 7 (เลื่อน Deploy target เป็นข้อ 8... จริง ๆ ไฟล์เดิมมี 6 ข้อ ให้เพิ่มเป็นข้อ 7): `7. **Volume?** — มี path ที่ต้อง persist ข้าม deploy ไหม (เช่น uploads) → รายชื่อ → บล็อก [VOLUME] ในทั้ง 2 compose; ไม่มี → ลบบล็อก [VOLUME]` (ข) ใน §2 Org Standards เพิ่มหัวข้อสั้น restate contract:

```markdown
### 2.8 Persistent data

ข้อมูลที่ต้องรอดข้าม deploy ใช้ bind mount ใต้ `/srv/appdata/<project>/<name>`
(dev = `/srv/appdata/<project>-dev/<name>`) เท่านั้น — ห้าม named volume,
ห้ามเก็บ secret ใน volume, ห้าม bind โค้ดทับ image. Deploy stage สร้าง path +
chown ให้ตรง UID ใน container (idempotent); admin เตรียม `/srv/appdata`
ให้เขียนได้ครั้งเดียว (ดู admin handoff).
```

  (ค) ใน §4.3 "Adjust per interview answers" เพิ่ม: `- ไม่มี volume → ลบทุกบล็อกคอมเมนต์ [VOLUME] ในทั้ง 2 compose`
- [ ] **Step 2: compose ทั้ง 2 ไฟล์** — เพิ่มใต้ `ports:` (คอมเมนต์ทั้งบล็อก — ค่า default คือไม่มี volume):

```yaml
    # [VOLUME] persistent data — uncomment + rename per interview; path must be
    # [VOLUME] under /srv/appdata (org contract). Delete block if nothing persists.
    # volumes:
    #   - /srv/appdata/__PROJECT_NAME__/uploads:/app/uploads
```

  (ไฟล์ dev ใช้ `/srv/appdata/__PROJECT_NAME__-dev/uploads`)
- [ ] **Step 3: admin-handoff.template.md** — เพิ่มรายการ (วางในหมวดงานฝั่ง server ตาม format เดิมของไฟล์): "สร้าง `/srv/appdata` ครั้งเดียว (ครั้งแรกของ server): `sudo mkdir -p /srv/appdata && sudo chown jenkins:jenkins /srv/appdata` — โปรเจคย่อยข้างใน Deploy stage สร้างเอง"
- [ ] **Step 4: verify.mjs** — ใน loop ตรวจ compose (§6 ของสคริปต์) เพิ่ม problem check:

```js
    // volumes must live under /srv/appdata (org contract — Persistent data)
    const vols = [...body.matchAll(/^\s*-\s*(\/[^:\s]+):/gm)].map((m) => m[1]);
    const stray = vols.filter((v) => !v.startsWith('/srv/appdata/'));
    if (stray.length) problems.push(`bind mount นอก /srv/appdata: ${stray.join(', ')}`);
```

- [ ] **Step 5:** bump plugin.json → 4.13.0 + CHANGELOG entry ("volume: interview ข้อ 7, บล็อก [VOLUME] ใน compose, verify check, admin handoff — ตาม contract Persistent data")
- [ ] **Step 6: ตรวจ** — `node --check plugins/ugt-nextjs-platform/skills/ugt-nextjs-cicd-setup/scripts/verify.mjs` ผ่าน และ drift check ยัง exit 0
- [ ] **Step 7: Commit** — `feat(nextjs-cicd): รองรับ volume ตาม contract Persistent data — interview + [VOLUME] + verify`

### Task 3: เพิ่ม drift check ของค่า volume

**Files:**
- Modify: `scripts/check-contract-drift.mjs`

- [ ] **Step 1:** เพิ่ม entry ใน `CHECKS` (หลัง entry `Credential naming`):

```js
  {
    name: 'Persistent data: bind mounts under /srv/appdata/<project>',
    files: {
      [`${CORE}/contracts/cicd.md`]: [/\/srv\/appdata\/<project>\//],
      [`${NEXT}/ugt-nextjs-cicd-setup/SKILL.md`]: [/\/srv\/appdata\/<project>\//],
    },
  },
```

- [ ] **Step 2: ตรวจ** — `node scripts/check-contract-drift.mjs` exit 0 (ถ้าแดง = ข้อความใน Task 1/2 สะกด path ไม่ตรง — แก้ให้ตรง)
- [ ] **Step 3: Commit** — `feat(drift): check ค่า /srv/appdata ระหว่าง contract กับ nextjs-cicd`

---

## Phase 2 — `ugt-python-platform`

### Task 4: Scaffold plugin + marketplace entry

**Files:**
- Create: `plugins/ugt-python-platform/.claude-plugin/plugin.json`
- Create: `plugins/ugt-python-platform/CHANGELOG.md`
- Modify: `.claude-plugin/marketplace.json`

**Interfaces:**
- Produces: plugin id `ugt-python-platform`, skill dir `plugins/ugt-python-platform/skills/ugt-python-cicd-setup/` ที่ Task 5–12 เติมไฟล์

- [ ] **Step 1: plugin.json:**

```json
{
  "$schema": "https://json.schemastore.org/claude-code-plugin-manifest.json",
  "name": "ugt-python-platform",
  "displayName": "UGT Python Platform",
  "version": "0.1.0",
  "description": "Org standards for Python projects (deploy-only scope for now): Jenkins + SonarQube + OWASP + Docker deploy for FastAPI / Flask / Django / batch jobs, including the minimal ruff/pytest tooling the org Quality Gate needs. Database/auth/design skills come later — see docs/multi-stack-proposal.md.",
  "author": { "name": "UGT DX Team" },
  "keywords": ["python", "fastapi", "flask", "django", "jenkins", "sonarqube", "org-standard"],
  "dependencies": ["ugt-core"]
}
```

- [ ] **Step 2: CHANGELOG.md:** หัวข้อ `0.1.0 (2026-08-11)` — "เกิดครั้งแรก: skill ugt-python-cicd-setup (deploy-only ตาม spec 2026-08-11) — ยังไม่ tag จนกว่าผ่าน pilot 1 โปรเจคจริง"
- [ ] **Step 3: marketplace.json** — เพิ่ม entry ต่อท้าย array `plugins`:

```json
    {
      "name": "ugt-python-platform",
      "source": "./plugins/ugt-python-platform",
      "description": "Org standards for Python projects (deploy-only for now): Jenkins + SonarQube + OWASP + Docker deploy for FastAPI / Flask / Django / batch jobs, with minimal lint/test tooling so the org Quality Gate passes"
    }
```

- [ ] **Step 4: ตรวจ** — `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8')); JSON.parse(require('fs').readFileSync('plugins/ugt-python-platform/.claude-plugin/plugin.json','utf8'))"` ไม่ error
- [ ] **Step 5: Commit** — `feat(python): scaffold ugt-python-platform v0.1.0 + marketplace entry`

### Task 5: Jenkinsfile (Python)

**Files:**
- Create: `plugins/ugt-python-platform/skills/ugt-python-cicd-setup/assets/Jenkinsfile`

**Interfaces:**
- Consumes: โครงจาก `plugins/ugt-nextjs-platform/skills/ugt-nextjs-cicd-setup/assets/Jenkinsfile` (คัดลอกเป็นฐานแล้วแก้ตามรายการนี้)
- Produces: Jenkinsfile 10 stages ที่ Task 10 (SKILL.md) และ Task 11 (verify) อ้าง — ชื่อ stage ต้องตรงชุดเดิม: Checkout / Install / Code Quality / Unit Tests / Build / OWASP Dependency Check / SonarQube Analysis / Quality Gate / Docker Build / Deploy

- [ ] **Step 1:** คัดลอก Jenkinsfile ของ nextjs มาเป็นฐาน แล้วแก้ดังนี้ (ส่วนที่ไม่ระบุ = คงเดิม: options, Checkout, OWASP (เปลี่ยนเฉพาะ exclude), SonarQube Analysis, Quality Gate, โครง when ของ Docker Build/Deploy, post emailext+cleanWs ทั้งบล็อก):
  - หัวไฟล์: ปรับคอมเมนต์ placeholder — ตัด `__BASE_PATH_*__`/`__APP_URL_*__` ออก เพิ่ม `__APP_MODULE__` (โมดูลหลัก เช่น `app`) และป้าย `[WEB]/[BATCH]/[DB]/[VOLUME]`
  - ลบบล็อก `tools { nodejs ... }` ทั้งบล็อก (มติ M8 — ไม่ใช้ Global Tool)
  - `environment`: เหลือ `CI = 'true'` (ตัด SKIP_ENV_VALIDATION, NEXT_PUBLIC_*)
  - **Install:**

```groovy
        stage('Install') {
            steps {
                script {
                    // มติ M8: toolchain รันใน docker — Jenkins ไม่มี Python tool
                    // .venv อยู่ใน workspace จึงรอดข้าม stage (docker.inside mount workspace)
                    docker.image('python:3.12-slim').inside {
                        sh '''
                            python -m venv .venv
                            .venv/bin/pip install --no-cache-dir -r requirements.txt
                            .venv/bin/pip install --no-cache-dir -r requirements-dev.txt
                        '''
                    }
                }
            }
        }
```

  - **Code Quality** (parallel 3 — แต่ละ branch เปิด `docker.image('python:3.12-slim').inside` ของตัวเอง): Lint → `sh '.venv/bin/ruff check .'` · Format Check → `sh '.venv/bin/ruff format --check .'` · Type Check → `sh '.venv/bin/mypy .'`
  - **Unit Tests:**

```groovy
        stage('Unit Tests') {
            steps {
                script {
                    docker.image('python:3.12-slim').inside {
                        // junit/coverage paths มาจาก [tool.pytest.ini_options] ใน pyproject.toml
                        sh '.venv/bin/pytest'
                    }
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'test-results/junit.xml'
                    publishHTML([allowMissing: false, alwaysLinkToLastBuild: true, keepAll: true,
                                 reportDir: 'coverage', reportFiles: 'index.html', reportName: 'Coverage Report'])
                }
            }
        }
```

  - **Build:** `steps { echo 'Build absorbed into Docker Build (Python มี artifact เดียวคือ image) — stage คงไว้ตาม 10-stage contract' }`
  - **OWASP:** เปลี่ยน `--exclude` เป็น `".venv/**"`, `"coverage/**"`, `"tests/**"` (ตัด `.next/node_modules`)
  - **Docker Build:** ตัด withCredentials [SENTRY] และ build-arg ทั้งหมด — เหลือ build เดียว:

```groovy
                    sh """
                        docker build \\
                            --network host \\
                            -t ${imageName}:latest \\
                            -t ${imageName}:${buildNum} \\
                            .
                    """
```

  - **Deploy:** โครง branch/credential เดิม แต่ (ก) migrate [DB] ใช้ image ตัวเอง ไม่มี builder image:

```groovy
                        // [DB] migrate ก่อน deploy — migration fail = ไม่ deploy (contract)
                        // ใช้ image ที่เพิ่ง build (มี alembic + code); Django สลับเป็น manage.py migrate
                        sh """
                          DB_URL=\$(grep "^DATABASE_URL=" .env | cut -d= -f2- | tr -d '"\r')
                          docker run --rm -e DATABASE_URL="\$DB_URL" ${imageName}:${buildNum} alembic upgrade head
                        """
```

  (ข) เพิ่มบล็อก [VOLUME] ก่อน `docker-compose up`:

```groovy
                        // [VOLUME] เตรียม path ข้อมูลถาวร (idempotent) — admin เตรียม /srv/appdata แล้ว
                        sh 'mkdir -p /srv/appdata/${containerName} && chmod 755 /srv/appdata/${containerName}'
```

  (ค) health-poll loop เดิมครอบด้วยป้าย `[WEB]` และเพิ่มบล็อกทางเลือก `[BATCH]` (คอมเมนต์ไว้ — ใช้เมื่อ shape เป็น batch: ไม่มี compose up ค้าง ให้ตรวจ image ใช้ได้จริงแล้วจบ):

```groovy
                        // [BATCH] แทน compose up + health poll ทั้งหมดด้านบนด้วย 2 บรรทัดนี้:
                        // sh "docker run --rm ${imageName}:${buildNum} python -c 'import __APP_MODULE__'"
                        // echo 'batch image พร้อม — host cron เรียก docker compose run --rm job (ดู references/docker-deploy.md)'
```

- [ ] **Step 2: ตรวจ brace สมดุล** — `node -e "const s=require('fs').readFileSync('plugins/ugt-python-platform/skills/ugt-python-cicd-setup/assets/Jenkinsfile','utf8').replace(/'''[\s\S]*?'''/g,'').replace(/\"\"\"[\s\S]*?\"\"\"/g,'').replace(/'[^'\n]*'/g,'').replace(/\/\/[^\n]*/g,''); const o=(s.match(/{/g)||[]).length,c=(s.match(/}/g)||[]).length; if(o!==c){console.error('brace mismatch',o,c);process.exit(1)}console.log('ok',o)"`
- [ ] **Step 3: ตรวจชื่อ stage ครบ 10 ตามลำดับ** — grep `stage('` ต้องเจอตามชุดใน Interfaces ข้างบน
- [ ] **Step 4: Commit** — `feat(python): Jenkinsfile 10 stages — toolchain ใน docker, migrate ด้วย image ตัวเอง`

### Task 6: Dockerfiles + compose (Python)

**Files:**
- Create: `plugins/ugt-python-platform/skills/ugt-python-cicd-setup/assets/docker/Dockerfile.web`
- Create: `plugins/ugt-python-platform/skills/ugt-python-cicd-setup/assets/docker/Dockerfile.batch`
- Create: `plugins/ugt-python-platform/skills/ugt-python-cicd-setup/assets/docker-compose.yml`
- Create: `plugins/ugt-python-platform/skills/ugt-python-cicd-setup/assets/docker-compose.dev.yml`

**Interfaces:**
- Produces: container port ภายใน = **8000** (compose/healthcheck/SKILL.md ใช้ค่านี้), start command placeholder `__START_CMD_JSON__`

- [ ] **Step 1: Dockerfile.web:**

```dockerfile
# Org-standard Python web Dockerfile — FastAPI / Flask / Django
# Placeholders: __START_CMD_JSON__ (JSON array — ดูท้ายไฟล์), เลือกไฟล์นี้เมื่อ shape = web
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chown -R app:app /app
USER app

EXPOSE 8000

# slim ไม่มี wget/curl — ใช้ python ยิง 127.0.0.1 (ห้าม localhost — IPv6 issue เดียวกับ Alpine)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status==200 else 1)" || exit 1

# __START_CMD_JSON__ ตัวอย่าง (skill เติมจาก entry point จริงที่อ่านเจอ):
#   ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]     FastAPI
#   ["gunicorn", "-b", "0.0.0.0:8000", "app:app"]                          Flask
#   ["gunicorn", "-b", "0.0.0.0:8000", "config.wsgi:application"]          Django
CMD __START_CMD_JSON__
```

- [ ] **Step 2: Dockerfile.batch:** เหมือน web แต่ตัด `EXPOSE`/`HEALTHCHECK` และ CMD:

```dockerfile
# Org-standard Python batch Dockerfile — ไม่มี web server / ไม่มี health endpoint
# รันโดย host cron: docker compose run --rm job  (ดู references/docker-deploy.md)
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN addgroup --system app && adduser --system --ingroup app app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN chown -R app:app /app
USER app
CMD ["python", "-m", "__APP_MODULE__"]
```

- [ ] **Step 3: docker-compose.yml** — คัดลอกโครงของ nextjs (`assets/docker-compose.yml` — มี pull_policy: never, proxy-network, logging, resources อยู่แล้ว) แล้วแก้: (ก) port map `'${APP_PORT:-__PORT_PROD__}:8000'` (ข) healthcheck ใช้ python one-liner เดียวกับ Dockerfile (path `http://127.0.0.1:8000/api/health`) (ค) environment เหลือ `DATABASE_URL: ${DATABASE_URL} # [DB]` + คอมเมนต์ตัวอย่าง secret (ตัด NODE_ENV) (ง) เพิ่มบล็อก `[VOLUME]` คอมเมนต์ แบบเดียวกับ Task 2 Step 2 แต่ mount ฝั่ง container เป็น `/app/<name>` (จ) เพิ่มคอมเมนต์หัวไฟล์: `# [BATCH] shape: เปลี่ยน service name เป็น job, ตัด ports/healthcheck/restart → restart: "no"`
- [ ] **Step 4: docker-compose.dev.yml** — เหมือน prod แต่ `__PORT_DEV__`, ชื่อ `__PROJECT_NAME__-dev`, volume path `-dev`
- [ ] **Step 5: Commit** — `feat(python): Dockerfile web/batch + compose — port 8000, healthcheck ไม่พึ่ง wget`

### Task 7: health snippets + tooling ขั้นต่ำ (Python)

**Files:**
- Create: `assets/health/fastapi_health.py`, `assets/health/flask_health.py`, `assets/health/django_health.py` (ใต้ skill dir เดียวกัน)
- Create: `assets/tooling/pyproject-tooling.toml`
- Create: `assets/tooling/requirements-dev.txt`
- Create: `assets/tooling/test_smoke.py`

**Interfaces:**
- Produces: junit ที่ `test-results/junit.xml`, coverage xml ที่ `coverage.xml`, html ที่ `coverage/` — ตรงกับที่ Jenkinsfile (Task 5) และ sonar (Task 8) อ้าง

- [ ] **Step 1: fastapi_health.py:**

```python
"""org /api/health — รวมเข้าแอปด้วย: app.include_router(health_router)"""
from fastapi import APIRouter, Response

health_router = APIRouter()


@health_router.get("/api/health")
def health(response: Response):
    ok = True
    # [DB] เช็ค DB แบบถูก (SELECT 1) แล้ว ok = False เมื่อพัง — ห้ามใส่ version/commit ใน response
    response.status_code = 200 if ok else 503
    return {"status": "healthy" if ok else "degraded"}
```

- [ ] **Step 2: flask_health.py** (blueprint: `health_bp = Blueprint("health", __name__)`, route `/api/health`, `return jsonify(...), 200 if ok else 503`) และ **django_health.py** (view function + คอมเมนต์บอกเพิ่ม `path("api/health", health)` ใน urls.py) — โครงเดียวกับ FastAPI: ตัวแปร `ok`, คอมเมนต์ `[DB]`, ห้าม version
- [ ] **Step 3: pyproject-tooling.toml** (skill จะ merge เข้า pyproject.toml ของโปรเจค — ถ้าไม่มีไฟล์ให้สร้างใหม่ทั้งไฟล์พร้อม `[project]` ขั้นต่ำ):

```toml
[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "W", "I"]

[tool.mypy]
ignore_missing_imports = true
exclude = ["\\.venv"]

[tool.pytest.ini_options]
addopts = "--junitxml=test-results/junit.xml --cov=. --cov-report=xml --cov-report=html:coverage"
testpaths = ["tests"]

[tool.coverage.run]
omit = ["tests/*", ".venv/*"]
```

- [ ] **Step 4: requirements-dev.txt:** `ruff`, `mypy`, `pytest`, `pytest-cov` (4 บรรทัด ไม่ pin เวอร์ชัน — โปรเจคใครโปรเจคมัน)
- [ ] **Step 5: test_smoke.py:**

```python
# smoke test ขั้นต่ำให้ pipeline รันผ่าน — ไม่ใช่ test suite จริง
# โค้ดใหม่หลังจากนี้ต้องมี test คู่กันตาม Quality Gate (coverage โค้ดใหม่ ≥ 60%)
import importlib


def test_app_importable():
    assert importlib.import_module("__APP_MODULE__")
```

- [ ] **Step 6: Commit** — `feat(python): health snippets 3 framework + tooling ขั้นต่ำ ruff/mypy/pytest`

### Task 8: sonar + owasp + admin-handoff + rules (Python)

**Files:**
- Create: `assets/sonar-project.properties`
- Create: `assets/owasp-suppressions.xml`
- Create: `assets/admin-handoff.template.md`
- Create: `assets/rules/ugt-python-ci.md`

- [ ] **Step 1: sonar-project.properties:**

```properties
sonar.projectKey=__PROJECT_NAME__
sonar.projectName=__PROJECT_DISPLAY_NAME__
sonar.sources=.
sonar.exclusions=**/.venv/**,**/tests/**,**/coverage/**,**/dc-report/**,**/test-results/**
sonar.tests=tests
sonar.python.version=3.12
sonar.python.coverage.reportPaths=coverage.xml
sonar.dependencyCheck.jsonReportPath=dc-report/dependency-check-report.json
sonar.dependencyCheck.htmlReportPath=dc-report/dependency-check-report.html
```

- [ ] **Step 2: owasp-suppressions.xml** — คัดลอกจาก nextjs (`assets/owasp-suppressions.xml`) ทั้งไฟล์ (เป็น skeleton `<suppressions>` + ตัวอย่างคอมเมนต์ — ไม่มีอะไรผูก stack)
- [ ] **Step 3: admin-handoff.template.md** — คัดลอกของ nextjs เป็นฐาน แก้: ตัดรายการ NodeJS tool + sentry credential; คงรายการ `nvd`, `env-__PROJECT_NAME__`, `env-__PROJECT_NAME__-dev`, SonarQube project ×2, webhook 2 ตัว, Lightweight checkout; เพิ่ม 2 รายการ: (ก) `/srv/appdata` ครั้งเดียวต่อ server (ข้อความเดียวกับ Task 2 Step 3) (ข) "Jenkins user อยู่ใน docker group (stage รันใน docker.image().inside)"
- [ ] **Step 4: rules/ugt-python-ci.md** — rule file สำหรับ `.claude/rules/` ของโปรเจคเป้าหมาย, frontmatter `paths: ["Jenkinsfile", "Dockerfile*", "docker-compose*", "sonar-project.properties"]`, เนื้อหา: 10 stages ห้ามตัด · แก้ pipeline แล้วค่า Quality Gate ต้องตรง contract (list ค่าทั้ง 4 ตาม Global Constraints) · volume ต้องอยู่ใต้ `/srv/appdata/` · ห้ามใส่ version ใน `/api/health` · image tag ด้วย BUILD_NUMBER เสมอ
- [ ] **Step 5: Commit** — `feat(python): sonar/owasp/admin-handoff/rules assets`

### Task 9: references (Python)

**Files:**
- Create: `references/docker-deploy.md`
- Create: `references/legacy-test-generation.md`

- [ ] **Step 1: docker-deploy.md** — เนื้อหา (เขียนจริงทุกหัวข้อ ไม่ใช่โครง): (ก) กลไก deploy ตาม branch (ตาราง main/develop → image/compose/credential เหมือน nextjs) (ข) **batch shape**: ไม่มี long-running container — Jenkins build image + validate import แล้วจบ; host cron เรียก `docker compose run --rm job` พร้อมตัวอย่าง crontab บรรทัดจริง `0 2 * * * cd /opt/apps/__PROJECT_NAME__ && docker compose run --rm job >> /srv/appdata/__PROJECT_NAME__/logs/cron.log 2>&1` (ค) volume: ownership — container รันเป็น system user `app`; ถ้าเขียน volume ไม่ได้ให้ `chown` UID ของ user `app` ใน image (ดูด้วย `docker run --rm <image> id -u`) (ง) gotcha ที่รู้แล้ว: slim ไม่มี wget (healthcheck ใช้ python), `.venv` ใน workspace ห้ามเข้า docker build context (ใส่ `.dockerignore`: `.venv`, `coverage`, `dc-report`, `test-results`)
- [ ] **Step 2: legacy-test-generation.md** — ขั้น optional M7: (ก) เงื่อนไขเริ่ม — interview ข้อ 8 ตอบใช่ เปิด session ใหม่หลังไฟล์ deploy ครบ (ข) วิธีทำ: ไล่ module ตามลำดับ import graph (ใบก่อน ราก่อนสุดท้าย), module ละ 1 ไฟล์ test — characterization test: จับ output ปัจจุบันเป็น expected, mock I/O/DB ที่ขอบเท่านั้น (ค) จบแต่ละ module รัน `pytest --cov` รายงานตัวเลข (ง) คำเตือนตายตัว 2 ข้อ: test เหล่านี้ล็อกพฤติกรรมรวม bug — ทีมต้อง review ทุกไฟล์ก่อน commit; ไม่ใช่เงื่อนไข pipeline (gate นับเฉพาะโค้ดใหม่)
- [ ] **Step 3: Commit** — `feat(python): references — docker-deploy (batch/cron/volume) + legacy-test-generation`

### Task 10: SKILL.md (Python) + drift entries

**Files:**
- Create: `plugins/ugt-python-platform/skills/ugt-python-cicd-setup/SKILL.md`
- Modify: `scripts/check-contract-drift.mjs`

**Interfaces:**
- Consumes: ทุก asset จาก Task 5–9 (ตาราง copy → target ต้องตรงชื่อไฟล์จริง)
- Produces: ชื่อ skill `ugt-python-cicd-setup` ที่ evals (Task 12) อ้าง

- [ ] **Step 1: SKILL.md** — โครงตาม `ugt-nextjs-cicd-setup/SKILL.md` (อ่านไฟล์นั้นเป็น template ก่อนเขียน) ประกอบด้วย:
  - **frontmatter:** `name: ugt-python-cicd-setup` + `description:` (ภาษาเดียวกับของ nextjs — อังกฤษปน trigger ไทย): "Use when a Python project needs the org-standard delivery pipeline — 'ทำ CI/CD ให้โปรเจค python', 'deploy fastapi/flask/django ด้วย docker', 'ตั้ง jenkins ให้ python' — producing the 10-stage Jenkinsfile (toolchain in docker), sonar-project.properties, Dockerfile (web/batch), both compose files, minimal ruff/mypy/pytest tooling + smoke test so the Quality Gate can pass, /api/health per framework, volume bind mounts under /srv/appdata, and the admin handoff. Covers FastAPI, Flask, Django and batch jobs. Not for Next.js (→ ugt-nextjs-cicd-setup) or PHP (→ ugt-php-cicd-setup)."
  - **§1 Overview** + ป้ายสถานะ: "**ยังไม่ผ่าน pilot** — ทุก shape ยังไม่เคยรันกับโปรเจคจริง (มติ M2: ต้องผ่านภาษาละ 1 โปรเจคก่อน tag); shape ที่ผ่านแล้วจะย้ายออกจากรายการนี้"
  - **§2 Org Standards** — restate contract ครบชุด (คัดจาก §2 ของ nextjs โดยตัดข้อ Next-specific): 10-stage list, branch model, ตาราง Quality Gate 4 ค่า, OWASP thresholds, credential naming, secret rules, image tag BUILD_NUMBER, migrate-before-deploy, health endpoint, **Persistent data (`/srv/appdata/<project>/`)** — สะกดค่าตาม Global Constraints เป๊ะ (drift check จับ)
  - **§3 อ่าน codebase ก่อนถาม** — หา entry point (`FastAPI()`/`Flask(`/`manage.py`), มี `requirements.txt`? มี route `/api/health` เดิม? มี config ruff/pytest เดิม? — ของเดิมไม่เขียนทับ
  - **§4 Interview 8 ข้อ** ตาม spec §4.1 (ชื่อโปรเจค / ports / subpath / **shape** / DB+migration / **volume** / deploy target / **optional legacy tests**)
  - **§5 Setup Steps** — ตาราง copy assets → ตำแหน่งจริง (Jenkinsfile→root, docker/Dockerfile.web→Dockerfile ตาม shape, health/→ตาม framework, tooling/→pyproject merge + requirements-dev.txt + tests/test_smoke.py, rules→.claude/rules/) + ตาราง placeholder (`__PROJECT_NAME__`, `__PROJECT_DISPLAY_NAME__`, `__PORT_PROD__`, `__PORT_DEV__`, `__APP_MODULE__`, `__START_CMD_JSON__`) + Adjust per interview ([DB]/[VOLUME]/[WEB]/[BATCH] ลบ-คงตามคำตอบ, Django สลับ alembic→manage.py migrate)
  - **§6 Quick Rules** + **§7 Verification** (ชี้ `scripts/verify.mjs` + รายการที่ admin ต้องยืนยันฝั่ง server)
- [ ] **Step 2: drift check** — เพิ่ม `const PY = 'plugins/ugt-python-platform/skills';` แล้วเติม `[`${PY}/ugt-python-cicd-setup/SKILL.md`]` เข้า entry เดิมทั้ง 8 ตัว: new_coverage / new_violations / new_duplicated_lines_density / new_security_hotspots_reviewed / Dependency scan / Credential naming / 10 stages / Persistent data (ใช้ regex เดียวกับของ NEXT ในแต่ละ entry)
- [ ] **Step 3: ตรวจ** — `node scripts/check-contract-drift.mjs` exit 0 (แดง = SKILL.md สะกดค่าไม่ตรง — แก้ SKILL.md ไม่ใช่แก้ regex)
- [ ] **Step 4: Commit** — `feat(python): SKILL.md ugt-python-cicd-setup + drift coverage`

### Task 11: verify.mjs (Python) + fixture test

**Files:**
- Create: `plugins/ugt-python-platform/skills/ugt-python-cicd-setup/scripts/verify.mjs`
- Test: fixture ชั่วคราวใน scratchpad (ไม่ commit)

- [ ] **Step 1:** คัดลอก `verify.mjs` ของ nextjs เป็นฐาน แก้เป็นเช็คของ Python:
  - `CI_FILES`: Jenkinsfile, sonar-project.properties, Dockerfile, docker-compose.yml, docker-compose.dev.yml, owasp-suppressions.xml, requirements-dev.txt
  - ตัดเช็ค package.json/npm scripts/next.config/[SENTRY] ออก แทนด้วย: `pyproject.toml` มี `[tool.ruff]` + `[tool.pytest.ini_options]` ที่ชี้ `test-results/junit.xml` · มี `tests/` อย่างน้อย 1 ไฟล์ `test_*.py` · sonar มี `sonar.python.coverage.reportPaths=coverage.xml` · [DB] เช็คจาก `alembic`/`manage.py` ในโปรเจค vs `[DB]` ใน Jenkinsfile (ตรรกะเดียวกับของเดิม)
  - health check: `[WEB]` ใน Jenkinsfile → ต้อง grep เจอ `/api/health` ใน `**/*.py` (ใช้ readdir recursive ข้าม `.venv`) ไม่เจอ = FAIL; เจอคำว่า version/commit ใกล้ ๆ = warn (ท่าเดียวกับของ nextjs)
  - เช็ค compose volume ใต้ `/srv/appdata/` (โค้ดเดียวกับ Task 2 Step 4)
  - เช็ค 10 stages / QG blocks / brace balance / groovy secret — คงไว้ทั้งหมด (ทำงานกับ Jenkinsfile ไหนก็ได้)
- [ ] **Step 2: ทดสอบกับ fixture** — สร้างโฟลเดอร์ scratchpad จำลองโปรเจคที่รัน skill แล้ว: Jenkinsfile (copy asset แล้ว sed placeholder เป็นค่า dummy), sonar/compose/Dockerfile/owasp/requirements-dev.txt/pyproject.toml/tests/test_smoke.py/แอป `app.py` ที่มีสตริง `/api/health` → รัน `node <repo>/plugins/ugt-python-platform/skills/ugt-python-cicd-setup/scripts/verify.mjs` จาก fixture — ต้อง exit 0; ลบ `tests/` แล้วรันซ้ำ — ต้อง exit 1 (พิสูจน์ว่าเช็คจับจริง)
- [ ] **Step 3: Commit** — `feat(python): verify.mjs — ทดสอบผ่าน fixture ทั้งเคสผ่านและเคสพัง`

### Task 12: evals (Python)

**Files:**
- Create: `evals/evals.json`, `evals/trigger-evals.json` (ใต้ skill dir)

- [ ] **Step 1: trigger-evals.json** — format ตามของ nextjs (purpose/method/queries; ไม่มี baseline_result — ยังไม่รัน) S-queries 6 ข้อ เช่น: "ทำ CI/CD ให้โปรเจค python หน่อย", "deploy fastapi ขึ้น docker ตามมาตรฐานบริษัท", "โปรเจค django ยัง deploy มือทุกครั้ง", "python batch job อยาก deploy ด้วย jenkins", "pipeline python ค้างที่ Quality Gate", "volume ของแอป python ต้อง mount ยังไงตามมาตรฐาน" · N-queries 4 ข้อ: "ทำ CI/CD ให้โปรเจค next.js" → ugt-nextjs-cicd-setup, "deploy laravel ด้วย docker" → ugt-php-cicd-setup, "เขียน test ให้ function python นี้" → (none — งาน dev ปกติ), "ตั้ง keycloak login ให้แอป python" → (none — ยังไม่มี auth skill; ดู multi-stack-proposal)
- [ ] **Step 2: evals.json** — เคสเดียวแบบ with/without-skill ตาม format เดิมของ repo (อ่าน `plugins/ugt-core/skills/ugt-requirements/evals/evals.json` เป็นตัวอย่าง format): โจทย์ "โปรเจค FastAPI มี requirements.txt ไม่มี test ขอ deploy ตามมาตรฐาน" + expected: ไฟล์ครบ 10 อย่าง, stage รันใน docker, smoke test ถูกสร้าง, volume อยู่ใต้ /srv/appdata
- [ ] **Step 3:** ตรวจ JSON parse ทั้ง 2 ไฟล์ + Commit — `feat(python): evals + trigger-evals`

---

## Phase 3 — `ugt-php-platform`

### Task 13: Scaffold plugin + marketplace entry (PHP)

**Files:**
- Create: `plugins/ugt-php-platform/.claude-plugin/plugin.json`
- Create: `plugins/ugt-php-platform/CHANGELOG.md`
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1:** ทำแบบ Task 4 ทุกขั้น โดยแทนค่า: name `ugt-php-platform`, displayName `UGT PHP Platform`, description: "Org standards for PHP projects (deploy-only scope for now): Jenkins + SonarQube + OWASP + Docker deploy for Laravel / CodeIgniter / plain PHP / WordPress, including the minimal php-cs-fixer/phpstan/PHPUnit tooling the org Quality Gate needs.", keywords `["php", "laravel", "codeigniter", "wordpress", "jenkins", "sonarqube", "org-standard"]`, marketplace description สั้นแบบเดียวกัน
- [ ] **Step 2:** ตรวจ JSON ทั้ง 2 + Commit — `feat(php): scaffold ugt-php-platform v0.1.0 + marketplace entry`

### Task 14: Jenkinsfile (PHP)

**Files:**
- Create: `plugins/ugt-php-platform/skills/ugt-php-cicd-setup/assets/Jenkinsfile`

**Interfaces:**
- Consumes: Jenkinsfile ของ python (Task 5) เป็นฐาน — โครง/stage เหมือนกันทุกอย่าง ต่างเฉพาะรายการนี้
- Produces: ใช้ CI image ชื่อ `__PROJECT_NAME__-ci` ที่ build จาก `Dockerfile.ci` (Task 15)

- [ ] **Step 1:** คัดลอก Jenkinsfile python แล้วแก้:
  - **Install:** build CI image ก่อน (มี pcov+composer — Task 15) แล้วติดตั้ง dependency:

```groovy
        stage('Install') {
            steps {
                script {
                    // CI image = php + pcov + composer (Dockerfile.ci) — build ครั้งแรกช้า ครั้งถัดไปโดน cache
                    sh 'docker build -f Dockerfile.ci -t __PROJECT_NAME__-ci .'
                    docker.image('__PROJECT_NAME__-ci').inside {
                        // [WP] legacy/WordPress ที่ composer.json มีแต่ dev tooling — ใช้บรรทัดเดียวกันได้
                        sh 'composer install --no-interaction --no-progress'
                    }
                }
            }
        }
```

  - **Code Quality** (parallel 3, ทุก branch `.inside` CI image): Lint → `sh 'find . -path ./vendor -prune -o -name "*.php" -print0 | xargs -0 -n1 php -l > /dev/null'` · Format Check → `sh 'vendor/bin/php-cs-fixer fix --dry-run --diff'` · Static Analysis → `sh 'vendor/bin/phpstan analyse --no-progress'`
  - **Unit Tests:** `.inside` CI image → `sh 'vendor/bin/phpunit --coverage-clover clover.xml --coverage-html coverage'` (junit path มาจาก phpunit.xml — Task 16); post junit path เดิม `test-results/junit.xml`, publishHTML reportDir `coverage`
  - **Build:** echo absorbed (ข้อความเดียวกับ python)
  - **OWASP:** `--exclude "vendor/**"` แทน `.venv`
  - **Deploy [DB]:** สลับ migrate เป็น `docker run --rm --env-file .env ${imageName}:${buildNum} php artisan migrate --force` พร้อมคอมเมนต์: `[DB] Laravel เท่านั้น — CodeIgniter/legacy/WP ไม่มี migration มาตรฐาน ให้ลบบล็อกนี้`
  - ป้าย `[BATCH]` ไม่มีใน PHP — ตัดบล็อกนั้นทิ้ง; เพิ่มป้าย `[WP]` ตรง volume: wp-content บังคับ mount
- [ ] **Step 2:** brace-balance check (คำสั่งเดียวกับ Task 5 Step 2 เปลี่ยน path) + ตรวจ 10 stages
- [ ] **Step 3: Commit** — `feat(php): Jenkinsfile 10 stages — CI image มี pcov, migrate เฉพาะ Laravel`

### Task 15: Dockerfiles + compose (PHP)

**Files:**
- Create: `assets/docker/Dockerfile.web`, `assets/docker/Dockerfile.wordpress`, `assets/docker/Dockerfile.ci`
- Create: `assets/docker-compose.yml`, `assets/docker-compose.dev.yml`

**Interfaces:**
- Produces: container port ภายใน = **80** (apache) — compose/healthcheck ใช้ค่านี้; CI image `Dockerfile.ci` ที่ Task 14 build

- [ ] **Step 1: Dockerfile.web:**

```dockerfile
# Org-standard PHP web Dockerfile — Laravel / CodeIgniter / plain PHP (apache)
FROM php:8.3-apache
WORKDIR /var/www/html

# [DB] เปิด extension ตาม DB ของโปรเจค — เลือกบรรทัดเดียว ลบที่เหลือ:
# RUN docker-php-ext-install pdo_mysql
# RUN pecl install sqlsrv pdo_sqlsrv && docker-php-ext-enable sqlsrv pdo_sqlsrv   # SQL Server (ต้องมี msodbcsql — ดู references/docker-deploy.md)

RUN a2enmod rewrite

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY composer.json composer.lock* ./
# legacy ที่ composer มีแต่ dev tooling: --no-dev จะไม่ติดตั้งอะไร — ถูกต้องแล้ว
RUN composer install --no-dev --no-interaction --no-progress || true

COPY . .
RUN chown -R www-data:www-data /var/www/html

# [LARAVEL] DocumentRoot ชี้ public/ — ลบ 2 บรรทัดนี้ถ้าไม่ใช่ Laravel/CI4
# RUN sed -ri 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf
# RUN sed -ri 's!/var/www/!/var/www/html/public!g' /etc/apache2/apache2.conf

EXPOSE 80

# apache image ไม่มี curl/wget เสมอไป — ใช้ php ยิง 127.0.0.1
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD php -r 'exit(@file_get_contents("http://127.0.0.1:80/api/health") !== false ? 0 : 1);' || exit 1
```

- [ ] **Step 2: Dockerfile.wordpress:**

```dockerfile
# Org-standard WordPress Dockerfile — wp-content เป็น volume บังคับ (ดู compose)
FROM wordpress:php8.3-apache
# วาง org health endpoint ลง webroot ของ image (นอก wp-content — รอด volume mount)
COPY api/health/index.php /var/www/html/api/health/index.php
RUN chown -R www-data:www-data /var/www/html/api
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD php -r 'exit(@file_get_contents("http://127.0.0.1:80/api/health") !== false ? 0 : 1);' || exit 1
```

- [ ] **Step 3: Dockerfile.ci:**

```dockerfile
# CI-only image — ใช้ใน Jenkins stage Install/Quality/Tests เท่านั้น ห้าม deploy
FROM php:8.3-cli
RUN pecl install pcov && docker-php-ext-enable pcov
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
```

- [ ] **Step 4: compose ×2** — โครงเดียวกับ python (Task 6 Step 3-4) แก้: port map `:80`, healthcheck ใช้ php one-liner, `[VOLUME]` ฝั่ง container เป็น `/var/www/html/<name>`, เพิ่มบล็อก `[WP]` (ไม่คอมเมนต์เมื่อ shape = WordPress):

```yaml
    # [WP] WordPress: wp-content เป็น volume บังคับ — ห้ามลบบล็อกนี้เมื่อใช้ shape WP
    # volumes:
    #   - /srv/appdata/__PROJECT_NAME__/wp-content:/var/www/html/wp-content
```

- [ ] **Step 5: Commit** — `feat(php): Dockerfile web/wordpress/ci + compose — apache port 80`

### Task 16: health + tooling ขั้นต่ำ (PHP)

**Files:**
- Create: `assets/health/index.php` (target: `api/health/index.php` ในโปรเจค)
- Create: `assets/tooling/phpstan.neon`, `assets/tooling/.php-cs-fixer.php`, `assets/tooling/phpunit.xml`, `assets/tooling/composer-require-dev.md`, `assets/tooling/SmokeTest.php`

- [ ] **Step 1: health/index.php:**

```php
<?php
// org /api/health — 200 healthy / 503 degraded · ห้ามใส่ version/commit · ไม่ต้อง login
declare(strict_types=1);
$ok = true;
// [DB] เช็ค DB แบบถูก (SELECT 1) แล้ว $ok = false เมื่อพัง
http_response_code($ok ? 200 : 503);
header('Content-Type: application/json');
echo json_encode(['status' => $ok ? 'healthy' : 'degraded']);
```

  (คอมเมนต์ในไฟล์: Laravel ไม่ใช้ไฟล์นี้ — ใช้ `Route::get('/api/health', ...)` โค้ดเดียวกันใน routes/web.php แทน)
- [ ] **Step 2: phpstan.neon:** `parameters: { level: 0, paths: [.], excludePaths: [vendor, tests] }` · **.php-cs-fixer.php:** PSR-12 ruleset, finder exclude `vendor` · **phpunit.xml:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" bootstrap="vendor/autoload.php" colors="true">
  <testsuites>
    <testsuite name="default"><directory>tests</directory></testsuite>
  </testsuites>
  <logging>
    <junit outputFile="test-results/junit.xml"/>
  </logging>
  <source>
    <include><directory>.</directory></include>
    <exclude><directory>vendor</directory><directory>tests</directory></exclude>
  </source>
</phpunit>
```

  (coverage flags อยู่ฝั่ง Jenkinsfile แล้ว — Task 14 รัน `vendor/bin/phpunit --coverage-clover clover.xml --coverage-html coverage`; phpunit.xml ถือเฉพาะ junit)
- [ ] **Step 3: composer-require-dev.md** — บอกคำสั่งที่ skill รันในโปรเจคเป้าหมาย: `composer require --dev friendsofphp/php-cs-fixer phpstan/phpstan phpunit/phpunit` + กรณี legacy ไม่มี composer.json: `composer init --no-interaction --name org/__PROJECT_NAME__` ก่อน
- [ ] **Step 4: SmokeTest.php:**

```php
<?php
// smoke test ขั้นต่ำให้ pipeline รันผ่าน — ไม่ใช่ test suite จริง
// โค้ดใหม่หลังจากนี้ต้องมี test คู่กันตาม Quality Gate (coverage โค้ดใหม่ ≥ 60%)
use PHPUnit\Framework\TestCase;

final class SmokeTest extends TestCase
{
    public function testEntryPointExists(): void
    {
        $this->assertFileExists(__DIR__ . '/../__ENTRY_FILE__');
    }
}
```

- [ ] **Step 5: Commit** — `feat(php): health endpoint + tooling ขั้นต่ำ phpstan/php-cs-fixer/phpunit`

### Task 17: sonar + owasp + admin-handoff + rules (PHP)

**Files:**
- Create: `assets/sonar-project.properties`, `assets/owasp-suppressions.xml`, `assets/admin-handoff.template.md`, `assets/rules/ugt-php-ci.md`

- [ ] **Step 1: sonar-project.properties** — เหมือน python แก้ 3 จุด: exclusions `**/vendor/**,**/tests/**,**/coverage/**,**/dc-report/**,**/test-results/**,**/wp-admin/**,**/wp-includes/**` (2 ตัวหลังสำหรับ WP — ไม่สแกน core ของ WordPress), ตัด `sonar.python.*` ใส่ `sonar.php.coverage.reportPaths=clover.xml` + `sonar.php.tests.reportPath=test-results/junit.xml`
- [ ] **Step 2:** owasp-suppressions.xml (copy จาก python), admin-handoff (copy จาก python — เนื้อหาเหมือนกันทั้งหมด ไม่มีรายการเพิ่ม), rules/ugt-php-ci.md (เนื้อหาเดียวกับ ugt-python-ci.md + 1 ข้อ: "WordPress: wp-content ต้องเป็น volume เสมอ และห้ามสแกน wp-admin/wp-includes ใน Sonar")
- [ ] **Step 3: Commit** — `feat(php): sonar/owasp/admin-handoff/rules assets`

### Task 18: references (PHP)

**Files:**
- Create: `references/docker-deploy.md`, `references/legacy-test-generation.md`

- [ ] **Step 1: docker-deploy.md** — โครงเดียวกับ python (Task 9) แทนเนื้อ stack: (ก) ตาราง branch เดิม (ข) **WordPress**: wp-content volume บังคับ + upgrade path (core อัปเดตผ่าน image ใหม่ ไม่ใช่ auto-update ใน container — ปิด `WP_AUTO_UPDATE_CORE`) (ค) **SQL Server จาก PHP**: pdo_sqlsrv ต้องมี msodbcsql18 — บรรทัด Dockerfile ที่ใช้จริง (`curl` MS repo + `ACCEPT_EULA=Y apt-get install msodbcsql18`) (ง) gotcha: `.dockerignore` ต้องมี `vendor`, `coverage`, `dc-report`, `test-results` · php -l หา syntax error ก่อน phpstan เสมอ (เร็วกว่า) · Laravel ต้อง `php artisan config:cache` ใน image? — **ไม่ทำใน v0.1** (env มาจาก runtime .env — cache ที่ build time จะฝัง secret) เขียนเหตุผลนี้ลงไฟล์
- [ ] **Step 2: legacy-test-generation.md** — เนื้อหาเดียวกับ python ฉบับ PHP (PHPUnit, mock ที่ขอบ, รายงาน coverage จาก clover) รวมคำเตือน 2 ข้อเดิม
- [ ] **Step 3: Commit** — `feat(php): references — docker-deploy (WP/sqlsrv) + legacy-test-generation`

### Task 19: SKILL.md (PHP) + drift entries

**Files:**
- Create: `plugins/ugt-php-platform/skills/ugt-php-cicd-setup/SKILL.md`
- Modify: `scripts/check-contract-drift.mjs`

- [ ] **Step 1: SKILL.md** — โครงเดียวกับ Task 10 ฉบับ PHP: frontmatter description trigger "ทำ CI/CD ให้โปรเจค php", "deploy laravel/wordpress ด้วย docker", "ตั้ง jenkins ให้ php" + Not-for ชี้ python/nextjs · §2 restate contract ชุดเดียวกันเป๊ะ · §3 อ่าน codebase (หา `artisan`/`system/`CodeIgniter/`wp-config.php`/`public/index.php`) · §4 Interview 8 ข้อ (shape: laravel/codeigniter/legacy/wordpress) · §5 ตาราง copy + placeholder (`__ENTRY_FILE__` แทน `__APP_MODULE__`/`__START_CMD_JSON__`; ไม่มี `[BATCH]` มี `[WP]`/`[LARAVEL]`) · ป้าย "ยังไม่ผ่าน pilot" ทุก shape
- [ ] **Step 2: drift check** — `const PHP = 'plugins/ugt-php-platform/skills';` + เติม SKILL.md ของ php เข้า entry เดียวกับที่ Task 10 ทำ
- [ ] **Step 3:** `node scripts/check-contract-drift.mjs` exit 0 + Commit — `feat(php): SKILL.md ugt-php-cicd-setup + drift coverage`

### Task 20: verify.mjs (PHP) + fixture test

**Files:**
- Create: `plugins/ugt-php-platform/skills/ugt-php-cicd-setup/scripts/verify.mjs`

- [ ] **Step 1:** ฐานจาก verify.mjs ของ python (Task 11) แก้: CI_FILES เพิ่ม `Dockerfile.ci`, `phpunit.xml`, `phpstan.neon` · เช็ค tooling: phpunit.xml มี junit outputFile `test-results/junit.xml` · sonar มี `sonar.php.coverage.reportPaths=clover.xml` · health: grep `/api/health` ใน `**/*.php` (ข้าม vendor) หรือ route ใน routes/*.php · [DB] จาก `artisan` vs `[DB]` ใน Jenkinsfile · [WP] ถ้า FROM wordpress → compose ต้องมี wp-content volume (FAIL ถ้าไม่มี) · volume ใต้ /srv/appdata (เช็คเดิม)
- [ ] **Step 2:** fixture 2 เคสแบบ Task 11 Step 2 (เคสผ่าน / เคสลบ tests → ต้อง FAIL)
- [ ] **Step 3: Commit** — `feat(php): verify.mjs — ทดสอบผ่าน fixture`

### Task 21: evals (PHP)

**Files:**
- Create: `evals/evals.json`, `evals/trigger-evals.json`

- [ ] **Step 1:** แบบ Task 12 ฉบับ PHP — S: "ทำ CI/CD ให้โปรเจค laravel", "deploy wordpress บน docker ตามมาตรฐาน", "โปรเจค php เก่าไม่มี composer อยาก deploy", "pipeline php ตกที่ Quality Gate", "wp-content หายทุกครั้งที่ deploy ใหม่" (อันนี้ต้องมาที่ skill นี้ — volume), "ตั้ง sonar ให้ php" · N: nextjs → nextjs-cicd, python → python-cicd, "แก้โค้ด php ให้ sonar ไม่ฟ้อง" → none (ยังไม่มี php clean-code — ระบุใน purpose), "อยากได้หน้า login ให้ php" → none
- [ ] **Step 2:** JSON parse + Commit — `feat(php): evals + trigger-evals`

---

## Phase 4 — เอกสาร repo + ปิดงาน

### Task 22: อัปเดต multi-stack-proposal + README

**Files:**
- Modify: `docs/multi-stack-proposal.md`
- Modify: `README.md`

- [ ] **Step 1: multi-stack-proposal.md** — (ก) หัวไฟล์บล็อกสถานะ: อัปเดต Last-reviewed เป็นวันที่ทำจริง + เปลี่ยนข้อความ "ยังไม่มี plugin ตามข้อเสนอ" → "Python: ส่วน cicd ทำแล้ว (v0.1.0, ยังไม่ผ่าน pilot — ดู spec 2026-08-11); ส่วน database/auth/quality ยังเป็น backlog ตามเดิม; React SPA ยังไม่ทำ" (ข) §2: เพิ่ม note ใต้หัว section ชี้ว่า D5–D7 ถูกเคาะแล้วใน spec 2026-08-11 (มติ M5/M6/M8 + pip/venv, /api/health) — D1–D3 ยังเปิด (ค) เพิ่ม section ใหม่ `## 4. ugt-php-platform` สั้น ๆ: สถานะเดียวกับ Python (cicd แล้ว, ที่เหลือ backlog), มติสำคัญอ้าง spec, decision ที่ยังเปิดของ PHP (framework ORM/auth เมื่อจะทำ skill ต่อ)
- [ ] **Step 2: README.md** — หา section ที่ list plugin ทั้ง 3 ตัว (grep `ugt-nextjs-standard`) แล้วเพิ่ม 2 แถว/หัวข้อสำหรับ plugin ใหม่ พร้อมป้าย "v0.1.0 — ยังไม่ผ่าน pilot" + ประโยคเดียวอธิบาย scope (deploy-only) — ตาม format ที่ README ใช้อยู่
- [ ] **Step 3: Commit** — `docs: อัปเดต multi-stack-proposal (python/php cicd ทำแล้ว) + README plugin ใหม่ 2 ตัว`

### Task 23: ตรวจปิดงานทั้ง repo

- [ ] **Step 1:** `node scripts/check-contract-drift.mjs` — ทุก check ผ่าน (ตอนนี้ครอบ 4 ไฟล์: contract + nextjs + python + php)
- [ ] **Step 2:** `node --check` ทุก verify.mjs ใหม่ (python + php) และ JSON.parse marketplace + plugin.json ทั้ง 2
- [ ] **Step 3:** รัน fixture verify ทั้ง 2 ภาษาอีกรอบ (เคสผ่านต้อง exit 0)
- [ ] **Step 4:** `git log --oneline` ตรวจว่า commit เรียงตาม task และไม่มีไฟล์ตกค้าง (`git status` clean)
- [ ] **Step 5:** รายงานผู้ใช้: สรุปสิ่งที่สร้าง + ขั้นถัดไปคือ **pilot ภาษาละ 1 โปรเจคจริงก่อน tag** (เงื่อนไขจาก spec §7 — งานนอก repo นี้)
