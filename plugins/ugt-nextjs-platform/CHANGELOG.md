# Changelog — ugt-nextjs-platform

## 4.54.0 (2026-08-26)

**upload-setup: virus scan เป็นคำถาม interview (opt-out ได้แบบมีเงื่อนไข) +
troubleshooting `SCANNER_UNAVAILABLE` จาก field report**

- §3 Q5 ใหม่: ถามว่าเอา virus scan ไหม (default **เอา** ตามมติ 2026-08-09)
  พร้อมเงื่อนไข infra ที่ทำให้บางโปรเจคเอาไม่ได้จริง (clamav กิน RAM ~2 GB,
  boot แรกต้องโหลด signature DB ~1 GB จากเน็ต) — ตอบ "ไม่เอา" ต้องรับ 3 ข้อ:
  ตัดตาม marker `[SCAN]`, บันทึก `⚠ deviation` ใน architecture.md, เพิ่ม
  งานค้าง retrofit ใน board.md (ถอด scan = ติดหนี้ ไม่ใช่ปิดเรื่อง)
- marker `[SCAN]` (แบบเดียวกับ `[METHOD:]` ของ auth-setup) ใน asset ทุกจุด:
  `lib/virus-scan.ts` (ข้ามทั้งไฟล์), บล็อก scan ใน `app/api/files/route.ts`
  (scan-off → `scanStatus: 'unscanned'`), ด่านดาวน์โหลด `[id]/route.ts`
  (scan-off → `=== 'infected'` เพื่อให้แถวเก่า 'unscanned' ยังโหลดได้ตอน
  retrofit), env `CLAMAV_*`, service clamav + depends_on + clamav-db ใน
  compose snippet — คอลัมน์ `scanStatus` ในตารางคงไว้เสมอ (retrofit ไม่ต้อง
  migrate)
- `scripts/verify.mjs` รู้จักโหมด scan-off: ตรวจว่า opt-out **ครบชุดและตั้งใจ**
  (ไม่มี virus-scan.ts + 'unscanned' + ด่านดาวน์โหลดแก้แล้ว + มีบรรทัด
  deviation) — เข้าเงื่อนไขครึ่งเดียว = การติดตั้งพัง ไม่ใช่ opt-out
- §7 ใหม่ Troubleshooting `SCANNER_UNAVAILABLE` (field report 2026-08-26):
  สาเหตุจริงอยู่ใน log `virus scan unavailable <สาเหตุ>` ของ container แอป
  เสมอ · กับดัก "toast ≠ log" และ "clamav healthy ≠ แอปต่อถึง" (healthcheck
  รันในตัวเอง) · ตาราง 4 สาเหตุ: ENOTFOUND (network/ชื่อ service),
  ECONNREFUSED (DB ยังโหลด / host ไม่มี outbound internet → freshclam ล้ม
  เงียบถาวร), timeout, `INSTREAM size limit exceeded` (StreamMaxLength
  default 25 MB ชนกับ `UPLOAD_MAX_BYTES` ที่ขยับเกิน) + ท่า `docker exec …
  node -e` พิสูจน์เส้นทาง network เมื่อ image ไม่มี nc

## 4.53.0 (2026-08-26)

**auth-setup: return-to-page (`?from=`) — login แล้วกลับหน้าเดิม ไม่ตกหน้าแรก**

- ปิด gap ที่ 4.52.0 ทิ้งไว้: `SessionExpiredDialog` พาไป `/login` เฉย ๆ
  ผู้ใช้ login ใหม่แล้วตกหน้าแรก งานที่ค้างอยู่หายทั้งหน้า — ตอนนี้ทุกทางเข้า
  `/login` แนบ `?from=<path>` (basePath-relative เสมอ) แล้ว login ทุกวิธี
  พากลับ:
  - `proxy.ts`: redirect ฝั่ง server แนบ `?from=<pathname+search>` +
    forward header ใหม่ `x-from` ให้ protected layout ใช้ตอน
    `redirect('/login?reason=session_expired')` (server component มองไม่เห็น
    URL ตัวเอง — header นี้คือทางเดียว)
  - `session-expired-dialog.tsx`: แนบ `&from=` จาก `location.pathname+search`
    (ตัด basePath ก่อน)
  - `login-form.tsx`: prop ใหม่ `from` — SSO ส่งเป็น
    `callbackURL: `${basePath}${from}``, LDAP/local `router.push(from)`
    หลังสำเร็จ
- **กัน open redirect**: `sanitizeFrom()` ใน login-form รับเฉพาะ same-origin
  relative path — ต้องขึ้นต้น `/`, ห้าม `//` (protocol-relative) และ `/\`
  (browser normalize backslash) — ค่าอื่นทิ้งกลับ `'/'` เพราะ `?from=`
  มาจาก searchParams ที่ใครก็ forge ลิงก์ได้ (OWASP A01)
- SKILL.md §5.5: login page ส่ง `from` จาก searchParams + layout อ่าน `x-from`
- `references/auth-flows.md`: section ใหม่ "Return-to-page (`?from=`)
  convention" + snippet Server Component session check แนบ `from`

## 4.52.0 (2026-08-26)

**auth-setup: ตัวรับ event `session-expired` ที่ขาดหาย — `SessionExpiredDialog`**

- `assets/components/session-expired-dialog.tsx` ไฟล์ใหม่: `query-provider`
  (design kit) และ `lib/auth-client.ts` ยิง CustomEvent `session-expired`
  ตอนเจอ 401 กลางหน้ามานานแล้วแต่ไม่เคยมีตัวรับ — event เงียบหาย ผู้ใช้เห็น
  ทุกปุ่ม "พังเงียบ" จนกว่าจะ refresh เอง ตอนนี้เป็น `AlertDialog` ปิดไม่ได้
  (ไม่มีปุ่มยกเลิก — session ตายแล้ว "ยกเลิก" ไม่มีความหมาย) ปุ่มเดียว
  full-navigate ไป `/login?reason=session_expired` (ใช้ banner หน้า login
  ที่มีอยู่แล้ว + ล้าง client state/React Query cache ที่ stale ทั้งก้อน)
- SKILL.md: แถวติดตั้งใน §5.2 + mount ใน protected layout (§5.5 ข้อ 2)
- `lib/auth-client.ts`: comment ชี้ตัวรับจริง แทน "banner" ที่ไม่เคยถูกสร้าง
- design-setup `references/conventions.md` + `assets/DESIGN.template.md`:
  Dialog ladder เพิ่มแถว "system alert บังคับ action เดียว" — ข้อยกเว้น
  footer ไม่มีปุ่มยกเลิก บันทึกเป็นกติกา ไม่ปล่อยเป็น dialog นอกแบบ
- messages: namespace ใหม่ `auth.sessionExpiredDialog` (th/en)

## 4.51.0 (2026-08-25)

**Audit ปูพรม 7 มิติ 2026-08-25 — แก้ verified-wrong + ความขัดแย้งทั้งชุดฝั่ง
Next.js** ทุกข้อตรวจกับเอกสารทางการ/ซอร์สจริงของ package ก่อนแก้ (Better Auth
1.7.1 แตก tarball อ่านตรง, SonarJS rule metadata, Next.js 16 docs):

ของที่พังจริง/เงียบ (auth-setup):
- `assets/proxy.ts`: `export const proxyConfig` → **`export const config`**
  (Next อ่านชื่อนี้ชื่อเดียว — matcher เดิมเป็น dead code proxy รันทุก request)
  + เช็คเวอร์ชัน Next ก่อน copy: <16 ต้องใช้ชื่อ `middleware.ts` (เดิมโปรเจค
  Next 15 ได้ไฟล์ที่ไม่มี route protection แบบเงียบ)
- `assets/lib/auth.ts`: คีย์ `rateLimit.customRules` ตัด basePath —
  `'/api/auth/sign-in/email'` ไม่เคย match (library ตัด `/api/auth` ก่อนเทียบ)
  → `'/sign-in/email'` / `'/request-password-reset'` — brute-force protection
  กลับมาทำงานจริง
- `assets/lib/audit-actions.ts` **ไฟล์ใหม่**: ค่าคงที่ audit action ที่
  `references/audit-logging.md` บังคับแต่ไม่เคย ship — refactor call site
  ทุกตัวเลิกใช้ raw string, verify.mjs สแกนกันถอยหลัง
- ตัวอย่าง guard ใน `rbac.md`/`audit-logging.md` เลิกใช้
  `PERMISSIONS.USERS_DELETE` ที่ kit จงใจไม่ประกาศ (copy แล้ว
  `hasPermission(perms, undefined)` = 403 เงียบถาวร) → เขียนรอบ `ROLES_DELETE`
- `BETTER_AUTH_URL` optional → **required** (ไม่ตั้งใน production =
  `__Secure-` prefix mismatch = redirect loop ที่ skill นี้กันเอง)
- Keycloak redirect URI slash ใน `keycloak-client.md` ตรงกันทุกจุดแล้ว
  (`<BETTER_AUTH_URL>/__BASE_PATH__/...`) + โน้ตว่า backchannel logout แบบ
  POST เป็น legacy endpoint เก็บไว้โดยตั้งใจ

database-setup:
- เหตุผล generator เขียนใหม่ตามจริง: org คง `prisma-client-js` เพราะ asset
  import `@prisma/client` (ไม่ใช่ "prisma-client ไม่มี MSSQL adapter" ซึ่ง
  กลับด้านกับความจริง — ตัวใหม่คือ default ที่ Prisma แนะนำ ตัวเดิม deprecated)
- `migrations.md`: `--to-schema-datamodel` (ถูกถอดใน Prisma 7) → `--to-schema`
  · เพิ่ม §shadow database (สิทธิ์ CREATE DATABASE บน SQL Server องค์กร +
  `SHADOW_DATABASE_URL`) — gap ที่จะเจอทุกโปรเจคที่รัน `migrate dev` ครั้งแรก
- `naming-conventions.md`: ตัวอย่าง ✅ เลิกใช้ชื่อตารางชุดยกเว้น
  (`Users`/`RolePermissions` → `HolidayLists`/`Items`) + กฎตัด audit column
  ต้องบันทึก `⚠ deviation` ตาม contract

ความขัดแย้ง prose ที่แก้ให้ตรงฝั่งที่ enforce จริง:
- auth-setup: ข้อยกเว้น singular 5 → **8 ตาราง** ตรง verify.mjs ทั้งสองฝั่ง ·
  §3 Q7 mail↔auth เลิกวนลูป — ใช้ two-pass ตาม full-setup (auth → mail →
  กลับ §5.5) · ข้อยกเว้น audit columns + hard delete ของตาราง auth ประกาศ
  ชัด + สั่งบันทึก `⚠ deviation` ใน architecture.md · เหตุผล "Edge" ที่ตาย
  แล้ว (proxy รัน Node.js ตั้งแต่ Next 16) → เหตุผล latency จริง ·
  SKILL.md 506 → 465 บรรทัด (checklist ย้ายไป `references/verification.md`)
- pitfalls: `hardening.md` เลิกสอน catalog `.json` (ชนกับ gate `check-i18n.mjs`
  ที่บังคับ `.ts`) · `dates-timezones.md` §4 เขียนใหม่ตามมติ 2026-08-24 —
  ค.ศ. เสมอ ไม่มีเส้นทาง ±543 (เดิมสอน "display BE" พร้อม helper ที่ contract
  ประกาศว่าต้องไม่มีอยู่) · verify.mjs จับ ±543 ทุกที่ ไม่มี exempt
- clean-code: Sonar rule ID ผิด 3 จุดแก้ตาม SonarJS metadata จริง (S7764 ไม่จับ
  `typeof window` · `a ? a : b` = S6644 · S7718 ignore `e`/`err` โดย default)
  + verify.mjs เลิก false-positive `catch (e|err)` · กลไก NOSONAR อธิบายถูก
  (ติดที่บรรทัด ไม่ใช่ชนิด comment) + caveat ว่า NOSONAR ไม่รับ rule key
- cicd-setup: health payload `'ok'` → **`'healthy'`** ตรง contract + อีก 2
  stack · `sonar-project.properties` แก้ sources/tests ทับซ้อน (เสี่ยง
  "indexed twice") ให้ตรง convention co-located ของ test-lint-setup ·
  stage summary `format` → `format:check` · Jenkins custom image จบ
  `USER jenkins` ไม่ใช่ root · แก้ข้ออ้าง HEALTHCHECK env / `--network host`
- test-lint-setup: frontmatter ครบสี่ script · "three in parallel" → สอง ·
  กลไก globalIgnores สะสมไม่ใช่ทับ · kit-sync `ROOT_FILES` เพิ่ม
  `vitest.setup.ts` (เดิมมองไม่เห็นตลอดกาล) · design-setup `check-contrast.mjs`
  รองรับ `src/` layout (เดิม gate ปิดงานพังบน src/ โปรเจค) · `size="icon"`
  ตามมติ 2026-08-21 (ทุกที่ + aria-label) · smoke checklist ที่ซ้ำ §6
  ยุบเหลือ pointer (design-setup + full-setup)

## 4.50.0 (2026-08-25)

**`ugt-nextjs-auth-setup` SKILL.md restructure** (backlog §10 — the piece
deliberately left out of 4.48.1's fix release because it needed its own
version + a trigger-eval re-run, not a doc tweak): file was 632 lines vs
skill-creator's ~500 guideline, and most of the excess was §7's "Quick Rules
DO/DON'T" table restating facts already documented once, properly, in §2 or
in `references/{auth-flows,rbac,data-scope,directory-enrichment}.md` — files
§1 already tells the reader to consult before touching auth code.

Cross-checked all 39 rows against those five sources by reading each file in
full — 34 rows were near-verbatim duplicates (same API name, same code
snippet, same cookie mechanic, same RBAC/scope contrast already tabulated
elsewhere); 5 were genuinely unique to the table (admin-created-local-user
hashPassword pattern, `isSelf`/`!viewAll` pitfall, the two UI-kit rows) and
stayed. §7 shrinks from 39 rows to 5. Zero information loss — everything cut
is still documented, with more context, at its one real home.

**Second pass — found and fixed more, this time by relocating instead of
deleting** (asked "what else can shrink without losing content" after the §7
cut): §5.2's i18n-catalog-registration walkthrough (53 lines, self-contained,
duplicated nowhere) moved wholesale to a new `references/i18n-wiring.md` —
§5.2 keeps a short pointer + the "skipping this fails silently" warning.
The better-auth 1.7.0 migration history in §5.1's dependency comment moved
into `references/auth-flows.md`'s SSO login flow section, where the code it
explains actually lives. §3 Q5 (first-admin) was duplicating §5.5 step 5
almost sentence-for-sentence — trimmed to a pointer. §8's HSTS/security-header
checklist entries were restating explanations `proxy.ts` already carries as
code comments — trimmed to the check itself with a pointer to the asset.
§4's DataTable-downgrade paragraph tightened without dropping the decision
rule. File: 632 → 604 → **547 lines** (still above the ~500 guideline —
§5/§8's remaining bulk is setup steps and a hand-verification checklist,
not duplication, so further cuts there would be a different, riskier kind
of change).

**Third pass — reaching the guideline** (asked for an assessment of what
could genuinely be *cut*, found 4 real leftover duplications + relocatable
lookup content): §4 stated each admin table's DataTable mode in prose that
§5.2's asset-table rows already carry — cut, §5.2 is the home · §4's
enumeration of 8 file names calling `useTranslations()` compressed to the
principle · §5.5 step 2's `isAdminInitialized` caching rationale → pointer
to `rbac.md` · §2 item 4's 11-name audit-action catalog moved INTO
`references/audit-logging.md`'s action-naming section (which previously
listed only 4 of the mandated actions — the move made that file *more*
correct, not just shorter), §2 keeps the principle · §6's placeholder table
moved to a new `references/placeholders.md` (§6 heading kept as a pointer —
section numbers never shift, per the no-renumber rule) · historical
parentheticals, the §7 preamble, and three verbose passages tightened.
**Also fixed a real numbering bug found on the way: §5.5 had two steps
numbered "5"** — the sync step is now 6, and §5.6's "the sync in step 5"
reference updated to match. File: 632 → 547 → **506 lines**, at the ~500
guideline with zero content loss (references/ gained `i18n-wiring.md` and
`placeholders.md`; `audit-logging.md` gained the full mandated catalog).

**Trigger-eval re-validation** (required because this touches the file the
trigger baseline was built against, even though the frontmatter `description`
itself was not edited by any pass): 3 independent judges, same method as
the 2026-08-09 baseline (skill listing built from every SKILL.md frontmatter
in the marketplace + superpowers distractors, judges answer from that text
only). Result: primary accuracy 27/27 (100%) — unchanged. Full result
recorded in `evals/trigger-evals.json` under `revalidation_2026-08-25`
(covers all passes — the frontmatter never moved, so a re-run would test
nothing new).

## 4.49.3 (2026-08-25)

**Internal-CA TLS for SSO/LDAP — real production incident, not theoretical**
(`fetch failed` → `UNABLE_TO_VERIFY_LEAF_SIGNATURE` on login SSO in a deployed
project) exposed two gaps between `ugt-nextjs-auth-setup` and
`ugt-nextjs-cicd-setup` that neither skill's docs reconciled:

- `auth-setup`'s `env.example` ships `NODE_TLS_REJECT_UNAUTHORIZED=0` **on by
  default** for SSO/LDAP (closed-intranet assumption), but `cicd-setup`'s
  SKILL.md said this value must **never** reach the prod/dev Jenkins Secret
  File credential — correct rule, but nothing told anyone what to do
  instead, so the variable silently never reached the deployed container at
  all
- `docker-compose.yml`/`docker-compose.dev.yml` had no placeholder for it or
  for `NODE_EXTRA_CA_CERTS` — even someone who knew the fix had nowhere
  asset-provided to put it

Fixed: `docker-compose.yml`/`.dev.yml` now carry a `[METHOD: SSO or LDAP]`
commented placeholder for both variables in `environment:`, with a note that
this is an infra decision made directly in the compose file, not a secret ·
`admin-handoff.template.md` gets a new §4 "TLS ภายในองค์กร" — the admin picks
CA-cert-file (preferred) or closed-intranet confirmation and sends it back,
same pattern as the existing Keycloak/`APP_PORT` rows · cicd-setup SKILL.md's
DO/DON'T table row rewritten — the DON'T was never "don't use this in prod",
it was "don't put it in the Secret File" · `keycloak-client.md` and
`auth-flows.md`'s troubleshooting table cross-reference the new admin-handoff
section and name the exact error signature seen in production
(`UNABLE_TO_VERIFY_LEAF_SIGNATURE`) · auth-setup SKILL.md's interview step 4
tells the installer to keep this admin-handoff section even when the
Keycloak-client sub-step wasn't needed (LDAP-only projects still need the
TLS decision)

## 4.49.2 (2026-08-25)

**Fix เดี่ยว: check "mkdir -p ↔ bind" ของ cicd `verify.mjs` อ่าน compose แบบดิบ**
— บั๊กคู่แฝดของ jf/jfActive แต่ฝั่ง compose (ฝั่ง python/php ปิดไปแล้วใน 0.3.0
ด้วย `composeActive` แต่ nextjs ตกหล่น): template compose แจกตัวอย่าง `[VOLUME]`
เป็นบรรทัดคอมเมนต์ที่มีชื่อ `uploads` อยู่ — โปรเจคที่ไม่ใช้ volume (ลบบล็อก
[VOLUME] ใน Jenkinsfile ตามคำสั่ง แต่ปล่อยคอมเมนต์ตัวอย่างใน compose ไว้) จึง
**FAIL ปลอม**โดยอ้าง bind ที่ไม่เคยมีจริง · แก้ให้ตัดบรรทัด `#` ออกก่อน matchAll
(`composeActive` แบบเดียวกับ `jfActive`) · พิสูจน์ด้วย fixture สองฝั่ง:
คอมเมนต์ค้างอย่างเดียว → pass, bind จริงที่ Deploy stage ไม่เตรียม → ยัง FAIL

## 4.49.1 (2026-08-25)

**Fix release จากผล re-score หลัง 4.48.1** — แก้บั๊ก 2 ตัวที่ 4.48.1 พามาเอง,
ทำ src/ layout ให้จบทั้งชุด, ปิดช่อง vacuous ที่เหลือ · ทุกข้อพิสูจน์ด้วย
fixture ทั้งฝั่ง fail และฝั่ง pass ก่อน commit

- **upload sweep (บั๊กจาก 4.48.1)**: strip string literal ก่อนหา `\bFile\b`
  (`throw new Error('File not found')` เคย false-fail) · directive จับทั้ง
  `'use server'` และ `"use server"` (double-quote ของ Prettier default เคยรอด
  ทั้งที่รับไฟล์จริง) · ขยายไปกวาด colocated `app/**/actions.ts(x)` ด้วย
- **src/ layout จบทั้งชุด**: auth `verify.mjs` เปลี่ยน helper กลาง `p()` ให้
  probe `src/` อัตโนมัติ — ทุก check ได้พร้อมกัน (`AUTH_FILES`, cookie, proxy,
  password/directory/scope/approval/env) ไม่ใช่เฉพาะจุดที่ 4.48.1 แตะ ·
  `check-i18n.mjs` probe `src/messages/` + `src/i18n/messages.ts` (เดิม parity
  false-fail และ registration check วนกลับเป็น vacuous บนโปรเจกต์ src/ —
  ขัดกับ `hasIn` ที่ผู้เรียกเพิ่งได้) · design export check รู้จัก
  `src/lib/export.ts` (เดิม kit ของตัวเองโดนตีเป็น hand-rolled)
- **`resolveConverted` ตามหา admin page ที่ย้าย route group** — suffix match
  แบบเดียวกับ auth verify (auth SKILL §5.6 อนุญาต
  `app/(app)/(admin)/admin/users/page.tsx`) เดิมหน้า relocated หลุดด่าน
  no-Thai เงียบๆ เพราะเป็น optional file
- **mail verify**: check ใหม่ "Template admin UI complete" — page + manager +
  `mail-templates:manage` permission (เดิมเช็คแค่ `dev-mode:enable` หน้าแอดมิน
  403 ถาวรได้โดยไม่มีด่านจับ) · actor check ประกาศชัดว่า call ที่ส่ง identifier
  ตรวจไม่ได้ (ข้ามอย่างมีเหตุผล ไม่ผ่านเงียบ)
- **upload verify**: `components/file-upload.tsx` เข้า REQUIRED (เป็นเหตุผล
  ที่ catalog ถูกบังคับแต่ตัวเองไม่เคยถูกเช็ค) · `canReadAttachment` check
  เปลี่ยนเกณฑ์เป็น "มี return ที่ไม่ใช่ `return false`" (เดิมบังคับ `case '`
  literal ทำให้ if/else หรือ one-line boolean ที่ถูกต้อง false-fail)
- **auth verify**: cookie-prefix presence เช็คบน comment-stripped source
  (comment ที่เอ่ยถึง `cookiePrefix` เคยทำให้ check ผ่านทั้งที่โค้ดจริงถูกลบ)
- **เอกสารตรงโค้ด**: upload SKILL checklist เลิกสัญญา toast ฝั่ง download
  (route คืน `code` ให้ `<a href>` — key `FORBIDDEN_DOWNLOAD`/`NOT_FOUND`/
  `FILE_NOT_AVAILABLE` สงวนไว้สำหรับโปรเจกต์ที่ fetch เอง) ·
  `attachment-access.ts` docblock แก้ "denies everything except the uploader"
  → deny ทุกคนรวม uploader · `file-upload.tsx` docblock เลิก quote สตริงไทย
  ยุคก่อน i18n · login-form อ้าง §6 (เดิมชี้ §7 ผิด) · design SKILL เลิกอ้างว่า
  verify เช็ค placement ของ filter (เช็คแค่ bare `<Input>` แบบ warn) ·
  full-setup ปิดท้ายรายชื่อ module ครบ mail/upload + จับ `src/lib/storage.ts`

## 4.49.0 (2026-08-25)

**Harness ตกรุ่นต้องมองเห็นได้** — จากเคสจริงใน HRMS: CLAUDE.md block เป็น
v2.x (ไม่มี sizing section, ไม่มี precedence ของ model-mode, ชื่อ skill เก่า)
โดยไม่มีด่านไหนบอก เพราะ paste-into-file asset ไม่มีกลไก sync (คู่กับ
ugt-core 2.8.0 ฝั่ง `ugt-model-mode`)

- **`assets/CLAUDE-block.md` ประทับเวอร์ชันใน marker**:
  `<!-- ugt:start __HARNESS_VERSION__ …` — full-setup §4.1 สั่ง substitute
  เป็นเวอร์ชัน plugin ณ ตอน install
- **full-setup `verify.mjs` check ใหม่** "ugt block is not from an older
  harness release": marker ไม่มีเวอร์ชัน → warn ว่าเป็น block ก่อน 4.49.0
  ให้ re-apply · มีเวอร์ชันแต่ major.minor ตามหลัง plugin ที่ติดตั้ง → warn
  พร้อมทางแก้ (patch ต่างกันไม่เตือน — block ไม่ได้เปลี่ยนทุก patch)
- **`assets/state/model-mode.md`** ได้ 2 bullet เดียวกับ template ใหม่ของ
  `ugt-model-mode` 2.8.0 (precedence เหนือ skill + superpowers role mapping)

## 4.48.1 (2026-08-25)

