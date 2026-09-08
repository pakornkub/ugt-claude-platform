// kit: ugt-nextjs-platform 4.60.0 · ugt-nextjs-upload-setup/app/api/files/route.ts
// kit-hash: 480106039b00
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { auth } from '@/lib/auth';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { PERMISSIONS } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/actions/auth';
import { checksum, newStorageKey, safeDisplayName, writeStoredFile } from '@/lib/storage';
// [SCAN] — virus scan เป็น opt-in (default: ไม่เอา, SKILL.md §3 Q5). เปิดใช้งาน:
// import scanBuffer from lib/virus-scan, เรียกมันก่อน newStorageKey ด้านล่าง,
// fail closed ทุกกรณีที่ไม่ใช่ 'clean' — ตัวอย่างเต็มอยู่ใน SKILL.md §3 Q5

/**
 * Upload endpoint. A Route Handler, NOT a Server Action, on purpose: Server
 * Actions cap the request body at `serverActions.bodySizeLimit` (1 MB by
 * default) and fail with an opaque error above it — a trap that only shows up
 * once someone uploads a real document.
 *
 * Order is fixed (auth.md guard order, extended for uploads):
 *   session → permission → read bytes → [SCAN, if enabled] → write to volume → row → audit log
 * When virus scan is enabled, the scan happens before a single byte reaches
 * the volume, so an infected file is never stored, not even briefly.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  const permissions = await getUserPermissions(session.user.id);
  if (!permissions.has(PERMISSIONS.FILES_CREATE)) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN_UPLOAD' } }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get('file');
  const entityType = String(form.get('entityType') ?? '');
  const entityId = String(form.get('entityId') ?? '');

  if (!(file instanceof File) || !entityType || !entityId) {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST' } }, { status: 400 });
  }

  const maxBytes = Number(env.UPLOAD_MAX_BYTES);
  if (file.size > maxBytes) {
    // ไม่มี message ที่นี่ — client แปล code + maxMb เอง (มติ 2.6: server คืน
    // code เสมอ ไม่คืนข้อความสำเร็จรูป)
    return NextResponse.json(
      { success: false, error: { code: 'FILE_TOO_LARGE', maxMb: Math.floor(maxBytes / 1024 / 1024) } },
      { status: 413 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  const storageKey = newStorageKey();
  await writeStoredFile(storageKey, bytes);

  const attachment = await prisma.attachment.create({
    data: {
      entityType,
      entityId,
      storageKey,
      fileName: safeDisplayName(file.name),
      contentType: file.type || 'application/octet-stream',
      fileSize: bytes.length,
      checksum: checksum(bytes),
      // [SCAN] — เปิด virus scan แล้วเปลี่ยนเป็น scanStatus: 'clean' +
      // scannedAt: new Date() (ห้ามคง 'unscanned' ไว้ — ข้อมูลจะโกหกว่าไม่เคย
      // สแกน) พร้อมแก้ด่านดาวน์โหลดใน app/api/files/[id]/route.ts ตาม marker
      // [SCAN] ที่นั่น
      scanStatus: 'unscanned',
      createdBy: session.user.email ?? session.user.id,
    },
    select: { id: true, fileName: true, fileSize: true, contentType: true },
  });

  await writeAuditLog({
    userId: session.user.id,
    action: 'file.upload',
    detail: { attachmentId: attachment.id, entityType, entityId, fileName: attachment.fileName },
  });

  return NextResponse.json({ success: true, data: attachment }, { status: 201 });
}
