# Verification Checklist (Python)

รายการตรวจเต็มหลัง setup เสร็จ — SKILL.md §7 ชี้มาที่นี่ (ฝั่ง repo · ฝั่ง server · รันจริง)

เนื้อหา: รัน `verify.mjs` · สิ่งที่ script ไม่ตรวจโดยตั้งใจ · ไฟล์ในโปรเจค · ฝั่ง server (admin ยืนยัน) · รันจริง

**รัน script ก่อน** (cwd = root ของโปรเจคปลายทาง):

```bash
node <skill-dir>/scripts/verify.mjs
```

ครอบฝั่ง repo ให้ทั้งหมด (placeholder ตกค้าง, ครบ 10 stages + `emailext` ×4,
brace balance หลังลบบล็อก, shape `[WEB]`/`[BATCH]` ตรงกันทั้ง Dockerfile /
Jenkinsfile / compose, `CMD` เป็น JSON array, `mkdir -p` ↔ bind, path ใน
`sonar.sources` มีจริง, compose, tooling, health, ไฟล์ที่ SKILL.md §5.1 copy มาครบ) —
ฝั่ง server ยังต้องให้ admin ยืนยันเอง

> **ทุก check ที่อ่าน Jenkinsfile / Dockerfile / compose อ่านเฉพาะบรรทัดที่ยัง
> ทำงานจริง** (ตัดคอมเมนต์ออกก่อน) — ไฟล์ template พก legend + บล็อกทางเลือกของ
> อีก shape ไว้เป็นคอมเมนต์ถาวร ถ้าอ่านดิบ ๆ ป้าย `[DB]`/`[WEB]`/`volumes:` และ
> ชื่อ volume ตัวอย่างจะทำให้ check ผ่านฟรีทั้งที่ไม่ได้ตั้งค่าอะไรเลย

**ไม่ตรวจโดยตั้งใจ (out of scope ของ script — ต้องตรวจเอง):**

- **พฤติกรรมตอนรันจริงของ `/api/health`** — script พิสูจน์แค่ว่า route/ไฟล์มีจริง
  และไม่ส่ง version/commit; ส่วน "เข้าได้โดยไม่ต้อง login" กับ "200 healthy /
  503 degraded" ต้องยิงจริงตามหัวข้อ **รันจริง** ท้ายหน้านี้
- **[subpath] เปิดผ่าน URL เต็มหลัง proxy** — script ตรวจได้แค่ว่า
  `ROOT_PATH`/`SCRIPT_NAME`/`FORCE_SCRIPT_NAME` ตั้งครบทั้ง 2 compose หรือไม่ตั้ง
  เลย (ตั้งข้างเดียว = fail) ตัวค่าที่ถูกต้องพิสูจน์ได้ทางเดียวคือเปิดจริง
- **SKILL.md §5.6 toolchain ในเครื่อง** (`ruff` / `mypy` / `pytest`) — ต้องมี `.venv`
  จริงถึงจะรู้ผล script ไม่รันแทนให้
- **ค่าใน `.env` / `.env.dev`** — เช็คแค่ว่ามีไฟล์และมี `APP_PORT` (เตือน ไม่
  fail เพราะ clone ใหม่ยังไม่มีทั้งคู่ตามปกติ) · **ไม่อ่านค่า secret ใด ๆ**
- **ฝั่ง server ทั้งหมด** (Jenkins tools/credentials/global env, docker group,
  SonarQube projects + gate, webhook, host cron ของตาราง cron `[CRON]`) — อยู่นอก repo

**ไฟล์ในโปรเจค:**

- [ ] `Jenkinsfile` ครบ 10 stages + post (emailext ×4 + `cleanWs`) — ไม่มี
      `__*__` ค้าง
- [ ] บล็อก `[DB]` / `[VOLUME]` / `[WEB]` / `[BATCH]` คงหรือถูกลบตรงตามคำตอบ
      interview — และ Groovy ยัง parse ผ่านหลังลบ (brace ครบ)
- [ ] `Dockerfile` มาจาก shape ที่ถูก (`Dockerfile.web` = มี `EXPOSE 8000` +
      `HEALTHCHECK` · `Dockerfile.batch` = ไม่มีทั้งคู่) · `CMD` เป็น JSON array
      จริง ไม่ใช่ `__START_CMD_JSON__` ค้าง
- [ ] health endpoint (shape web): `/api/health` มีจริงในซอร์ส · เข้าได้โดยไม่
      ต้อง login · 200 healthy / 503 degraded · ไม่มี version/commit ใน response
- [ ] [subpath] เปิดแอป**ผ่าน URL เต็มหลัง reverse proxy** ได้จริง (ตั้ง
      `root_path`/`SCRIPT_NAME`/`FORCE_SCRIPT_NAME` ตาม SKILL.md §5.3 แล้ว) — ทดสอบแค่
      `localhost:port` ตรง ๆ ผ่านเสมอแม้ config ผิด จึงพิสูจน์อะไรไม่ได้
- [ ] `sonar-project.properties`: `sonar.projectKey`/`projectName` แทนค่าแล้ว ·
      **ทุก path ใน `sonar.sources`/`sonar.tests` มีอยู่จริงในโปรเจค** ·
      `sonar.python.coverage.reportPaths=coverage.xml`
- [ ] `owasp-suppressions.xml` (skeleton ว่าง) อยู่ที่ root
- [ ] compose ทั้ง 2 ไฟล์: `pull_policy: never` · `APP_PORT` override ได้ ·
      healthcheck ยิง `127.0.0.1:8000` · volume (ถ้ามี) อยู่ใต้ `/home/docker02/appdata/`
