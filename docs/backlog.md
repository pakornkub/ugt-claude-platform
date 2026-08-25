# Platform Backlog — งานที่รู้แล้วว่าต้องทำ แต่ยังไม่ได้ทำ

> **Status:** Living · **Date:** 2026-08-12 · **Applies-to:** ทั้ง marketplace
> **Last-reviewed:** 2026-08-25 (ขีด 3 ข้อแรกของ §6 ที่ 4.45.0/0.5.0 ปิดไปแล้วแต่ยังไม่ได้ขีด + doc drift ฝั่ง python ปิดใน 0.5.1) — ที่เดียวของ backlog ระดับ platform; ปิดข้อไหนให้ขีดพร้อมชี้รุ่นใน CHANGELOG (แบบเดียวกับ Addendum ของ app-patterns-audit ที่ปิดครบแล้ว)

กติกา: ข้อที่ปิดแล้ว**ขีดทิ้งพร้อมชี้รุ่น** ไม่ลบ (ประวัติว่าเคยเป็น backlog มีค่า) ·
งานที่เป็นของโปรเจคใดโปรเจคหนึ่งไม่อยู่ที่นี่ (ไปที่ project-notes/decisions ของโปรเจคนั้น
— เช่นการทยอยย้ายหน้า HRMS มาใช้ toolbar แถวเดียว อยู่ใน `.claude/state/project-notes.md` ของ HRMS แล้ว)

## รอลงมือ (เรียงตามความคุ้ม)

### 1. Post-deploy standard — เลื่อนไว้ 2026-08-12 รอเช็ค infra

ความเสี่ยงอันดับหนึ่งที่ระบุไว้: pipeline จบที่ container healthy แล้วมืด — เมล
Jenkins เฝ้าเฉพาะช่วง build/deploy ไม่มีอะไรเฝ้าวันที่ 2 เป็นต้นไป (ระบบพังตอน
ไม่มี build = ไม่มีเมล), ถอย release ไม่มี runbook (โดยเฉพาะเมื่อ migrate DB ไป
แล้ว), backup ไม่มีมาตรฐานและไม่เคยซ้อม restore

**หลักออกแบบที่ตกลงแล้ว:** baseline ต้องไม่ลง software ใหม่ — ใช้ Jenkins
scheduler + emailext + SMTP relay + Docker host + SQL Server ที่มีอยู่

**บล็อกอยู่ที่:** เจ้าของระบบขอเช็คความพร้อม infra 8 ข้อก่อน:

1. Image เก่าเก็บที่ไหน — registry กลาง? prune policy บน host?
2. ใครถือสิทธิ์ deploy/rollback บน host (ssh? ผ่าน Jenkins เท่านั้น?)
3. SQL Server มี backup job / DBA อยู่แล้วไหม (SQL Agent = candidate ของมติ cron ข้อ 3 ด้วย)
4. Backup เก็บที่ไหน + retention เท่าไหร่
5. **เคยซ้อม restore จริงไหม** (ข้อสำคัญสุด — backup ที่ไม่เคย restore คือความหวัง)
6. Host เป็น VM ที่ snapshot ได้ไหม (กำหนดวิธี backup volume ของ upload)
7. Jenkins: ตั้ง cron trigger ได้ไหม + มองเห็น URL prod ทาง network + ssh เข้า host ได้ไหม
8. มี Sentry กลางไหม (pipeline มีบล็อก `[SENTRY]` รออยู่แล้ว)

หมายเหตุ: นโยบาย expand-contract migration เป็นเรื่องฝั่งโค้ด — เขียนเป็นกฎได้เลย
ไม่ต้องรอคำตอบ infra

### 2. E2E test (Playwright) — เลื่อนโดยมติผู้ดูแล 2026-08-10

HRMS มี `playwright.config.ts` + โฟลเดอร์ `e2e/` ให้สกัดได้ทันทีเมื่อเปิดงาน
น่าจะเป็น skill ใหม่หรือส่วนขยายของ `ugt-nextjs-test-lint-setup` (pipeline ต้อง
เพิ่ม stage ด้วย → แตะ cicd)

### 3. Cron / background job — รอมติองค์กร

