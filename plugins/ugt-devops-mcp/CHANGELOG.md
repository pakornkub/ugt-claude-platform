# Changelog — ugt-devops-mcp

## 0.1.2 (2026-11-12)

- **SessionStart hook เตือน MCP เก่าจากสคริปต์** — เดิมวิธีลบอยู่แค่ใน README คนติดตั้ง plugin โดยไม่อ่านได้ tool ซ้ำสองชุด + ตัวเก่ายังอ่าน token จาก env var ข้อความเปล่า → `scripts/check-legacy-mcp.mjs` อ่าน `~/.claude.json` (ไม่แก้ไฟล์) หา server ที่ชี้ `.claude/mcp-servers/{jenkins,sonarqube}-mcp/` ทั้งระดับ user และใต้ `projects` แล้วพิมพ์คำสั่งลบตาม scope ที่เจอจริง (`-s user` / `cd` + `-s local`) · เงียบเมื่อไม่เจอหรืออ่านไฟล์ไม่ได้ · ทดสอบกับเครื่อง dev: เจอ 2 ตัวระดับ user, ~160ms

## 0.1.1 (2026-11-12)

- **eval หลัง merge (#48)** — รันทุก tool กับ Jenkins + SonarQube 26.10 ของจริงผ่าน stdio (อ่านอย่างเดียว): `list_jobs`, `get_build` (+stages), `get_console_log` (tail จาก log 186K ตัวอักษร), `get_quality_gate_status`, `list_issues` ผ่านหมด · Jenkins อยู่หลัง base path `/jenkins/` → relative join ใช้ได้จริง
- error 404/401 จาก Jenkins เดิมแนบ HTML ทั้งหน้า (มี CSRF crumb) เข้า error → ตัด body ที่เป็น HTML ทิ้ง เหลือแค่ status + path
- ทุก request มี timeout 30 วินาที (เดิม server ค้าง = tool ค้างจน Claude Code ตัด)
- `list_issues` ใช้ `components` แทน `componentKeys` (deprecated ตั้งแต่ SonarQube 10.2 — ทดสอบแล้วกรองได้ผลเท่ากันบน 26.10)
- `get_build` ดึงข้อมูล build กับ stages พร้อมกัน · คำอธิบาย `job` บอกวิธีเขียน branch ที่มี `/` ของ multibranch (`%2F`)
- README: วิธีลบ MCP เก่าที่สคริปต์ผูกไว้ระดับโปรเจค (`-s local`) · `SONAR_TOKEN` ลบเฉพาะถ้าไม่ใช้ sonar-scanner · ขั้น release ข้อ 7 เพิ่ม `ugt-devops-mcp` เข้ารายการ "ยังไม่ tag จนกว่าจะผ่าน pilot"
- ยังไม่แก้: `get_console_log` ยังโหลด log ทั้งไฟล์แล้วตัดท้าย (186K ตัวอักษรใช้ ~0.3 วินาที รับได้) · ไม่มีเช็ค Node ≥ 18

## 0.1.0 (2026-11-12)

- **plugin ใหม่ แทนสคริปต์ `install-jenkins-mcp.ps1` / `install-sonarqube-mcp.ps1`** — MCP Jenkins (`list_jobs`, `get_build` + stages, `get_console_log`) และ SonarQube (`list_issues`, `get_quality_gate_status`) แบบอ่านอย่างเดียว ย้ายโค้ดเดิมมา แก้ปัญหาของสคริปต์:
  - สคริปต์ text-patch `.claude.json` หา `"mcpServers"` ตัวแรก ซึ่งในเครื่องที่เคยเปิดโปรเจคมาแล้วเป็นของ `projects` → MCP ผูกกับโปรเจคเดียว → plugin ลงทะเบียนให้เอง
  - token เก็บเป็น user env var ข้อความเปล่า + `Read-Host` โชว์บนจอ → `userConfig` แบบ `sensitive` เก็บใน credential store ของเครื่อง
  - ชื่อ env ของ Sonar ไม่ตรงกันระหว่างเวอร์ชันสคริปต์ (`SONAR_*` กับ `SONARQUBE_*`) → ใช้ `SONARQUBE_*` ที่เดียว ผู้ใช้ไม่ต้องตั้งเอง
  - Sonar ใช้ `new URL(path, HOST)` ตัด base path ทิ้ง (`https://host/sonar/`) → relative join แบบเดียวกับ Jenkins (`mcp/http.mjs`)
  - `zod` ไม่อยู่ใน dependencies (อาศัยติดมากับ SDK) + `^` ไม่มี lockfile → pin `@modelcontextprotocol/sdk` 1.30.0 / `zod` 4.6.5 + `package-lock.json` (Claude Code ติดตั้งให้ตอน install/update)
- ตัวอย่าง projectKey ใน tool description เปลี่ยนเป็น `my-app` (เดิมเป็นชื่อโปรเจคจริง — รีโปนี้ public)
- รอ pilot: ยืนยันบน Windows ว่าถาม `userConfig` ตอน enable + token ไปอยู่ Credential Manager · `npm install` ในเครื่องที่ dev ใช้ ~47 วินาที (95 แพ็กเกจ) ใกล้ timeout 60 วินาทีของ plugin install — ถ้าเกินบนเครือข่ายบริษัท ให้ bundle เป็นไฟล์เดียวแทน
