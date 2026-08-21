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

**Nothing was extracted here.** Unlike the other skills, `ugt-hrms` has no
upload path at all — no `formData()` handler, no volume, no storage dependency,
only CSV/XLSX *exports*. This skill is built from the org's three decisions
(2026-08-09) rather than from an existing implementation, so treat its defaults
as a starting point that the first real project will sharpen.

| Decision | Answer |
| --- | --- |
| Where files live | **Docker volume** (not the container, not `public/`, not the DB) |
| Which types | **All types, virus-scanned** |
| Downloads | **Permission-checked on every request** |

## 2. Org standards

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
4. **Retention** — how long a soft-deleted attachment's bytes are kept before
   the cleanup job removes them.

## 4. Setup steps

### 4.1 Copy assets (they mirror their destinations)

| Asset | Destination |
| --- | --- |
| `assets/lib/storage.ts` | `lib/storage.ts` |
| `assets/lib/virus-scan.ts` | `lib/virus-scan.ts` |
| `assets/lib/attachment-access.ts` | `lib/attachment-access.ts` — **must be implemented**, it denies everything by default |
| `assets/app/api/files/route.ts` | `app/api/files/route.ts` (upload) |
| `assets/app/api/files/[id]/route.ts` | `app/api/files/[id]/route.ts` (download) |
| `assets/components/file-upload.tsx` | `components/file-upload.tsx` |
| `assets/prisma/schema-attachment.prisma` | paste INTO `prisma/schema.prisma` |
| `assets/env.example` | append to `.env.example` (+ real values in `.env.local`) |
| `assets/rules/ugt-nextjs-upload.md` | `.claude/rules/ugt-nextjs-upload.md` |

### 4.2 Env schema

Add to `lib/env.ts` (server block):

```ts
STORAGE_ROOT: z.string().default('/app/storage'),
UPLOAD_MAX_BYTES: z.string().default('26214400'),
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
compose files: the mount point owned by `nextjs`, the named volume, the clamav
service with a 5-minute `start_period`, and the persisted signature DB.

### 4.5 Health + migrate

Add the scanner to `/api/health` so a dead clamd is visible before users find
it (`pingScanner()` from `lib/virus-scan.ts`), then:

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

## 6. Verification checklist

```bash
node <skill-dir>/scripts/verify.mjs
```

Then by hand — these are the ones that catch real breakage:

- [ ] Upload the [EICAR test string](https://www.eicar.org/download-anti-malware-testfile/)
      → refused with `FILE_INFECTED`, **no file on the volume**, audit row written
- [ ] Stop the clamav container → upload is refused with 503, not accepted
- [ ] Upload a file, `docker compose down && up -d`, download it again → still there
- [ ] Call the download URL while logged out → 401; as a user without access → **404**
- [ ] Upload an `.svg` containing `<script>` → downloads as a file, never renders
- [ ] Upload something just over `UPLOAD_MAX_BYTES` → clean 413 from the app
      (if the proxy answers instead, raise its limit)
- [ ] `canReadAttachment` no longer returns `false` for every case
- [ ] `docs/admin-handoff.md` mentions the volume backup and the
      `docker compose down -v` warning
- [ ] The attachment→record linking pattern is recorded in
      `docs/project-context/decisions.md` (polymorphic / FK / single column),
      not left as "whatever the skeleton did"