ต้องตอบก่อนว่ารันที่ไหน: in-app scheduler / SQL Server Agent / Jenkins ตั้งเวลา
(แบบเดียวกับที่ upload เคยรอ 3 มติ) — **retention sweep ของ upload-setup รอ
ข้อนี้อยู่**: ตอนนี้ soft delete แล้วไม่มีใครกวาด bytes จริง และ pattern A
(polymorphic) ต้องการ orphan sweep ด้วย · คำตอบ infra ข้อ 3 ของ post-deploy
อาจตอบข้อนี้ไปพร้อมกัน

### 4. ~~Security headers~~ + rate limiting ชุดเต็ม

- ~~proxy มี CSP แล้ว แต่ยังไม่ครบชุด (HSTS, X-Frame-Options ฯลฯ)~~ → 4.34.0
  (HSTS ยิงเฉพาะ https · ไม่ใส่ `includeSubDomains`/`preload` รอมติเจ้าของโดเมน ·
  X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy
  ครบ และย้ายไปตั้งที่ทุกจุด return ไม่ใช่เฉพาะ response สุดท้าย)
- **ยังเปิดอยู่:** rate limiter ของ auth เป็น in-memory ต่อ instance (มี TODO
  ในโค้ดกำกับแล้ว) — deploy เดี่ยวตามมาตรฐานปัจจุบันไม่กระทบ ต้องแก้เมื่อไป
  หลาย instance

### 5. คงค้างจาก audit ปูพรม 2026-08-21 (4 agents: Base UI API / DESIGN / SKILL flows / stale ports)

ของวิกฤตแก้ไปแล้วใน 4.25.0 (ดู CHANGELOG) — ที่เหลือจัดกลุ่มตามชนิด:

**ต้องมีมติ design ก่อน (ขัดกันเองระหว่างข้อตกลง/preview/asset):**
- ~~ปุ่ม "เพิ่ม/สร้าง" — เขียวทึบ vs primary~~ → มติ primary, 4.26.0
- ~~badge ชื่อ role — outline vs secondary~~ → มติ outline, 4.26.0
- ~~แถว system role — ซ่อน vs disabled+tooltip~~ → มติ disabled+tooltip (business rule) / ซ่อน (permission), 4.26.0
- ~~`detail-row.tsx` docblock ขัด §4~~ → 4.30.0 (justify-between + gap 16px + min-h 24px)
- ~~ฟอร์ม auth เป็น useState ไม่ใช่ ui/field+RHF+zod~~ → มติ migrate ทั้งหมด, 4.30.0 (พ่วง: `@hookform/resolvers` ไม่เคยอยู่ใน dep list ทั้งที่ form-validation.md สั่งใช้ zodResolver — เพิ่มแล้ว)
- ~~ข้อความ title/subtitle/หัวคอลัมน์ admin ไม่ตรง preview~~ → 4.27.0 (sync สองทางทั้ง §13)
- ~~audit-logs: ขอบ filter +07:00 แต่จอ format ตาม timezone ผู้ดู~~ → 4.30.0 (formatDateTime pin Asia/Bangkok ตาม §5)
- ~~audit-logs toolbar มี Input ค้นหาเปล่าที่ชน §3 (ช่องค้นหาเป็นของ DataTable) และชน verify ของ skill เอง — ต้องออกแบบ global-search โหมด server ใน DataTable~~ → 4.36.0 (prop `serverSearch={{ value, onChange }}` — DataTable วาดช่องเดิม + debounce ให้ ไม่แตะ client filter · หน้าแม่ push คำค้นลง URL เอง)
- ~~DataTable สามก้อนยังไม่ห่อการ์ดตาม §3~~ → มติห่อใน DataTable กลาง (prop `card` default เปิด), 4.26.0
- ~~theme-toggle / ปุ่ม icon นอกตาราง~~ → มติขยาย §0.4, 4.30.0 (size=icon ใช้ได้ทุกที่ + aria-label บังคับ · ในตารางยังต้องผ่าน IconAction · ห้าม override ขนาดด้วย className)

- ~~`destructive` ของ base-mira เป็นพื้นจาง ไม่ใช่แดงทึบ~~ → มติ 2026-08-21 ยึด preset, 4.33.0 (preview วาดตามแล้ว · soft-* ใน preview ก็แก้ให้โปร่งใสตอนพักด้วย)

