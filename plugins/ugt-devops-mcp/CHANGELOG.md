# Changelog — ugt-devops-mcp

## 0.1.4 (2026-11-16)

- **Jenkins เรียกไม่ได้บนเครื่อง user ทั้งที่ `/mcp` ขึ้น connected** — connected แปลว่าแค่โปรเซสเปิดขึ้นได้ (ตอนเปิดยังไม่ได้เรียก server) ทุก tool ตอบ `fetch failed` · สาเหตุจริง: `ugtweb.ube.co.th` ส่งมาแค่ cert ใบ leaf (`*.ube.co.th`) **ไม่ส่ง intermediate** `RapidSSL TLS RSA CA G1` (openssl: `unable to verify the first certificate`) · Node ใช้แค่ root ที่ bundle มาเลยต่อ chain ไม่ได้ → `UNABLE_TO_VERIFY_LEAF_SIGNATURE` · เครื่อง dev ผ่านตอน pilot เพราะ Claude Code ส่ง `NODE_USE_SYSTEM_CA=1` มาให้ child process และ Windows cache intermediate ไว้ใน `CurrentUserCA` แล้ว · แก้: ใส่ `NODE_OPTIONS=--use-system-ca` ใน env ของทั้งสอง server ใน `plugin.json` ให้ Node อ่าน cert store ของ Windows เอง (ทดสอบแล้ว: ปิด `NODE_USE_SYSTEM_CA` → fail · ใส่ flag → 200) · **ต้องใช้ Node ≥ 22.15**: Node เก่ากว่านี้ไม่รู้จัก flag ทำให้ server เปิดไม่ขึ้น · **ยังเหลือ:** ถ้าเครื่องไหนไม่มี intermediate ใน store จะยังพัง ต้องแก้ที่ต้นเหตุคือให้ admin ตั้ง reverse proxy ของ `ugtweb` ให้ส่ง full chain
- **error บอกสาเหตุจริง** — เดิม tool ตอบแค่ `fetch failed` เพราะรหัสจริงอยู่ใน `err.cause` · ตอนนี้ `getJson` แนบรหัส (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `ENOTFOUND`, `ECONNREFUSED`, …) + origin ของ server และถ้าเป็นเรื่อง cert จะบอกวิธีแก้ (Node ≥ 22.15 + CA อยู่ใน cert store หรือ `NODE_EXTRA_CA_CERTS`) · test ใหม่ใน `http.test.mjs`
- ทดสอบบนเครื่อง dev (Node 22.22): `list_jobs` ผ่าน flag ใหม่กับ Jenkins จริงได้ · sonarqube server เปิดขึ้นพร้อม flag · host ที่ cert self-signed ขึ้นข้อความใหม่ถูกต้อง · ยังไม่ได้ลองบนเครื่อง user ที่เจอปัญหา

## 0.1.3 (2026-11-12)

- **แก้คำอธิบายที่เก็บ token** — 0.1.0 เขียนว่าเก็บใน credential store / Credential Manager ของเครื่อง แต่ pilot บน Windows พบว่า Claude Code เก็บ `sensitive` userConfig ไว้ใน `~/.claude/.credentials.json` (คีย์ `pluginSecrets`, ไฟล์เดียวกับ token login ของ Claude Code) ไม่ใช่ Windows Credential Manager · ค่าไม่ลับ (URL, user) อยู่ `~/.claude/settings.json` คีย์ `pluginConfigs` · ทั้งคู่อยู่ถาวรข้าม restart/update · แก้ `plugin.json`, `marketplace.json`, README
- **ผล pilot บนเครื่อง dev (Windows 11)** — `claude mcp remove` ตัวเก่า → hook เงียบ · `claude plugin install … --config` ตั้ง URL/user ได้จาก CLI, token ใส่ผ่าน `/plugin` configure · install รวม npm ใช้ 55 วินาที (เฉียด timeout 60) · ทุก tool ตอบผ่าน server ของ plugin: `list_jobs` (36 job), `get_build`, `get_quality_gate_status` · ยังไม่ได้ดูข้อความเตือนของ hook ใน UI จริง และพฤติกรรมตอน uninstall

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
