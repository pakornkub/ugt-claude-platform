# Changelog — ugt-devops-mcp

## 0.1.0 (2026-11-12)

- **plugin ใหม่ แทนสคริปต์ `install-jenkins-mcp.ps1` / `install-sonarqube-mcp.ps1`** — MCP Jenkins (`list_jobs`, `get_build` + stages, `get_console_log`) และ SonarQube (`list_issues`, `get_quality_gate_status`) แบบอ่านอย่างเดียว ย้ายโค้ดเดิมมา แก้ปัญหาของสคริปต์:
  - สคริปต์ text-patch `.claude.json` หา `"mcpServers"` ตัวแรก ซึ่งในเครื่องที่เคยเปิดโปรเจคมาแล้วเป็นของ `projects` → MCP ผูกกับโปรเจคเดียว → plugin ลงทะเบียนให้เอง
  - token เก็บเป็น user env var ข้อความเปล่า + `Read-Host` โชว์บนจอ → `userConfig` แบบ `sensitive` เก็บใน credential store ของเครื่อง
  - ชื่อ env ของ Sonar ไม่ตรงกันระหว่างเวอร์ชันสคริปต์ (`SONAR_*` กับ `SONARQUBE_*`) → ใช้ `SONARQUBE_*` ที่เดียว ผู้ใช้ไม่ต้องตั้งเอง
  - Sonar ใช้ `new URL(path, HOST)` ตัด base path ทิ้ง (`https://host/sonar/`) → relative join แบบเดียวกับ Jenkins (`mcp/http.mjs`)
  - `zod` ไม่อยู่ใน dependencies (อาศัยติดมากับ SDK) + `^` ไม่มี lockfile → pin `@modelcontextprotocol/sdk` 1.30.0 / `zod` 4.6.5 + `package-lock.json` (Claude Code ติดตั้งให้ตอน install/update)
- ตัวอย่าง projectKey ใน tool description เปลี่ยนเป็น `my-app` (เดิมเป็นชื่อโปรเจคจริง — รีโปนี้ public)
- รอ pilot: ยืนยันบน Windows ว่าถาม `userConfig` ตอน enable + token ไปอยู่ Credential Manager · `npm install` ในเครื่องที่ dev ใช้ ~47 วินาที (95 แพ็กเกจ) ใกล้ timeout 60 วินาทีของ plugin install — ถ้าเกินบนเครือข่ายบริษัท ให้ bundle เป็นไฟล์เดียวแทน