**งานโค้ดที่ตามมาได้เลย:**
- ~~`AdminNav` fallback rebuild บน shadcn Sidebar~~ → 4.27.0
- ~~date-picker label ไม่ผ่าน lib/format~~ → 4.30.0 (prop `formatLabel` default `formatDate`) · ~~`toDateKey` ซ้ำสองที่~~ → 4.35.0 ย้ายเข้า `lib/format` เป็นบ้านเดียว **แต่ไม่ยุบเข้า `formatExportDate`** — วัดแล้วให้คนละคำตอบ (local midnight ร่นวัน) คนละ input contract กัน + `lib/format.test.ts` ล็อกไว้
- ~~admin-setup-form `text-2xl` override~~ → 4.30.0 · ~~hand-built icon circle~~ → มติ 4.35.0 **ไม่ทำ component** (shadcn ไม่มีของกลาง · `EmptyMedia` คนละงาน · มีที่ใช้ที่เดียว) แต่ตรึงสเปคใน DESIGN §4 — ครบ 3 ที่ค่อยยกเป็น component
- ~~tiptap toolbar: ปุ่ม `size="sm"`+`size-7 p-0` override + native title~~ → 4.38.0 (ToolbarToggle/ToolbarAction ยุบเป็น ToolbarButton บน `IconAction` · `size="icon"` ของ preset = size-7 อยู่แล้ว · tooltip ของ kit แทน title · ปุ่ม Link ซ้อน TooltipTrigger→PopoverTrigger→Button) · lint-kit-assets ตั้งกฎ FAIL กัน override กล่องขนาด + native title แล้ว
- ~~`check-kit-freshness.mjs` ไม่ scan root files~~ → 4.27.0 (root files + prisma/; ชนิดไฟล์อื่นยัง out of scope โดยประกาศใน SKILL แล้ว)
- ~~mail-setup สัญญา `/admin/mail-templates` แต่ไม่มีหน้า~~ → 4.27.0 (หน้า+editor+preview+actions ครบ)
- ~~upload-setup: placeholder table/verify · ลำดับ Upload↔CI~~ → 4.27.0 · คำถาม retention ยังรอมติ cron ข้อ 3 (SKILL บอกตรง ๆ แล้วว่าเป็นแค่ decision record)
- ~~verify checks ที่ประกาศแต่ไม่ implement (ฝั่ง nextjs: mkdir-p↔bind, handoff scan, no-memo, zod deprecated, S6606/S3735, design placeholder scan, full-setup rules list)~~ → 4.27.0 · ~~ฝั่ง php/python~~ → python/php 0.3.0 (ยังไม่ tag — รอ pilot): emailext ×4, shape `[WEB]`/`[BATCH]` ตรงกัน 3 ที่, `CMD` JSON array, subpath สองฝั่ง, coverage.xml, `[LARAVEL]`↔framework, health ใต้ docroot จริง, `volumes:` ก้อนเดียว, composer/require-dev, schema `phpunit.xml`↔lock, SmokeTest entry file, ไฟล์ §5.1 ที่ copy ทุกโปรเจค · ทุก check อ่านเฉพาะบรรทัดที่ยังทำงานจริง (เพิ่ม `dockerfileActive`/`composeActive` คู่กับ `jfActive`) · ข้อที่ไม่ตรวจประกาศไว้ใน SKILL §7 แล้ว
- ~~pitfalls อธิบายด้วยพฤติกรรม Radix~~ → 4.27.0 (re-word เป็น Base UI-first)
- ~~full-setup: rules mail/upload + เลขข้อ interview~~ → 4.27.0
- ~~database: dev/prod question, requestTimeout, naming exception, `__LINKED_SERVER__`~~ → 4.27.0
- ~~design-setup: placeholder table · verify scan MOTION/design-questions · export.test.ts inventory~~ → 4.27.0
- ~~python/php cicd: subpath steps · `[BATCH]` dev marker · `.env.example` · `[WEB]` checklist · mkdir-p↔bind + handoff placeholder checks~~ → python/php 0.2.0 (ยังไม่ tag — รอ pilot)
- ~~nextjs cicd: `.dockerignore` + ตาราง placeholder admin-handoff~~ → 4.27.0
- ~~ugt-core: board.md copy skeleton · ugt-handoff date format~~ → core 2.7.0 (Workflow-tool ที่ audit ว่า "ไม่มีจริง" ตรวจแล้วมีจริงใน harness ปัจจุบัน — เพิ่มแค่ fallback สำหรับ harness ที่ไม่มี)

### 6. php pilot feedback ที่ยังไม่ได้แก้ — จาก `ugt-mscpl-ana` (2026-08-23, หลัง blocker 5 ข้อปิดใน 0.4.0)