**Fix release จาก re-score ตามเกณฑ์ skill-creator (สอง reviewer อ่านโค้ดจริง
ทุกไฟล์)** — ปิดช่อง verify ที่ผ่านโดยไม่เช็ค, ตัด dependency ข้ามสกิลที่ทำให้
โปรเจค compile ไม่ผ่าน, และรองรับ `src/` layout ให้ครบทั้งชุด · ทุกข้อพิสูจน์
ด้วย fixture ทั้งฝั่ง fail และฝั่ง pass ก่อน commit

- **auth-setup `verify.mjs`**: `PLACEHOLDERS` เพิ่ม `__LINKED_SERVER__` /
  `__HR_DB__` / `__HR_EMPLOYEE_VIEW__` / `__HR_AUTHORIZE_VIEW__` (ship อยู่ใน
  `lib/directory.ts` + `lib/approval-chain.ts` แต่ด่านไม่เคยสแกน — install ที่
  ลืมแทนค่าเคยผ่านเขียว) · scope-suspect scan normalize `src/` + เลิกจำกัดแค่
  route group (`app/admin/...` ที่รับ `empCode` โดยไม่เช็ค scope เคยรอดด่าน) ·
  first-admin candidates เพิ่ม `src/app/admin/setup/page.tsx` · เปลี่ยนชื่อ
  check cookie-prefix เป็น "env-driven (no hardcoded literal)" ให้ตรงกับที่
  เช็คจริง (ไม่ได้เทียบค่า derived ข้ามไฟล์)
- **design-setup `assets/lib/actions-locale.ts` ยืนเองได้แล้ว**: ตัด
  `import { auth } from '@/lib/auth'` + session guard ออก — action นี้แก้ได้แค่
  locale cookie ของ browser ตัวเอง ไม่ใช่ privileged action ตามมติ 2.6 และ
  dependency นี้ทำให้โปรเจค th+en ที่ไม่ติดตั้ง auth-setup compile ไม่ผ่านถาวร
  (ลำดับติดตั้งเอกสารเองก็ให้ design มาก่อน auth) · แก้ตาราง provenance ใน
  `references/conventions.md` ให้ตรง
- **design-setup `verify.mjs` รองรับ `src/` layout** (`hasIn`/`readIn`):
  globals.css, layout.tsx, kit files, `lib/format.ts`, `i18n/request.ts`,
  `messages/` — เดิม false-fail ทั้ง layout ที่ `check-i18n.mjs` เพิ่งรองรับใน
  4.47.5 (ขัดกันเองในสกิลเดียว) · next-intl หายเปลี่ยนจาก `warn` เป็น **fail**
  ให้ตรง severity ที่ SKILL.md ประกาศเอง ("แอปไม่ขึ้นทั้งแอป")
- **mail-setup + upload-setup `verify.mjs`**: `messages/*.{th,en}.ts` เข้า
  REQUIRED — เดิม install ที่ข้าม catalog ผ่าน verify ของสกิลตัวเองเขียวสนิท
  (จับได้เฉพาะเมื่อไปรัน check-i18n ของ design-setup ซึ่งเป็น manual step) ·
  upload's "Route Handler, not Server Action" เลิก hardcode 2 path — กวาด
  `lib/actions/**` + `src/lib/actions/**` หา `'use server'` + การใช้ `File`
  จริง (ไม่ใช่แค่ `formData` ซึ่ง form action ปกติก็ใช้)
- **`ui/chart-example.tsx` เข้าระบบ catalog แล้ว** (namespace ใหม่
  `kit.chartExample` 3 key ทั้ง th/en) — เป็นไฟล์ kit UI ไฟล์เดียวที่ด่าน
  no-Thai มองไม่เห็น · เพิ่มเข้า `OPTIONAL_CONVERTED_FILES` ของ
  `check-i18n.mjs`
- **เอกสารตรงกับโค้ด**: upload-setup SKILL.md เลิกอ้างว่า route handlers เรียก
  `useTranslations()` (มีแค่ widget ที่เรียก — handlers คืน `code` ตามมติ 2.6
  ซึ่งถูกแล้ว) · design-setup §6 ระบุชัดว่า `docs/design-preview.html` อยู่ใน
  platform repo ไม่ได้ copy เข้าโปรเจค · full-setup frontmatter กล่าวถึง
  mail/upload ในเส้นทาง routing · kit-sync §1 เพิ่ม `gitignore` ของ
  database-setup เข้ารายการ paste-into-file ที่อยู่นอกขอบเขต stamp
- **backlog §10 ใหม่**: auth-setup SKILL.md 628 บรรทัด (เกินเกณฑ์ ~500) —
  งาน restructure §7 แยกเป็นรุ่นของตัวเอง ไม่รวมใน fix release นี้

## 4.48.0 (2026-08-24)

**เฟส 3 (สุดท้าย) ของ i18n — mail-setup admin UI + upload-setup ทั้งสกิลอ่านจาก
catalog แล้ว** (spec: `docs/superpowers/specs/2026-08-24-org-kit-i18n-design.md`
§6.2, 52 ข้อความ — 36 mail-setup + 16 upload-setup) **ปิดสเปคทั้งฉบับ**

- **catalog ใหม่**: `messages/mail.th.ts`/`mail.en.ts` (namespace `errors` ·
  `templates` · `page` · `manager`) และ `messages/upload.th.ts`/`upload.en.ts`
  (namespace `errors` · `fileUpload`)
- **error-code contract ขยายไปอีกสองสกิล** (มติ 2.6): `admin-mail-templates.ts`
  เลิกคืน `{ error: 'ข้อความไทย' }` **และ** เลิกคืนอังกฤษดิบที่ฝังไว้เดิม
  (`'Unauthorized'`/`'Forbidden'`/`'Unknown template'` — ข้อความอังกฤษที่
  check-i18n.mjs สแกนไม่เห็นเพราะสแกนแต่อักษรไทย พบด้วยการอ่านโค้ด ไม่ใช่ด่าน)
  · ทั้งสอง route handler ของ upload-setup (`app/api/files/route.ts`,
  `app/api/files/[id]/route.ts`) เดิมมี `{ code, message }` อยู่แล้ว —
  ตัด `message` (ไทย) ออก เหลือ `code` ให้ client แปล (`FILE_TOO_LARGE` ส่ง
  `maxMb` แทนข้อความสำเร็จรูป)
- **`lib/types/mail-templates.ts`**: `MailTemplateDefinition.menu/label/
  description` (10 ข้อความ = UI chrome ของหน้าแอดมิน) กลายเป็น
  `menuKey/labelKey/descriptionKey` แปลที่ Server Component
  `page.tsx` (`getTranslations('mail.templates')`) — **เนื้ออีเมล 32 ข้อความ
  ที่เหลือในไฟล์เดียวกัน (GREETING, EMAIL_FOOTER, heading, previewSample,
  DEFAULT_MAIL_TEMPLATES) ไม่แตะ** (มติ 2.3, รอ locale column บน `user`) —
  ไฟล์นี้จึงไม่อยู่ใน `check-i18n.mjs`'s `OPTIONAL_CONVERTED_FILES` โดยเจตนา
  (จะมี Thai เหลืออยู่ถาวรจนกว่าจะทำ mission 2.3)
- **`check-i18n.mjs`**: `OPTIONAL_CONVERTED_FILES` +6 ไฟล์ (3 mail-setup, 3
  upload-setup) — พิสูจน์ด้วย fixture จริง: inject ไทยกลับเข้า
  `file-upload.tsx` แล้วเห็นด่านแดงทันที, ไทยในคอมเมนต์ยังผ่านตามปกติ
- **`SKILL.md` §i18n wiring**: ทั้ง `ugt-nextjs-mail-setup` และ
  `ugt-nextjs-upload-setup` ได้ย่อหน้าเดียวกับที่ `ugt-nextjs-auth-setup`
  §5.2 มี — copy catalog + ลงทะเบียนใน `i18n/messages.ts` ก่อน render
- **ปิดสเปค `2026-08-24-org-kit-i18n-design.md` ทั้งฉบับ**: เฟส 0-3 ครบ
  256/256 ข้อความในขอบเขต (289 - 33 เนื้ออีเมลนอกขอบเขต) — เนื้ออีเมล,
  ปฏิทิน พ.ศ., CLI/test titles, และคอมเมนต์ 845 บรรทัด ยังอยู่นอกขอบเขตตาม
  §8 เดิม

## 4.47.5 (2026-08-24)

**ปิดสองข้อจาก `docs/backlog.md` §7 — เจอจากการเทียบกับ HRMS** ทั้งสองข้อ
เล็กและเป็นอิสระต่อกัน:

- **`next-intl` pin เป็น `^4`** — เดิมใส่เป็น dependency ลอยไม่มี version
  constraint ทั้งที่คิตทั้งชุดเรียก `getRequestConfig`, `NextIntlClientProvider`,
  `useTranslations`, `getTranslations`, `createNextIntlPlugin` ตรง ๆ —
  breaking change ของ upstream แบบเงียบ ๆ กระทบทุกโปรเจคที่ติดตั้งใหม่ ตัวอย่าง
  จริงในรุ่นเดียวกันคือ `better-auth` เอา export ออกใน MINOR bump (ดู 4.47.2)
  — SKILL.md เองก็ประกาศหลักไว้แล้วว่า "pin majors, the kit is
  version-coupled" สำหรับ dep อื่น next-intl แค่ยังไม่เคยได้ pin — เช็ค npm
  registry แล้ว latest คือ 4.x (ตรงกับที่ HRMS ใช้จริง `^4.8.3`) จึง pin `^4`
  ทั้งใน `npm i` ของ Step 4 และ dependency note ของ Step 6 ให้ตรงกัน
- **`resolveConverted()` ใน `check-i18n.mjs` probe `src/` แล้ว** — เดิมลอง
  แค่ `<ROOT>/<rel>` กับ `<ROOT>/components/<rel>` โปรเจคที่ใช้ Next.js
  scaffold แบบ `src/` (บาง version default ให้) จะได้ FALSE FAILURE บนด่าน
  "converted files carry no Thai outside comments" — ไฟล์ติดตั้งถูกแล้วแต่ด่าน
  หาไม่เจอเพราะลึกไปอีกชั้น เพิ่ม `<ROOT>/src/<rel>` และ
  `<ROOT>/src/components/<rel>` เข้า candidate list เดียวกัน · พิสูจน์ด้วย
  fixture 4 เคส (src+clean ผ่าน, flat+clean ผ่านเหมือนเดิม, required file
  หายไปจริง FAIL ชี้ชื่อไฟล์, src+Thai ย้อนกลับเข้าไฟล์ FAIL ชี้ชื่อไฟล์)
  ไม่ใช่แค่อ่านโค้ด — กันไม่ให้ซ้ำรอยด่านนี้เคยพลาดมาสองรอบ (parity ผ่านบน
  catalog ว่างเปล่า, registration match decoy comment)

## 4.47.4 (2026-08-24)

**`ugt-nextjs-database-setup` fixes for the 3 defects the 4.47.2 eval surfaced
against it (`docs/backlog.md` ข้อ 9) — verified against a real scaffold, not
reasoned about:**

- **`prisma.config.ts` vs the pinned Prisma major** — the config file and
  schema skeleton were already written for Prisma 7's driver-adapter model
  (`url` only in `prisma.config.ts`), but `SKILL.md`'s install step never
  pinned a version, so an unpinned `npm install prisma` could resolve to 6.x
  and throw `P1012` on `prisma generate`, blocking `next build` behind it.
  Pinned `prisma@7.9.1` / `@prisma/client@7.9.1` / `@prisma/adapter-mssql@7.9.1`
  in the install step — confirmed `npx prisma generate` and `npx prisma
  validate` both pass against the skill's own unmodified assets at that
  version.
- **No Tailwind on the documented database → design → auth path** —
  `ugt-nextjs-design-setup`'s existing-project `shadcn@latest init` requires
  Tailwind already configured and does not install it; nothing named whose
  job that was. `ugt-nextjs-design-setup`'s `SKILL.md` now checks for
  Tailwind before that init branch and installs it
  (`tailwindcss` + `@tailwindcss/postcss` + `postcss.config.mjs`) when
  missing.
- **No `.gitignore` shipped** — left `.env.local` uncommitted only by luck,
  and failed `ugt-nextjs-auth-setup`'s "`.env.local` not committed" check on
  every fresh install. Added `assets/gitignore` (Next.js standard +
  `.env`/`.env.local`/`.env*.local` excluded, `.env.example` kept) copied to
  `.gitignore` in Setup Step 2.

## 4.47.3 (2026-08-24)

**ปิดข้อวิจัยที่ค้างจาก 4.47.2 — migrate จริง ไม่ใช่ค้าง pin**

ตรวจ better-auth 1.7.x จริง (npm pack tarball ของ `1.6.14`/`1.6.11`/`1.6.13`/
`1.7.0`/`1.7.1` + อ่าน source ที่ compile จริงใน `dist/plugins/generic-oauth/`,
ไม่ใช่แค่ changelog) แล้วยืนยันว่าการถอด `genericOAuthClient` เป็นการรีดีไซน์
ตั้งใจ ไม่ใช่ regression: generic OAuth (ปุ่ม SSO/Keycloak) ย้ายไปเป็น social
provider ระดับ core ตั้งแต่ 1.7.0 — `authClient.signIn.social({ provider:
'keycloak' })` แทน `signIn.oauth2({ providerId })` ที่ถูกลบ ไม่ต้องมี client
plugin เลย และ callback route ย้ายจาก `/api/auth/oauth2/callback/:id` เป็น
`/api/auth/callback/:id`. ฝั่ง server `genericOAuth`/`keycloak()` จาก
`better-auth/plugins` ยังอยู่เหมือนเดิม (ยืนยันด้วยการอ่าน `plugins/index.d.mts`
จริง) — เปลี่ยนแค่ `redirectURI` กับคอมเมนต์ `pkce` (default เป็น `true` แล้ว
ตั้งแต่ 1.7 แต่ยังใส่ explicit ไว้เพื่อจับคู่กับ Keycloak client config)

- `lib/auth-client.ts` — ลบ `import { genericOAuthClient }` และ
  `plugins: [genericOAuthClient()]` ทิ้งทั้งคู่ (ไม่มี client plugin ให้ใส่แทน)
- `lib/auth.ts` — `redirectURI` เปลี่ยน path เป็น `/api/auth/callback/keycloak`
- `components/login-form.tsx` — `SsoSection` เปลี่ยนเป็น
  `authClient.signIn.social({ provider: 'keycloak', callbackURL })`
- `references/auth-flows.md` และ `references/keycloak-client.md` — ปรับ flow
  description + Keycloak client's Valid Redirect URI ให้ตรง path ใหม่
- `SKILL.md` §5.1 — เปลี่ยน pin จาก `better-auth@1.6.14` (stopgap ฉุกเฉินของ
  4.47.2) เป็น `better-auth@^1.7.1` พร้อมคอมเมนต์อธิบายเหตุผลใหม่
- **พิสูจน์ด้วยการ typecheck จริง** ไม่ใช่แค่เปลี่ยน import แล้วเดา: สร้าง
  scratch project ติดตั้ง `better-auth@1.7.1` จริง คัดลอกโค้ด SSO block ของ
  `lib/auth.ts`/`lib/auth-client.ts` มา `tsc --strict` ผ่านสะอาด และยืนยันแยก
  ต่างหากด้วย `@ts-expect-error` ว่า `signIn.oauth2` หายไปจริงจาก type ของ
  1.7.1 (ไม่ใช่แค่เอกสารบอก)
- `docs/backlog.md` ข้อ 9 บรรทัด "ยังเปิด — ต้อง research จริง" → ปิดแล้ว
  ชี้มาที่รุ่นนี้

## 4.47.2 (2026-08-24)

**พบด้วยการรัน eval จริง ไม่ใช่อ่านโค้ด** — รัน `ugt-nextjs-auth-setup`'s
eval 1 (`sso-plus-ldap-drop-local`) ผ่าน subagent จริงบน scaffold ที่จำลอง
output ของ `ugt-nextjs-database-setup` เจอ 3 บั๊กที่**มีมาก่อนเฟส i18n** และ
ไม่เคยถูกจับได้เพราะไม่เคยมีใครรัน install เต็มแล้วเช็คผลจริง

- **`verify.mjs`'s "[METHOD: …] markers removed" ให้ FAIL ทุกการติดตั้งที่เก็บ
  มากกว่า 1 login method** (เช่น SSO+LDAP ที่ทดสอบ) — เช็คเดิมนับ marker ดิบ
  ทุกตัวโดยไม่แยกว่าเป็น marker ของ method ที่**เก็บไว้** (ซึ่ง SKILL.md §5.2
  บอกเองว่าเป็น section header ที่ถูกต้อง ไม่ใช่ของค้าง) กับ method ที่**ถูก
  ปฏิเสธ** (ของค้างจริง) — แก้ให้ตรวจ evidence จริงในไฟล์ (`lib/ldap.ts` มีไหม,
  `localLoginAction` มีไหม, `keycloak(` มีไหม) แล้ว flag เฉพาะ marker ของ
  method ที่ไม่มี evidence ว่าถูกเลือก
- **SKILL.md §6 เขียนผิดว่า placeholder checker "อ่านเฉพาะ .ts/.tsx/.prisma"**
  — `verify.mjs` สแกน `.env.local`/`.env.example`/`.env` ด้วยจริง พิสูจน์ด้วย
  การใส่ `__KEYCLOAK_HOST__` กลับเข้า `.env.example` แล้วเห็น verify FAIL ทันที
- **`better-auth` ไม่เคย pin version ที่ §5.1 — พังปุ่ม SSO ทันทีตั้งแต่วันนี้
  สำหรับการติดตั้งใหม่ทุกครั้ง** — bisect npm package จริงยืนยันแล้วว่า
  `genericOAuthClient` ที่ `lib/auth-client.ts` import เพื่อผูก
  `authClient.signIn.oauth2(...)` มีอยู่ถึง `better-auth@1.6.14` แล้วหายไปใน
  `1.7.0` — **ไม่ใช่ major bump ด้วยซ้ำ** unpinned `npm i better-auth` ที่ทำมา
  ตลอดได้ 1.7.x ทันที · แก้แบบ stopgap: pin `1.6.14` — 1.7.x's ตัวแทนจริง
  (ถ้ามี) ยังไม่ได้ research ดู `docs/backlog.md` ข้อ 9

**คงค้างจาก eval เดียวกัน แต่ไม่ใช่ของ auth-setup**: `prisma.config.ts` ของ
`ugt-nextjs-database-setup` ขัดกับ `prisma: "^6.0.0"` ที่ pin ไว้เอง
(`P1012`, บล็อก `prisma generate` และทุกอย่างต่อจากนั้น) และ scaffold ของ
skill นั้นไม่มี Tailwind/`.gitignore` เลย — ส่งต่อให้เจ้าของ skill ดู บันทึกไว้ที่
`docs/backlog.md` ข้อ 9 เช่นกัน

## 4.47.1 (2026-08-24)

**ปิดช่องที่ทำให้ catalog ถูก copy แล้วไม่ถูกใช้ — เงียบ ๆ** (พบตอน review
เฟส 2 ด้วย fixture ไม่ใช่การอ่านโค้ด)

- **ด่านใหม่ใน `check-i18n.mjs`: `every catalog in messages/ is registered in
  i18n/messages.ts`** — เดิมโปรเจคที่ copy `messages/auth.{th,en}.ts` ครบแต่
  ลืมแก้ `i18n/messages.ts` ได้ `2 passed · 0 failed` exit 0 ทั้ง
  `check-i18n.mjs` และ `verify.mjs` (ตัวหลังเช็คว่า `messages/` **มีไฟล์**
  ไม่ได้เช็คว่า **ถูก wire**) แต่ตอน render ทุกหน้าโชว์ `auth.login.submit`
  ดิบ เพราะ `i18n/request.ts` ไม่ตั้ง `getMessageFallback` → next-intl ใช้ค่า
  default ที่ **คืน key path** ไม่ throw · เป็น failure class เดียวกับ 4.46.0
  (ลงทะเบียน plugin ไม่ครบ = รุ่นเป็นโมฆะ) แค่ลึกลงไปอีกชั้น — comment ใน
  `verify.mjs` เขียนบทเรียนนั้นไว้เองว่า "Four pieces, all load-bearing" แต่
  ชิ้นที่ห้านี้ไม่มีใครนับ
  - ด่านอ่าน **เฉพาะ object literal ของ `messages`** ไม่ใช่ทั้งไฟล์ — header
    comment ที่ ship มาเอ่ยชื่อ `auth, mail, upload` เป็นตัวอย่างอยู่แล้ว
    grep ทั้งไฟล์จะรายงานว่าลงทะเบียนครบทุก namespace แล้วผ่านบนต้นไม้ที่
    ด่านนี้มีไว้จับพอดี
  - `messages/app.*.ts` (namespace ของโปรเจคเอง) ได้รับการยกเว้น ไม่บังคับลงทะเบียน
  - **ครอบเฟส 3 (mail + upload) ให้ล่วงหน้า** เพราะใช้ pattern registration เดียวกัน
  - ⚠️ โปรเจคที่ติดตั้ง 4.46.x/4.47.0 ไว้แล้วและไม่เคยลงทะเบียน จะเห็น
    `verify.mjs` แดงขึ้นมาหลังอัปเดต — นั่นคือด่านทำงานถูก ไม่ใช่ regression
- **`SKILL.md` §5.2 เขียนพฤติกรรมความพังใหม่ให้ตรงความจริง** — เดิมบอกว่า
  `t()` *"throws at render time"* ซึ่งทำให้ขั้นตอนนี้อ่านเหมือนมีอะไรบังคับอยู่
  ของจริงคือ render key path ออกจอเงียบ ๆ error อยู่แค่ใน server console
- **`login.adUsernameLabel`** — ป้าย `Username (AD)` ใน `login-form.tsx` เป็น
  อังกฤษฮาร์ดโค้ดมาตลอด นั่งติดกับ `{t('passwordLabel')}` ที่แปลแล้ว โหมดไทย
  จึงได้ฟอร์มครึ่งอังกฤษครึ่งไทย · ไม่ใช่ regression ของเฟส 2 แต่เผยข้อจำกัด
  เชิงโครงสร้าง: `check-i18n.mjs` สแกน**อักษรไทย** สตริงที่เป็นอังกฤษอยู่แล้ว
  จึงมองไม่เห็นโดยธรรมชาติ — และ inventory ของเฟสนี้ก็นับจากอักษรไทย ทำให้
  หลุดทั้ง inventory → แผน → ด่าน · สแกนสองวิธีแล้วเจอตัวนี้ตัวเดียว
- CHANGELOG 4.47.0 นับไฟล์ที่แปลงเป็น "19" ทั้งที่รายการจริงคือ 21 — แก้แล้ว

## 4.47.0 (2026-08-24)

**เฟส 2 ของ i18n — auth-setup ทั้งสกิลอ่านจาก catalog แล้ว** (spec:
`docs/superpowers/specs/2026-08-24-org-kit-i18n-design.md` §6.2, 166 ข้อความ)

- **catalog ใหม่**: `assets/messages/auth.th.ts` / `auth.en.ts` — namespace
  `errors` (34 error code ใช้ร่วมกันทั้งสกิล) บวก `adminSetup` ·
  `passwordPolicy` · `changePassword` · `resetPassword` · `forgotPassword` ·
  `login` · `rolesManager` · `roleForm` · `adminUserActions` ·
  `auditLogsTable` · `usersTable` · `navUser` · `adminNav` ·
  `userRoleSelect` · `adminUsersPage` · `adminAuditLogsPage`
- **error-code contract**: ทุก Server Action ในสกิล (`lib/actions/auth.ts` ·
  `admin-setup.ts` · `admin-users.ts` · `admin-roles.ts` · `password.ts`)
  ตอนนี้ return `{ code: 'SOME_CODE' }` แทน `{ error: '<ข้อความไทย/อังกฤษ>' }`
  — ฝั่ง client แปล code เป็นข้อความตอน render ด้วย `useTranslations('auth.errors')`
  (หรือ `useFieldErrorText()` ตัวใหม่ใน `lib/use-field-error.ts` สำหรับ field
  error ของ react-hook-form)
- **ปิดกับดัก `admin-user-actions.tsx:82`**: โค้ดเดิมเดา field ที่ error ด้วย
  `/อีเมล|email/i.test(result.error)` — พังทันทีที่ข้อความเปลี่ยนภาษาหรือคำ
  เปลี่ยน เพราะ regex ผูกกับข้อความที่แปลแล้ว ไม่ใช่ข้อมูลจริง ตอนนี้
  `createLocalUserAction` return `field` มาจาก zod issue's `path` ตรง ๆ
  ฝั่ง client เทียบ `result.field === 'email'` แทนการเดาจากข้อความ
- **21 ไฟล์แปลงเป็น catalog ครบ** — `components/login-form.tsx` ·
  `roles-manager.tsx` · `admin-user-actions.tsx` · `audit-logs-table.tsx` ·
  `forgot-password-dialog.tsx` · `change-password-dialog.tsx` ·
  `reset-password-form.tsx` · `role-form.tsx` · `users-table.tsx` ·
  `admin-setup-form.tsx` · `nav-user.tsx` · `admin-nav.tsx` ·
  `user-role-select.tsx` · `lib/password-policy.ts` ·
  `lib/actions/{auth,admin-setup,admin-users,admin-roles,password}.ts` ·
  `app/(admin)/admin/{users,audit-logs}/page.tsx`
