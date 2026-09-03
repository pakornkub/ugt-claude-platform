---
name: ugt-nextjs-upload-setup
description: >
  Use when a project needs users to attach files — "อัปโหลดไฟล์", "แนบเอกสาร",
  "แนบใบเสร็จ", "เก็บไฟล์แนบของคำขอ", "ต้องสแกนไวรัสก่อนเก็บ" — installing the
  Docker-volume storage layer, ClamAV scanning that fails closed, the
  `Attachments` table, an upload Route Handler and a permission-guarded
  download route, plus the compose/Dockerfile changes the volume needs.
  Reach for it too on these symptoms: uploaded files vanishing after a deploy
  (stored inside the container instead of on a volume), uploads failing around
  1 MB (Server Action `bodySizeLimit`), a 413 that never reaches the app
  (reverse-proxy body limit), files readable by anyone who knows the URL
  (served from `public/`), or an uploaded `.svg`/`.html` running as script on
  your own domain.
  Needs the database and auth installed first (the table, the permissions and
  the audit log all come from there), and the org UI kit from
  ugt-nextjs-design-setup (the upload component imports `ui/icon-action` and
  `lib/format`). Not for exporting/downloading generated files such as Excel
  reports — that is ordinary feature work with no storage.
---

# UGT Upload Setup — attachments on a volume, scanned, and guarded

## 1. Overview

> **ต้องติดตั้งก่อน**: `ugt-nextjs-database-setup` (ตาราง `Attachments` +
> Prisma client) → `ugt-nextjs-auth-setup` (session + permission ที่ด่าน
> ดาวน์โหลดใช้) → `ugt-nextjs-design-setup` (ตัวอัปโหลดเรียก `ui/icon-action`).
> ขาดตัวไหนให้หยุดแล้วไปติดตั้งตัวนั้นก่อน — ลำดับใน `ugt-nextjs-full-setup`
> รับประกันให้อยู่แล้ว

**Nothing was extracted here.** Unlike the other skills, `ugt-hrms` has no
upload path at all — no `formData()` handler, no volume, no storage dependency,
only CSV/XLSX *exports*. This skill is built from the org's three decisions
(2026-08-09) rather than from an existing implementation, so treat its defaults
as a starting point that the first real project will sharpen.

| Decision | Answer |
| --- | --- |
| Where files live | **Docker volume** (not the container, not `public/`, not the DB) |
| Which types | **All types, virus-scanned** — scan เป็น default; ถอดได้เฉพาะผ่านคำถาม §3 Q5 และต้องบันทึกเป็น deviation |
| Downloads | **Permission-checked on every request** |

## 2. Org Standards

1. **Scan before the volume.** Bytes are scanned in memory; an infected file is
   never written to disk, not even briefly.
2. **Fail closed.** Scanner unreachable, timing out, or answering anything other
   than a definite *clean* → the upload is refused (503). A scanner that lets
   files through when it is broken is worse than no scanner, because everyone
   believes files are checked.
3. **The database row is the source of truth.** The path is generated
   (`yyyy/mm/<uuid>`, no extension); the user's filename is stored for display
   only and never becomes part of a path.
4. **Never `public/`.** Everything there is served with no auth. Files live on
   the volume specifically so the download guard cannot be bypassed.
5. **Download guard order**: session → permission → *per-record* scope →
   `scanStatus === 'clean'` → stream → audit log. Missing and not-yours both
   answer **404**.
6. **Always `application/octet-stream` + `Content-Disposition: attachment` +
   `nosniff`.** A virus-free `.svg` or `.html` served inline is stored XSS on
   your own domain. "All types allowed" makes this rule non-negotiable.
7. **Soft delete.** `IsDeleted = 1` on the row; the bytes go later, via
   retention — an accidental delete stays recoverable.
8. **Upload through a Route Handler**, never a Server Action (`bodySizeLimit`
   defaults to 1 MB and fails opaquely above it).

## 3. Interview

1. **Max file size** (default 25 MB) — and does a reverse proxy sit in front?
   Its body limit must be raised to match, or large uploads die before the app
   sees them.
2. **Which records get attachments**, and **how the attachment links to them** —
   the file's path is always a column in `Attachments`, but the *relationship*
   is business logic, not a default. Polymorphic `entityType`+`entityId` (what
   the skeleton ships) · a real FK per owning type · a single column on the
   business table. Trade-offs and how to choose →
   `references/attachment-linking.md`. Record the choice in
   `docs/project-context/decisions.md`.
3. **Who may upload / download** — two permissions are added
   (`files:create`, `files:read`); decide which roles get them.