**ยังกัด "deploy ได้" อยู่จริง (คุ้มก่อน hardening):**
- ~~`Jenkinsfile` Deploy stage ยังเรียก `docker-compose` (v1, EOL 2023) เป็นค่า
  default~~ → v2 เป็นค่าตั้งต้นทั้ง 3 stack, nextjs 4.45.0 / php+python 0.5.0
- ~~`[VOLUME]` guard (`if [ ! -d /srv/appdata/<project> ]`) เช็คแค่ dir บนสุด —
  volume ที่เพิ่มหลัง release แรกไม่ถูก mkdir/chown ให้~~ → ลูป per-subdir
  ทั้ง 3 stack + แก้ verify.mjs คู่กัน, nextjs 4.45.0 / php+python 0.5.0 ·
  doc ฝั่ง python ที่ยังสอนบล็อกเก่า (`docker-deploy.md` §C/§D) ตามปิดใน 0.5.1
- ~~ไม่มีที่ไหนพูดถึง DNS resolution ของ container network~~ → php+python 0.5.0
  (`docker-deploy.md` §G + คำถามยืนยัน connectivity จากคอนเทนเนอร์ใน
  admin-handoff)
- subpath ของ CI3/legacy ทิ้งไว้ที่ "`base_url` ใน config ของโปรเจคเอง" — ไม่มี
  สูตรสำหรับแอปที่ใช้ relative path (ต้อง inline redirect เติม/ตัด trailing
  slash ใน `<head>` ไม่งั้น asset พังหลัง proxy)

**Container hardening — ออกแบบไว้แล้ว พักเป็น backlog ตามที่คุยกัน 2026-08-23:**
spec เต็มอยู่ที่ `docs/superpowers/specs/2026-08-23-php-container-hardening-design.md`
(ตรวจกับ Docker จริงแล้ว ไม่ใช่แค่ทฤษฎี) — non-root ผ่าน `setcap`+`cap_add`,
ปิด banner, security headers พื้นฐาน, ห้าม `no-new-privileges` (พังบน docker02)
· **ไม่ใช่ของที่ทำให้ deploy ไม่ได้** — ไม่มีใครในองค์กรร้องขอ พักไว้จนกว่าจะมี
โปรเจคที่ต้องการจริง

**Cosmetic ที่เหลือ (ไม่บล็อกอะไร):**
- ~~`CI = 'true'` คอมเมนต์สไตล์ Next.js/vitest หลงเหลือใน `Jenkinsfile` ทั้ง php
  และ python~~ → เขียนใหม่เป็น generic CI flag, php 0.5.1 / python 0.5.2
- ~~php admin-handoff ตัวอย่าง dev port `8080` ชนกับ port default ของ Jenkins เอง~~
  → `8081` (+ SKILL เลิกยกตัวอย่าง 8080 ทุกจุด), php 0.5.1
- ~~python admin-handoff ยังโชว์ port `3000`/`3001` (ของเหลือจาก Next.js)~~
  → `8000`/`8001` ตรง Dockerfile จริง, python 0.5.2
- มติ 2026-08-25: HEALTHCHECK retries 3 (Dockerfile) vs 5 (compose) **ไม่เปลี่ยน**
  — compose ประกาศ healthcheck เต็มชุด override ตอน deploy จริง ค่า Dockerfile
  มีผลเฉพาะ bare `docker run` · [WP] deploy `cp` block **คงเป็น instruction ใน
  reference** จนกว่า WP จะมี pilot จริง (ownership หลัง cp ยังไม่เคยพิสูจน์)

**มาตรฐานที่ยังขาด (แยกจาก hardening):**
- OWASP Dependency Check สแกน `composer.lock` ที่มักมีแต่ dev tooling (runtime
  0 package) แต่ threshold บล็อก deploy ได้จากช่องโหว่ที่ไม่เคยขึ้น production —
  ควรมี Trivy (image scan) เป็นส่วนหนึ่งของ "Dependency Scan" ตามที่ contract
  ตั้งชื่อ stageไว้กว้างอยู่แล้ว ไม่ต้องแก้ contract
- `.dockerignore` บังคับแค่ 4 บรรทัด (CI artifact) ไม่ครอบไฟล์ secret
  (`db_config.php`, `.env`) ที่ `COPY . .` จะพาเข้า image ได้ถ้าไม่กันเอง

