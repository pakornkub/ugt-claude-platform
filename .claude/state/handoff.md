# Handoff

Last updated: 2026-10-15

## In progress
- field report AI Studio (2026-09-09) — แก้ platform แล้ว (4.61.0) แต่**ยังไม่ได้
  ยืนยันอาการที่ 3** ("template default เองก็เพี้ยน") จากโปรเจคจริง: สมมติฐาน
  = Tailwind v3 (`@tailwind base;`) ที่ token file v4-only ถูกมองข้าม — รอค่า
  `tailwindcss` ใน package.json + 3 บรรทัดแรก `app/globals.css` จากน้อง

## Next
- Post-deploy standard — รอเจ้าของระบบตอบเช็ค infra 8 ข้อ (docs/backlog.md §1, เลื่อนไว้ 2026-08-12)
- ugt-python-platform 0.9.5 / ugt-php-platform 0.8.5 — รอ pilot จริงภาษาละ 1 โปรเจคก่อน tag (README ตาราง plugin); eval baseline 2026-09-13 ผ่านแล้วแต่ไม่แทน pilot (ไม่มี build/pipeline จริง)
- E2E Playwright skill — เลื่อนโดยมติผู้ดูแล 2026-08-10 (docs/backlog.md §2)
- Pilot bundle mattpocock กับโปรเจคจริง 1 ตัวก่อนแนะนำวงกว้าง (walkthrough + setup-matt-pocock-skills ยังไม่เคยถูกใช้จริง)

## Open Questions
- remote branch `claude/wizardly-albattani-ywvn6s` (วิดีโอโปรโมต/explainer/sizzle 11 commit, 2026-09-30) ยังไม่ merge ไม่มี PR — ผู้ดูแลสั่งเก็บไว้ก่อน 2026-10-09 ยังไม่ตัดสินว่าเข้า main ไหม
- เช็คความพร้อม infra 8 ข้อของ post-deploy standard — เจ้าของระบบเป็นคนตอบ (รายการอยู่ docs/backlog.md §1)
- โปรเจค ugt-customer-request: root cause ของ `SCANNER_UNAVAILABLE` ยังไม่ได้ diagnose จบ (ถอด scan ออกชั่วคราวแล้ว — ยังไม่เห็นบรรทัด `virus scan unavailable <สาเหตุ>` ใน log แอป) ตอน retrofit ให้ไล่ตาม SKILL.md upload-setup §7
- ทีมที่ใช้ `ugt-nextjs-standard` เดิม (ก่อน split) ต้องประกาศ migration: `/plugin install ugt-nextjs-standard-superpowers@ugt` + ลบ key เก่าใน settings.json (รายละเอียด CHANGELOG 4.56.0) — ยังไม่ได้ประกาศ