- **`check-i18n.mjs`'s `OPTIONAL_CONVERTED_FILES`** เพิ่มทั้ง 21 ไฟล์ข้างบน —
  optional เพราะ th+en โปรเจคอาจไม่ได้ติดตั้ง auth-setup เลยก็ได้ (ต่างจาก
  `ui/data-table.tsx` ของ design-setup ที่ติดมาทุกโปรเจค) พิสูจน์ด้วย fixture
  ที่ copy `assets/` ทั้งต้นไม้ไปรันจริง: `26/26 converted file(s) present and
  clean` แล้วลองใส่อักษรไทยกลับเข้าไปไฟล์เดียวก็จับได้ทันที ระบุชื่อไฟล์และ
  จำนวนบรรทัด
- **`SKILL.md` §5.2** เพิ่มขั้นตอน copy `auth.th.ts`/`auth.en.ts` เข้า
  `messages/` แล้วลงทะเบียนใน `i18n/messages.ts` ของโปรเจค (import +
  `AuthCatalog` type + เพิ่ม key `auth` ในอ็อบเจ็กต์ `messages`) — ขั้นตอนนี้
  เดิมไม่มีที่ไหนพูดถึงเลย ทั้งที่ทุกไฟล์ที่แปลงแล้วเรียก `useTranslations()`
  ตรง ๆ ไม่มี fallback เป็นไทย ข้ามขั้นตอนนี้ = หน้าจอ error/admin/password
  ทุกหน้าจะ throw ตอน render · §8 เพิ่มบรรทัดตรวจ `check-i18n.mjs` สำหรับ
  th+en

**ยังไม่ครบ** — เฟส 3: mail admin UI (36) + upload-setup (16) รวม 52 ข้อความ
ดู spec §6.2

## 4.46.1 (2026-08-24)

**สามข้อที่เจอตอนเทียบกับ HRMS ซึ่งใช้ i18n เต็ม (1,819 key × 2 locale จริงใน
production) เป็นเคสอ้างอิง**

- **`check-i18n.mjs` ผ่านทั้งที่ catalog ว่างเปล่า** — ด่าน parity match แค่
  ไฟล์รูปแบบ `<namespace>.(th|en).ts`; โปรเจคที่มี `messages/` แต่เป็นไฟล์คนละ
  รูปแบบ (เช่น `th.json`/`en.json` แบบที่ HRMS เคยใช้ก่อนย้ายมาที่คิต) ทำให้ลูป
  ไม่เจอไฟล์ไหนเลยแล้ว "ผ่านเพราะไม่มีอะไรให้เทียบ" — พิสูจน์ด้วย fixture ที่
  `th.json` มี key, `en.json` ว่าง ก็ยังขึ้น "2 passed · 0 failed" ตอนนี้ตรวจ
  แล้ว: `messages/` มีไฟล์แต่ไม่ match รูปแบบที่คิตต้องการ = FAIL พร้อมบอกชื่อ
  ไฟล์ที่เจอ
- **`.gitattributes`** เพิ่มที่ root ของ repo นี้ (`* text=auto eol=lf`) — HRMS
  มีอยู่แล้วและตรงกับปัญหาที่เจอตอนทำ i18n เฟส 0+1: worktree ที่ checkout เป็น
  CRLF ล้วนทำ `stamp-kit-assets.mjs` พังทั้ง 91 ไฟล์เพราะ hash คำนวณจาก byte
  ของไฟล์ ไม่ได้ ship เป็น asset ให้โปรเจคลูกในรอบนี้ — renormalize ทั้งต้นไม้
  ของโปรเจคที่มีอยู่แล้วเป็นการตัดสินใจแยกที่เสี่ยงกว่า (`docs/backlog.md` §7)
- **คำถามข้อ 7 (พ.ศ./ค.ศ.) ตัดออกจาก interview** — ให้ตัวเลือก "พ.ศ. (ต้องมี
  เหตุผลธุรกิจ → มติ)" ทั้งที่ `lib/format.ts` บังคับ `-u-ca-gregory` ที่ตัว
  formatter เดียวไม่มีทางเลือกเลย มติแบบนั้นจึงเป็นมติที่โค้ดทำตามไม่ได้ — ขัด
  กับ "date/number formats" ที่ประกาศเป็น iron rule (ไม่ถาม) อยู่แล้วในหัวข้อ
  เดียวกัน `DESIGN.template.md` เขียน "ค.ศ. เสมอ" ตรง ๆ แทน `__ERA__`
  placeholder ที่ไม่ต้องมีคำตอบให้แทนแล้ว

**คงค้างจากการเทียบ HRMS** (`docs/backlog.md` §7): pin `next-intl` เป็น major
เดียว (HRMS ใช้ `^4.8.3` ลอยเหมือนกัน) · `resolveConverted` ใน `check-i18n.mjs`
ไม่ probe layout `src/components/`

## 4.46.0 (2026-08-24)

**เฟส 0+1 ของ i18n — ปุ่มสลับภาษาเปลี่ยนภาษาได้จริงแล้ว** (spec:
`docs/superpowers/specs/2026-08-24-org-kit-i18n-design.md`)

เดิมโปรเจคที่ตอบ `ภาษา = th+en` ได้ `next-intl`, ปุ่มสลับภาษา และ Server Action
เขียนคุกกี้ — แต่ไม่มี catalog, ไม่มี `i18n/request.ts`, ไม่มี provider และไม่มี
ไฟล์ไหนในคิตเรียก `useTranslations` เลย กดสลับแล้วคุกกี้เปลี่ยน จอเหมือนเดิมทุก
ตัวอักษร (ตัวปุ่มเองก็ throw ตอน render เพราะไม่มี provider ให้ `t()` อ่าน)

- `i18n/request.ts` + `i18n/messages.ts` + `messages/kit.{th,en}.ts` — catalog
  เป็น `.ts` **ไม่ใช่ `.json`** เพราะ `check-kit-freshness.mjs` และ
  `stamp-kit-assets.mjs` กรอง `/\.tsx?$/` ทั้งคู่ ไฟล์ json จะล่องหนจาก kit-sync
  คือตกรุ่นเงียบ ซึ่งเป็นความล้มเหลวแบบเดียวกับที่ kit-sync มีไว้กัน
- `next-intl` กลายเป็น dependency ของ **ทุกโปรเจค** ไม่ใช่เฉพาะ th+en — แจกไฟล์
  สองเวอร์ชันหรือ codemod ตอนติดตั้งจะตัดทุกโปรเจคขาดจาก kit-sync ถาวร
  โปรเจคไทยล้วนได้ catalog ภาษาเดียวและไม่ต้องแปลอะไร
- **5 คอมโพเนนต์อ่านจาก catalog แล้ว รวม 33 key**: `ui/data-table.tsx` (24) ·
  `ui/export-menu.tsx` (3) · `ui/confirm-action-dialog.tsx` (2) ·
  `ui/date-picker.tsx` (2) · `ui/tiptap-editor.tsx` (2) · คอมโพเนนต์ที่รับ label
  เป็น prop อยู่แล้วไม่ต้องแตะ — คิตส่วนใหญ่ออกแบบมาแบบนั้นตั้งแต่ต้น (18 จาก 26
  ไฟล์ที่มีอักษรไทยเป็นคอมเมนต์ล้วน) · ข้อความที่มีตัวแปรใช้ `{name}` ของ next-intl
  ไม่ใช่ `${name}` ของ JS · ช่วงแถวคงรูป ternary ไว้ ไม่แปลงเป็น ICU plural เพราะ
  ตัวเลขผ่าน `formatNumber` มาเป็น string แล้ว
- `scripts/check-i18n.mjs` — ด่านสองข้อ: key `th`/`en` ตรงกัน และไฟล์ที่แปลงแล้ว
  ห้ามมีสตริงไทยนอกคอมเมนต์ (ตัวแยกคอมเมนต์เดินทีละอักขระ ไม่ใช่ตัดที่ `//`
  ตัวแรก เพราะ backtick คร่อมหลายบรรทัดและ `//` โผล่ใน URL)
- **ผู้ติดตั้งต้องลงทะเบียน plugin ของ next-intl ใน `next.config.ts` ด้วย**
  (`createNextIntlPlugin('./i18n/request.ts')` + `export default withNextIntl(nextConfig)`
  — SKILL §Step 3) ไม่มีบรรทัดนี้ `i18n/request.ts` ไม่เคยถูกโหลด และ `t()` ทุกตัว
  โยนตอน render คือแอปไม่ขึ้น · `verify.mjs` fail ถ้าไม่มี
- `kit-sync/scripts/check-kit-freshness.mjs` เดิน `i18n/` กับ `messages/` ด้วยแล้ว
  — สอง dir นี้อยู่ที่ root โปรเจค ไม่อยู่ในรายการที่สแกน ทั้งที่เหตุผลที่ catalog
  เป็น `.ts` คือให้ kit-sync เห็น

**ยังไม่ครบทุกหน้า** — auth-setup (166 ข้อความ), mail admin UI (36) และ
upload-setup (16) เป็นเฟส 2-3 ดู spec §6.2

## 4.45.0 (2026-08-24)

สามข้อที่ทำให้ **ผลลัพธ์ต่างกันระหว่างโปรเจค** ทั้งที่ติดตั้งจาก plugin ตัวเดียวกัน
— มาจาก pilot ฝั่ง PHP (`ugt-mscpl-ana`) แต่สองข้อแรกเป็นบั๊กเดียวกันเป๊ะใน nextjs ด้วย
จึงแก้พร้อมกันทั้ง 3 stack (php/python 0.5.0)

**`[VOLUME]` guard เช็คแค่ dir ระดับโปรเจค — volume ที่เพิ่มทีหลังไม่มีวันถูกสร้าง.**
บล็อกเดิมห่อทุกอย่างไว้ใน `if [ ! -d /srv/appdata/<project> ]` ซึ่งกลายเป็น
no-op ถาวรทันทีที่ deploy แรกสร้างโฟลเดอร์นั้นขึ้นมา · โปรเจคที่เพิ่ม volume
ในรุ่นถัดไปจึงได้ subdir ที่ dockerd สร้างเองเป็น `root:root` ตอน `up -d` แล้ว
user `nextjs` เขียนไม่ได้ — **ทั้งที่ container ขึ้น healthy ปกติ** อาการโผล่
ตอนแอปเขียนไฟล์จริงเท่านั้น · เปลี่ยนเป็นวนเช็คทีละ subdir
(`for p in …; do [ ! -d "$p" ] && mkdir + chown; done`) ซึ่งสร้าง volume ที่เพิ่ม
ทีหลังให้ และยังข้ามตัวที่มีอยู่แล้วโดยไม่ `chown -R` ซ้ำทุก deploy เหมือนเดิม

> `verify.mjs` ต้องแก้คู่กัน: check เดิมอ่านชื่อ volume จากบรรทัด `mkdir -p`
> ตรง ๆ ซึ่งพอเป็นลูปแล้วเหลือแค่ `"$p"` — ไม่แก้พร้อมกันจะ **false-fail ทุก
> โปรเจคที่ตั้ง volume ถูกต้อง** · ตอนนี้สแกนทั้ง Jenkinsfile ที่ตัดคอมเมนต์แล้ว
> จึงทนต่อรูปแบบคำสั่งด้วย ไม่ผูกกับ `mkdir`

**`docker compose` (v2) เป็นค่าตั้งต้นแทน `docker-compose` (v1).** v1 เป็น
Python standalone ที่ EOL ตั้งแต่กลางปี 2023 และไม่มีใน Docker Engine
ปัจจุบัน — template จึงบังคับให้ทุกโปรเจคแก้บรรทัดเดียวกันซ้ำ ๆ หรือ Deploy
stage ตาย · แถม `SKILL.md` เองก็เขียนตัวอย่างเป็น v2 อยู่แล้ว (template ขัดกับ
SKILL ของตัวเอง) · host เก่าที่มีแต่ v1 ยังแก้กลับได้ที่บรรทัดเดียว —
`references/jenkins-one-time-setup.md` §A7 กลับทิศคำอธิบายให้ตรงแล้ว

**`ugt-nextjs-full-setup/scripts/verify.mjs` ไม่เคยเช็ค design module.**
§4.2 ประกาศว่าเช็ค rule file ของ database/auth/ci/design แต่โค้ดสร้างรายการจาก
signal ของ prisma/better-auth/Jenkinsfile/nodemailer/storage.ts เท่านั้น —
`ugt-nextjs-design.md` จึงไม่มีวันเข้า `expected` และโปรเจคที่ขาดไฟล์กติกา
design ผ่านการเช็คไปเงียบ ๆ ทั้งที่ full-setup ติดตั้ง Design ให้ทุกครั้ง ·
ใช้ `docs/DESIGN.md` เป็น signal (dependency ระบุไม่ได้ เพราะ shadcn/tailwind
โปรเจคอาจมีอยู่ก่อน)

## 4.44.0 (2026-08-23)

**`IconAction` ได้ prop `tone` — ปุ่ม action ในแถวตารางมีพื้นตั้งแต่ตอนพัก**
(มติ 2026-08-23 · **กลับมติ 4.33.0 เฉพาะแถวตาราง**)

เหตุผลที่กลับมติ: บนการ์ดสีขาว ไอคอนเปล่าไม่มีอะไรบอกว่าเป็นปุ่ม ต้องเอาเมาส์ไป
จิ้มถึงรู้ — และ **บนมือถือไม่มี hover เลยไม่มีทางรู้** ซึ่งหนักกว่าเรื่องดูโล่ง ·
4.33.0 ทำให้ preview ตรงกับ `soft-*` ของ kit ซึ่งถูกในแง่ "ตรงกับโค้ด" แต่โค้ด
ตัวนั้นเองไม่เหมาะกับบริบทแถวตาราง

ระบบใหม่ยกมาจาก `ugt-hrms components/ui/icon-action.tsx` ที่ใช้จริงมาก่อน:

| tone | ใช้กับ | เหตุผล |
| --- | --- | --- |
| `neutral` | ดู · ดาวน์โหลด · พิมพ์ | อ่านอย่างเดียว ไม่เปลี่ยนข้อมูล |
| `info` | แก้ไข · ตั้งค่า · ตั้งรหัสผ่าน | เปลี่ยนข้อมูล แต่ย้อนได้ |
| `danger` | ลบ · ยกเลิก · ปฏิเสธ | ย้อนยากหรือย้อนไม่ได้ |
| `success` | กู้คืน · อนุมัติ | คืนสภาพ / เดินหน้าเชิงบวก |

**4 โทนเท่านี้ ห้ามเพิ่ม** — สีต้องบอก "อันตรายแค่ไหน" ไม่ใช่ "action ตัวที่เท่าไร"
ในกล่อง 28px คนแยกออกแค่ 3-4 สี ถ้าให้ทุก action มีสีของตัวเอง สีจะหยุดสื่อ
ความหมายแล้วเหลือแค่ตกแต่ง · **ดู = เทา ไม่ใช่ฟ้า** เพราะไม่เปลี่ยนข้อมูล
(ถ้าดูกับแก้ไขเป็นฟ้าทั้งคู่ สีก็ไม่ได้แยกอะไร)

สีดึงจาก `--status-*` **ชุดเดียวกับ `StatusBadge`** — ทั้งแอปจึงมีระบบสีชุดเดียว
แทนที่จะให้ปุ่มใช้ `--primary`/`--destructive` แต่ป้ายสถานะใช้ `--status-*` ·
ผลพลอยได้: `scripts/check-contrast.mjs` ตรวจสูตรนี้อยู่แล้ว (badge = สี/10 บนการ์ด)
จึงได้ด่านฟรี — รันแล้วผ่าน AA ทั้ง 4 โทน ทั้ง light และ dark (6.6–9.2:1)

**`soft-*` ยังอยู่ และยังเป็นคำตอบที่ถูกสำหรับ toolbar** ที่ปุ่มเรียงติดกันเยอะ
(เช่น `ui/tiptap-editor` 8-10 ปุ่ม) — ที่นั่นปุ่มรวมกันเป็นแถบอยู่แล้วจึงเห็นว่ากดได้
โดยไม่ต้องมีพื้นทุกใบ · ส่ง `tone` กับ `variant` พร้อมกันไม่ได้

รายละเอียดที่ต้องระวังและทำไว้แล้ว: ปุ่มที่ `disabled` (ซึ่งที่นี่คือ `aria-disabled`
จึงยัง hover ได้จริง) **ไม่เข้มขึ้นตอน hover** ไม่งั้นจะดูเหมือนกดได้ — แยก
`TONE_REST`/`TONE_HOVER` ออกจากกันเพื่อการนี้

ย้าย call site ทั้ง 4 จุดแล้ว (`admin-user-actions` · `roles-manager` ×2 ·
`file-upload`) · `design-preview.html` ย้าย 14 ปุ่มในทุก specimen พร้อมคำอธิบายว่า
ทำไม 4 โทนและทำไมดูเป็นเทา · กฎเขียนลง DESIGN §0.4 · conventions · button-variants
## 4.43.0 (2026-08-23)

**ถอด shadcn MCP ออกจาก plugin** — ลบ `.mcp.json` ที่ประกาศ
`npx shadcn@latest mcp` มาตั้งแต่ 4.x ต้น

เหตุผล ตรวจจริงสองรอบ (2026-08-21 และ 2026-08-23):

- `get_component("button")` คืน **style default ของ shadcn** — `import { Slot }
  from "radix-ui"` · `asChild` · ขนาด `h-9` · `destructive` แดงทึบ — ตรงข้ามกับ
  preset `base-mira` ของเราทุกข้อ และ **ไม่มีพารามิเตอร์ให้เลือก style**
- `list_blocks` ซึ่งเป็นเหตุผลเดียวที่เหลือให้เก็บไว้ (ชื่อ block ดริฟต์ ต้องมี
  ที่ไล่ดู) ตอบ error `Unexpected response from GitHub API`

ที่จ่ายไปคือทุกโปรเจคที่ติดตั้ง plugin spawn subprocess เพิ่มหนึ่งตัว แล้วได้ tool
ชุดหนึ่งที่ตอบคนละ style วางไว้ให้เรียก — เอกสารเตือนไม่พอ เพราะบั๊ก 4.25.0
(ปุ่ม logout กดไม่ได้เพราะ `onSelect` แบบ Radix) เกิดจากโค้ดสไตล์นี้พอดี

**ไม่มีอะไรหายไป** — งานที่เคยพึ่ง MCP มีทางอื่นครบ:

| เคยใช้ MCP ทำ | ทำแทนด้วย |
| --- | --- |
| ติดตั้ง component | `npx shadcn@latest add` (CLI อ่าน `components.json` → base-mira) |
| อ่าน API ของ component | `curl -s https://ui.shadcn.com/r/styles/base-mira/<name>.json` |
| ยืนยัน prop ของ primitive | `node_modules/@base-ui/react/**/*.d.ts` |
| เช็คว่าชื่อ block ยังใช้ได้ | `curl -s -o /dev/null -w '%{http_code}' .../base-mira/sidebar-07.json` ต้องได้ `200` |

`layout-shells.md` เขียนคำสั่งเช็คชื่อ block ไว้ให้แล้ว พร้อมหมายเหตุว่า
`/r/index.json` ลิสต์เฉพาะ component ไม่มี block · ทั้งสี่ที่ที่เคยอ้าง MCP
(SKILL §Step 3.4 · conventions §ตรวจ API · layout-shells · button-variants)
เปลี่ยนเป็นบอกว่าถอดแล้วและห้ามลอกโค้ดจากมันถ้าเครื่องไหนยังต่อไว้เอง
## 4.42.0 (2026-08-23)

**`selectionColumn()` — คอลัมน์ติ๊กเลือกแถวที่เป็นมาตรฐาน.** `DataTable` มีกลไก
เลือกแถวครบมาตลอด (`enableRowSelection` · `onSelectionChange` ·
`resetSelectionKey` · มือถือดึงติ๊กไปไว้หัวการ์ด) แต่ **ไม่เคยมีสูตรของคอลัมน์เอง** —
grep ทั้ง kit ไม่เจอ `id: 'select'` สักที่ ทุกโปรเจคจึงเขียน header/cell/aria เอง
สองอย่างที่พลาดกันประจำและ helper บังคับให้แล้ว:

- `aria-label` รายแถวต้องระบุแถวได้ — เขียนเองมักได้แค่ "checkbox" ทุกแถว
  screen reader เลยอ่านไม่ออกว่ากำลังติ๊กอะไร
- ติ๊กหัวตารางนับจากแถว **ที่กรองอยู่** (`getFilteredRowModel()`) ไม่ใช่ทั้งชุด
  ข้อมูล — ไม่งั้นกรองเหลือ 3 แถวแล้วกด "ทั้งหมด" จะไปโดนแถวที่มองไม่เห็นด้วย

สถานะครึ่งใช้ prop `indeterminate` ของ Base UI (Radix เขียน
`checked="indeterminate"` ซึ่งที่นี่ไม่ทำงาน) · แถวที่ห้ามเลือกยังส่งผ่าน
`enableRowSelection` ของตารางทางเดียว ไม่มีที่ให้ตั้งซ้ำในคอลัมน์

**ปุ่ม "อนุมัติ" ใน design-preview §3 เป็นน้ำเงิน ทั้งที่มติบอกว่าเขียว.**
DESIGN §1 กับ conventions เขียนตรงกันว่า primary สงวนให้ เพิ่ม/สร้าง/Import ส่วน
อนุมัติ/ยืนยันเชิงบวก = เขียวทึบ (`success`) · ตัวอย่างหน้ารายละเอียดวาดปุ่ม
อนุมัติเป็น primary มาตลอด ซึ่งอ่านแล้วเหมือนปุ่มสร้าง — แก้เป็น `success` แล้ว
พร้อมกำกับเหตุผลไว้ใต้ตัวอย่าง

**ยืนยัน (ไม่เปลี่ยน): `soft-*` ใสตอนพัก ขึ้นพื้นจางตอน hover.** มีคำถามว่าทำไม
ปุ่มไอคอนในตารางไม่มีพื้นสี — ตรวจต้นทางแล้ว `gov-boi-smart/components/ui/button.tsx`
(โปรเจค base-mira ที่ variant ชุดนี้สกัดมา) เขียน `text-primary hover:bg-primary/10`
ไม่มี `bg-` ตอนพัก เหมือน `button-variants.md` ที่เราแจกทุกตัวอักษร · preview รุ่นแรก
วาดพื้น 12% ตอนพักซึ่งไม่ตรงกับของจริง และแก้ไปแล้วใน 4.33.0 — รอบนี้แค่ยืนยันมติ
## 4.41.0 (2026-08-23)

**Documentation overhaul.** A survey of every doc in the repo found 73
confirmed problems; this release closes them. One is a real bug, the rest are
docs that had drifted from the code.

**บั๊ก: `verify.mjs` ฟ้อง ✘ ใส่การติดตั้งที่ถูกต้อง.** สาม asset ของ auth ที่ copy
ทุกครั้ง (`lib/auth-client.ts` · `lib/auth.ts` · `proxy.ts`) เขียนคำว่า
`__BASE_PATH__` ไว้ใน**คอมเมนต์อธิบาย** แต่ตัวตรวจ placeholder กวาดทุกไฟล์
`.ts`/`.tsx` โดยไม่ตัดคอมเมนต์ · เส้นทางปกติ (ตอบว่าไม่ใช้ basePath) จึงขึ้น ✘
บนไฟล์ที่ถูกอยู่แล้ว แล้วคนติดตั้งไปแก้ของที่ไม่ได้เสีย · คอมเมนต์เปลี่ยนไปใช้
ตัวอย่างจริง (`expense-portal`) และ SKILL §6 ห้ามเขียน token ลงคอมเมนต์แล้ว ·
**โค้ดไม่เปลี่ยน** ทุกจุดยังอ่าน `NEXT_PUBLIC_BASE_PATH` เหมือนเดิม

**ตัวเลขเวอร์ชัน** ที่ค้างมา 15 รุ่น: README (nextjs 4.24.0 · core 2.6.0 ·
python/php 0.1.0), README.html 5 จุด, backlog, multi-stack-proposal 5 จุด และ
การ์ด marketplace 3 ใบที่ตกชื่อ skill ที่มีจริง

**คำอธิบายที่ไม่ตรงกับสคริปต์**: README นับ gate chain เคลื่อนไปหนึ่งและตกไปตัวหนึ่ง
· `check-doc-status` ถูกโฆษณาว่าตรวจ "ทุกไฟล์ใน docs/" ทั้งที่อ่านแค่ `.md`
ชั้นบนสุด · "ทุกตัวช่วยมี verify.mjs" จริงแค่ 12/17 · ขั้นตอน tag ไม่เคยบอกว่า
php/python ห้าม tag (กฎนี้เขียนอยู่ 8 ที่ ยกเว้นที่ที่คนกำลังจะ tag เปิดอ่าน) ·
นิยาม Living/Accepted/Superseded/Done ย้ายขึ้นมาก่อนเช็คลิสต์ที่ใช้มัน

**เอกสารสัญญา design** เลิกขัดกันเอง: `layout-shells` ไม่เรียก shadcn MCP ว่า
"preferred" อีก (มันตอบ Radix) · harness rule ซึ่งเป็นไฟล์เดียวที่โหลดอัตโนมัติ
ในโปรเจคลูกค้า ได้กฎ size ปัจจุบันและลำดับแหล่งอ้างอิงติดตัวไปเอง · radius ใน
SKILL เป็นปุ่มเดียวตามมติ 2026-08-09 · §8 เลิกยกตัวอย่างมติด้วยเลย์เอาต์ที่ §3
ห้าม · §4 อธิบายแพตเทิร์นฟอร์มแบบ RHF+Callout ที่ลงไปตั้งแต่ 4.30.0 · §3 บอก
ชื่อ `ui/page-shell` เสียที · conventions เลิกบอกเป็นนัยว่ามี sync จาก HRMS

