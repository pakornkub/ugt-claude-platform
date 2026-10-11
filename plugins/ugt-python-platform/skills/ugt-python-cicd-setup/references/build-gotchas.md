# Build gotchas — `.dockerignore` กัน `.venv` และ secret

กับดักตอน build image: artifact ของ CI stage ก่อนหน้าและ `.env` ต้องไม่หลุดเข้า build context / image layer

## `.dockerignore` — `.venv` ต้องไม่เข้า build context

สเตจ Install ของ Jenkinsfile สร้าง `.venv` ไว้ใน workspace (`python -m venv
.venv` แล้ว pip install ข้างใน — ดู มติ M8 ใน `assets/rules/ugt-python-ci.md`)
เพื่อให้ toolchain รันข้าม stage ได้โดยไม่ต้อง install ซ้ำทุกครั้ง ผลข้างเคียง
คือ `.venv/` **อยู่ใน workspace เดียวกับที่ Docker Build stage ใช้เป็น build
context** (`docker build ... .`) — ถ้าไม่กันไว้ `.venv` (มักเกิน 100 MB, มี
ไบนารีเฉพาะ platform ของ Jenkins agent) จะถูกส่งเข้า build context ทำให้
`docker build` ช้าลงมาก และเสี่ยงหลุดเข้า layer ของ image โดยไม่ตั้งใจถ้า
Dockerfile มี `COPY . .` แบบกว้าง (ทั้งสอง Dockerfile ในชุดนี้ใช้ `COPY . .`
จริง)

ต้องมี `.dockerignore` ที่ root โปรเจค กันไฟล์ที่เกิดจาก CI stage ก่อนหน้า
ไม่ให้หลุดเข้า image:

```
.venv
coverage
dc-report
test-results
.env
.env.*
!.env.example
```

สี่รายการแรกตรงกับ artifact ที่สเตจ Install/Unit Tests/OWASP สร้างไว้ในสเตจ
ก่อน Docker Build ตามลำดับ (`.venv` จาก Install, `coverage`/`test-results` จาก
Unit Tests — path มาจาก `[tool.pytest.ini_options]` ใน `pyproject.toml`,
`dc-report` จาก OWASP Dependency Check) — ไม่มีชิ้นไหนควรอยู่ใน production
image เลย

สาม `.env` ที่เหลือกันคนละความเสี่ยง: ไม่ใช่ context โต แต่เป็น secret รั่ว —
`.env` จริงที่อยู่ในเครื่อง dev หรือหลงเหลือใน workspace ของ Jenkins agent
ถ้าไม่ถูกกัน จะถูก `COPY . .` ฝังลง image layer แบบถาวร (Docker layer เป็น
append-only — ลบไฟล์ใน layer ถัดไปก็ยังดึง layer เก่ามาดู secret ได้)