### 7. i18n leftover ที่เจอตอนเทียบกับ HRMS (2026-08-24, หลังปิด gate bug + `.gitattributes` + era ใน 4.46.1)

HRMS (`D:\Project_2026\ugt-hrms`) เป็น production reference ของ i18n เต็ม —
1,819 key × 2 locale, parity ตรง 0 ตกหล่น, เมนู/sidebar แปลครบ — ใช้ยืนยันว่า
เป้าหมาย "สลับ ENG แล้วครอบคลุมทุกหน้าทุกเมนู" ทำได้จริง สามข้อที่เจอและปิดแล้ว
บันทึกไว้ที่ CHANGELOG 4.46.1 ที่เหลือยังไม่ปิด:

- ~~`next-intl` ไม่ pin major~~ → 4.47.5 (pin `^4` ทั้ง `npm i` ของ Step 4
  และ dependency note ของ Step 6 — เช็ค npm registry แล้ว latest เป็น 4.x
  ตรงกับที่ HRMS ใช้จริง `^4.8.3`)
- ~~`resolveConverted()` ใน `check-i18n.mjs` ไม่ probe `src/`~~ → 4.47.5
  (เพิ่ม `join(ROOT, 'src', rel)` และ `join(ROOT, 'src', 'components', rel)`
  เข้า candidate list เดียวกับที่มีอยู่ — พิสูจน์ด้วย fixture 4 เคสแล้ว)
- **`use-action-error.ts` แบบ HRMS เป็นภาพของปัญหาที่เฟส 2 (auth-setup) ต้อง
  เลี่ยง** — HRMS map error ด้วย**ข้อความอังกฤษ lowercase** 40 บรรทัดมือล้วน
  (`'you cannot delete your own account': 'errorCannotDeleteSelf'`), unknown
  value หลุดเป็นอังกฤษเงียบ ๆ — ยืนยันมติเดิมว่าเฟส 2 ต้องเปิดด้วย
  error-code contract (code-based ไม่ใช่ prose-based) ก่อนแตะสตริงสักตัว ดู
  `docs/superpowers/specs/2026-08-24-org-kit-i18n-design.md` §7

### 8. จาก review เฟส 2 (2026-08-24, หลังปิดช่อง registration ใน 4.47.1)

**ตราเวอร์ชันของ asset คลาดเคลื่อน 15 ไฟล์ใน 4.47.0** — `stamp-kit-assets.mjs`
นิยามไว้เองว่าเลขในตราคือ "release ที่ **เนื้อไฟล์** เปลี่ยนล่าสุด" และสั่งให้
รัน **หลัง** bump version แต่แผนเฟส 2 วาง bump ไว้ที่ task สุดท้าย (14) จึง
stamp ไปตอน `plugin.json` ยังเป็น `4.46.1` ทั้ง 15 ไฟล์ · ไฟล์ที่ถูกแก้อีกครั้ง
ใน fix-wave (ซึ่งรันหลัง bump) ได้ `4.47.0` ถูกต้อง ที่เหลือค้าง `4.46.1` ถาวร
เพราะ stamper จะไม่เขียนเลขใหม่เมื่อ hash ไม่เปลี่ยน · เคสชัดสุด
`lib/use-field-error.ts` = **ไฟล์ใหม่ที่อ้างว่ามาจากรุ่นที่มันไม่เคยมีอยู่**

**ไม่กระทบการทำงาน** — ตรวจแล้วว่า `check-kit-freshness.mjs` ตัดสิน
CURRENT/UPDATE/MERGE จาก content hash ล้วน เลขเวอร์ชันใช้แค่แสดงให้คนอ่าน
(`installedVersion`) · **ไม่แก้ย้อนหลัง** เพราะรัน stamper ซ้ำก็ไม่ช่วย (hash
เท่าเดิม) และบังคับเขียนเป็น `4.47.1` ก็ผิดอีกแบบ (เนื้อไม่ได้เปลี่ยนใน 4.47.1)

**สิ่งที่ควรทำจริง — เป็นเรื่องกระบวนการ ไม่ใช่ข้อมูล:** แผนรุ่นถัดไปต้อง
bump version **ก่อน** task ที่แตะ asset ไม่ใช่หลัง · ถ้าอยากกันด้วยเครื่องมือ
ให้ `stamp-kit-assets.mjs --check` เตือนเมื่อพบ asset ที่ `git diff` บอกว่า
เปลี่ยนใน commit range ของรุ่นนี้ แต่ตรายังเป็นเวอร์ชันก่อนหน้า