4. **Retention** — how long a soft-deleted attachment's bytes should be kept.
   **บอกตรง ๆ ตอนถาม**: ยังไม่มี cleanup job ให้ติดตั้ง (รอมติองค์กรว่า
   background job รันที่ไหน — `docs/backlog.md` ข้อ 3 ของ platform) — คำตอบนี้
   ถูก**บันทึกไว้ใน `docs/project-context/decisions.md`** เพื่อให้ job ที่จะมา
   ทีหลังใช้ ไม่ใช่ config ที่มีผลวันนี้ อย่าสัญญาว่าไฟล์จะถูกกวาดอัตโนมัติ
5. **Virus scan — เอาไหม** (default: **เอา** ตามมติองค์กร 2026-08-09) — ถามพร้อม
   เงื่อนไข infra ที่ทำให้บางโปรเจคเอาไม่ได้จริง: clamav กิน **RAM ~2 GB** และ
   boot แรกต้อง**ดาวน์โหลด signature DB ~1 GB จากอินเทอร์เน็ต** (host องค์กรที่
   ไม่มี outbound internet ต้อง preload DB เอง — §7) ตอบ "ไม่เอา" ได้ แต่ต้องรับ
   เงื่อนไขครบ 3 ข้อ ไม่ใช่แค่ข้ามขั้นตอน:
   - ตัดโค้ด/ config ตาม marker **`[SCAN]`** ทุกจุด: ไม่ copy `lib/virus-scan.ts`,
     ลบบล็อก scan ใน `app/api/files/route.ts` (เปลี่ยน `scanStatus` เป็น
     `'unscanned'` ตาม marker), แก้ด่านดาวน์โหลดใน `[id]/route.ts` เป็น
     `=== 'infected'`, ตัด env `CLAMAV_*`, ตัด service clamav + `depends_on` +
     `clamav-db` ใน compose/Jenkinsfile, ข้าม `pingScanner()` ใน §4.6 —
     **คอลัมน์ `scanStatus` ในตารางคงไว้** (retrofit ทีหลังไม่ต้อง migrate)
   - บันทึก `⚠ deviation:` ใน `docs/project-context/architecture.md` — *ไฟล์แนบ
     ไม่ผ่าน virus scan (มติโปรเจค <วันที่>) ต่างจาก org standard* + เหตุผล
   - เพิ่มงานค้าง "retrofit virus scan" ใน `docs/project-context/board.md`
     (สถานะ `⏳ — <รออะไร>`) — การถอด scan คือการติดหนี้ ไม่ใช่การปิดเรื่อง

## 4. Setup steps

### 4.1 Copy assets (they mirror their destinations)