**มติ 2026-08-23**: `data-[state=…]` **ไม่**เข้าด่าน No-Radix ฝั่งโปรเจค — มันเป็น
ทั้งสำนวน Radix และ attribute ธรรมดาที่ element ตั้งเองได้ (`data-table.tsx` ของ
เราก็ใช้อยู่และถูกต้อง) · ด่านที่ฟ้องผิดใส่โค้ดที่เราแจกเอง แย่กว่าด่านที่จับไม่ครบ
ในเมื่อ lint ฝั่ง repo คุมให้อยู่แล้ว · เหตุผลบันทึกไว้ใน `verify.mjs`

**`design-preview.html` 9 จุด** — §5 ตกเรื่องช่องค้นหาโหมด server · §13 ยังใช้
native `title=` ที่ lint ห้ามตั้งแต่ 4.38.0 · §10 ยังเป็นกฎ IconAction ก่อนมติ
2026-08-21 · §8 วาดกล่อง error เองแทน `Callout` (แก้แล้วตรงทุกค่าที่ตรวจในเบราว์เซอร์)
· ปุ่มท้าย dialog เป็น space-between ทั้งที่ของจริงชิดขวา · §6 ไม่มีแถว error
ระดับฟอร์ม · §4 ไม่บอกว่าการ์ดมาจาก DataTable · footer ตกด่านใหม่ของ 4.37.0 ·
และเพิ่ม specimen ของ tiptap ที่ไม่เคยมีเลย

**ทรงของ SKILL.md** — 17 ไฟล์เคยมี 5 ชื่อสำหรับหัวข้อปิดท้ายและ 8 ชื่อสำหรับ
หัวข้อ interview · ตอนนี้ทุกไฟล์ปิดด้วย `## Verification Checklist` ·
`design-setup` กับ `full-setup` ซึ่งเป็นทางเข้าหลักและไม่เคยมีหัวข้อนี้เลย ได้แล้ว ·
`clean-code` เลิกเอาคอลัมน์ผิดขึ้นก่อน (16/17 ไฟล์เอาคอลัมน์ดีขึ้นก่อน) ·
`ugt-handoff` ยุบ step ลงเป็น `###` ใต้ `## Workflow` เหมือนทุกตัว ·
upload/mail/cicd/auth ได้ blockquote **ต้องติดตั้งก่อน** ใต้ Overview ·
เช็คลิสต์ของ auth เลิกสลับภาษากลางคัน (ข้อความ UI ภาษาไทยที่ผู้ทดสอบต้องเห็น
บนจอยังคงไว้) · ทรงนี้เขียนลง README แล้ว จะได้ไม่ต้องเดาจาก 17 ไฟล์อีก

**ไม่ renumber `## N.`** — ครึ่งหนึ่งของตระกูลใส่เลขที่ `##` อีกครึ่งใส่ที่ `###`
ของขั้นตอน และ `full-setup` อ้าง `§3`/`§4.4`/`§5.5` ไปที่เลขของ `###` การ
renumber จะทำให้การอ้างอิงชี้ผิดเงียบ ๆ · กติกาใหม่คือ "ใส่หรือไม่ใส่ก็ได้ แต่ต้อง
เหมือนกันทั้งไฟล์"

**eval ที่ล่องหน**: `trigger-evals.json` ของ php/python ไม่มีคีย์ `baseline_result`
เลย (ที่อื่นถ้ายังไม่รันจะประกาศ `date: null`) จึงดูเหมือนรันแล้ว — ประกาศแล้ว ·
`ugt-nextjs-kit-sync` เป็น skill เดียวที่ไม่มี `evals.json` ทั้งที่มันเขียนทับไฟล์
ในโปรเจคจริง — ขึ้นแถวใน backlog §รอเงื่อนไข แล้ว
## 4.40.0 (2026-08-23)

**`ui/bulk-action-bar.tsx` — เลือกหลายแถวแล้วสั่งงานรวม.** `conventions.md`
โฆษณา "row selection + bulk bar" มาตั้งแต่ต้นทั้งที่ bulk bar ไม่เคยมีในโค้ด
(row selection มีจริง) · มติ 2026-08-23: **ทำของให้มีจริง** ไม่ใช่ลบคำสัญญาทิ้ง
เพราะ HRMS ใช้แพตเทิร์นนี้อยู่ 4 หน้า (อนุมัติลา · อนุมัติ OT · approvals ของ
employee-monitor · hr-sync) และพิสูจน์ตัวเองมาแล้ว

พอร์ตจาก `ugt-hrms components/ui/bulk-action-bar.tsx` (ยุค radix-mira) มาเป็น
Base UI + สเกลขององค์กร:

- Checkbox ของ Base UI ส่ง `(checked, eventDetails)` ไม่ใช่ค่าเดียว และแสดง
  สถานะด้วย `data-checked` ไม่ใช่ `data-[state=checked]`
- ปุ่มล้างการเลือกเป็น `variant="link"` แทน `<button>` เปล่า (§0.4 ห้ามปุ่มดิบ)
- `rounded-xl` ของต้นทางไม่อยู่ในสเกล 4 ระดับที่ตกลงไว้ → ใช้ `rounded-lg`
  (ระดับการ์ด) ตาม §1
- ตัวอักษรเป็น `text-xs/relaxed` ตามความหนาแน่นของ preset (ต้นทางเป็น `text-sm`)

`DataTable` ไม่ต้องแก้อะไรเลย — `onSelectionChange` กับ `resetSelectionKey` ที่
ต้องใช้มีอยู่แล้วทั้งคู่ ตัวแถบจึงเป็น presentational ล้วน ไม่มี state ของตัวเอง

กติกาสองข้อที่มากับแพตเทิร์น เขียนลง DESIGN §3 แล้ว: โผล่เมื่อเลือก **ตั้งแต่ 2
แถวขึ้นไป** (แถวเดียวใช้ปุ่มในแถว) · ระหว่างที่แถบขึ้นให้ **ซ่อนปุ่มสั่งงานรายแถว**
ไม่ให้มีสองทางสั่งงานพร้อมกัน · `design-preview.html` §5 มี specimen แล้ว
(พ่วง `.btn-link` กับ checkbox ที่ preview ยังไม่เคยมี CSS ให้)
## 4.39.0 (2026-08-23)
เดิมชนเลข 4.35.0 กับอีก branch ที่ถือ tag นั้นอยู่ — ย้ายมา 4.39.0 ตอน merge


ต่อจาก 4.34.0: เพิ่ม verify สองข้อใน `ugt-nextjs-auth-setup` — (1) header ครบทุก
response ไม่ใช่แค่หน้า HTML (`curl -sI` ทั้ง `/login` และ `/api/health`) เพราะจุดที่
มันหายเงียบคือ `return NextResponse.next()` เปล่า ๆ ที่ไม่ผ่าน
`applySecurityHeaders()` และ (2) HSTS ต้องไม่โผล่บน `http://localhost` และบน https
ต้องยังไม่มี `includeSubDomains`/`preload`

## 4.38.0 (2026-08-23)

**tiptap toolbar เข้าระบบขนาดของ kit** (backlog §5). ปุ่มทุกตัวใน toolbar เคยเป็น
`<Button size="sm">` ที่เขียนเองแล้วทับด้วย `className="size-7 p-0"` — override
กล่องขนาดของ control ตรงที่ DESIGN.md §0.4 ห้ามไว้ — บวก native `title` เป็น label.
ที่จริง preset วาดปุ่มนั้นให้อยู่แล้ว: `size="icon"` ของ base-mira **คือ** `size-7`
พร้อมไอคอน `size-3.5` — override ทั้งก้อนจึงเป็นการเขียนขนาดที่มีอยู่แล้วซ้ำ

- `ToolbarToggle` + `ToolbarAction` ยุบเหลือ `ToolbarButton` ตัวเดียวบน
  `ui/icon-action` → ได้ `size="icon"` + `aria-label` + Tooltip ของ kit แทน `title`
  ตอนนี้ไม่เหลือ `h-*`/`p-*`/`size-*` บน control ตัวไหนในไฟล์นี้เลย
- สถานะ active วิ่งตาม `aria-pressed` ไม่ใช่ boolean ฝั่ง JS: สีคือ
  `aria-pressed:bg-primary/10 …` — toggle ที่ลืมใส่ attribute จะไม่ติดสีไปด้วย
  ปุ่มที่ไม่ใช่ toggle ไม่ส่ง `active` มา attribute จึงหายไปทั้งอัน (ไม่ใช่ `false`)
  screen reader อ่านว่าเป็นปุ่มสั่งงานธรรมดา
- `<Icon className="size-3.5" />` 20 จุดหายไป — `size="icon"` ตั้งขนาด svg ให้เอง
- ปุ่ม Link เป็น trigger ของทั้ง Popover และ Tooltip จึงซ้อน render prop:
  `TooltipTrigger render={<PopoverTrigger render={<Button/>} />}` ตามที่ Base UI
  documented ไว้ (children ตกไปที่ชั้นในสุด) — ไม่ต้องมี wrapper เพิ่ม
- `disabled` ในปุ่ม toolbar = `aria-disabled` แล้ว (กติกาของ IconAction ตั้งแต่
  4.29.0): Undo ที่จางอยู่ยังโฟกัสได้และยังบอกเหตุผลตอน hover
- `references/conventions.md` เลิกเรียกไฟล์นี้ว่า "HRMS (verbatim)" และบันทึกว่า
  ต้องมี `ui/icon-action` + `tooltip` ติดตั้งไว้ก่อน

**และปิดทางไม่ให้ของแบบเดิมกลับมา** — `scripts/lint-kit-assets.mjs` (ด่านใน
release chain) เพิ่มกฎ FAIL สองข้อ: className ที่ทับกล่องขนาดของ `<Button>` /
`<IconAction>` (`h-*` `p*-*` `size-*` — `w-*` ผ่านเพราะเป็น layout,
`variant="link"` ยกเว้นตาม §0.4) และ native `title=` บนสองตัวนั้น เดิมกฎนี้อยู่
ใน DESIGN.md อย่างเดียวจึงไม่มีอะไรตรวจ asset จริง (เหตุผลเดียวกับตอนตั้งด่านนี้
ใน 4.25.0) · สแกนทั้ง 89 asset แล้ว: ของเดิมไม่ติดสักตัว ส่วนไฟล์ tiptap ก่อนแก้
ติด 6 จุด — ตัว lint อ่าน opening tag แบบรู้วงเล็บ/quote ไม่ใช่ regex ตัดที่ `>`
ตัวแรก ไม่งั้น `onClick={() => …}` จะทำให้มองไม่เห็น className ที่ตามมา

## 4.37.0 (2026-08-23)

**A wrong `shadcn init` is now a failing check, not a paragraph in a SKILL.**
4.25.0 forbade a plain `npx shadcn init` in prose (it resolves to the Radix
default style while the kit is base-mira/Base UI), but nothing enforced it:
`lint-kit-assets.mjs` only scans the assets in this repo, so Radix reaching a
target project was invisible. `ugt-nextjs-design-setup/scripts/verify.mjs`
now gates both halves, and it runs at close-out of every design-setup and
full-setup:

- **components.json matches the org preset** — the old check compared only
  `style` and `iconLibrary`; it now also fails on `rtl: true` and a
  `baseColor` other than `neutral`, and a wrong `style` names the fix
  (`--preset b1ZzrZbs0`) instead of just reporting the mismatch.
- **No Radix anywhere in the project** (new) — fails on a `radix-ui` or
  `@radix-ui/*` dependency, on a missing `@base-ui/react`, and on any source
  file under `app`/`components`/`features`/`src` using `asChild`, importing
  `radix-ui`, putting `onSelect` on a menu item, `checked="indeterminate"`,
  or `delayDuration`. These are exactly the idioms Base UI ignores silently —
  the component renders and the control does nothing, which is how the
  4.25.0 dead-logout-button shipped. Opt out per file with `// lint-ok:radix`.

Verified against fixtures: a plain-init project (new-york + `radix-ui` +
`asChild` + `onSelect` + `checked="indeterminate"`) fails with all six
findings named; a preset-correct Base UI project passes both.
## 4.36.0 (2026-08-23)

**DataTable gets a server-mode global search (prop `serverSearch`) — the
last page that hand-rolled its own search box now uses it.** Until now the
toolbar search only existed in client mode (`globalSearch` / `filterColumn`),
so a server-paginated page had no sanctioned way to offer free-text search
and `/admin/audit-logs` drew its own `<Input>` + magnifier inside
`toolbarFilters`. That broke two rules at once: DESIGN.md §3 ("the free-text
search belongs to the DataTable, never repeat it in the filter bar") and the
design skill's own `verify.mjs` check, which warns on any `<Input>` whose
placeholder reads like a search.

- `ui/data-table.tsx`: new `serverSearch={{ value, onChange, debounceMs? }}`.
  Same box, same leftmost slot, same `filterPlaceholder`; the difference is
  that the table keeps a local draft, debounces it (400ms default) and hands
  the trimmed term back — it never touches tanstack `globalFilter`, so client
  filtering stays off in server mode (filtering one page = confident
  nonsense, same rule as the per-column filter guard). The query itself stays
  the page's job because its meaning is page-specific — audit-logs searches
  across the *user* table, not the rows on screen. External changes to
  `value` (back/forward, a page-level clear) sync back into the box without
  stomping on what the user is currently typing.
- `components/audit-logs-table.tsx`: the hand-built search block, its
  `draftQ` state and the `Search`/`Input` imports are gone — one prop now.
  Behaviour change worth knowing: search used to apply on Enter/blur, it now
  applies after the user stops typing.
- DESIGN.md §3 and `references/conventions.md` say it explicitly: server mode
  is **not** an exception to "the search box belongs to the DataTable".
  `design-preview.html` had already drawn the audit-logs toolbar this way;
  only its placeholder text was synced to the asset's.
- `scripts/verify.mjs`: that same check now skips `components/ui/` before
  matching. It was flagging the kit's own `data-table.tsx` twice (the toolbar
  search and the per-column filter box — the two Inputs the rule exists to
  send people *to*), so it could never come back clean and a real offender
  would have been lost among two permanent warnings. Page code is still
  scanned exactly as before.

Closes the last open หมวด "ต้องมีมติ design ก่อน" item in `docs/backlog.md` §5.
## 4.35.0 (2026-08-23)

เศษสองข้อสุดท้ายที่ค้างจาก 4.30.0 ใน `docs/backlog.md` §5 — ทั้งคู่ปิดแล้ว.

**`toDateKey` มีบ้านเดียวใน `lib/format.ts`.** `ui/date-picker.tsx` เคยนิยาม
เองซ้ำกับ formatter กลาง ซึ่งชน §5 ("วันเวลาทุกจุดผ่าน `lib/format`") — ตอนนี้
`import { formatDate, toDateKey } from '@/lib/format'` แล้ว.

**แต่ไม่ได้ยุบเข้า `formatExportDate` ตามที่ backlog เดาไว้ — สองตัวนี้ให้คนละ
คำตอบ.** วัดจริง (`node --experimental-strip-types`, TZ=Asia/Bangkok) จาก
`new Date(2026, 7, 23)` ซึ่งคือสิ่งที่ react-day-picker ส่งกลับมาตอนคลิกเซลล์:

| ฟังก์ชัน | ผล |
| --- | --- |
| `toDateKey(picked)` | `2026-08-23` ← วันที่ผู้ใช้คลิกจริง |
| `formatExportDate(picked)` | `2026-08-22` ← **ร่นไปหนึ่งวัน** |

`formatExportDate` อ่าน **UTC parts** โดยเจตนา เพราะ input ของมันคือ wall-clock
date (คอลัมน์ SQL `date` = เที่ยงคืน UTC) — พอเจอเที่ยงคืน **local** ที่ +07:00
มันก็ตกไปเป็นเมื่อวาน. ถ้ายุบเข้าไป วันหยุดบนปฏิทินจะทำเครื่องหมายผิดวันเงียบ ๆ.
สองฟังก์ชันจึงแยกกันที่ **input มาจากไหน** ไม่ใช่หน้าตา output และเขียนกำกับไว้ทั้ง
ใน docblock ของทั้งคู่, DESIGN.md §5 และ `ugt-core/contracts/design.md` (ประโยค
"never through a local `Date`" ของ contract ครอบเกินจริง — เติมข้อยกเว้นเดียวที่มี).

- ใหม่: `assets/lib/format.test.ts` — ล็อก timezone contract 5 ข้อ (pin
  Asia/Bangkok ของ `formatDateTime` ยังได้ค่าเดิม `24/08/2026 00:30`, wall-clock
  ไม่เลื่อน, `toDateKey` ตรงเซลล์) · ทุกข้อผ่านโดยไม่ขึ้นกับ TZ ของเครื่องที่รัน
  · ship คู่กับ `lib/format.ts` แบบเดียวกับ `lib/export.test.ts`

**วงกลมไอคอน hero ของ `admin-setup-form` — ตัดสินว่า *ไม่* ทำ component.**
shadcn ไม่มีของกลางให้จริง: ตัวที่ใกล้สุดคือ `EmptyMedia variant="icon"` ซึ่งเป็น
สี่เหลี่ยม `size-8 rounded-md bg-muted` และเป็นช่องของ empty state คนละงานกัน.
markup ปัจจุบันเป็น Tailwind utilities ล้วนซึ่ง §0.1 อนุญาตอยู่แล้ว และมีที่ใช้
**ที่เดียวทั้ง kit** — component กลางที่มี consumer เดียวคือ abstraction เปล่า.
สิ่งที่ขาดคือ "สเปคตายตัว" ไม่ใช่ component จึงเขียนค่าชุดเดียว (`size-14` ·
`rounded-full` · `bg-primary/10` · ไอคอน `size-7 text-primary`) ลง DESIGN.md §4
พร้อมเงื่อนไขยกระดับ: ใช้ครบ 3 ที่เมื่อไรค่อยยกเป็น component.
## 4.34.0 (2026-08-23)

**Security headers ชุดเต็มใน `proxy.ts`** (backlog ข้อ 4 ครึ่งแรก). เดิม
proxy ตั้งแค่ `Content-Security-Policy` และตั้งเฉพาะ response สุดท้าย —
static pass-through, redirect ของ guard และ 401 JSON ออกไปโดยไม่มี header
อะไรเลย. ตอนนี้มี `applySecurityHeaders(response, request, nonce)` ตัวเดียว
เรียกที่ทุกจุด return ทั้ง 5 จุด และเพิ่มที่ขาด:

- `X-Frame-Options: DENY` — clickjacking สำหรับ browser ที่ไม่อ่าน
  `frame-ancestors` (CSP มี `frame-ancestors 'none'` อยู่แล้ว, สองตัวนี้ต้องตรงกัน)
- `X-Content-Type-Options: nosniff` — กัน MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — ปิด camera/microphone/geolocation/payment/usb
- `Strict-Transport-Security: max-age=31536000` — **ยิงเฉพาะเมื่อ request เป็น
  https** (อ่าน `x-forwarded-proto` ก่อน เพราะหลัง reverse proxy ที่ terminate
  TLS request จะมาถึงเป็น http) ดังนั้น dev บน `http://localhost` ไม่โดน pin
  — ถ้า pin ไปแล้ว browser cache ไว้และไม่มี https dev server ให้ถอย.
  **ไม่ใส่ `includeSubDomains` และไม่ใส่ `preload`** ทั้งคู่เป็นข้อผูกพัน
  ระดับโดเมนที่ถอยยาก (preload ฝังในตัว browser) และบน shared domain
  `includeSubDomains` ลากแอปเพื่อนบ้านไปด้วย — รอเจ้าของโดเมนตัดสิน

ครึ่ง rate limiting ของ backlog ข้อ 4 **ยังเปิดอยู่** — in-memory ต่อ instance
รับได้ตามมาตรฐาน deploy ปัจจุบัน (deploy เดี่ยว) และมี TODO กำกับในโค้ดแล้ว
## 4.33.0 (2026-08-21)

**มติ 2026-08-21 — ยึด preset สำหรับปุ่ม destructive.** base-mira ships a
*tinted* destructive (`bg-destructive/10 text-destructive`); the kit adds no
solid-red variant of its own, so a delete confirmation renders tinted.
`design-preview.html` now draws it that way (it had a solid red button the
preset never produced), and the decision is recorded in DESIGN.md §1 and
`button-variants.md`.
  - While aligning the preview, its `soft-*` buttons were wrong too: they
    painted a 12–14% tint at rest, but the kit variants are transparent at
    rest and tint only on hover. Fixed for all three.

**⚠️ The shadcn MCP is NOT a source of truth for this preset.** With the MCP
now connected, `get_component("button")` returns the **default shadcn v4**
style: `import { Slot } from "radix-ui"`, an `asChild` prop, `h-9` sizes and
a solid destructive — the opposite of base-mira on every point, and exactly
the code shape that caused the 4.25.0 dead-button bug. It exposes no style or
preset parameter (`get_component_metadata` has no entry for button either).
So the guidance added in 4.32.0 is corrected rather than kept:

- `references/conventions.md` §ตรวจ API now ranks the **base-mira registry
  URL first** and carries an explicit warning that the MCP answers with the
  Radix default — browse the catalog and demos with it, never copy its code
  into the kit.
- design-setup §Step 3.4 drops "prefer the shadcn MCP": install with
  `npx shadcn@latest add` (the CLI resolves `components.json` → base-mira, so
  it pulls the right style) and read APIs from the registry URL.
- `button-variants.md` no longer calls the MCP "the same source" as the
  registry.
## 4.32.0 (2026-08-21)

A full Radix→Base UI sweep, this time verified against the **shadcn registry
itself** (`https://ui.shadcn.com/r/styles/base-mira/<name>.json` — the source
the shadcn MCP reads; the MCP was not connected this session) plus the
installed `@base-ui/react` type declarations.

**Result: the shipped code is Radix-free.** All 30 base-mira registry items
the kit uses were pulled and diffed against every asset usage — no
`@radix-ui/*` import, no `asChild`, no `onSelect` on a menu item, no
`checked="indeterminate"`, no Radix overlay props. Every API the kit passes
was confirmed present on the real base-mira wrapper or its Base UI primitive:
`DropdownMenuContent` side/align/sideOffset · `SidebarMenuButton`
render/isActive/tooltip · `SheetContent side` · `Checkbox`
checked+indeterminate · `FieldError errors` · `SelectValue placeholder` ·
`Tabs.Tab`/`Tabs.Panel` value. The only remaining "Radix" strings in the repo
are prose that deliberately teaches the difference.

What actually changed:

- **`ConfirmActionDialog` passes `variant` directly.** 4.26.0 routed it
  through `buttonVariants()` in `className` because it could not confirm the
  prop existed; the registry shows `AlertDialogAction` is typed
  `ComponentProps<typeof Button>`, so the indirection is gone.
- **`button-variants.md` had a false rationale.** It claimed `success` uses
  `text-white` "like base-mira's `destructive`" — but the current registry
  ships a **tinted** destructive (`bg-destructive/10 text-destructive`), not a
  solid one. Corrected, and the doc now states the registry URL as the thing
  to check before trusting it (verified: the registry ships no `success`,
  `soft-*` or `field` variant, so this file is still required).
  ⚠️ Consequence worth a decision: with the preset as-is, the delete-confirm
  button renders tinted red, while `design-preview.html` draws it solid.
  Logged in backlog §5.
- **The lint gate now blocks the whole class**, not just the three patterns
  that had already bitten: Radix overlay props (`onEscapeKeyDown`,
  `onPointerDownOutside`, `onInteractOutside`, `onOpenAutoFocus`,
  `onCloseAutoFocus`, `forceMount`, `delayDuration`),
  `checked="indeterminate"`, and `data-[state=…]` selectors — the last with
  an opt-out (`// lint-ok:data-state`) for markup that sets `data-state`
  itself, which is exactly the one legitimate case in `data-table.tsx`.
- **The lookup procedure is now written down** so no future session guesses:
  `references/conventions.md` gains §ตรวจ API with the source order (MCP →
  registry curl → installed `@base-ui/react` types → a real base-mira
  project) and a Radix-vs-Base-UI difference table; design-setup §Step 3.4
  points at the registry URL for when the MCP is unavailable.
## 4.31.0 (2026-08-21)

Follow-up to 4.30.0's §0.4 amendment, after checking the rule against the
shipped base-mira button (`gov-boi-smart`, the reference base-mira project):
the new "no className size overrides" line banned two shapes the kit itself
uses correctly. §0.4 now states both exemptions —
`w-*`/`w-full` is layout, not the control size box, and `variant="link"` is
text rather than a button, so `h-auto p-0` on it is right (base-mira's `link`
variant only sets colour + underline; it does not clear the size padding).
Without this the login form's "ลืมรหัสผ่าน?" link and every `w-full` submit
button read as violations of a rule written the same day.
## 4.30.0 (2026-08-21)

Two มติ (2026-08-21) plus the contract fixes they unblocked.