### 9. จาก eval รันจริงของ `ugt-nextjs-auth-setup` (2026-08-24) — พบ 4 บั๊กที่มีมาก่อนเฟส i18n

รัน eval 1 (`sso-plus-ldap-drop-local`) จริงผ่าน subagent บน scaffold ที่จำลอง
output ของ `ugt-nextjs-database-setup` (ไม่มี design-setup) — 3 ข้อ**ปิดแล้ว**
ในรอบนี้ ข้อ 4 ยังเปิดอยู่โดยตั้งใจ (แก้แบบ stopgap ไปแล้ว รอ research จริง):

- ~~`verify.mjs`'s "[METHOD: …] markers removed" false-positive ทุกการติดตั้ง
  แบบหลาย method~~ → 4.47.2 (ตรวจสอบ selected methods จาก evidence จริงในไฟล์
  แทนการนับ marker ดิบ — SKILL.md §5.2 เองก็บอกว่ามาร์กเกอร์ของ method ที่เก็บไว้
  "อยู่ต่อได้" ไม่ใช่ของค้าง)
- ~~SKILL.md §6 บอกผิดว่า placeholder checker "อ่านเฉพาะ .ts/.tsx/.prisma"~~ →
  4.47.2 (`verify.mjs` สแกน `.env.local`/`.env.example`/`.env` ด้วยจริง — พิสูจน์
  ด้วยการใส่ token กลับเข้า `.env.example` แล้วเห็น FAIL)
- ~~`better-auth` ไม่ pin version ใน §5.1~~ → 4.47.2 stopgap: pin `1.6.14`
  (bisect npm package จริงยืนยันแล้วว่า `genericOAuthClient` หายจาก
  `better-auth/client/plugins` ตั้งแต่ `1.7.0` — **ไม่ใช่ major bump ด้วยซ้ำ**
  มีอยู่ถึง `1.6.14` หายใน `1.7.0` — `npm i better-auth` แบบไม่ pin ที่ทำมา
  ตลอดพังปุ่ม SSO ทันทีสำหรับการติดตั้งใหม่ทุกครั้งตั้งแต่วันนี้)
- ~~better-auth 1.7.x เอา `genericOAuthClient` ออกแล้วมี API แทนไหม~~ →
  **migrate แล้ว, 4.47.3** — อ่าน better-auth 1.7 upgrade guide +
  bisect tarball จริงของ `1.7.0`/`1.7.1` (`dist/plugins/generic-oauth/`)
  ยืนยันว่าเป็นการรีดีไซน์ตั้งใจ ไม่ใช่ regression: generic OAuth ย้ายเป็น
  social provider ระดับ core — `signIn.social({ provider: 'keycloak' })`
  แทน `signIn.oauth2()` ที่ถูกลบ, ไม่ต้องมี client plugin เลย (ไม่ใช่
  `oauthPopupClient` — ตัวนั้น popup-based คนละแบบตามที่สงสัยไว้), callback
  route ย้ายจาก `/api/auth/oauth2/callback/:id` เป็น `/api/auth/callback/:id`.
  ฝั่ง server (`genericOAuth`/`keycloak()` จาก `better-auth/plugins`) ไม่กระทบ
  — ยืนยันด้วยการอ่าน `plugins/index.d.mts` ของ tarball จริง SKILL.md §5.1
  เปลี่ยน pin เป็น `better-auth@^1.7.1` พิสูจน์ด้วย `tsc --strict` จริงบน
  scratch project ที่ติดตั้ง `1.7.1` จริง (ไม่ใช่แค่เปลี่ยน import แล้วเดา)