- [ ] มี volume → ทุก `<name>` ที่ compose bind **ปรากฏในบรรทัด `for p in` ของ
      บล็อก `[VOLUME]`** ในสเตจ Deploy ด้วย (ไม่ใช่แค่ระดับ `<project>`)
- [ ] `.env` + `.env.dev` มีในเครื่อง ตั้ง `APP_PORT` แล้ว และถูก gitignore จริง
      (`git check-ignore .env .env.dev` → exit 0) · `.env.example` commit แล้ว
      และ **ไม่** ถูก ignore
- [ ] `.venv/bin/ruff format --check .` · `ruff check .` · `mypy .` · `pytest`
      ผ่านครบในเครื่องก่อน push แรก (SKILL.md §5.6) — baseline ที่มีระบุ rule+path+เหตุผล
      ไม่ใช่ปิดยกโปรเจค
- [ ] `pyproject.toml` มี `[tool.ruff]` + `[tool.pytest.ini_options]` ที่ออก
      `test-results/junit.xml` + `coverage.xml`
- [ ] `requirements.txt` + `requirements-dev.txt` อยู่ที่ root คนละไฟล์ ·
      **server ที่ `CMD` เรียก (`gunicorn`/`uvicorn`) อยู่ใน `requirements.txt`
      จริง** (ไม่มี = image build ผ่านแล้วตายตอนรัน — SKILL.md §5.4)
- [ ] shape = django: `whitenoise` อยู่ใน `requirements.txt` · middleware อยู่
      ถัดจาก `SecurityMiddleware` · `STATIC_ROOT` ตั้งแล้ว · `Dockerfile` มี
      `collectstatic --noinput` (ไม่มี = `DEBUG=False` แล้วหน้า admin/CSS โล่ง
      โดยไม่มี error และ health ยังเขียว — SKILL.md §5.4)
- [ ] `tests/` มีอย่างน้อย 1 ไฟล์ `test_*.py` และ `tests/test_smoke.py` import
      `__APP_MODULE__` ตัวจริงได้ (`.venv/bin/pytest` ผ่านในเครื่อง)
- [ ] `.dockerignore` มี `.venv`, `coverage`, `dc-report`, `test-results`,
      `.env`, `.env.*` (+ `!.env.example`)
- [ ] `.claude/rules/ugt-python-ci.md` อยู่ในที่ของมัน
- [ ] `docs/admin-handoff.md` ถูก render แล้ว (ไม่มี `__*__` ค้าง, หัวข้อที่ไม่
      ใช้ถูกลบ)

**ฝั่ง server (admin ยืนยัน) — `docs/admin-handoff.md` ที่ส่งไปครอบรายการนี้
ด้วยชื่อจริงของโปรเจคแล้ว:**

- [ ] Jenkins tool ชื่อตรงเป๊ะ: `SonarQube-Scanner`, `Dependency-Check` ·
      SonarQube server entry ชื่อ `SonarQube`
- [ ] **ปลั๊กอิน Docker Pipeline (`docker-workflow`) ติดตั้งแล้ว** (มติ M8 ใช้
      `docker.image().inside{}`) — ขาดแล้วตายตั้งแต่ Install ด้วย
      `MissingPropertyException: No such property: docker` · คนละเรื่องกับการมี
      Docker CLI บนเครื่อง
- [ ] **Jenkins user อยู่ใน `docker` group** (มติ M8 — ไม่มีข้อนี้ทุก stage พัง
      ตั้งแต่ Install)
- [ ] Credentials ครบ: `nvd`, `env-<project>`, `env-<project>-dev`
- [ ] Global env vars: `NOTIFY_EMAIL`, `SMTP_FROM`
- [ ] webhook ทั้งคู่: GitHub → Jenkins (`/github-webhook/`) และ
      SonarQube → Jenkins (`/sonarqube-webhook/`)
- [ ] SonarQube projects prod+dev สร้างแล้ว + assign Quality Gate ตาม `references/org-standards.md` §4
      ให้ทั้งสอง
- [ ] ปิด Lightweight checkout ใน job config
- [ ] `/home/docker02/appdata` มีอยู่และ Jenkins user เขียนได้ (ครั้งเดียวต่อ server)
- [ ] มี job ตามรอบ: ตั้ง host cron (ตาราง cron ของ handoff) — batch เรียก `docker compose run --rm job` แล้ว
      + ทดสอบรันมือ 1 รอบผ่าน
- [ ] ได้ `APP_PORT` prod/dev ตัวจริงกลับมาแล้ว (ไม่ใช่ค่า placeholder)

**รันจริง:**

- [ ] push `develop` → pipeline เขียวครบ 10 stages · coverage report + DC report
      ขึ้นบนหน้า build
- [ ] shape web: container `healthy` ภายใน 4 นาที · เข้าแอปผ่าน reverse proxy ได้
- [ ] shape batch: สเตจ Deploy import โมดูลหลักจาก image จริงผ่าน · host cron
      รันมือ 1 รอบได้ผลตามคาด
- [ ] อีเมลผลลัพธ์ถึง `NOTIFY_EMAIL`
- [ ] พิสูจน์ว่า gate บล็อกจริง: ใส่ violation เข้าไป 1 จุด → pipeline ต้อง abort
      ที่สเตจ Quality Gate