**มติ — auth forms migrate to RHF (option B).** All six shipped forms
(login LDAP+local, forgot, reset, change password, create local user, set
password, role) now run `react-hook-form` + `zodResolver` + `ui/field`:
per-field errors sit under their field, form-level and server errors are a
`Callout` banner instead of a toast that vanishes before it is read, and the
dialogs move from raw `Dialog` to the kit `FormDialog` (header/body/footer,
submit wired by `form="…"` rather than `display:contents`). Password rules
stay in `lib/password-policy.ts` — it now also exports the change-password
and set-password form schemas, built by extending the shared field object
*before* `.refine()` (a refined schema is no longer a ZodObject and cannot
be extended). The login form deliberately validates only "is it filled in":
binding the password policy there would lock out anyone whose password
predates the current rules.
  - **`@hookform/resolvers` was never in any dependency list** even though
    `form-validation.md` has always told projects to use `zodResolver` —
    a latent break that this migration would have shipped everywhere. Added
    to design-setup's dep line and to auth-setup §5.1, along with the
    `field` component (auth §5.1 installed neither).

**มติ — `size="icon"` is allowed outside table rows** (§0.4 amended to match
three years of shipped reality: theme toggle, SidebarTrigger, the column
settings button, pagination). `aria-label` stays mandatory, **row actions
still must go through `IconAction`** (there the tooltip is the only thing
naming the icon), and overriding size via className (`size-7 p-0`) is now
explicitly banned — fix `ui/button.tsx` instead. §0.7 reworded to match.

**Contract fixes the agreement had already decided** (§0.8: DESIGN.md wins
over code — no new มติ needed, the assets were simply wrong):

- `ui/detail-row.tsx` claimed "label ซ้ายคงที่" as a locked decision while
  §4 *and* design-preview both specify `justify-between`, centred, ≥16px gap,
  ~24px min row height — the spec exists so a `StatusBadge` value cannot
  collide with its label. The component now matches; `nav-user`'s profile
  rows get the same 16px gap.
- `formatDateTime` rendered instants in the **viewer's** timezone while §5
  says Asia/Bangkok. On the audit-log page — whose server-side filter pins
  day boundaries to +07:00 — a viewer outside UTC+7 saw timestamps that
  disagreed with the range they had just picked. Now pinned, with a separate
  `hourCycle: h23` time formatter so midnight reads `00:00`, not `24:00`.
- `ui/date-picker` formatted its trigger label with `date-fns` directly,
  bypassing `lib/format` (§0.6): a project answering `__ERA__` = พ.ศ. got a
  button showing a different year from every table cell. The `dateFormat`
  prop is replaced by `formatLabel`, defaulting to `formatDate` (no call
  site passed the old prop).
- `admin-setup-form` dropped its `text-2xl` CardTitle override (§2: the type
  scale lives in the component, not per page).
## 4.29.0 (2026-08-21)

The rest of the code review's findings — two a11y/tooling fixes plus the
migration note 4.26.0 should have shipped with:

- **`IconAction` disabled state is now `aria-disabled`, not a focus trap.**
  4.26.0 made a disabled icon button focusable by wrapping it in a bare
  `<span tabIndex={0} aria-label>` (a real `disabled` button never fires the
  tooltip). That span has no role, so a screen-reader user tabbed into an
  unexplained stop that read out the reason text as a nameless label while
  the button itself was skipped. The button now stays a real, focusable
  button with `aria-disabled`, its click handler dropped and a
  cursor-not-allowed/50%-opacity look — assistive tech announces
  "button, disabled" with the reason as its name, and the tooltip still
  fires on hover and focus. It also gains `type="button"` so an
  aria-disabled row action can never submit a surrounding form.
- **`ugt-nextjs-auth-setup`'s Radix-idiom check no longer fails `src/`
  layouts.** Its shadcn-primitives exemption used
  `rel.startsWith('components/ui/')` while the same script explicitly
  supports `src/app/...` projects, so any primitive under
  `src/components/ui/` carrying `asChild` failed the run (exit 1) over a
  file the check was written to ignore. Now `rel.includes()`.
- **Migration note for 4.26.0's self-carding `DataTable`.** DESIGN §3 has
  always said content lives in a card, so existing pages wrapped
  `<DataTable>` in their own `<Card>` — after 4.26.0 those render a card
  inside a card, and nothing told anyone to remove the wrapper. The note now
  rides in the component's own header comment (where a kit-sync merge
  cannot miss it): drop the hand-written wrapper, or pass `card={false}`
  where the table already sits on a dialog/sheet surface.
## 4.28.0 (2026-08-21)

Two bugs a code review caught in 4.27.0's own additions:

- **The fallback admin shell was unreachable on mobile.** The rebuilt
  `(admin)` layout renders `SidebarProvider` + `Sidebar` + `SidebarInset`
  but shipped no `SidebarTrigger` — and shadcn's Sidebar renders as a
  *closed* Sheet on mobile, openable only from that trigger. A phone user in
  a fallback-shell project could reach a page but never the admin menu (the
  hand-rolled `<nav>` it replaced was always visible, so 4.27.0 regressed
  it). `SidebarInset` now opens with a slim header carrying the trigger,
  which doubles as the icon-collapse toggle on desktop.
- **The new mkdir↔bind check could be satisfied by a comment.** It scanned
  the raw Jenkinsfile instead of the comment-stripped `jfActive` the same
  scripts already keep for this exact reason — and the shipped Jenkinsfile
  documents the step in a `//` comment that names `/uploads` and
  `/reports`. A project binding either of those and forgetting the real
  `mkdir -p` line passed the check, i.e. the root:root first-deploy failure
  the check exists to catch shipped green. Fixed here and in the python/php
  siblings (still 0.2.0 there — untagged, so the fix folds into that entry).

## 4.27.0 (2026-08-21)

Works through the backlog §5 remainder from the 2026-08-21 audit — every
nextjs-platform item that needed no further มติ:

- **AdminNav fallback rebuilt on the shadcn Sidebar primitives** — the old
  hand-rolled `<nav>` broke the kit's own "shadcn exists → use it" rule, had
  no active state, and couldn't host `NavUser` (`useSidebar` throws with no
  provider). The `(admin)` layout fallback now wraps `SidebarProvider` +
  `SidebarInset`, feeds `NavUser` (footer, per DESIGN §3) from one extra
  query, and the nav highlights by longest-prefix per the layout-shells rule.
- **`/admin/mail-templates` now actually ships** (mail-setup promised it in
  three places with no asset): page + `MailTemplatesManager` (grouped list ·
  subject/body editor with token hints · Sheet preview rendered by the same
  server-side `renderComposedMail` used at send time · reset via
  `ConfirmActionDialog`) + `admin-mail-templates.ts` actions (guard order
  session → `mail-templates:manage` → action → audit, upsert/delete of the
  `AppSettings` override). SKILL §4.4/§4.5 wire the permission pair and the
  nav/section-guard entries.
- **Preview §13 ↔ asset text drift closed, both directions**: assets adopt
  the preview's better wording (nav+title "บทบาทและสิทธิ์", roles subtitle,
  users subtitle teaching the no-pre-registration rule, "ผู้กระทำ" column);
  the preview drops its English "Audit logs" (×4, §5 ภาษา UI) and its
  action/detail headers, gains a mail glyph, and the NavUser "2 รายการตายตัว"
  line (template §3 + preview) now names the local-only เปลี่ยนรหัสผ่าน item.
- **Declared-but-unimplemented verify checks, implemented**: cicd — compose
  `/srv/appdata` binds diffed against the Jenkinsfile `mkdir -p` line (the
  root:root failure), `docs/admin-handoff.md` placeholder scan, and a
  `.dockerignore` check with a new shipped `assets/dockerignore` (php/python
  had this; the Next.js `COPY . .` ran over the whole workspace) ·
  pitfalls — NO-MEMO (`useReactTable` without `'use no memo'`) plus the doc
  list finally mentions DATE-BIND · clean-code — S1874 (Zod `.flatten()` /
  `z.string().datetime()`), S6606/S7735 (`a ? a : b`), S3735 (statement
  `void`) · design — placeholder scan extended to MOTION.md +
  design-questions.md · full-setup — mail/upload rule files join the
  installed-rules check · upload — named-volume/placeholder/handoff/decisions
  checks. Running the new clean-code rules on this repo then caught four
  `.replace(/g)` and two duplicate-import Sonar idioms in shipped assets —
  fixed, so kit code no longer trips the gate it installs.
- **kit-sync sees root-level kit files** — `check-kit-freshness` now scans
  `proxy.ts` / `vitest.config.ts` / `prisma.config.ts` (+ `prisma/`); a
  shipped proxy fix was previously unreportable forever. SKILL wording now
  states the paste-into-file assets are deliberately unstamped.
- **Interview hygiene**: cicd §4.2 documents the 5 handoff-only placeholders;
  upload §3 says out loud that retention is a recorded decision awaiting the
  org cron มติ (no cleanup job exists), and the max-size answer now has a
  landing spot; upload §4.4/§4.5 sequence the compose snippet after
  cicd-setup and append the admin-handoff section; database §Interview stops
  asking the dev/prod split nothing consumes, tells no-SP projects to lower
  `requestTimeout`, and the Better-Auth singular exception finally appears in
  `naming-conventions.md` + the schema skeleton (the two files people
  actually open); test-lint reads `package.json` instead of asking about it;
  full-setup renumbers the colliding interview items and sequences
  upload-vs-CI correctly.

## 4.26.0 (2026-08-21)

Four design มติ (2026-08-21) resolving the contract-vs-artifact contradictions
the 4.25.0 audit surfaced — each decided, then contract + assets + preview
aligned in the same change:

- **เพิ่ม/สร้าง buttons are `primary`** (DESIGN §1 amended; it said เขียวทึบ
  while every shipped artifact used primary). `success` now explicitly means
  อนุมัติ/ยืนยันเชิงบวก. Preview's action-color demo updated.
- **Business-rule-disabled row buttons show disabled + tooltip reason** —
  hiding stays permission-only (§3). `IconAction` gains `disabled` support
  (span-wrapped trigger so the tooltip still fires — disabled buttons swallow
  pointer events); system-role rows in `/admin/roles` render both buttons
  disabled with "บทบาทระบบ — แก้ไข/ลบไม่ได้". Preview §13 aligned (both
  Administrator buttons disabled; the fictional "delete disabled because the
  role has users" state and the "ผู้ใช้" column the asset never shipped are
  removed).
- **`DataTable` wraps itself in the §3 card** (toolbar as card head, table
  flush, pagination as card foot — ≥sm only; mobile keeps its row-cards).
  New `card` prop defaults on; pass `card={false}` inside dialogs/sheets.
  Rules file forbids double-wrapping.
- **Identifier badges are `Badge variant="outline"`** per the §4 semantic
  table (`secondary` stays reserved for closable filter chips) — NavUser role
  badge and the roles-table "ระบบ" badge (also un-Englished from "system")
  switched; preview's two `lbadge sec` sites aligned.

## 4.25.0 (2026-08-21)

`ugt-nextjs-auth-setup` + a new release gate. Field report from a full-setup
pilot (CR System): six defects, five of them living in this repo's own assets —
the admin UI was ported from HRMS (radix-mira era) into the Base UI kit and
nothing ever enforced the design agreement on shipped assets.

- **nav-user.tsx: the logout / profile menu items did nothing when clicked.**
  Three `DropdownMenuItem`s still used Radix's `onSelect`; base-mira (Base UI)
  menu items take `onClick` and ignore `onSelect` silently — the menu opened,
  the items rendered, clicks were no-ops. Now `onClick` (logout keeps the menu
  open via `closeOnClick={false}` so the spinner is visible).
- **roles-manager.tsx rewritten to the design agreement it ships next to**:
  delete confirms through the kit's `ConfirmActionDialog` (was `window.confirm`
  — DESIGN.md §4 forbids it, and the ponytail excuse was wrong: the kit already
  ships the dialog); row buttons are `IconAction` + `soft-primary`/
  `soft-destructive` (was bare ghost buttons with no tooltip/color); create/edit
  moved from a fixed-height `Dialog` (unscrollable once the permission list
  grew) to a `Sheet` with a scrolling body, matching the dialog ladder and what
  design-preview §13 has drawn all along; the stray `asChild` is gone.
- **Admin pages get real page headers**: users / roles / audit-logs now compose
  `PageHeader`/`PageTitle`/`PageDescription`/`PageActions` from `ui/page-shell`
  (subtitle included) instead of hand-written `<h1>`.
- **First-admin flow**: SKILL.md §3 no longer asks "who is the first admin" —
  the answer was unusable by design (มติ 2026-08-11: no pre-registration), so
  asking only created the expectation of a seeded account. Instead the
  protected app layout gates on `isAdminInitialized()` (now caches its positive
  result) and redirects every login to `/admin/setup` until the bootstrap
  happens — no more blank permission-less first login — and the install summary
  + `docs/admin-handoff.md` must state in Thai that the first person to log in
  becomes Administrator. §5.1 also stops suggesting a bare `npx shadcn init`
  (it initializes the Radix style; the kit is Base UI — design-setup's preset
  init is the only sanctioned path) and now lists every component the admin
  UI actually imports (`alert-dialog sheet avatar dropdown-menu`).
- **Enforcement, so this class of defect stops shipping**: new release gate
  `scripts/lint-kit-assets.mjs` (in the README release chain) fails on
  `asChild`, `onSelect` on menu items, `window.confirm/alert/prompt`,
  `@radix-ui/*` imports, and raw control bytes, across **all** `.ts`/`.tsx`
  assets; auth's `verify.mjs` gains the same checks project-side plus a warn
  when no layout wires the first-admin gate; SKILL.md §7/§8 document the Base
  UI API rule and the new manual checks. `stamp-kit-assets.mjs`'s stamp regex
  now strips CRLF stamps (a Windows checkout previously left stray `\r`s and
  `--check` never converged).

**Then a 4-agent full-plugin audit** (Base UI API · DESIGN compliance · SKILL
flows · stale ports) swept everything else. Fixed in this release; the
remainder is recorded in `docs/backlog.md` §5:

- **Functional breaks**: `upload-setup/lib/storage.ts` carried three raw
  control bytes (NUL included) in a regex — the file read as *binary* to every
  grep-based gate, making it invisible to the very lint written above; now the
  escape text `[\x00-\x1f\x7f]` and a lint rule against control bytes.
  `lib/permissions.ts` declared `files:*` / `dev-mode:enable` keys **without**
  `ALL_PERMISSIONS` seeds — they could never be granted (upload/download 403
  forever) and their presence steered installers past the mail/upload skills'
  own "add key + seed" step; the keys now belong to their owning skills, and
  the unshipped `users:delete` seed (a checkbox granting nothing) is gone.
  `admin-setup.ts` now seeds via the idempotent `syncPermissionsIfNeeded()` —
  the old bare `createMany` wedged the bootstrap forever if a prior attempt
  died between seeding and role-creation (`skipDuplicates` doesn't exist on
  SQL Server).
- **More Radix leftovers, same shipped-bug class**: `role-form.tsx` fed the
  group checkbox Radix's `'indeterminate'` string — truthy, so a
  partially-selected permission group rendered fully checked; now Base UI's
  `checked` + `indeterminate` (the helper producing the Radix value is
  deleted). `nav-user.tsx` styled its trigger with `data-[state=open]` (Base
  UI emits `data-popup-open` — the open-highlight never fired);
  `combobox.tsx` had six dead `data-[state=…]` animation selectors
  (`data-open`/`data-closed` now); `tiptap-editor.tsx`'s link button used
  `window.prompt` → a kit Popover+Input.
- **Kit component fixes**: `ConfirmActionDialog` confirms destructive in red
  (`confirmVariant`, default `destructive` — was the primary/blue registry
  default); `date-picker` closes its popover on select (it used to stay open
  covering the "to" field); `truncated-text` drops a stray `{' '}` that skewed
  its overflow measurement; `query-state` retry icon `RotateCcw`→`RefreshCw`
  (RotateCcw = กู้คืน per the icon map); DataTable's row-range line formats
  through `formatNumber` ("1–20 จาก 1,248").
- **DESIGN.md §4 form/footer pass over the auth forms**: required `*` on every
  mandatory label, `Callout` for the forgot-password confirmation box,
  `IconAction soft-primary` for the set-password row button, role-form gets a
  ยกเลิก/บันทึก footer, `Badge` for its count pill, dead `done` state removed
  from admin-setup-form, `Button variant="link"` for "ลืมรหัสผ่าน?", size
  overrides (`h-10`, `size="lg"`, `font-bold`) dropped.
- **Dialog ladder sharpened** (template + conventions + design rules file):
  "ยาว" now explicitly includes any form whose list/checklist **grows with
  data** — long even if short today, so it goes in a `Sheet`/page, never a
  fixed-height Dialog. Encodes the exact judgment the role-form bug slipped
  through ("3 ช่อง" looked ≤6 while the permission checklist grew unbounded).