## Done (newest first — keep only ~10; older history lives in git and CHANGELOG)
- 2026-10-15 nextjs **4.79.1** (full-setup วางไฟล์ `.claude/` ที่เขียนไม่ได้ใน `docs/setup-finish.md`) · **4.79.2**
  (eval ใหม่ `module-auth-org-identity` + `module-mail-after-auth` 1.00 · verify auth/mail false-fail 4 ข้อ ·
  review เจอ policy check ถูกข้าม + grader 2 ตัว แก้แล้ว) · eval หลัง merge 4.79.0 ครบ: plan/design/auth 1.00,
  db-quality-ci 0.94→grader แก้ · ค้าง: package.json ไม่ได้เพิ่ม dep เมื่อไม่มี shell, ที่บันทึก deviation เมื่อยังไม่มี
  docs/project-context/, fixture ไม่มี shadcn base components · ลบ branch contribute/* + PR #23 บน GitHub แล้ว
- 2026-10-14 **merge PR #23** nextjs **4.79.0** · core **2.14.4** (8410fba): ตั้ง role ล่วงหน้าจาก HR,
  แท็บ "ยังไม่มีบทบาท", `ORG_EMAIL_DOMAINS`, กัน SSO/LDAP→Local, login hero · **review ก่อน merge เจอช่องโหว่**
  (SSO เดา AD login จากอีเมล → ได้ role คนอื่น · AD 2 ตัวอีเมลเดียวกันผูกบัญชีเดียว · race · role กลับมาเอง ·
  LDAP ใช้ชื่อที่พิมพ์) แก้ 2 รอบ + security re-review 2 รอบ — ldapUsername มาจาก `preferred_username` ใน
  idToken ที่ verify แล้ว · eval auth 1.00 · contract auth.md มีหัวข้อ Accounts · โปรเจคเดิมต้องทำ
  org-identity.md §7 ก่อน deploy (filtered unique index `LdapUsername` จำเป็นทุกโปรเจคที่ไม่ใช่ LDAP ล้วน)
- 2026-10-14 nextjs **4.78.0** · python **0.9.5** · php **0.8.5** (1b94963): upload retention sweep ผ่าน host cron
  (review เจอลบเกินขอบเขต → กรอง key + เบรก 10% แก้แล้ว) · eval run-through แตกเป็น 4 ชุด ผ่าน 1.00 ทุกชุด
  (design/auth รันงบ $20 ตามมติผู้ดูแล) · full-setup ห้ามเปิดคำตอบซ้ำ + ข้อความปิดท้าย 6 หัวข้อ ·
  interview cicd ถาม Jenkins host/repo URL · plugin เครื่องนี้ update แล้ว
- 2026-10-11..13 **post-merge review + eval ตามมติใหม่** (merge PR #21/#22 = 4.76.0 ก่อน) —
  nextjs **4.77.0→4.77.3** · core **2.14.1→2.14.3** · python **0.9.4** · php **0.8.4**:
  review 4 ตัวขนาน → bug จริง: `Account.issuer` ของ #17 ใช้ได้แค่ better-auth 1.7.0–1.7.2 (ตรวจ
  package จริง) ถอนแล้ว ขั้นต่ำ `^1.7.4` · cron secret อยู่ใน argv → `node fetch` · verify หลายตัวนับ
  comment · php cron ต้อง `-u www-data` · `[VOLUME]` mkdir รันบน Jenkins agent ผิดเครื่อง → container
  บน Docker host · แตกไฟล์ยาว: ทุก SKILL.md ≤ 500 (auth 554→496, design 552→404, python 638→454,
  php 830→498) + reference ตามเรื่อง · ใหม่ `scripts/check-skill-size.mjs` + README ขั้นหลัง merge ·
  eval 3 รอบ (grader subagent ตรวจทุก FAIL — ส่วนใหญ่ grader พัง): python 1.00 · php 1.00 ·
  config-change 1.00 · small-bugfix 1.00 · interview-batch 1.00 · run-through ใหญ่เกิน 3600 s
  (backlog §13) · ค่า eval รวม ~$60 · ugt-contribute เลิก bump เวอร์ชัน → `## Unreleased`
- 2026-10-09 **มติ: scheduled job ทุกตัว = host cron** — core **2.14.0** · nextjs **4.75.0** ·
  python **0.9.0** · php **0.8.0** (9ae878c): contract `cicd.md` หัวข้อ Scheduled jobs · Next.js
  `docker exec` → `wget /api/cron/<job>` + `CRON_SECRET` (proxy.ts ปล่อย `/api/cron/`) · Python web/PHP
  `docker exec <command>` · Laravel เลิก `schedule:run` · audit retention SQL Agent → usp + cron route ·
  ตาราง cron ใน admin-handoff ทั้ง 3 stack · verify ห้าม in-app scheduler · drift 23/23 ·
  tag core + nextjs push แล้ว · plugin เครื่องนี้ update แล้ว
- 2026-10-09 **merge contribute PR #16–#20** (ugt-voice-platform) เป็น release เดียว nextjs **4.74.0**
  (e2da5fe): stale-cookie redirect loop · `Account.Issuer` (better-auth 1.7) · `disableConcurrentBuilds()` ·
  upload verify scan-off/`src/` · OWASP suppression braces/sprintf-js · merge commit จริง GitHub ขึ้น merged เอง ·
  ซ้ำรอบที่ 2 แล้วที่ PR ขนานจองเลขเวอร์ชันชนกัน
- 2026-10-09 nextjs **4.73.0** · python **0.8.0** · php **0.7.0** (5265d46) — ตามคำขอผู้ดูแล:
  (1) admin-handoff เป็นตารางล้วน (ขั้นตอนรวม → ตารางต่อระบบ เมนู + ช่อง/ค่า → ตารางส่งกลับ)
  + เพิ่มตาราง SQL Server (db/login/สิทธิ์) และ folder server/backup ที่เดิมไม่มี ·
  (2) `.env.example` โครง 7 หัวข้อตายตัว + compose `environment:` รายการตายตัวลำดับเดียวกัน ·
  (3) **มติ: `NODE_TLS_REJECT_UNAUTHORIZED=0` เปิดเสมอ** (compose + env) เลิกให้ admin ตัดสิน ·
  cicd verify +2 · tag `ugt-nextjs-platform--v4.73.0` push แล้ว (python/php ไม่ tag) ·
  plugin เครื่องนี้ update ครบ — ต้อง restart session · ยังไม่ได้ลองกับโปรเจคจริง
  (ชื่อ DB/login ไม่มี convention องค์กร — template เสนอ `<ระบบ>`/`<ระบบ>_Dev`, `<project>_app`)
- 2026-10-09 **merge contribute PR #3–#14** (stack จาก /ugt-contribute, 12 PR) — nextjs
  **4.64.0→4.72.0** + python **0.7.0**: DB password รั่วใน Deploy console (`set +x` +
  `-e DATABASE_URL` ทั้ง nextjs/python), `.npmrc` legacy-peer-deps + Dockerfile copy,
  `migration_lock.toml` = `mssql`, admin pages ใน shell ต้อง `<PageShell>`, Select
  `items`, logo ผ่าน CSS mask, DatePicker label วันถอย, `SidebarInset min-w-0`,
  `nav-user` error #31, site-header separator, ป้าย DEV + title `(DEV)`, keycloak
  endpoints fallback (`PROVIDER_NOT_FOUND`) · fast-forward main (ไม่มี merge commit) ·
  #4–#12 ปิดมือ (base เป็น branch ใน stack GitHub เลยไม่ขึ้น merged) · **#15 ปิดไม่ merge**
  — แก้ซ้ำกับ 4.66.0 (`showLabels` vs `hideLabels`) เหลือแค่กฎ conventions.md ยกมาเป็น
  **4.72.1** (70bee8b) · drift 22/22 · lint-kit-assets 0 warning · kit stamps ตรง ·
  tag `ugt-nextjs-platform--v4.72.1` push แล้ว (4.64.0–4.72.0 ไม่ tag แยก, python 0.7.0
  ไม่ tag ตามมติรอ pilot) · ลบ branch `contribute/*` หมดแล้ว · เครื่องนี้ `claude plugin update`
  แล้ว (nextjs 4.72.1 · python 0.7.0) — ต้อง restart session · บทเรียน: stack PR ของ /ugt-contribute ทุกตัว bump เวอร์ชันเอง →
  PR ที่แตกจาก main ขนานกันชนเลข (#15 = 4.69.0 ซ้ำ #11)
- 2026-09-29 prompt audit Claude 5.5 ปิดครบ — core **2.13.2** · nextjs **4.63.5** ·
  php **0.6.6** · python **0.6.5** (6d70ab7 + 6961a82)
- 2026-09-15 ugt-core **2.13.0** — skill ใหม่ `ugt-contribute` (ยกกับดักจากโปรเจค
  ขึ้น platform เป็น PR: gate 3 ข้อ → skill เจ้าของ → scratch clone → entry +
  CHANGELOG + bump + chips → โชว์ diff รอ yes → gh pr create → ลบต้นทาง) · มติ:
  ไม่ทำ hook, push เฉพาะผู้ดูแล (ปฏิเสธ → patch) · handoff/context/README/index.html
  ชี้ตาม · evals.json 3 case ยังไม่รัน baseline · commit + tag `ugt-core--v2.13.0` + push แล้ว 2026-09-15 · เครื่องนี้ `claude plugin update` แล้ว (core 2.13.0 · nextjs 4.63.2) — ต้อง restart session ถึงจะมีผล
- 2026-09-13 **พิสูจน์ prompt audit ด้วย `claude plugin eval` ครั้งแรก** — nextjs **4.63.1** ·
  php/python **0.6.4** (core คง 2.12.2): case แบบรันได้ 6 ตัวที่ `plugins/*/evals/`
  (วิธีรัน + ข้อจำกัด Windows อยู่ใน memory `claude-plugin-eval-runner` + CHANGELOG nextjs
  4.63.1) · ผล: interview batch 4/4 · light-version บอกก่อนแก้ 4/4 (2/2 หลังแก้ wording) ·
  config direct 2/2 · python cicd 13/13 วัดได้ · php cicd 12 ผ่าน + 1 skill defect (health
  route → `routes/api.php`) · run-through ยาว (ทุกคำตอบใส่ล่วงหน้า, ไม่มี bundle) 20 ผ่าน / 2 fail / 7 env-blocked — ลำดับ §3 ถูก ไม่ถามซ้ำ ไม่แบ่ง chunk, database+cicd verify exit 0, พบ gap ทาง none-bundle ของ CLAUDE-block (decisions.md + แถว feature หาย) + auth verify regex + login-form `__PROJECT_NAME__` · defect จริงที่แก้: `/srv/appdata` ค้างใน compose
  asset ทั้ง 3 stack (+drift pin), pytest `pythonpath`, Laravel `[DB][LARAVEL]` env, CLAUDE-block
  รูปประโยคประกาศ light version, full-setup Q6–9 ถามแยก · grader/rubric ผิดเองมากกว่าครึ่งของ
  FAIL ดิบ (แก้แล้ว — ห้ามอ่าน score ดิบโดยไม่ให้ grader subagent ตรวจ) · commit 48fe5d5 + tag `ugt-nextjs-platform--v4.63.1` แล้ว 2026-09-14 (php/python ไม่ tag ตามมติรอ pilot) · push แล้ว (main + tag) · เครื่องนี้ `claude plugin update` ครบ (nextjs 4.63.1 · php/python 0.6.4) — ต้อง restart session ถึงจะมีผล
- 2026-09-13 **merge PR #2** `claude/compassionate-keller-mxx44p` เข้า main (2abacbf) ·
  tag `ugt-nextjs-platform--v4.63.0` + `ugt-core--v2.12.2` push แล้ว (php/python 0.6.3
  ไม่ tag ตามมติรอ pilot) · ลบ branch แล้ว เหลือ main ตัวเดียว · plugin เครื่องนี้
  update ครบ 4 ตัวผ่าน `claude plugin update` (core 2.12.2 · nextjs 4.63.0 ·
  php/python 0.6.3) — ต้อง restart session ถึงจะมีผล · prompt audit พิสูจน์แล้วในแถวบน
- 2026-09-13 prompt audit รอบ 2 ครบทั้ง 17 skill — nextjs **4.63.0** · core **2.12.2**:
  CLAUDE-block งาน Small → light version เป็น default (ไม่ถามทุกครั้ง) + autonomy
  line สำหรับ subagent · ตัด Quick Rules สำเนาที่ 3 (database/cicd/test-lint) ·
  read-before เป็นเงื่อนไข (auth/design) · ตัด incident tag · requirements เลิกอ้าง
  context เป็นเหตุผล · ยังไม่พิสูจน์ด้วย eval — ลอง bug fix เล็ก 2–3 งานดูว่า light
  version ถูกบอกก่อนเริ่มจริง
- 2026-09-12 prompt audit รอบแรก (Opus 5 / Fable 5.1) — nextjs **4.62.3** · php/python
  **0.6.3**: full-setup default รันรวดเดียว (chunk เป็นทางเลือก), autonomy line ใน
  subagent dispatch, scope line ตอน close-out/§5.6, ตัด Quick Rules ที่ซ้ำ §2 +
  ย่อหน้า volume ซ้ำ, ตัด incident tag · ยังไม่ได้พิสูจน์ด้วย `claude plugin eval`
  (ชุด vague-make-it-deployable / *-no-tests-full-setup) — อีก 14 skill ยังไม่ audit
- 2026-09-12 ugt-core **2.12.1** — `ugt-model-mode` eval 4 (dispatch-plan-before-spawn)
  รัน baseline ครั้งแรก **5/5 PASS** (executor+grader subagent, fixture โปรเจค
  จริงที่มี model-mode.md โหมด auto): dispatch plan พิมพ์ก่อน spawn จริง,
  review → fable (auth risk domain), test → haiku, model ที่ dispatch ตรงแผน
  ทุกแถว, ไม่หยุดรอ confirm, ไม่แก้ model-mode.md — ไม่มี defect ต้องแก้ · เก็บกวาด
  branch/worktree ค้างทั้งหมดเสร็จ (local branch เหลือแค่ main, remote เหลือแค่
  main, worktrees ว่าง) · commit + tag แล้ว
- 2026-09-11 **merge** `claude/wizardly-dijkstra-ev60pz` เข้า main — ugt-core
  **2.12.0** + ugt-nextjs-platform **4.62.0** (model-mode dispatch plan, ดูรายละเอียด
  แถวถัดไป) รวมกับ 4.61.2–4.61.4 (preserve mode baseline) ที่ค้าง push อยู่ก่อนหน้า ·
  conflict 5 ไฟล์ (plugin.json version, README/index.html version chip,
  CHANGELOG.md ลำดับรุ่น, handoff.md) แก้แบบ union ไม่ทิ้งเนื้อหาฝั่งไหน · tag ครบ
  ทั้ง `ugt-core--v2.12.0`, `ugt-nextjs-platform--v4.62.0`, `--v4.61.2/.3/.4` · push แล้ว
- 2026-09-10 ugt-core **2.12.0** + ugt-nextjs-platform **4.62.0** — ตอบคำถาม
  ผู้ดูแล "spawn sub agent ใช้ model เหมาะไหม / โชว์แผนก่อนไหม": การเลือก model
  ต่อประเภทงานมีอยู่แล้ว แต่ไม่มีกติกาให้โชว์แผนก่อน และ audit log ไม่เก็บ model
  → เพิ่ม **dispatch plan** (ตาราง Work · Task type · Model · Why ก่อน spawn ชุดแรก
  แล้วทำต่อ ไม่หยุดรอ confirm) ใน SKILL.md + template ทุก preset + CLAUDE-block,
  audit-log เก็บ `model`/`subagent_type`, **ค่าเริ่มต้นโปรเจคใหม่เป็น `auto`**
  (asset, harness.md, full-setup step 4, verify msg, README, index.html chip
  auto), eval 4 ใหม่, drift check ข้อใหม่ (22/22 ผ่าน) · **ยังไม่ tag/ยังไม่รัน eval**
  (ปิดแล้วในรอบ merge ด้านบน — tag ไปแล้ว)
- 2026-09-11 ugt-nextjs-platform **4.61.4** — baseline eval ที่เหลือครบ: database
  #1 fresh-DB 10/10, #2 existing+SP+linked-server 7/7, #3 reserved-word 6/6 ·
  auth sidebar #1 fresh-no-shell 3/3, #2 existing-menu RBAC 5/5 · full-setup #5
  defer-migration 6/6 · แก้ 8 finding ของ grader: prisma.config.ts dotenv quiet
  (migration SQL พัง), migrations.md แยกทาง existing-DB, linked-server ต้องถามชื่อ
  4 ส่วน, `CHANGE_ME_DB_USER/PASSWORD` เป็นกติกา, ไม่แต่งตาราง domain เอง,
  database verify รองรับ `docs/adr/` (2 รอบ — รอบแรก regex ยังพลาด ยืนยันแล้วว่า
  แก้ตรง), `shadcn add sidebar` เตือนเรื่องทับ scale-bridge, `SESSION_COOKIE_NAME`
  อธิบายเหตุผล 'use server' · executor ดับกลางทาง 2 รอบ (session ดับ + 429 rate
  limit) ต้อง reset + rerun หลายรอบ · commit + tag แล้ว ยังไม่ push
- 2026-09-10 ugt-nextjs-platform **4.61.3** — baseline ที่เหลือ: database eval 4
  **9/9** + auth sidebar-eval 0 **8/8** (รันต่อเป็นสาย design → database → auth บน
  โปรเจคเดียว) · แก้ finding ของ grader: `CreatedBy` ยึด NOT NULL + marker
  `'prototype-import'`/`'system'` (reference เคยขัดกันเอง), pin `zod@^4`
  database+auth, `[METHOD: LOCAL]` บน `users:create`/`users:reset-password`,
  auth §5.1 `--legacy-peer-deps` (better-auth peer vitest ^2–4 vs org ^5), auth
  verify จับ shell ที่สองที่สร้างมือใน `(admin)`, database verify บอกชื่อไฟล์ที่ใช้
  prisma · backlog §11 +2 (NavUser บังคับ SidebarProvider · migrations.md ขาด path
  offline) · commit + tag แล้ว ยังไม่ push