| Asset | Destination |
| --- | --- |
| `assets/lib/storage.ts` | `lib/storage.ts` |
| `assets/lib/virus-scan.ts` | `lib/virus-scan.ts` — **[SCAN]** ข้ามทั้งไฟล์เมื่อไม่เอา scan (§3 Q5) |
| `assets/lib/attachment-access.ts` | `lib/attachment-access.ts` — **must be implemented**, it denies everything by default |
| `assets/app/api/files/route.ts` | `app/api/files/route.ts` (upload) |
| `assets/app/api/files/[id]/route.ts` | `app/api/files/[id]/route.ts` (download) |
| `assets/components/file-upload.tsx` | `components/file-upload.tsx` |
| `assets/prisma/schema-attachment.prisma` | paste INTO `prisma/schema.prisma` |
| `assets/env.example` | append to `.env.example` (+ real values in `.env.local`) — **substitute the interviewed max size** into `UPLOAD_MAX_BYTES` here and in the compose default (§3 Q1's answer has no other landing spot) |
| `assets/rules/ugt-nextjs-upload.md` | `.claude/rules/ugt-nextjs-upload.md` |
| `assets/compose-and-dockerfile.snippet.md` | **not copied** — applied to the Dockerfile + both compose files in §4.4 (after cicd-setup has written them) |

**Placeholders**: `__PROJECT_NAME__` (in the compose snippet — bind-mount
paths + container names). `verify.mjs` checks nothing is left.

**i18n wiring (every project, since `ugt-nextjs-design-setup` 4.46.0):**
`components/file-upload.tsx` calls `useTranslations()` unconditionally since
this phase, and both `app/api/files/**/route.ts` handlers return bare `code`
values (มติ 2.6) that the widget translates through the same catalog — so the
`upload` catalog **must** be registered before the widget renders:

1. Copy `assets/messages/upload.th.ts` and `assets/messages/upload.en.ts` to
   the project's `messages/` directory.
2. Edit the project's `i18n/messages.ts`:

   ```ts
   import { uploadEn } from '@/messages/upload.en';
   import { uploadTh } from '@/messages/upload.th';

   type UploadCatalog = {
     [Namespace in keyof typeof uploadTh]: Record<keyof (typeof uploadTh)[Namespace], string>;
   };

   export const messages: Record<AppLocale, { kit: KitCatalog; upload: UploadCatalog /* + auth, mail if installed */ }> = {
     th: { kit: kitTh, upload: uploadTh },
     en: { kit: kitEn, upload: uploadEn },
   };
   ```

Skipping step 2 fails silently — `FileUpload` still builds, but every label
renders its raw key path (`upload.fileUpload.attachButton`). `check-i18n.mjs`
catches it (`every catalog in messages/ is registered in i18n/messages.ts`).

### 4.2 Env schema

Add to `lib/env.ts` (server block):

```ts
STORAGE_ROOT: z.string().default('/app/storage'),
UPLOAD_MAX_BYTES: z.string().default('26214400'),
// [SCAN] — สามตัวนี้ตัดเมื่อไม่เอา virus scan (§3 Q5)
CLAMAV_HOST: z.string().default('clamav'),
CLAMAV_PORT: z.string().default('3310'),
CLAMAV_TIMEOUT_MS: z.string().default('30000'),
```

### 4.3 Permissions

In `lib/permissions.ts`, plus their `ALL_PERMISSIONS` entries (group: `ไฟล์แนบ`):

```ts
FILES_CREATE: 'files:create',
FILES_READ:   'files:read',
```

### 4.4 Infrastructure

Apply `assets/compose-and-dockerfile.snippet.md` to the Dockerfile and **both**
compose files: the mount point owned by `nextjs`, the `/home/docker02/appdata` bind
mounts (never a named volume — cicd contract §2.8), the clamav service with a
5-minute `start_period`, the persisted signature DB, and `storage` +
`clamav-db` added to the Jenkinsfile `[VOLUME]` `mkdir -p` line
(ส่วนที่มาร์ค `[SCAN]` ในตัว snippet — ตัดเมื่อไม่เอา scan ตาม §3 Q5).
These files are written by cicd-setup — when running under full-setup, this
step waits until after cicd-setup and runs as a close-out.

### 4.5 Handoff to the admin team

Append the snippet's §3 bullets (volume backup · deleting the host dir ·
clamav RAM · reverse-proxy body limit) to `docs/admin-handoff.md` — create the
file from cicd-setup's template if it does not exist yet. The checklist below
fails without it.

### 4.6 Health + migrate

Add the scanner to `/api/health` so a dead clamd is visible before users find
it (`pingScanner()` from `lib/virus-scan.ts`) — [SCAN] ข้ามเมื่อไม่เอา scan —
then:

```bash
npx prisma migrate dev --name add-attachments && npx prisma generate
```

## 5. Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| Scan in memory, then write | Write first and scan after |
| Refuse on scanner error (503) | Treat "scanner down" as clean |
| Generated `yyyy/mm/<uuid>` paths | Any path built from `file.name` |
| Serve through the guarded route | Anything under `public/` |
| `octet-stream` + `attachment` + `nosniff` | Inline serving of user files |
| 404 for both missing and forbidden | 403, which confirms the id exists |
| Implement `canReadAttachment` from session identity | `!canSeeAll`, or leaving the deny-all skeleton in place |
| Route Handler for upload | Server Action (1 MB body cap) |

## 6. Verification Checklist

```bash
node <skill-dir>/scripts/verify.mjs
```

Then by hand — these are the ones that catch real breakage:

- [ ] [SCAN] Upload the [EICAR test string](https://www.eicar.org/download-anti-malware-testfile/)
      → refused with `FILE_INFECTED`, **no file on the volume**, audit row written
- [ ] [SCAN] Stop the clamav container → upload is refused with 503, not accepted
- [ ] [SCAN-off only] `docs/project-context/architecture.md` has the
      `⚠ deviation` line and `board.md` has the retrofit row (§3 Q5)
- [ ] Upload a file, `docker compose down && up -d`, download it again → still there
- [ ] Call the download URL while logged out → 401; as a user without access → **404**
- [ ] Upload an `.svg` containing `<script>` → downloads as a file, never renders
- [ ] Upload something just over `UPLOAD_MAX_BYTES` → clean 413 from the app
      (if the proxy answers instead, raise its limit)
- [ ] `canReadAttachment` no longer returns `false` for every case
- [ ] `docs/admin-handoff.md` mentions the storage-dir backup and that
      deleting the host dir deletes every attachment (verify.mjs greps this)
- [ ] The attachment→record linking pattern is recorded in
      `docs/project-context/decisions.md` (polymorphic / FK / single column),
      not left as "whatever the skeleton did"
- [ ] th+en projects: `node <ugt-nextjs-design-setup skill dir>/scripts/check-i18n.mjs .`
      reports 0 failed, and the attach/upload widget's labels + **upload** error
      toasts show English text after switching locale (download errors return a
      bare `code` from the guarded route — a plain `<a href>` navigation renders
      that JSON as-is, no toast; the `FORBIDDEN_DOWNLOAD`/`NOT_FOUND`/
      `FILE_NOT_AVAILABLE` catalog keys are reserved for a project that fetches
      downloads via JS and surfaces them itself)

## 7. Troubleshooting — upload โดน `SCANNER_UNAVAILABLE` (field report 2026-08-26)

กติกาไล่ปัญหา: **สาเหตุจริงอยู่ใน log ของ container แอปเสมอ** —
`app/api/files/route.ts` เขียน `virus scan unavailable <สาเหตุ>` ทุกครั้งก่อน
ตอบ 503 อ่านบรรทัดนั้นก่อน อย่าเดาจาก `docker ps`:

```bash
docker logs <app-container> 2>&1 | grep "virus scan unavailable"
```

สองกับดักที่ทำให้คนไล่ผิดทาง (เจอทั้งคู่ใน field report):

- **toast ในหน้าเว็บไม่ใช่ log** — ผู้ใช้เห็นแค่ข้อความแปลของ
  `SCANNER_UNAVAILABLE` (จงใจไม่บอกรายละเอียด กันข้อมูล infra รั่ว)
- **clamav "healthy" ≠ แอปต่อถึง** — healthcheck (`clamdscan --ping`) รัน
  *ภายใน* container ตัวเอง พิสูจน์แค่ clamd มีชีวิต ไม่ได้พิสูจน์เส้นทาง
  network จากแอป

| ข้อความหลัง `virus scan unavailable` | สาเหตุ | ทางแก้ |
| --- | --- | --- |
| `getaddrinfo ENOTFOUND clamav` | แอป resolve ชื่อ service ไม่ได้ — รัน `npm run dev` นอก docker, อยู่คนละ compose network, หรือ key ของ service ไม่ได้ชื่อ `clamav` (DNS ใช้ชื่อ service ไม่ใช่ `container_name`) | dev นอก docker: publish `3310:3310` + `CLAMAV_HOST=localhost` ใน `.env` เครื่องตัวเอง · prod: ให้ app กับ clamav อยู่ network เดียวกัน / แก้ `CLAMAV_HOST` ให้ตรงชื่อ service |
| `connect ECONNREFUSED` | clamd ยังไม่เปิด port — boot แรกกำลังโหลด signature DB (~1 GB, หลายนาที) หรือ **host ไม่มี outbound internet ทำให้ freshclam โหลด DB ไม่ได้เลย** — container จะ running ค้างแบบไม่มี error แต่ clamd ไม่ listen ถาวร | ดู `docker logs <clamav>`: มี freshclam error → เปิดทางไป `database.clamav.net` หรือ preload ไฟล์ `.cvd` (main/daily/bytecode) ใส่ `/home/docker02/appdata/<project>/clamav-db` แล้ว restart · แค่ยังโหลดอยู่ → รอจน STATUS เป็น `(healthy)` |
| `clamd timeout` | scan ไม่เสร็จใน `CLAMAV_TIMEOUT_MS` (ไฟล์ใหญ่/host ช้า/clamd กำลัง reload DB) | เพิ่ม `CLAMAV_TIMEOUT_MS` |
| `INSTREAM size limit exceeded` | ไฟล์ใหญ่กว่า `StreamMaxLength` ของ clamd (**default 25 MB**) — โผล่ทันทีที่โปรเจคขยับ `UPLOAD_MAX_BYTES` เกิน 25 MB | ตั้ง `StreamMaxLength` ใน `clamd.conf` ให้ ≥ `UPLOAD_MAX_BYTES` (mount ไฟล์ conf ทับใน service clamav) แล้ว recreate |

พิสูจน์เส้นทาง network จากในแอปตรง ๆ (image ไม่มี `nc` ก็ใช้ node ได้):

```bash
docker exec <app-container> node -e "require('net').createConnection({host:process.env.CLAMAV_HOST,port:process.env.CLAMAV_PORT}).on('connect',()=>{console.log('CONNECT OK');process.exit(0)}).on('error',e=>{console.log('FAIL:',e.message);process.exit(1)})"
```
