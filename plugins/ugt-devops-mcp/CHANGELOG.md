# Changelog — ugt-devops-mcp

## 0.1.6 (2026-11-17)

- **ติดตั้ง/อัปเดตไม่ต้องรัน npm แล้ว** — เดิม plugin มี `package.json` ทำให้ Claude Code รัน `npm ci` ตอน install/update ซึ่งมี timeout 60 วินาที แต่บนเน็ตบริษัทใช้ 47–55 วินาที (95 แพ็กเกจ) · 2026-11-17 อัปเดตเป็น 0.1.5 แล้วเกินเวลา → ไม่มี `node_modules` → server พังตอนเริ่ม (`ERR_MODULE_NOT_FOUND @modelcontextprotocol/sdk`) และ `claude mcp list` ขึ้น `Connection closed` ทั้ง Jenkins และ SonarQube · ตอนนี้ bundle SDK + zod ด้วย esbuild ไว้ใน `mcp/` (commit ไว้ในตัว plugin · server ละไฟล์ + chunk ร่วม ~1.3 MB) · source ย้ายไป `src/` · `package.json`/lock + ตัว build อยู่ที่ `scripts/devops-mcp/` นอก plugin · `node build.mjs --check` ยืนยันว่า `mcp/` ตรงกับ `src/` · ทดสอบจากสำเนาที่ไม่มี `node_modules`: ทั้งสอง server ตอบ `initialize`/`tools/list`/`tools/call` ได้
- **เครื่องที่อัปเดต 0.1.5 ไม่สำเร็จ**: อัปเดตเป็น 0.1.6 ได้เลยโดยไม่ต้องรัน npm เอง (ถ้ายังค้างที่ 0.1.5 และอยากใช้ก่อน: `npm ci --ignore-scripts --workspaces=false --no-audit --no-fund` ในโฟลเดอร์ `~/.claude/plugins/cache/ugt/ugt-devops-mcp/0.1.5/`)

## 0.1.5 (2026-11-17)

แก้ตามผล code review หลัง merge 0.1.4:

- **`NODE_OPTIONS=--use-system-ca` → `NODE_USE_SYSTEM_CA=1`**: flag ที่ใส่ใน `NODE_OPTIONS` ทำให้ Node ที่ไม่รู้จัก flag ปฏิเสธไม่ยอมเปิดเลย (`is not allowed in NODE_OPTIONS`, exit 9) คือทั้งสอง server จะพังบน Node < 22.15 รวมถึง SonarQube ที่เป็น http และไม่ต้องใช้ CA ด้วย ส่วนตัวแปร env ที่ Node ไม่รู้จัก จะถูกข้ามไปเฉย ๆ · อีกเรื่องคือ `NODE_OPTIONS` ของ plugin ไปทับค่า `NODE_OPTIONS` เดิมของ user (เช่น `--require` ของ proxy agent) · ทดสอบกับ Node 22.22 แล้ว: ปิดค่าที่ Claude Code ส่งมา แล้วตั้ง `NODE_USE_SYSTEM_CA=1` อย่างเดียว ได้ 200 จาก `ugtweb`
- **hint เรื่อง cert แสดงเฉพาะกรณีที่ chain ไม่ trust** (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `UNABLE_TO_GET_ISSUER_CERT(_LOCALLY)`, `SELF_SIGNED_CERT_IN_CHAIN`, `DEPTH_ZERO_SELF_SIGNED_CERT`) · เดิม regex `CERT` ไปจับ `ERR_TLS_CERT_ALTNAME_INVALID`/`CERT_HAS_EXPIRED` ด้วย แล้วแนะนำผิดทาง · ข้อความเปลี่ยนจาก "Windows store" เป็น "OS cert store" (macOS ใช้ Keychain)
- `package.json`/`package-lock.json` ค้างที่ 0.1.0 → 0.1.5 · test ใหม่ยืนยันว่า `getJson` ห่อ error ที่ `fetch` โยนมาจริง
- **ยังไม่แก้:** ถ้า Windows เครื่องไหนไม่มี RapidSSL intermediate ใน store ก็ยังต่อ `ugtweb` ไม่ได้ ต้องแก้ที่ต้นเหตุคือให้ reverse proxy ส่ง full chain · ส่วน Claude Code ส่ง `NODE_USE_SYSTEM_CA=1` มาอยู่แล้วหรือไม่ (เครื่อง dev ส่ง) ทำให้ 0.1.4/0.1.5 อาจไม่ได้เปลี่ยนอะไรบนเครื่องที่ส่งมาอยู่แล้ว ต้องรอคำสั่งวินิจฉัยจากเครื่อง user

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