- ~~ไม่ใช่บั๊กของ auth-setup แต่กระทบการ verify แบบ end-to-end: `prisma.config.ts`
  (จาก `ugt-nextjs-database-setup`) เขียนคอมเมนต์ไว้ว่า "schema.prisma must NOT
  contain a url field — Prisma 7 + driver adapter" แต่ไม่มีที่ไหน pin เวอร์ชัน
  prisma เลย ทำให้ install ที่ไม่ pin ลง Prisma 6 ได้ (ตามที่ scaffold ของ eval
  เจอ) — Prisma 6 ไม่อ่าน `datasource.url` จาก `prisma.config.ts` โยน `P1012`
  ทันที บล็อก `prisma generate` และทุกอย่างที่ต่อจากนั้น~~ → 4.47.4 pin
  `prisma@7.9.1` / `@prisma/client@7.9.1` / `@prisma/adapter-mssql@7.9.1` ใน
  Setup Step 1 (พิสูจน์แล้วว่า `npx prisma generate`/`validate` ผ่านจริงกับ
  asset เดิมที่เวอร์ชันนี้ — asset เองเขียนถูกอยู่แล้ว ปัญหาคือไม่มีการ pin)
- ~~scaffold ของ database-setup ไม่มี Tailwind/`.gitignore` เลย — ทำให้
  `npx shadcn@latest init` พังจนกว่าจะติดตั้ง `tailwindcss` เองก่อน และ
  auth-setup's verify.mjs's ".env.local not committed" check FAIL จนกว่าจะสร้าง
  `.gitignore` เอง — ไม่มีเอกสารที่ไหนบอกว่าเป็นความรับผิดชอบของใคร~~ → 4.47.4
  (ยิง `.gitignore` เป็น asset ใหม่ของ database-setup copy ใน Setup Step 2 ·
  design-setup's SKILL.md เพิ่มเช็ค Tailwind ก่อน `shadcn init` ในสาขา
  existing-project แล้วติดตั้งให้ถ้ายังไม่มี)

### 10. จาก re-score ตามเกณฑ์ skill-creator (2026-08-25, หลังปิด gap หลักใน 4.48.1)

- **auth-setup SKILL.md ยาว 628 บรรทัด** เกินเกณฑ์ ~500 ของ skill-creator —
  ส่วนที่ควรย้ายคือตาราง DO/DON'T 43 แถวใน §7 ที่ซ้ำเนื้อหากับ §2 และ
  `references/auth-flows.md` บางส่วน · เป็นงาน restructure ไม่ใช่แก้จุด
  จึงไม่รวมใน 4.48.1 (fix release) — ทำเป็นรุ่นของตัวเองพร้อม re-run
  trigger evals เพราะแตะโครงเอกสารที่ trigger อาศัย

## รอเงื่อนไข (ทำไม่ได้จนกว่า)

| งาน | รออะไร | บันทึกตัวเองไว้ที่ |
| --- | --- | --- |
| Behavior evals 3 ชุด (ugt-context / mail / upload) | โปรเจคจริงที่ติดตั้ง | `evals.json` ทั้งสามประกาศ `"date": null` เอง |
| Trigger baseline ของ `ugt-nextjs-kit-sync` | release gate รอบถัดไป (ผู้ตัดสิน 3 คนตามแบบแผน) | `trigger-evals.json` ประกาศ pending เอง |
| Behavior evals ของ `ugt-nextjs-kit-sync` (ยังไม่เคยเขียน — เป็นตัวเดียวที่ไม่มี `evals.json`) | โปรเจคจริงที่มีไฟล์ kit ถูกแก้เอง เพื่อวัดการตัดสิน merge vs overwrite | แถวนี้ |
| Trigger baseline ของ php/python (ประกาศ `date: null` แล้ว 2026-08-23) | pilot จริงของสอง stack นี้ | `evals/trigger-evals.json` ของแต่ละตัว |
| Pilot `ugt-python-platform` / `ugt-php-platform` 0.3.0 → tag | โปรเจค pilot จริง | README ตาราง plugin |
| Multi-stack ต่อ (React SPA ฯลฯ) | มีโปรเจค stack นั้นจริง | `docs/multi-stack-proposal.md` |

## ปิดแล้ว (ย้ายมาจากรายการบน — ชี้รุ่นที่ปิด)

- ~~React Query provider + เกณฑ์ RQ vs RSC~~ → 4.12.0
- ~~zustand ยังไม่ converge~~ → ปฏิเสธ + client-state ladder, 4.15.0
- ~~RHF schema/resolver + zod ที่ boundary~~ → form-validation.md, 4.16.0
- ~~asset ตกรุ่นเงียบไม่มีกลไก sync~~ → `ugt-nextjs-kit-sync` + stamp, 4.14.0
  (พิสูจน์สนามจริงกับ HRMS 2026-08-12)
- ~~ui/chart · tiptap · motion มีกฎแต่ไม่มีของ~~ → 4.12.0