- **Drift & dead-ends closed**: `RoleInput.permissionKeys` renamed
  `permissionIds` (it always carried ids); `ActivityLogs` gains
  `@@index([createdAt]/[action]/[userId])` (the unbounded audit table had
  none); audit-log date filters get ตั้งแต่/ถึง labels; the auth rules file
  (`.claude/rules/ugt-nextjs-auth.md`) now **covers the admin UI components**
  (nav-user shipped its bug outside the rules' path globs) and states the
  Base UI contract + ConfirmActionDialog/IconAction/page-shell rules — the
  design rules file states the Base UI API rule too, since it is the one that
  loads on every UI file; `ugt-nextjs-full-setup` no longer re-asks the
  banned first-admin question and its Quick Rule restores Design to the
  install order; cicd's `admin-handoff.template.md` gains the
  "ผู้ดูแลระบบคนแรก" section auth §5.5 depends on; upload-setup's compose
  snippet switches from named volumes to `/srv/appdata` bind mounts (it
  contradicted cicd §2.8's ห้าม-named-volume contract) and declares its
  design-kit prerequisite; test-lint ships the `build` script + the
  `.gitignore` step its own verify demanded; database's `lib/env.ts` gains
  the client-block/runtimeEnv EXTENSION POINT that `NEXT_PUBLIC_BASE_PATH`
  keeps being lost to; `scope.ts` documents that `ownOrgCode` has no
  enforcing helper yet.

`ugt-nextjs-auth-setup`: the three admin pages finally follow the design
agreement they ship next to — DESIGN.md §4 says "DataTable only for tabular
data", yet the assets still rendered raw shadcn `Table` (extracted from an HRMS
snapshot older than HRMS's own DataTable upgrade). The preview (§13) had been
drawing DataTables for months; the assets now match it instead of the other way
around.

- `/admin/users` + `/admin/roles` → kit `DataTable` **client mode** (bounded
  master data fetched whole). New `components/users-table.tsx` holds the
  column defs (client code); the password column is `[METHOD: LOCAL]`.
  `roles-manager.tsx` drops the per-row Dialog mounts for one controlled edit
  dialog. The users page loses its `take: 200` cap — the table paginates now.
- `/admin/audit-logs` → **server mode**, the full contract: the page parses
  searchParams (`parsePageParams`/`parsePageSize` fallback 20 per the
  watch-table มติ, `parseTableQuery` allowlist `sortable: ['createdAt']`),
  queries Prisma directly — no separate API route — and redirects when `?page`
  runs past the end. New `components/audit-logs-table.tsx` renders toolbar
  filters (ชื่อผู้ใช้ → ช่วงวันที่ → action, กว้าง→แคบ มติ 2026-08-11) that push
  `q`/`from`/`to`/`action` to the URL; DataTable pushes `page`/`pageSize`/
  `sort`/`dir` itself. Date bounds are computed at `+07:00` (createdAt is an
  instant; the container runs UTC), the date→param round-trip reads local
  parts (never `toISOString` — the UTC+ off-by-one-day bug HRMS already paid
  for), and the action Select's options come from `distinct` values in the
  log, not a hardcoded list. `detail` JSON opens in a dialog, not only a
  title tooltip (mobile has no hover).
- SKILL.md §4 gains the second prerequisite: the org UI kit
  (`ugt-nextjs-design-setup`) must be installed before auth — full-setup's
  design → auth order already guarantees it; a standalone auth install into a
  kit-less project either runs design-setup first or knowingly downgrades the
  admin pages to plain `Table` as a recorded DESIGN.md deviation. §5.2 lists
  the two new assets; §8 gains the server-side-filter check.
- `docs/design-preview.html` §13 corrected to the real component behavior:
  audit-logs toolbar now shows the page-level filters (the preview drew only a
  search box — drifting from reality is the defect class 4.19.0 documented),
  its per-column filter icons are gone (server mode filters live in the
  toolbar), pagination reads 20 แถว/หน้า, and the client-mode tables show
  filter funnels instead of sort arrows (client mode has no sort toggle in the
  shipped component).

## 4.23.0 (2026-08-20)

Companion to ugt-core 2.5.0 (the 4-hour-setup field report). Three changes,
all about *how the work runs*, none about what gets installed:

- `ugt-nextjs-full-setup` gains **§2.5 Choose the run shape**: after the
  interview batch, propose ONE way to run the install — straight through
  (≤2 modules, fresh project) · chunked sessions of 1–3 modules with
  `/ugt-handoff` between (3+ modules or careful merges) · per-module
  subagents that follow the child SKILL.md and return only a summary +
  verify result. Splits stay sequential (modules share `package.json` /
  `schema.prisma`), §3 order unchanged. Codifies in writing that **the setup
  path never enters the superpowers pipeline** — each child SKILL.md is the
  plan, `verify.mjs` is the review.
- `CLAUDE-block.md`: the infrastructure row now excludes the *entire*
  pipeline (brainstorming/plans/TDD), not just brainstorming — TDD's broad
  trigger could still fire mid-install. New **Layer contract** subsection
  (feature = fresh session, never a subagent · merge = integration check
  only, no re-review · SDD ledger vs board/handoff are separate territories).
  The model-mode bullet now states the table wins over model advice inside
  superpowers skills.

## 4.22.0 (2026-08-20)

`ugt-nextjs-design-setup`: the scale question. Field report: an existing
project answered "คงของเดิมไว้ แต่ใช้ shadcn" and got a two-scale UI — legacy
48px inputs next to kit-default 28px controls in the same form. Density/sizes
were "deliberately not asked" (an org iron rule meant for fresh projects), and
the scan never measured the old UI's control metrics, so nobody chose which
scale wins. Four changes:

- **§Scale scan** in `references/interview.md`: measure the existing UI from
  real code across six dimensions — control size (height/padding/icon), shape
  (radius/border/shadow/focus ring), typography (control/label/heading sizes),
  density (form gap, card padding, table rows), form conventions
  (label/required/error placement), colors (already in the main checklist) —
  and present an old-vs-kit comparison table before asking.
- **ข้อ 9** (ชุด 3): when the measured scale differs from the kit, ask which
  scale wins — ยึดของเดิม (rebase kit, recommended) / ยึด kit (migrate old
  forms) / แยกโซน (never mix in one page) — with real numbers in the question
  and the cost of each path in the option descriptions. The un-chosen middle
  is explicitly named as the outcome that must never happen.
- **§Scale bridge**: how to rebase correctly — every dimension has exactly one
  source file (`ui/input|button|select|textarea`, `--radius`, `ui/table`,
  `ui/field`); per-page overrides are banned as the origin of round-two mess.
- `DESIGN.template.md` §4: the mira density line became a fillable
  `__CONTROL_SCALE__` agreement plus the scale rule (same-form controls equal
  height; sizes change only at `components/ui/*`).

## 4.21.0 (2026-08-20)

`ugt-nextjs-auth-setup`: SSO first-login hardening. Field report: a
production SSO login died with `unable_to_create_user`, and the error page
itself 404'd at the proxy — the user saw a blank nginx page. Root cause was
email drift (AD email domain differs from the stored row's email, e.g.
`@company.com` vs `@company.co.th`), a case `auth-flows.md` already documented
but the shipped `lib/auth.ts` never implemented. Four changes:

- `lib/auth.ts` `mapProfileToUser` now resolves the existing row by
  `ldapUsername` first and lets its email win (prevents the
  create-instead-of-link unique-constraint death), and throws a findable
  message when Keycloak sends no email at all.
- `lib/auth.ts` adds `accountLinking.requireLocalEmailVerified: false` —
  better-auth ≥1.6.11 blocks implicit linking into `emailVerified: false`
  rows (nOAuth fix), which every LDAP-upsert/admin-created row is. Safe here
  because self-registration is closed (มติ 2026-08-11).
- `lib/auth.ts` adds `onAPIError.errorURL` = `${basePath}/login` (the default
  `/api/auth/error` is computed WITHOUT the basePath — same trap as
  redirectURI and the reset link — and 404s behind a shared-domain proxy)
  plus an `onError` log so the real cause lands in `docker logs`.
  `login-form.tsx` maps `?error=<code>` to Thai messages; SKILL.md §5.5 wires
  the new `ssoError` prop.
- `scripts/verify.mjs`: new FAIL check (SSO without `onAPIError.errorURL`)
  and WARN check (no `ldapUsername` lookup in `mapProfileToUser`);
  `auth-flows.md` troubleshooting table gains the full
  `unable_to_create_user` checklist.

## 4.20.0 (2026-08-19)

`ugt-nextjs-auth-setup` no longer ships a second sidebar into projects that
already have one. Field feedback: installing into an existing project produced
a separate admin sidebar (the asset default) instead of new menu items in the
project's own nav. Three changes:

- `components/admin-nav.tsx` now exports **`ADMIN_NAV_ITEMS`** (menu data with
  per-item permission keys) separately from the `<AdminNav>` fallback sidebar,
  so an existing sidebar can merge the three admin items directly.
- `app/(admin)/layout.tsx` documents its two jobs — GUARD (always keep) vs
  SHELL (fallback only) — with an inline marker showing what to delete when
  the project's own shell wraps the admin pages.
- `SKILL.md` gains **§5.6**: detect an existing shell first; merge
  `ADMIN_NAV_ITEMS` + strip the shell from the admin layout when one exists,
  copy as-is only for shell-less projects. Plus §3 Q8: ask which existing
  menus should come under RBAC — declaring keys in `ALL_PERMISSIONS` is the
  registration step that makes them appear in the `/admin/roles` checklist;
  unregistered menus stay session-only by design.
- `scripts/verify.mjs`: the admin-pages check now suffix-matches
  `admin/<seg>/page.tsx` anywhere under the project instead of two fixed
  paths — a §5.6 install that nests `(admin)` under the project's shell no
  longer reports a false FAIL.

Validated with a 3-eval benchmark (existing-sidebar merge / fresh no-shell /
existing-menu RBAC) against the 4.19.0 snapshot: new skill 11/11 assertions,
old skill 8/11 — the old version reproduced the reported double-sidebar bug
in both existing-sidebar scenarios.

## 4.19.0 (2026-08-18)

`ugt-nextjs-auth-setup`'s `references/directory-enrichment.md` now states
up front that the standard pattern has **two separate HR views**, not one:
the employee/identity view (`lib/directory.ts`) and the authorize/approval
view (`lib/approval-chain.ts`). Previously that split was documented only in
`references/data-scope.md`, so a reader who opened `directory-enrichment.md`
alone had no signal a second view existed. Confirmed against `ugt-hrms`'s
real schema (`vwHR_SC_Employee` vs `HR_SC_AuthorizeEmployee_ms`) — the
existing column mapping in both asset files already matched; this was a
cross-reference gap, not a code gap.

## 4.18.0 (2026-08-16)

`ugt-nextjs-full-setup`'s `CLAUDE-block.md` no longer routes every "build a
feature / fix a bug" straight into the full superpowers pipeline
(brainstorming → plan → TDD → review). It now **sizes the work first** on the
same three signals `ugt-model-mode`'s `auto` preset already uses — ambiguity,
blast radius, risk domain. Small, unambiguous, low-risk work gets offered a
choice (full pipeline or a light version that skips brainstorming/plan but
keeps TDD + review); anything ambiguous, cross-module, or touching a risk
domain still goes full pipeline without asking. Fixes the previous
all-or-nothing behavior that made a one-file, well-understood bug fix pay the
same process cost as a multi-module feature.

## 4.17.0 (2026-08-16)

`ugt-nextjs-auth-setup`'s `assets/env.example` now ships
`NODE_TLS_REJECT_UNAUTHORIZED=0` **uncommented by default** — for projects
whose containers sit on a closed intranet with no outbound path to the
internet, Node couldn't verify the org's internal-CA Keycloak cert and SSO
failed with "Invalid OAuth configuration" every time until someone manually
uncommented the line. The comment above it now says plainly why it's on and
warns to remove it the moment the container gains any outbound access (npm
registry, external API, etc.) — it disables TLS verification for the entire
Node process, not just the Keycloak connection. `SKILL.md`'s Quick Rules table
updated to match (no longer "never by default").

## 4.16.0 (2026-08-12)

**Form validation convention — the last two audit-addendum items, closed
together** (they were always one story told from two sides). New
`pitfalls/references/form-validation.md`, loaded when building forms or the
Server Actions they submit to:

- **Two layers on purpose**: RHF + zod in the browser is UX; `safeParse` in
  the Server Action is the security boundary — an action is a public HTTP
  endpoint and TypeScript types are erased at runtime. HRMS runs this at 48
  boundaries.
- **Schema factory per form** in `lib/validations/`, messages injected —
  testable without next-intl, wording owned by the component. RHF
  `mode`/`reValidateMode` stay at library defaults (the old "org standard"
  merely restated them; the real rule is one line: don't override).
- **Choice values are literal unions** (`z.enum`) so fabricated values die at
  the boundary instead of landing in the database.
- **The rule with teeth — limits defined once**: HRMS keeps its form schema
  and action schema aligned by a comment and a promise; when they drift the
  user passes the form and gets rejected at save with nothing highlighted.
  Numbers/regexes/enums live in one module both schemas import. No new asset
  needed — the kit already ships the canonical example: `password-policy.ts`
  is one definition consumed by the reset form, the change dialog and the
  admin create action.
- pitfalls' description gains the symptom trigger
  ("ฟอร์มผ่านแต่บันทึกไม่ได้") and the reference table gains the row.

With this, the 2026-08-04 audit addendum is **fully closed**: react-query
(4.12.0) · zustand (4.15.0) · RHF/zod (4.16.0).

## 4.15.0 (2026-08-12)

**The zustand question is closed: rejected, with a client-state ladder in its
place** (มติ 2026-08-12 — the last open item from the 2026-08-04 audit
addendum besides the two form-validation ones).

The evidence made the call easy. HRMS — the larger production app — ships
zero stores. gov-boi's entire zustand footprint turned out to be one 18-line
store mirroring `selectedTaxId`, whose real source of truth is a **cookie**
written by a server action, with a single consumer and an in-file comment
admitting the rest was "for future use": a third copy of one value, bought
before anyone needed it.

- `pitfalls/references/data-fetching.md` gains **§0 Client-state ladder**:
  server data → React Query · filter/sort/page/tab → URL · one component →
  `useState` · a subtree → lift/Context · **a store library → not a standard,
  needs a dated project มติ first**. Stop at the first rung that fits.
- The audit addendum row is closed with the decision and the evidence.

Also: `stamp-kit-assets.mjs` now keeps a file's stamp version when its content
hash is unchanged — the stamp reads "the release this file last changed in",
which is what kit-sync's "ติดตั้งที่ X" report actually wants to say, and a
docs-only release no longer rewrites 84 asset files (this release proves it:
zero asset churn). `--check` validates presence + hash, not version equality.

## 4.14.0 (2026-08-12)

**New skill `ugt-nextjs-kit-sync` + version stamps on every copied asset** —
closing the systemic gap that assets are copied into projects and then sit
still while the plugin moves on (`/plugin update` refreshes the knowledge, not
the copies; HRMS kept a `scrollX` bug for weeks after the plugin fixed it).

The mechanism, per the maintainer's design (มติ 2026-08-11): check which side
is newer, then choose per file — update or merge.

- Every whole-file-copy asset (84 `.ts/.tsx` files) now carries two baked
  header lines: `// kit: <plugin> <version> · <skill>/<path>` and
  `// kit-hash:` (sha256-12 of the content excluding the stamp, LF-normalized
  so a Windows checkout doesn't read as an edit). Version answers "is the copy
  behind"; hash answers **"did the project touch it"** — the distinction that
  makes a safe proposal possible. Merged/pasted/appended assets
  (globals.tokens.css, prisma snippets, env.example) are deliberately
  unstamped: they never exist in a project as a whole file.
- `scripts/stamp-kit-assets.mjs` (repo): stamps at release, `--check` joins
  the release gate. README release steps updated.
- `check-kit-freshness.mjs` (in the skill, report-only, `--json` for the
  flow): classifies every stamped project file as **CURRENT** (equals the
  current asset — even when only the stamp label is old) / **UPDATE**
  (outdated, never touched → safe overwrite) / **MERGE** (outdated and
  modified — which by design includes placeholder-substituted files;
  indistinguishable from a real edit and the careful path is right for both) /
  **REMOVED** (asset retired or renamed → CHANGELOG). All four states proven
  against a fixture project before shipping.
- The skill flow: report → consent per file (or all) → UPDATE re-substitutes
  placeholder values pulled from the file being replaced; MERGE is a
  **semantic three-way merge with the CHANGELOG as the base narrative** —
  read the project's file, the new asset, and every CHANGELOG entry between
  the two versions, keep both sides, surface conflicts instead of picking the
  plugin's side. Stamps stay verbatim; merged files truthfully report MERGE
  again next round. Close-out = มติ in decisions.md + owning skills' verify +
  project tests.
- Files installed before this release carry no stamp; the skill matches them
  to assets by path and treats them as MERGE once — the first sync adds
  stamps.

## 4.13.0 (2026-08-11)

`ugt-nextjs-cicd-setup` follows the platform contract's new **Persistent
data** section (`ugt-core/contracts/cicd.md`): volume: interview ข้อ 7,
บล็อก `[VOLUME]` ใน compose, verify check, admin handoff — ตาม contract
Persistent data.

- SKILL.md §3 gains interview item **7. Volume?** — a path that must persist
  across deploys (e.g. uploads) → list them → uncomment `[VOLUME]` in both
  compose files; none → delete the block. §2.8 **Persistent data** restates
  the contract (bind mount under `/srv/appdata/<project>/<name>`, dev suffixed
  `-dev`, no named volumes, no secrets in a volume, no code bind-mounted over
  the image). §4.3 gains the corresponding cleanup step.
- Both `assets/docker-compose.yml` and `docker-compose.dev.yml` gain a
  commented `[VOLUME]` block under `ports:` (default: no volume) —
  `/srv/appdata/__PROJECT_NAME__/uploads` prod, `-dev` suffix for dev.
- `assets/admin-handoff.template.md`: the first-project-on-server appendix
  now also covers the one-time `/srv/appdata` bootstrap (`sudo mkdir -p
  /srv/appdata && sudo chown jenkins:jenkins /srv/appdata`) — every project's
  own path underneath is created by its Deploy stage.
- `scripts/verify.mjs`: the compose check now fails on any bind mount outside
  `/srv/appdata/`.
- `assets/Jenkinsfile` Deploy stage gains the `[VOLUME]` mkdir+chown block
  (ported from `ugt-python-cicd-setup`, after the `[DB]` migrate step, before
  `docker-compose up -d`) — without it §2.8's "Deploy stage สร้าง path + chown
  ให้ตรง UID" was unfulfilled and an uncommented compose volume hit
  `root:root` `PermissionError`.
- `scripts/verify.mjs`: the `[DB]`/`[SENTRY]` consistency checks no longer
  regex the whole Jenkinsfile — the header legend permanently mentions both
  tags in comments, so a project that correctly deleted the blocks still
  false-failed. They now test `jfActive` (pipeline body, comment lines
  stripped), the same fix the python/php verify scripts carry.

## 4.12.0 (2026-08-11)

**The four "rule exists, asset missing" gaps are closed.** Each had a
convention naming the required library with nothing to install, which in
practice means every project re-derives the setup and drifts.

- **React Query provider** (from HRMS `components/providers.tsx`, now standard
  in every install): `components/query-provider.tsx` — one QueryClient for the
  whole app, `staleTime 0` (org data changes from many hands; freshness beats
  fetch thrift), `retry 1`, and a `QueryCache.onError` that turns a mid-session
  401 into a `session-expired` event for auth's watcher instead of an error
  toast. With it: `lib/http-error.ts` (queryFns throw `HttpError`, never bare
  `Error` — the 401 routing depends on the status being attached) and
  `ui/query-progress.tsx` (top bar on **initial** fetches only; background
  refetches stay silent so the bar doesn't flash on every post-save
  invalidation; its nprogress CSS rides in the header comment).
  `pitfalls/data-fetching.md` now names the provider and the
  never-`new QueryClient`-in-a-page rule.
- **`ui/tiptap-editor.tsx`** — HRMS's editor verbatim (389 lines: toolbar,
  source mode, an `insert()` handle for server-built HTML like mail-template
  tokens). Ships only when the project has rich text; `@tiptap/*` ^3 set.
- **`ui/chart-example.tsx`** — a reference to copy-adapt-delete, not a shared
  component (charts are feature code; `npx shadcn add chart` provides the real
  primitive). What it teaches is the color rule with teeth: generic series →
  `--chart-1..5` in order; a series that *is* a status → the matching
  `--status-*`, so the chart and the StatusBadge on the table tell the same
  story in the same color.
- **`lib/motion.ts`** — the agreement's numbers (0.2s ease-out, ≤12px) as
  importable constants plus `fadeSlideUp(reduced)`/`fadeOnly()`, so pages stop
  inventing their own durations. The decision ladder is unchanged and stated
  in the file: don't animate → CSS → only then `motion`. HRMS's animated tab
  underline was NOT extracted — it is built on Radix and the kit is Base UI;
  the technique (layoutId + `useReducedMotion`) is cited instead.

Install wiring: `QueryProvider` joins the layout provider chain (outermost),
`@tanstack/react-query` + devtools + `nprogress` join the standard deps;
chart/tiptap/motion stay opt-in per project, listed with their triggers in
SKILL step 3.4 and the kit inventory.

## 4.11.0 (2026-08-11)

**One toolbar row** (มติ 2026-08-11). The maintainer flagged the three-strip
card header — filter row, then a half-empty search row, then chips — as
reading wrong, and it did: three scans for one job. The layout follows the
canonical shadcn DataTable toolbar now:

```
[search] [period] [org] [status]   …   [export] [columns]
[active-filter chips]                       ← only when filtering
─────────────────────────────────────────── ← the one divider
table …
```

- `data-table.tsx` gains a **`toolbarFilters` slot**, rendered right after the
  search box; page-level filters go there (wide → narrow) instead of a
  separate row above. The toolbar row wraps on narrow screens. Placement is
  layout only — a filter that changes which rows exist must still ride the
  server query (that rule is unchanged).
- Chips row survives on purpose: it is the one place per-column filters (from
  the header popovers) become visible and individually clearable — the
  "values shown in the controls, no chips" variant was considered and
  rejected for exactly that reason.
- The divider rule from earlier today simplifies to: the last control row
  present carries the single divider (chips when filtering, the toolbar
  otherwise).
- `conventions.md` §Page-level filter bar + §DataTable Toolbar rewritten;
  design SKILL §2.4 updated; preview specimen 4 redrawn (active filter shown
  with a primary border so "filtering is on" is visible even before the chips
  row). The org contract needed no change — it pins "same card, leading edge,
  wide → narrow", which this still satisfies.

## 4.10.0 (2026-08-11)

Two changes from the maintainer reviewing the admin pages against HRMS, plus a
preview rework.

**AD pre-registration removed** (มติ 2026-08-11, reverses part of 4.7.1/4.8.0):
`addDirectoryUserAction` and the AD branch of the "เพิ่มผู้ใช้" dialog are gone.
AD accounts behave exactly like SSO — the directory already has their data, the
row appears on first login, and the role is assigned from `/admin/users` after
that. Hand-typing an `ldapUsername` had only downside: one typo and the login
upsert creates a second user, leaving the role on a row nobody uses. HRMS's
`addHREmployeeAction` stays un-extracted, now by decision rather than omission.
The dialog is local-only again; `lib/directory.ts` keeps its two call sites
(LDAP login + SSO hook) — enrichment on login is unaffected.

**Permission checklist brought up to the HRMS shape** (มติ 13.3). The skeleton's
checklist was a flat two-column grid; HRMS's is the version that survived real
use. `role-form.tsx` now renders bordered groups with a **tri-state select-all
per group header** (with n/m counts), indented children, the **mono permission
key beside every label** — so what a dev reads in code is what an admin sees on
screen — and a total-selected pill. The pure helpers behind the tri-state
(`groupState` / `groupCheckedValue` / `toggleGroup`) are extracted verbatim as
`lib/permission-group-select.ts`.

**Preview section 13 redrawn inside the app shell.** All three pages (users,
roles, audit) now sit in the sidebar shell with a "ผู้ดูแลระบบ" nav group, as
they will actually appear; the roles specimen shows the HRMS-style checklist in
a Sheet (long form → Sheet, per the Dialog ladder) including an indeterminate
group header; the add-user dialog is local-only with the reasoning shown beside
it; disabled delete buttons demonstrate both blockers (system role · role still
in use).

## 4.9.0 (2026-08-10)

**Permission answers "may they"; nothing answered "whose data".** 4.8.0 put
`empCode` / `orgCode` / `superEmpCode` on the user row and stopped there — the
raw material for row-level scope with no layer that enforced it. That gap is the
most common hole in internal apps: a user passes every guard, edits `?empCode=`
to a colleague's, and reads their rows. The skill's own
`ugt-nextjs-pitfalls/references/hardening.md` already described the incident;
there was just nothing to reach for.

- `lib/scope.ts` (from `ugt-hrms/lib/services/employee-monitor-scope.ts` +
  the subtree walk in `hr-lookup.ts`): `resolveDataScope` →
  `isEmpCodeAllowed` for one record, `scopeWhere` for a list, both from the
  **same** scope object — a list filtered one way and a detail page checked
  another leaves a gap nothing on screen reveals.
  - An account with no linked `empCode` sees nothing; `scopeWhere` yields
    `{ in: [] }`, which is zero rows rather than all of them.
  - Out of scope answers **404** — 403 confirms the id exists.
  - `collectSubtreeEmpCodes` is pure and ships with `lib/scope.test.ts`
    covering the cases that regress in silence: multi-level teams, a cycle
    (real HR data has them, from keying errors), a null supervisor, and the
    unlinked account.
- `lib/approval-chain.ts` (from `workflow-resolver.ts` + `hr-lookup.ts`) reads
  the org **approval-chain view** — one row per step (`EmpCode` + `Seq`). It is
  a different object from the employee view, and `superEmpCode` there is only
  the denormalized direct supervisor: fine for team scope, wrong for routing an
  approval.
- **The two linked-server modules fail in opposite directions, deliberately.**
  `directory.ts` swallows and returns `null` — it runs during login, and an HR
  outage must not become "nobody can log in". `approval-chain.ts` rethrows —
  returning `[]` would save a request with no approver, tell the user
  "submitted", and leave it sitting until someone chases it weeks later.
  Callers must also separate `[]` (no chain configured → contact HR) from a
  thrown error (system down → retry); one message sends people to HR over a
  network blip.
- `verify.mjs` now flags a route or action that accepts an `empCode` from the
  client without resolving scope, a `scopeWhere` that does not constrain, a
  missing `scope.test.ts`, and an approval-chain lookup that swallows its error.
- Fixed a pre-existing inconsistency while here: the scope permission was
  documented as `resource:view-all` in `permissions.ts` and `hardening.md` but
  `resource:read-all` in `rbac.md`. Standardized on **`read-all`**, which is
  what the production code actually uses.

Not extracted, and the reference says so: HRMS's per-menu workflow config,
approval-chain snapshots taken at submit time, and its bulk `/admin/users/sync`
page. Those encode one organization's workflow rules, not an org-wide standard.

## 4.8.0 (2026-08-10)

**Identity now comes from the employee directory, not just the IdP.** SSO and
LDAP answer exactly one question — "who are you" — and the skill stopped there,
leaving three `EXTENSION POINT: enrich the user from your own directory` comments
and no mechanism. Every feature needing an employee code, department, position
or supervisor would have gone and queried the HR view itself, each mapping the
columns its own way.

- `lib/directory.ts`, generalized from `ugt-hrms/lib/hr-lookup.ts` (the
  HR-domain half — shift rules, leave quota, approval chains, subordinate BFS —
  stayed behind; that is feature code, not identity):
  `getDirectoryPerson` · `getDirectoryPersonByEmpCode` · `searchDirectory` ·
  `directoryUserFields`.
- Wired at all three points that create or refresh a user, from the **same**
  helper: `ldapLoginAction`, the SSO `session.create.after` hook, and
  `addDirectoryUserAction`. Separate implementations would leave SSO users and
  AD users with different columns filled, and nothing would surface it until a
  page needed the missing one. SSO must enrich in the hook — Better Auth drops
  custom fields returned from `mapProfileToUser`.
- The `user` model gains `empCode` · `fullNameThai` · `position` · `department`
  · `orgCode` · `superEmpCode`, documented as a **cache, not the source**, and
  refreshed on every login rather than once at signup — people change teams.
- **Every lookup returns `null` instead of throwing.** A dead HR server must
  degrade to "the Thai name is stale", never to "nobody can log in".
- `Prisma.raw` for the view name and column list, which are identifiers rather
  than values — interpolating them normally makes them bound parameters and the
  SQL fails. Nothing user-supplied ever goes near it. The SQL rules themselves
  (SELECT-only, CAST every column, no recursive CTEs) are not restated here;
  they live in `ugt-nextjs-database-setup` → `references/raw-sql-and-sp.md`.
- `addDirectoryUserAction` no longer asks the admin to type a name and email —
  it resolves them from the directory. Typed values would be overwritten at the
  person's first login anyway, so they could only ever be right by luck.
- Interview gains "is there a central employee database?" so answering *no* is a
  recorded decision rather than a silent omission, and `verify.mjs` checks the
  lookup fails soft, uses `Prisma.raw`, and is actually called from a login path.

## 4.7.1 (2026-08-10)

**User administration was missing entirely**, in both directions. 4.7.0
described the password policy as shared with "admin-create"; checking that claim
found no such thing, and pulling the thread found two holes that had been there
since local login was first offered:

- **No account could be created by hand at all.** `/admin/users` only listed
  users and assigned roles; `/admin/setup` promotes an already-logged-in user;
  there is no sign-up page. `USERS_CREATE` and `USERS_RESET_PASSWORD` sat in
  `ALL_PERMISSIONS` with nothing implementing them. A local-only project could
  not get its first person in.
- **Sign-up was open to anyone who could reach the app.**
  `emailAndPassword.enabled: true` publishes `POST /api/auth/sign-up/email` and
  nothing closed it.

`ugt-hrms` had already solved both — the skill just never extracted it. It is
extracted now, generalized:

- `createLocalUserAction` · `setUserPasswordAction` · `addDirectoryUserAction`
  in `lib/actions/admin-users.ts`, all on the org guard order, all audited
  (`users.create`, `users.password-set`), none putting a password in `detail`.
  `components/admin-user-actions.tsx` puts them on `/admin/users` as one
  "เพิ่มผู้ใช้" dialog that switches between a local account (with an initial
  password) and an AD account.
- **AD accounts can be pre-registered.** They already appear on the first
  successful bind, but a role often has to be in place before day one. The
  `ldapUsername` must match exactly what the person types at login — that is
  the key the login upsert matches on, so a typo produces a second user and the
  role sits on the row nobody uses.
- `emailAndPassword.disableSignUp: true`. This also blocks the server-side
  `auth.api.signUpEmail()` (verified in 1.5.4 — the check is inside the handler,
  no server bypass), which is why the admin action writes the `user` +
  `credential` rows itself with `hashPassword` from `better-auth/crypto`, the
  way HRMS does. That avoids a second problem in passing: `signUpEmail` mints a
  session for the account being created.
- An admin **sets a password directly** rather than mailing a link, because
  `ugt-nextjs-mail-setup` is optional and a project without it would otherwise
  have no recovery path at all. Every session of that user is revoked, and the
  cost — two people knowing one credential for a while — is stated in the rule
  file rather than left implicit.
- `scripts/create-first-user.ts` for the chicken-and-egg a local-only project
  hits: accounts come from `/admin/users`, which needs a login nobody has yet.
  It refuses to run once any user exists.
- `verify.mjs` fails on a missing `disableSignUp`, a missing
  `createLocalUserAction`, an admin action still calling `signUpEmail`, and a
  missing bootstrap script.

## 4.7.0 (2026-08-10)

**Local login is finally complete.** Until now a project could hand someone a
local account and had no way to let them recover it — the only path was an
admin editing the database. `ugt-nextjs-mail-setup` (4.4.0) removed the blocker.

- `lib/password-policy.ts` — **one** schema for length and complexity, imported
  by reset, change and admin-create. `lib/auth.ts` previously said complexity
  "belongs in Zod schemas on the create-user / reset-password forms", which is
  how three forms end up with three different rules and the loosest one becomes
  the real policy.
- `lib/actions/password.ts` — forgot / reset / change, each rate-limited and
  audited (`password.reset.requested` · `password.reset` ·
  `password.reset.refused` · `password.change` · `password.change.failed`).
- `lib/auth.ts` gains `sendResetPassword`, `resetPasswordTokenExpiresIn` (1h),
  `revokeSessionsOnPasswordReset` and `onPasswordReset`; `proxy.ts` makes
  `/reset-password` public; NavUser grows a **เปลี่ยนรหัสผ่าน** item that is
  hidden unless `authType === 'local'`; the login form grows "ลืมรหัสผ่าน?".
- `auth.password-reset` joins the mail templates, so the wording is admin-editable
  while the link button stays fixed chrome nobody can delete by accident.

Four decisions that are security, not preference, and are written down as such:

1. **The reset link is built from `token` + `NEXT_PUBLIC_BASE_PATH` by hand.**
   Better Auth's own `url` omits the Next.js basePath — the same trap already
   documented for the Keycloak `redirectURI` — so mailing it 404s, and only in
   production, where the basePath exists.
2. **Every email gets the same answer**, real or not. Anything else turns the
   form into a way to test who has an account.
3. **SSO/LDAP accounts are refused a reset.** Their password lives in the
   directory; a second app-local password beside it defeats the directory.
4. **Reset and change both revoke the user's other sessions.** People reset
   because they think someone else is in the account; leaving that session alive
   makes the reset theatre.

API note, verified against the better-auth **1.5.4** in `ugt-hrms/node_modules`
rather than from memory: `auth.api.forgetPassword` **no longer exists** — it is
`requestPasswordReset` now. The old name still type-checks and fails at runtime,
so `verify.mjs` fails on it explicitly.

Also fixed while adding the template: `mail-setup`'s "every key has a definition
and a default" check read the key list with a regex that stopped at the first
`]`. A `[METHOD: …]` comment inside the array would have closed the match early
and every key after it would have gone **unchecked in silence**. The regex now
anchors on `] as const`, and the array carries a comment saying why brackets
must stay out of it.

## 4.6.0 (2026-08-10)

**Excel/CSV export joins the UI kit** — extracted from `ugt-hrms`, where the
same ~120 lines were written twice (`access-monitor/export`,
`employee-monitor/export`) and drifted apart. Deliberately **not a new skill**:
export is ordinary feature work with no infrastructure, and
`ugt-nextjs-upload-setup`'s trigger evals confirm judges already route
"ปุ่ม export Excel" away from it 3/3 — a skill would have blurred a boundary
that works.

- `lib/export.ts` — one `ExportColumn[]` spec drives **both** formats, so CSV
  and Excel cannot disagree. HRMS proved why that matters: `employee-monitor`
  shipped a CSV with **15 headers and 13 values per row**, misaligned all the
  way down, because the header string and the row array were maintained
  separately. That class of bug is now unrepresentable.
- Three things the hand-written routes got wrong, fixed once:
  **no UTF-8 BOM** (Thai opens as garbage in Excel on Windows), **no formula
  guard** (a cell starting with `=`/`+`/`-`/`@` is executable — `=cmd|…` is a
  real attack against whoever opens the file), and **no row cap** on
  `employee-monitor` while `access-monitor` capped at 10,000. `exceljs` is now
  a dynamic import, so a CSV request no longer loads an xlsx parser.
- `ui/export-menu.tsx` — the dropdown, reshaped to the toolbar's icon-button
  form so it matches the column-settings button it sits beside; the filename
  now comes from the server's `Content-Disposition` instead of being guessed a
  second time on the client.
- `references/conventions.md` §Export — the route order (**session →
  permission → scope → zod → capped query → audit → build**) and the DO/DON'T
  table. The export bypasses pagination, which makes the scope check the only
  thing between a user and every row in the table.
- `assets/lib/export.test.ts` travels with the code — 4 assertions covering
  BOM, formula guard, negative numbers staying numeric, and column alignment.
- `scripts/verify.mjs` gains a check that fails on a hand-rolled export
  (`exceljs` or `text/csv` outside `lib/export.ts`); it stays silent in
  projects that export nothing.
- `docs/design-preview.html`: Export was drawn as a text button in the page
  header, which matched neither the kit nor HRMS. Moved into the table toolbar
  as an icon button — the preview drifting from reality is the same defect
  class this release is about.

Trigger-eval baselines run for the two 4.4/4.5 skills (3 judges, 27 queries
interleaved, randomized per judge): **mail 24/24 primary · upload 21/21 ·
negatives 36/36**, every negative landing on its expected owner unanimously.
No description changes needed.

## 4.5.1 (2026-08-09)

Two gaps in 4.4.0/4.5.0, both found by review rather than by a check:

- **The installer never asked about Upload.** Mail was in the module question;
  Upload only ever appeared in the child-skill table and the install order, so
  a run of `ugt-nextjs-full-setup` would have skipped it silently. Both are now
  asked as their own yes/no, phrased by what the app does ("ต้องส่งอีเมลแจ้งเตือนไหม",
  "ผู้ใช้ต้องแนบไฟล์ไหม") rather than by module name, and both default to **no** —
  each drags in real infrastructure (an SMTP relay to request; a volume plus a
  ~2 GB ClamAV container needing its own backup), so neither should arrive
  uninvited.
- **How an attachment links to its record was presented as a default when it is
  a business decision.** The path itself is always a column, and that stays
  fixed — but the polymorphic `entityType`+`entityId` shape the skeleton ships
  is one of three, and the schema said so nowhere. New
  `references/attachment-linking.md` lays out polymorphic vs a real FK per
  owning type vs a single column on the business table, with the trade-off that
  actually bites: polymorphic has **no FK protecting it**, so deleting an owning
  record leaves orphan rows that only the retention sweep will catch. The
  interview now asks, the schema comment says it is a choice, and the checklist
  requires the answer in `docs/project-context/decisions.md`.

## 4.5.0 (2026-08-09)

**New skill `ugt-nextjs-upload-setup`** — file attachments, the second runtime
gap. 4.4.0 recorded that this needed three org decisions before any code could
be written; they were made on 2026-08-09:

| Decision | Answer |
| --- | --- |
| Where files live | **Docker volume** |
| Which types | **All types, virus-scanned** |
| Downloads | **Permission-checked every request** |

Unlike every other skill here, **nothing was extracted** — `ugt-hrms` has no
upload path at all, so this is built from the decisions rather than from a
running implementation, and the SKILL says so.

What it installs: `lib/storage.ts` (volume paths derived from a generated
`yyyy/mm/<uuid>`, never from the filename, with a containment check) ·
`lib/virus-scan.ts` (clamd INSTREAM spoken directly over TCP — ~40 lines, no
npm client on the upload path) · an upload Route Handler · a guarded download
route · `lib/attachment-access.ts` (deny-all skeleton the project must
implement) · the `Attachments` model · a `FileUpload` component · the
Dockerfile/compose changes · `.claude/rules`.

The rules that carry the risk:

- **Scan before the volume, fail closed.** Bytes are scanned in memory;
  anything but a definite *clean* refuses the upload (503 when the scanner is
  down). A scanner that waves files through when it is broken is worse than
  none, because everyone believes files are checked. `verify.mjs` fails when
  `writeStoredFile` runs before `scanBuffer`.
- **Always `octet-stream` + `attachment` + `nosniff`.** "All types allowed"
  makes this non-negotiable: a virus-free `.svg` or `.html` served inline is
  stored XSS on the app's own domain.
- **Missing and forbidden both answer 404** — a 403 confirms the id exists.
- **Upload is a Route Handler, not a Server Action** — `bodySizeLimit` caps
  Server Actions at 1 MB and fails opaquely above it.
- The storage volume **is not covered by the database backup** and
  `docker compose down -v` deletes it; both go into `docs/admin-handoff.md`.

Also: `lib/format.ts` gains **`formatFileSize`** (1024-based, KB/MB/GB, `.0`
trimmed) — file sizes are numbers shown to users, so they belong in the central
formatter rather than being formatted inline. `ugt-nextjs-auth-setup` now ships
`files:create` / `files:read` alongside `dev-mode:enable`.

Install order is now `Database → Quality → Design → Auth → [Mail] → [Upload] →
CI`; Upload is opt-in and must precede CI, whose compose files it modifies.

## 4.4.0 (2026-08-09)

**New skill `ugt-nextjs-mail-setup`** — the first of the runtime-feature gaps
identified in the platform review. Extracted from `ugt-hrms`, where this exact
code sends every approval email in production.

What it installs: `nodemailer` over the org SMTP relay · admin-editable
templates (subject + body stored as one `AppSettings` row per key, in-code
defaults so mail works before anyone edits anything) · fixed email chrome
(card, header, greeting, status banner, CTA, "do not reply" footer) assembled
in code so an admin can change wording but never the layout or the disclaimer ·
`AppSettings` model · the `.claude/rules` file · `references/templates-and-tokens.md`.

Three production lessons carried over as enforced rules:

- **Dev mode is mandatory.** A user holding `dev-mode:enable` receives workflow
  mail themselves — CC dropped, `[DEV] ` on the subject, a banner naming the
  real recipients — so an approval flow can be tested end to end without
  notifying anyone. `verify.mjs` fails on any `sendTemplatedMail` call without
  an `actor`, because omitting it turns dev mode off silently.
- **Missing `SMTP_HOST` throws.** Without the guard nodemailer falls back to
  `localhost:25` and mail disappears with no error — checked by the script.
- **Every token is HTML-escaped.** `htmlVariables` is the single bypass, for
  server-built HTML only; the script fails when a user-typed token name
  (`reason`, `comment`, `note`, …) appears in that list.

Wiring: install order becomes `Database → Quality → Design → Auth → [Mail] → CI`
(Mail is opt-in and must follow Auth — it needs the session actor and adds
`dev-mode:enable` to `ugt-nextjs-auth-setup`'s permission list, which now ships
that key with a warning to grant it to testers only).

Not in scope, stated so it is not assumed: **file upload**. The review named it
alongside email, but `ugt-hrms` has no upload path at all — no `formData()`
handler, no volume, no storage dependency, only CSV/XLSX *exports*. There is
nothing to extract, and writing one would mean inventing answers to three org
decisions (where files live given `docker-compose` mounts no volume, size/type
limits and whether virus scanning is required, and whether downloads must be
permission-checked). Those go to the team before any code.

## 4.3.0 (2026-08-09)

**One scrollbar style for the whole org.** 4.1.0 said "delete `no-scrollbar`",
which leaves the OS scrollbar — chunky on Windows, invisible-until-hover on
macOS, different on every machine. `globals.tokens.css` now ships
`@utility scroll-thin` (6px, `--border` thumb, brightens on hover, Firefox +
WebKit), lifted from `ugt-hrms` where the same arbitrary-variant string was
pasted per call site.

- `SidebarContent`: swap `no-scrollbar` → `scroll-thin` (block-cleanup step in
  `references/layout-shells.md`, with the exact line to paste).
- `DataTable`: the sideways scroll container gets `scroll-thin` too, so the
  scrollbar that 4.1.0 turned on looks deliberate.
- `verify.mjs`: fails when `no-scrollbar` survives or when `globals.css` has
  no `@utility scroll-thin`; warns when `SidebarContent` carries neither.
  All four paths tested.

### Syncing a project that installed the kit before 4.3.0

The kit is copied into projects, so an update does not reach them. Nothing
here is urgent, but a project on an older copy is missing these — re-copy the
file, or apply the one-liner:

| What | Where | How |
| --- | --- | --- |
| Sideways scroll on wide tables (**the "data disappears" fix**) | `components/ui/data-table.tsx` | `scrollX` default `false` → `true`; add `scroll-thin` to the container |
| Filter chips as `Badge` | same file | the hand-rolled pill → `<Badge variant="secondary">` |
| Visible sidebar scrollbar | `components/ui/sidebar.tsx` | `no-scrollbar` → `scroll-thin` |
| `scroll-thin` itself | `app/globals.css` | copy the `@utility` block from `assets/globals.tokens.css` |
| Identity block | `components/nav-user.tsx` | new file from `ugt-nextjs-auth-setup` (projects with their own version: keep it, but check the two menu items and the two standard profile rows match) |
| Radius from the preset | `app/globals.css` | drop the org `--radius*` declarations, keep the preset's (see 4.0.0) |

`ugt-hrms` — the source of most of this kit — currently has the **old**
`scrollX = false` and the hand-rolled chip, so the table-clipping bug reported
from there is still live in that project until it syncs. Its sidebar already
matches (it removed `no-scrollbar` in `cf8cd53`, which is where the
`scroll-thin` style came from).

## 4.2.0 (2026-08-09)

**Every app now ships the same identity block.** Ported from `ugt-hrms`
`components/nav-user.tsx`, generalized — the HR-only parts (employee photo
lookup, Thai full name, emp-code / position / cost-centre rows) are gone and
come back through a single `extraRows` prop.

- New asset `ugt-nextjs-auth-setup/assets/components/nav-user.tsx`: sidebar
  footer button (avatar + name + email + `MoreVertical`) → dropdown with
  exactly two items, **บัญชีผู้ใช้** and **ออกจากระบบ** (spinner while
  pending; SSO routes to the backchannel logout, other methods to the plain
  one) → a read-only profile card.
- DESIGN.md §3 fixes the placement and both menu items, so "who am I / sign
  out" sits in the same spot in every app; §3 also describes the profile card
  (banner → avatar → name → role `Badge` → label–value rows, with **email**
  and **last login method** as the two rows every app has).
- **มติ 2026-08-09 — recorded exception**: the profile card may use per-row
  dividers (`divide-y`), which §4 forbids for detail dialogs generally. A
  profile is one short list; splitting it into sections would invent headings
  that carry no meaning. The exception is scoped to this card only.

**Badge, stated properly.** There are two components — `Badge` and
`StatusBadge` (itself `Badge variant="outline"`) — and "chip" is a *usage*, not
a third thing. DESIGN.md §4 now tables the five cases: status → StatusBadge ·
label/identifier → `Badge outline` · count → `Badge` + `tabular-nums` ·
removable filter chip → `Badge secondary` + ✕ · icon-free coloured label →
`Badge outline` + `TONE_STYLES`. All five are `rounded-full`.

**Sidebar count badges** are new to the agreement (มติ 2026-08-09): only for
menus holding **work waiting on that user**, `h-5 min-w-5 rounded-full px-1
text-xs tabular-nums`, **hidden at 0** (never a literal "0"), `99+` above 99,
and the number must come from a query already scoped to the user's
permissions — not a system-wide total.

**Radius `sm` was mislabelled.** The token comment and DESIGN called it
"chip 4px"; chips and badges are `rounded-full` and never touch it. Verified
against the registry: `sm` is for sub-elements *inside* controls — `size="xs"`
buttons, focus-ring targets that are not full buttons (a chip's ✕, the column
drag handle, the header sort button), tooltips, and sidebar menu items.
Corrected in `globals.tokens.css`, DESIGN.md §1 and the preview.

`docs/design-preview.html` grows two specimens: the five badge cases, and
NavUser + the profile card; the shell mock now shows count badges and the
NavUser footer.

## 4.1.0 (2026-08-09)

**Overflow — content must never disappear without a trace.** Reported from a
real project ("ข้อมูลใน DataTable หาย ไม่มี scroll") and confirmed in the code.

- `DataTable`: **`scrollX` now defaults to `true`.** It was `false`, and the
  wrapper applies `overflow-x-clip` in that case — so any table wider than its
  container had its trailing columns cut off with no scrollbar and no other
  hint. Passing `scrollX={false}` is still allowed but is now the opt-in, and
  `verify.mjs` fails unless a comment next to it explains why clipping is safe
  there. (The Y axis was already fine: the table has no `max-h` and the header
  is `sticky`, so it rides the page scroll.)
- **Sidebar**: the `sidebar-*` block ships `SidebarContent` with shadcn's
  `no-scrollbar` utility — verified to be `scrollbar-width: none` plus a
  hidden webkit scrollbar. A long menu scrolls but nothing tells the user
  more exists below. The block cleanup in `references/layout-shells.md` now
  requires removing it, and `verify.mjs` fails while it is present.
- DESIGN.md §3 gains an overflow table covering all four surfaces (table X,
  table Y, sidebar, topbar) with the shared principle stated once.

**Filter chips are `Badge` now.** The chips above the table were a hand-rolled
pill (`rounded-full border bg-muted px-2 py-0.5 text-xs`) — same idea as
`Badge` but a different height and font size, so filter chips did not match
badges elsewhere. They now render `<Badge variant="secondary">`, which is also
what `StatusBadge` builds on (`Badge variant="outline"` + tone + required
icon), so all three pill shapes finally come from one component.

`docs/design-preview.html`: every hard-coded `border-radius` inside the
specimen scope now uses the radius variables — the page was violating the
"ห้าม override ราย callsite" rule it teaches, and after the 4.0.0 switch to
mira's radii those literals no longer matched anything.

## 4.0.0 (2026-08-09)

**BREAKING — radius is now the preset's, not the org's** (มติ 2026-08-09).
`globals.tokens.css` no longer declares any radius; projects use what
`base-mira` ships.

The values were finally measured by running the org preset for real
(`shadcn init --preset b1ZzrZbs0`) instead of guessing — mira sets
`--radius: 0.45rem` (7.2px) and derives the rest by multiplication:

| role | mira (new) | org hand-set (old) |
| --- | --- | --- |
| chip `sm` (×0.6) | 4.32px | 4px |
| control `md` (×0.8) | 5.76px | 6px |
| card `lg` (×1) | 7.20px | 12px |
| overlay `xl` (×1.4) | 10.08px | 14px |

Small tiers were already all but identical — the real change is **cards and
dialogs get noticeably squarer** (12→7.2, 14→10.1). What the switch buys: one
knob (`--radius`) rescales everything, which the old setup could not do (its
four literals moved independently, and changing `--radius` only affected the
card tier — a trap documented in 3.4.0 and now gone).

Because the install replaces the `:root` block, three other places had to
change or projects would end up with **no** `--radius` at all and square
corners everywhere:

- `SKILL.md` merge step: explicitly carry over the preset's `--radius` line
  and leave its `@theme` radius scale untouched.
- `verify.mjs`: new check **`--radius survived the token merge`** (fails when
  the line was lost, warns when the `@theme` scale is gone), and the old
  "globals.css must not declare `--radius-2xl`" check is **removed** — the
  preset legitimately declares 2xl/3xl/4xl, so that check would have failed
  every project. The usage rule stays: source may only use the four agreed
  roles, `rounded-2xl` and up still fail.
- DESIGN.md §1 rewritten: radius comes from the preset, one knob adjusts it,
  changing it is a มติ.

All three checks were exercised against the real `globals.css` mira generated:
passes as-shipped, fails when `--radius` is stripped, fails on `rounded-3xl`.
`docs/design-preview.html` now renders the mira radii.

## 3.4.0 (2026-08-09)

**Correction to 3.3.0 — the radius comparison in that entry was wrong.**
3.3.0 said shadcn derives `sm/md/xl` from `--radius` as `−4/−2/+4px`. It does
not: shadcn derives them by **multiplication** — `sm ×0.6 · md ×0.8 · lg ×1 ·
xl ×1.4 · 2xl ×1.8 · 3xl ×2.2 · 4xl ×2.6` — with stock `--radius: 0.625rem`
giving 6 / 8 / 10 / 14px ([shadcn theming docs](https://ui.shadcn.com/docs/theming)).
The conclusion still holds and is now stated with the right numbers: our tiers
are **hand-set, not derived**, because mira puts controls at 28px, where a
derived `md` (9.6px at our `--radius`) reads as 34% radius-to-height instead
of 21%.

Two consequences that were never written down and are now in DESIGN.md §1:

- **Changing `--radius` does NOT rescale the tiers** here — it only moves
  `lg`/card, because the other three are literal values. Change a tier by
  editing its own line.
- **Only four tiers exist**: chip 4 · control 6 · card 12 · overlay 14.
  `--radius-2xl/3xl/4xl` are removed from `globals.tokens.css` — but removing
  them does **not** disable `rounded-2xl`, since Tailwind still ships its own
  defaults for those utilities. The real guard is a new `verify.mjs` check
  that fails on `rounded-2xl|3xl|4xl` in source and on any re-declaration of
  those variables in `globals.css` (tested on both failure modes plus the
  passing case).

Not verifiable from here, stated so nobody assumes: **whether the `base-mira`
preset ships its own radius values.** Styles clearly can carry radius —
public docs describe Lyra as zero-radius and Maia as larger-cornered — but
mira's exact numbers are not published, and our install replaces the whole
token block anyway, so the four tiers above are what a project actually gets
regardless of what the preset had.

## 3.3.0 (2026-08-09)

> **แก้ไขแล้วใน 3.4.0**: สูตร derive ของ shadcn ที่อ้างในหัวข้อนี้ (`−4/−2/+4`)
> ผิด — ที่ถูกคือคูณ (`×0.6 / ×0.8 / ×1.4`) ดูรายละเอียดใน 3.4.0


Two rules the agreement never stated, found by reviewing the preview page —
both are layout bugs that repeat on every form/detail screen until pinned:

- **`*` (required) must sit on the same line as its label.** Written because
  a label built as a grid container pushes the `*` onto its own row, leaving
  a red star floating above the field. DESIGN.md §4 now says the label line
  is a flex row, not a separate grid item.
- **label–value rows** (detail dialogs, summaries, data cards) are flex
  `justify-between` + `align-items:center`, column gap ≥16px, row height
  ≥~24px — a `StatusBadge` is taller than plain text and collides with the
  left-hand label without it.

Also documented, because the token file cited a section that did not exist:
**DESIGN.md §1 now carries the radius tiers** — control 6px (`--radius-md`) ·
card 12px (`--radius-lg` = `--radius`) · overlay 14px (`--radius-xl`) ·
chip 4px (`--radius-sm`), stated as **org values that deliberately replace
shadcn's derived scale** (shadcn derives sm/md/xl from `--radius` as −4/−2/+4;
the org pins tighter control corners to match mira density). Never override
per callsite.

`docs/design-preview.html` fixed for both layout rules and verified in a
browser: all three required labels keep `*` inline (18px single-line labels),
all four label–value rows are vertically centred with ≥110px column gap.

## 3.2.0 (2026-08-09)

**Fix — icon buttons in `DataTable` were two different sizes.** The four
pagination buttons hardcoded `size-8` / `h-8 w-8` (32px) while the toolbar's
column-settings button used the mira density default (28px) — visibly uneven
inside one table. All five now use `size="icon"` with no size override, and
the code carries a comment saying why an override must not come back.

Pinned so it cannot drift again (มติ 2026-08-09, ugt-core 2.2.0 carries the
stack-agnostic wording):

- DESIGN.md §4: pagination is rows-per-page + "หน้า X จาก Y" + four icon
  buttons, **no numbered page list**; icon buttons in a table are
  `size="icon"` only.
- `references/conventions.md`: new **Header cell anatomy** (drag handle →
  sortable label with direction indicator → per-column filter popover, with
  the auto-suppression rule when `serverPagination` has no `serverQuery`) and
  **Toolbar** / **Pagination** paragraphs.

`docs/design-preview.html` (repo-level) corrected to match the real
component — it had been showing a plain header row, text prev/next buttons,
and dialogs without the header/footer rules. Now shows the real header
affordances, the real pagination cluster, `FormDialog`'s bordered
header/scrollable body/bordered footer + built-in close ✕, and
`ConfirmActionDialog` deliberately without either.

## 3.1.0 (2026-08-09)

**Cross-feature consistency** — closing the gap between "the agreement was
installed" and "page 2 still looks like page 1" (ugt-core 2.1.0 carries the
stack-agnostic rules).

`ugt-nextjs-design-setup`:

- DESIGN.md §3 pins the **page-level filter bar**: inside the table's card,
  left-aligned, ordered period → org unit → status; page actions stay in
  `PageActions` top-right; control per the existing ladder and **never a bare
  `Input` as a filter** (free-text search is the DataTable toolbar's, not
  duplicated beside it).
- DESIGN.md §4: **every `<DataTable>` must pass a unique `id`** — column prefs
  persist only with one, so a table that forgets it silently behaves
  differently from every other table in the app. Turning a standard feature
  off now needs a reason that holds on any similar page.
- DESIGN.md §8: when a per-page UX choice becomes a **precedent** for later
  pages it is a มติ (§10) *and* gets written into the section it belongs to —
  the test is "must the next similar page do this too?". Plus the explicit
  reminder that design มติ live here, never in `project-context/decisions.md`.
- `scripts/verify.mjs` gains two real checks: a **fail** on any `<DataTable>`
  without an `id` or with a duplicated `id` (reported file:line), and a
  **warning** on an `<Input>` used as a search/filter control.
- `references/conventions.md`: new "Page-level filter bar" section and the
  DataTable "consistency obligations" block.
- `evals/evals.json` adds **evals 6 and 7 — a different kind of eval**: 1–5
  grade the install moment, 6–7 grade the agreement's actual purpose by asking
  for a *second* feature on a project that already has one, with no design
  instructions in the prompt, and checking the result against the first page
  (scaffold, filter placement, table config, StatusBadge, formatter) — plus
  the case where the second feature genuinely needs a new pattern and must
  record it as a precedent.

## 3.0.0 (2026-08-09)

**BREAKING — the naming + knowledge-architecture release** (pairs with
ugt-core 2.0.0). Renamed skills keep their old trigger words in the new
descriptions, so "บันทึก checkpoint" or "/ugt-nextjs-setup"-era habits still
route correctly.

Renames:

- `ugt-nextjs-setup` → **`ugt-nextjs-full-setup`** (the orchestrator no longer
  reads as a sibling of the `*-setup` children)
- `ugt-nextjs-quality-setup` → **`ugt-nextjs-test-lint-setup`** (no more
  collision with "Quality Gate", which belongs to clean-code/cicd)
- displayName → "UGT Next.js Platform"

Assets are now one convention everywhere:

- **Placeholders**: one system — `__X__` — in every asset (was 3 systems:
  `<x>`, `__X__`, `{{X}}`). Angle/mustache notation survives only as prose
  notation in docs. Verify scripts updated to match.
- **Mirror layout**: every asset sits at its destination path
  (`assets/lib/auth.ts` → `lib/auth.ts`, `assets/app/(admin)/…` →
  `app/(admin)/…`) — the auth copy table collapsed from 26 rows to a
  copy-the-tree rule + 4 exceptions.
- **Rules travel with their owner**: `.claude/rules/ugt-nextjs-{database,
  auth,ci,design}.md` are installed by their own child skill from
  `assets/rules/` — installing a single skill now also installs its rule.
- Every skill now ships both `evals.json` and `trigger-evals.json`
  (5 new trigger sets; baselines run at the release gate).

Knowledge architecture (see ugt-core 2.0.0 for the design):
`assets/state/` now ships `handoff.md` (new sections) + `model-mode.md` only;
`project-notes.md` is gone; the harness step invokes `ugt-context` to
bootstrap `docs/project-context/`; CLAUDE-block imports
`@docs/project-context/00-index.md`, tells sessions to read the relevant
context **before** entering the superpowers pipeline, to check `decisions.md`
before proposing direction changes, and to open `troubleshooting.md` before
debugging a strange error; the knowledge triage is now 4-way.

### Migration — existing v2.x projects (AI-executable; run after `/plugin update`)

1. `git mv .claude/state/checkpoint.md .claude/state/handoff.md` and
   `git mv .claude/state/mode.md .claude/state/model-mode.md`.
2. Create `docs/project-context/` by running **`ugt-context`** (existing
   codebase → scan path). Then move history into it:
   - `handoff.md` §Decisions entries → append to
     `docs/project-context/decisions.md` (keep dates/reasons verbatim), then
     delete the section; retitle sections to **In progress / Next / Open
     Questions / Done** and trim Done to ~10 rows.
   - `project-notes.md`: Error Patterns → `troubleshooting.md` · Deviations →
     `⚠ deviation` lines in `architecture.md` at the relevant section · Open
     Questions → `handoff.md` §Open Questions. Then delete
     `project-notes.md`.
   - If `docs/requirements-brief/00-overview.md` has a สถานะ column: move the
     feature rows + statuses to `docs/project-context/board.md` and drop the
     column from the overview.
3. Re-run `ugt-nextjs-full-setup`'s harness step (step 4–5 only) to refresh
   the CLAUDE.md block (new imports + rules) — project content outside the
   markers is untouched.
4. Verify: `node <plugin>/skills/ugt-nextjs-full-setup/scripts/verify.mjs`
   from the project root — it fails loudly on any leftover v2.x file.

Release gate (run before tagging): a scratch project on the v2.x layout
(checkpoint + project-notes + mode + old CLAUDE block + a brief with a สถานะ
column) fails verify with 5 actionable errors naming the migration; executing
steps 1–3 above verbatim lands it on **14/14 green**, with team content
outside the `ugt:start/end` markers untouched. A fresh harness install is
14/14 green as well.

## 2.9.3 (2026-08-05)

`ugt-nextjs-design-setup`: **company logo assets** join the kit —
`assets/brand/ube-logo-short.svg` (shell header) and `ube-logo-long.svg`
(with tagline — login/landing), both converted to `fill="currentColor"` so
CSS `color` tints them (brand blue, white-on-dark, any theme). The install
step copies them to the project's `public/brand/`, and DESIGN.md §3 gains
the usage rule (short = header, long = login/landing, ห้าม embed
logo รูปอื่น/สีเพี้ยน). Also fixes a leftover `radix-mira` mention in
conventions.md's kit inventory (missed in the 2.9.0 sweep).

## 2.9.2 (2026-08-05)

**Admin handoff becomes a standard FILE, not a chat message.** The external
setup work (Jenkins credentials/job/webhook, SonarQube projects/gate/webhook,
Keycloak client) was already surfaced with exact project-specific names — but
as a rendered table in chat, which users then had to copy for their admin
team. Now:

- New asset `ugt-nextjs-cicd-setup/assets/admin-handoff.template.md` — a
  plain-Thai, step-by-step handoff document: 1-minute overview table,
  per-system sections (exact credential IDs / project keys / Client ID /
  redirect URIs generated to match the project's settings), a fill-in
  **"ค่าที่ต้องส่งกลับ"** section the admin completes and returns (secrets
  explicitly routed to a secure channel, never into the file), and a closing
  checklist. Sections for unselected systems are deleted, not left blank;
  server-level first-project setup is an optional appendix.
- cicd-setup close-out now **writes `docs/admin-handoff.md`** into the
  project and tells the user to forward that file; chat summary is
  secondary. Raw per-system detail stays in the existing references.
- Parent `ugt-nextjs-setup` close-out: confirms the file exists with no
  `{{...}}` left; Auth-without-CI renders the Keycloak-only version.
- auth-setup (solo run, SSO client not yet created): renders its Keycloak
  request from `references/keycloak-client.md` into the same
  `docs/admin-handoff.md` (updating the section if the file already exists)
  — stays self-contained, no cross-skill file reference.

## 2.9.1 (2026-08-04)

`ugt-nextjs-design-setup`: polish from behavioral eval **iteration-2** on
the base-mira preset — both runs passed everything (verify 14/14, contrast
30/30 first-try, `next build` green with zero kit TS errors → the Base UI
port is proven on real projects; 9+ of iteration-1's 12 frictions confirmed
fixed by two agents independently). This release closes the six minor
frictions that remained, all doc-level:

- **Windows short-path is now the primary flow**, not a footnote — deep
  paths break both the shadcn CLI and Turbopack builds (MAX_PATH; junctions
  don't help): scaffold + run all CLI/build steps at a short real path,
  then move. Plus a recovery line for `--template next` dying mid-install
  (re-run init in existing-project mode after `npm install`).
- **Install order flipped: shell block BEFORE button variants** —
  `add <block>` prompts per existing file even with `--yes` (headless:
  `yes n |`), and a `y` would silently wipe just-applied variants.
- **theme-provider**: keep the preset scaffold's own file (superset of our
  asset — hotkey + disableTransitionOnChange); the asset is fallback only.
- layout-shells.md: mandatory `sidebar-*` block cleanup steps (move
  Provider composition into `app/(app)/layout.tsx`, delete demo samples,
  resolve the root `app/page.tsx` collision).
- globals.tokens.css ships `--font-heading: var(--font-sans)` and the merge
  instruction keeps preset `@layer`/`@theme` additions (cursor-pointer
  rule).
- Init step renames `package.json` `"name"` from the template's `next-app`.
- evals.json updated to the base-mira standard (eval-3's deviation fixture
  flips to radix-mira — the old standard is now the deviation under test).

## 2.9.0 (2026-08-04)

`ugt-nextjs-design-setup`: **standard base flips to `base-mira` (Base UI)**,
superseding the radix-mira มติ of the same day — the org preset
(`b1ZzrZbs0`) was deliberately authored on Base UI and the user confirmed
that intent, so the standard follows the preset rather than the other way
around. Minor bump: the shipped kit's component API changed.

- Init commands drop `-b radix` (and the docs now warn *against* adding it).
  Fallback becomes `--preset mira`. verify.mjs expects `style: "base-mira"`.
- Kit ported Radix → Base UI: `asChild` → `render` prop at 7 sites
  (combobox, data-table ×2, date-picker, truncated-text, theme-toggle) ·
  `icon-action.tsx` + `confirm-action-dialog.tsx` restored to their
  gov-boi-smart **Base UI originals** (the Radix-era `preventDefault`
  workaround on AlertDialogAction is gone — Base UI doesn't auto-close).
  Remaining kit files audited clean of Radix-only API. `grep asChild|@radix-ui`
  over assets/: 0.
- Provenance flips: gov-boi-smart (base-mira) is now the base-aligned
  reference; **ugt-hrms stays the DataTable reference but every sync now
  ports `asChild` → `render`** (recorded in conventions.md §Kit status).
- Scan checklist: `base-mira` = compliant, `radix-*` = recorded deviation.
- Historical trail kept in `docs/design-skill-draft.md` (superseded มติ
  struck through, not erased).

## 2.8.2 (2026-08-04)

`ugt-nextjs-design-setup`: the org now has its own **canonical shadcn
preset** (authored in the shadcn configurator, then verified by a live init
run) — init becomes
`printf '<name>\n' | npx shadcn@latest init --preset b1ZzrZbs0 -b radix --template next --pointer --yes`
for greenfield (scaffolds the Next app too — no separate create-next-app),
same command without `--template next` for existing projects. Verified
output: `radix-mira` + `lucide` + `rtl:false` + menu default/solid/subtle +
neutral. Two live findings baked into the docs: **`-b radix` is mandatory**
(the preset code was authored on the Base UI side — without the flag it
yields `base-mira` and the Radix kit breaks), and `--template next` has a
project-name prompt `--yes` doesn't cover (hence the `printf` pipe). The
generic `--preset mira -b radix` invocation stays documented as fallback.
Post-init verification expanded: `rtl: false` + `menuColor: "default"` join
the lucide check. DESIGN.template §1 now records the menu agreement
(Default / Solid / Subtle) from the preset.

## 2.8.1 (2026-08-04)

`ugt-nextjs-design-setup` hardening from the first behavioral eval run
(2 evals × with/without-skill on real scaffolds; with-skill passed 14/14
assertions + verify + contrast + build in both — but only by improvising
past 12 frictions, all now fixed; baselines scored 2/14, confirming the
skill carries org knowledge, not general competence):

- SKILL.md: the real init invocation (`npx shadcn@latest init --preset mira
  -b radix` — "style radix-mira" is not a CLI flag) + force `iconLibrary`
  to lucide and strip `@hugeicons/*` (the mira preset's default) + Windows
  MAX_PATH/`subst` hazards note.
- **`form` → `field`**: radix-mira's `form.json` is an empty stub — install
  list, template, rules, and conventions now all say `ui/field`
  (still zod + react-hook-form).
- npm deps pinned (`@tanstack/react-table@^8` — v9 renames the kit's API —
  `date-fns@^4`) + `react-hook-form zod lucide-react` added explicitly.
- `button-variants.md` now ships the **`field` variant** (kit date-picker
  needs it; today's registry button dropped it — was a build breaker) and
  the template sanctions it.
- `globals.tokens.css`: dark `--ring`/`--sidebar-ring` now derive from
  `{{PRIMARY_DARK}}` instead of hardcoded indigo.
- interview.md documents the **brand-color AA trap** (mid-lightness brand +
  "dark primary lighter" + near-white foreground can't all pass AA) with the
  sanctioned fix: flip dark `--primary-foreground` to a dark brand tone, as
  a มติ.
- Exact `app/layout.tsx` next/font snippet now in SKILL.md (the old text
  pointed at a template section that had no snippet) + **root
  `TooltipProvider` requirement** (radix-mira Tooltip doesn't self-wrap;
  sidebar tooltips crash prerender without it).
- New asset `components/theme-provider.tsx` (next-themes wrapper — was
  improvised in both eval runs).
- `lib/format.ts`: locale now defaults to `'th'` (ไทยล้วน projects no longer
  pass it on every call).
- conventions.md: added ถูก/ผิด code-example pairs for the five most common
  violations (StatusBadge, DataTable, formatter, size default, IconAction).

## 2.8.0 (2026-08-04)

`ugt-nextjs-design-setup`: the **full-option DataTable** lands, closing
2.7.0's known gap — built and tested inside ugt-hrms first (PR #166: 10 new
tests, components/ui 62/62, tsc + next build clean), then synced back as the
asset (de-i18n'd to Thai literals like the rest of the kit):

- Server mode done right: new `serverQuery` prop — sort/filter/paginate all
  through URL state (`lib/table-query.ts`); legacy `serverPagination`-only
  tables get per-column filter UI suppressed (partial-page guard).
- Per-column popover filter + active-filter chips (per-chip ✕ + clear-all),
  multi-column AND.
- Column drag-reorder (dependency-free, keyboard-accessible) + hide/show
  (Settings2 popover) + localStorage prefs via the new `id` prop
  (`lib/table-prefs.ts`) + reset-to-default.
- Page size default 10, options 10/20/50; `lib/pagination.ts` upgraded to
  the HRMS-adapted version (`parsePageSize` clamps URL-supplied sizes to the
  option set).
- Trigger-evals baseline recorded: 42/42 primary across 3 judges
  (text-isolated, 7 distractors) — no description change needed.

## 2.7.0 (2026-08-04)

New skill: **`ugt-nextjs-design-setup`** — the design agreement installer,
rendering ugt-core's new `contracts/design.md` (1.5.0) for Next.js. Extracted
from `ugt-hrms` (the reference implementation) and `gov-boi-smart` (whose git
history — two full rethemes — is the reason the skill runs *before* UI
exists). Full evidence trail: `docs/design-skill-draft.md` in this repo.

- Interview (defaults on every question, "ตามมาตรฐานทั้งหมด" fast path) →
  generated `docs/DESIGN.md` with a dated decision log; existing projects get
  scan → draft agreement → recorded Deviations (migrate/grandfather) instead
  of a silent reformat.
- Installs: shadcn `radix-mira` config, org tokens (indigo primary,
  semantic-6 `--status-*` set, WCAG-AA-verified — `scripts/check-contrast.mjs`
  re-verifies on every color change), Inter + Noto Sans Thai, app shell from
  shadcn blocks, the org UI kit (DataTable, FormDialog, StatusBadge,
  IconAction, ConfirmActionDialog, date pickers, combobox, detail-*,
  query-state, merged `lib/format.ts`), and the `.claude/rules/
  ugt-nextjs-design.md` harness rule so the agreement outlives the session.
- "sync ข้อตกลง design" mode: after a plugin update, diff the project's
  DESIGN.md against the contract and record มติ — never overwrite.
- Plugin now declares the **shadcn MCP server** (`.mcp.json`) so component/
  block installs browse the live registry.
- `ugt-nextjs-setup` (parent): install order is now Database → Quality →
  **Design** → Auth → CI — design must precede auth because auth generates
  themed pages.
- Known gap, deliberate: the shipped `ui/data-table.tsx` is the HRMS build;
  the full-option merge (URL-state server mode + per-column popover filter +
  dnd + localStorage prefs) is being built and tested inside ugt-hrms first
  (มติ 2026-08-04) and will replace the asset when it lands.

Real-deployment feedback: `ugt-nextjs-auth-setup` shipped the RBAC data model
and the permission-check plumbing, but never the pages to actually manage it.
Confirmed while investigating — `references/rbac.md`'s own documented
first-admin bootstrap flow redirects to `/admin/users`, and the shipped
`admin-setup-action.ts` redirected to `/` with an "adjust to your admin
landing page" comment, because the page it was supposed to land on never
existed.

- New route group `(admin)` — `/admin/users` (list + inline role assign,
  can't change your own role), `/admin/roles` (create/edit/delete + a
  permission-checkbox grid grouped by `permission.group`; the system
  `Administrator` role can't be edited or deleted), `/admin/audit-logs`
  (read-only `ActivityLogs` viewer). All three follow the existing
  session → permission → action → audit-log Server Action contract; the
  section layout hides nav items per-permission (UI only — every action still
  gates server-side).
- New `lib/permissions-sync.ts` (`syncPermissionsIfNeeded`) — `rbac.md`
  already recommended this upsert-on-request pattern for permissions added to
  `ALL_PERMISSIONS` after bootstrap; it was never actually shipped as code.
  Wired into `app/(admin)/layout.tsx`.
- Bootstrap now redirects to the real `/admin/users` instead of `/` (both
  `admin-setup-action.ts` and the setup page's "already initialized" check).
- `scripts/verify.mjs` — checks the three admin pages exist, the bootstrap
  redirect isn't still pointing at `/`, `syncPermissionsIfNeeded` is both
  defined and called, and both role mutations check `isSystem`.
- `references/rbac.md` — new "Ongoing admin pages" section (route table +
  guards); the permission-sync section now points at the shipped file instead
  of describing a "recommended pattern" that didn't exist yet.
- Scope, decided with the user rather than assumed: users page is list +
  assign-role only, no "create user" button (SSO/LDAP auto-provision on
  login; Local method has no self-registration in this skeleton either — a
  known gap, out of scope here) · roles page gets full CRUD with a permission
  checkbox grid · audit-log viewer included.

## 2.5.0 (2026-08-03)

Feedback from a real deployment: local `docker compose` testing had no env
file to read, and the admin handoff at the end of setup was three separate
documents instead of one table with this project's actual names.

- **`ugt-nextjs-cicd-setup`** — new step 4.5 creates local `.env` (mirrors
  `.env.local` + `APP_PORT=<prod port>`) and `.env.dev` (+ `APP_PORT=<dev
  port>`), both gitignored, so `docker compose up` / `docker compose -f
  docker-compose.dev.yml --env-file .env.dev up` work locally without a
  Jenkins deploy. `docker compose` auto-loads a file literally named `.env` —
  it never reads `.env.local`, which is why this was missing.
- New `references/external-config-handoff.md` — the Jenkins credential list,
  SonarQube project/gate setup, and Keycloak client request, previously three
  separate reference docs, collapsed into **one table** using the same
  `__PROJECT_NAME__`-style placeholders the skill already substitutes
  elsewhere, so the admin gets exact names instead of a prose summary. Wired
  into `ugt-nextjs-setup`'s close-out step as the mandated final output.
- `scripts/verify.mjs` — new check that `.env`/`.env.dev`/`.env.local` are
  gitignored and `.env.example` isn't accidentally caught by a broad
  `.env*` rule.
- **`ugt-nextjs-auth-setup`** — `assets/env.example` gains a commented-out
  `NODE_TLS_REJECT_UNAUTHORIZED=0` for local dev against an internal-CA
  Keycloak/LDAP (the gotcha was already documented in
  `references/keycloak-client.md` but never actually in the template).
  Off by default, loud warning against ever uncommenting it in `.env`/the
  prod Jenkins credential — it disables TLS verification process-wide, not
  just for one connection.

## 2.4.0 (2026-08-03)

Harness refresh for `/ugt-mode auto` (ugt-core 1.4.0). Existing projects: run
`/ugt-nextjs-setup` again to refresh the block, or just run `/ugt-mode auto`
directly — the skill rewrites `mode.md` wholesale anyway.

- `assets/state-mode.md` + `assets/CLAUDE-block.md` — preset list becomes
  `easy|default|god|auto`; dispatch wording broadened to cover Agent Teams
  teammate spawns ("dispatching a subagent or spawning a teammate")
- `scripts/verify.mjs` — the `Current mode:` check accepts `auto`

## 2.3.0 (2026-08-03)

Two new triage rows in the CLAUDE.md block. Existing projects: run
`/ugt-nextjs-setup` again to refresh the block (project content outside the
markers is untouched, as always).

- `assets/CLAUDE-block.md` — "Which skill, when" gains a **read-only work**
  row: answering questions about code/docs/config goes directly, with an
  explicit note that superpowers' "1% chance → must invoke" rule does not
  apply to read-only work. Without this, the always-loaded `using-superpowers`
  dispatcher could pull `brainstorming` into a plain question and start a
  design interview nobody asked for (observed in practice; the existing
  "small task" row only covered edits, not reads).
- `assets/CLAUDE-block.md` — "Which skill, when" also gains a
  **requirements-folder** row: starting from a requirements folder to produce
  the committed per-feature brief routes to `/ugt-requirements` (new in
  ugt-core 1.2.0), then features go to the superpowers pipeline one at a
  time. The read-only row deliberately excludes brief *production* — a quick
  question about the docs stays direct, producing the brief artifact is the
  skill's job.

## 2.2.0 (2026-07-30)

Harness additions for the `/ugt-mode` skill (ugt-core 1.1.0) plus a task-triage
rule. Existing projects: run `/ugt-nextjs-setup` again to refresh the CLAUDE.md
block, or just run `/ugt-mode default` once (creates `mode.md`; the block
import can wait for the next refresh).

- `assets/state-mode.md` — new skeleton → `.claude/state/mode.md` (create once,
  never overwrite; owned by `/ugt-mode` afterwards): per-task-type subagent
  model routing, shipped on the `default` preset
- `assets/CLAUDE-block.md` — new "Model mode" section importing
  `@.claude/state/mode.md`, and a triage row in "Which skill, when": small
  tasks (typo, doc edit, config value, one-line fix at a known spot) go
  directly, skipping the superpowers pipeline — auto-loading rules still apply
- `ugt-nextjs-setup` — `state-mode.md` added to the step-4 asset table;
  `scripts/verify.mjs` checks `mode.md` declares a valid mode (warn-only when
  absent, so pre-2.2.0 installs stay green)

## 2.1.1 (2026-07-30)

- ugt-nextjs-setup: document coexistence with Next.js 16.3+ auto-generated
  agent files — next dev upserts its own managed block (BEGIN:nextjs-agent-rules
  + @AGENTS.md import) into CLAUDE.md preserving content outside it (verified
  against the Next.js ai-agents guide); commit that block, never edit it, and
  never nest the ugt block inside it. Opt-out: agentRules: false.

## 2.1.0 (2026-07-30)

New skill **`ugt-nextjs-pitfalls`** — production-bug lessons for feature code,
distilled from the source HRMS project's bug-fix log and conventions
(audit: `docs/app-patterns-audit.md`). Auto-loads via `paths` on
`app/`, `components/`, `lib/` edits, same mechanism as `ugt-nextjs-clean-code`.

- `references/dates-timezones.md` — Date→string binding for MSSQL SP/linked-server
  params (`toLocalYmd`), anchor-matched getters, wall-clock vs instant
  formatters, CE-storage + BE-display via central helpers
- `references/data-fetching.md` — React Query × Server Actions
  (`revalidatePath` doesn't touch the client cache), dataset filters re-fetch,
  stable `data` identities (`'use no memo'` × React Compiler), basePath client
  fetch prefix, API envelope
- `references/hardening.md` — server-side scope overrides, ownership =
  identity match, fail-closed gates, cron date-guards, DTO literal unions,
  effective-value pre-fill, i18n checklist
- `scripts/verify.mjs` — greppable checks (bare `/api` fetch, empty
  `SelectItem`, swallow-catches, inline `±543`, anchor-suspect serializers,
  selectable tables missing `getRowId`)

Curation note: items already covered by framework defaults/docs (RSC-by-default,
RHF default modes, `getRowId`, adjust-during-render) were kept only as one-line
Quick Rules or dropped — see the audit's curation pass.

Trigger evals: `evals/trigger-evals.json` — 20 queries × 3 judges; iteration 0
= 54/60 (missing "wrong row selected" / "stale code after edit" symptoms in
the description), description fixed, iteration 1 = 60/60.

Also in this release — `ugt-nextjs-auth-setup/references/auth-flows.md`
addenda from the same audit: resolve SSO identity by `ldapUsername` (existing
row's email wins; `unable_to_create_user` on email drift),
`accountLinking.requireLocalEmailVerified: false` for sync-created users, and
don't enforce `ldaps://` for private-network AD (3 new gotcha-table rows).

## 2.0.0 (2026-07-29)

**Breaking at the plugin level, invisible at the project level.** The
stack-agnostic pieces moved to the new `ugt-core` plugin, which this plugin now
declares as a dependency — `/plugin update` pulls it automatically, and target
projects need **zero** changes (`/ugt-checkpoint` keeps its name; installed
CLAUDE.md/rules/state files stay valid untouched).

Moved out (now in ugt-core v1.0.0): `skills/ugt-checkpoint/`,
`hooks/hooks.json`, `scripts/audit-log.mjs`,
`references/org-managed-settings.md` (→ `ugt-core/contracts/`). The only
content edit in the remaining six skills is the IT-doc pointer in
`ugt-nextjs-setup` step 4.6.

If you consume this plugin by folder copy (README mode B), copy **both**
`plugins/ugt-core` and `plugins/ugt-nextjs-platform` from now on.

## 1.0.0 (2026-07-27)

First release. Extracted from a production HRMS project, rebuilt clean — no
references to the source project's private skills or Copilot-era instructions.

### Skills (7)

- `ugt-nextjs-setup` — parent installer: one interview batch, routes
  Database → Quality → Auth → CI, installs the harness layer, refuses
  non-Next.js stacks instead of adapting
- `ugt-nextjs-database-setup` — SQL Server via Prisma: naming conventions, audit
  columns, reserved-word guard, raw-SQL/SP patterns, migration playbooks
- `ugt-nextjs-quality-setup` — Vitest (JUnit + lcov) / ESLint / Prettier /
  husky + lint-staged, wired to the exact script names the pipeline calls
- `ugt-nextjs-auth-setup` — Better Auth SSO (Keycloak) / AD-LDAP / Local + RBAC +
  audit logging + first-admin bootstrap; every production redirect-loop and
  cookie gotcha documented with its fix
- `ugt-nextjs-cicd-setup` — 10-stage Jenkins pipeline, SonarQube Quality Gate
  (blocking), OWASP DC, two-image Docker deploy, `/api/health` route
- `ugt-nextjs-clean-code` — pass the Quality Gate on the first scan; auto-loads on
  `.ts`/`.tsx` edits via `paths` frontmatter
- `ugt-checkpoint` — team state in `.claude/state/` + the 3-way knowledge
  triage (project notes / PR upstream / auto memory)

### Harness layer (installed into target projects by ugt-nextjs-setup)

- `CLAUDE.md` block between `<!-- ugt:start/end -->` markers (updatable
  without touching team content), importing team state via `@`
- `.claude/rules/ugt-{database,auth,ci}.md` with `paths:` frontmatter —
  loaded by the runtime when matching files are touched
- `.claude/state/{checkpoint,project-notes}.md` skeletons (created once,
  never overwritten)
- `.claude/settings.json` — marketplace + plugin declaration so cloning
  prompts the install, plus a starter deny/ask permission set

### Plugin-level

- Audit-trail hooks (`PostToolUse` / `PostToolUseFailure` /
  `InstructionsLoaded`) appending metadata-only JSONL to `.claude/logs/` —
  deliberately never logs file contents or tool inputs
- `scripts/verify.mjs` per skill — each Verification Checklist as one
  runnable command; tested against a real production project and negative cases
- `evals/evals.json` per skill — 18 cases / 118 assertions; iteration-1
  results: with-skill 34/34 (100%) vs without-skill 18/34 (53%)
- `evals/trigger-evals.json` — 20-query trigger-boundary regression set;
  baseline 60/60 correct
- `references/org-managed-settings.md` — the hard-boundary deployment guide
  for IT (managed-settings.json), stated plainly as outside the skill's reach
