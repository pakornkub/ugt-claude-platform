import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { auth } from '@/lib/auth';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { PERMISSIONS } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/actions/auth';
import { checksum, newStorageKey, safeDisplayName, writeStoredFile } from '@/lib/storage';
import { scanBuffer } from '@/lib/virus-scan';

/**
 * Upload endpoint. A Route Handler, NOT a Server Action, on purpose: Server
 * Actions cap the request body at `serverActions.bodySizeLimit` (1 MB by
 * default) and fail with an opaque error above it — a trap that only shows up
 * once someone uploads a real document.
 *
 * Order is fixed (auth.md guard order, extended for uploads):
 *   session → permission → read bytes → SCAN → write to volume → row → audit log
 * The scan happens before a single byte reaches the volume, so an infected file
 * is never stored, not even briefly.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'ต้องเข้าสู่ระบบก่อน' } },
      { status: 401 }
    );
  }

  const permissions = await getUserPermissions(session.user.id);
  if (!permissions.has(PERMISSIONS.FILES_CREATE)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์อัปโหลดไฟล์' } },
      { status: 403 }
    );
  }

  const form = await request.formData();
  const file = form.get('file');
  const entityType = String(form.get('entityType') ?? '');
  const entityId = String(form.get('entityId') ?? '');

  if (!(file instanceof File) || !entityType || !entityId) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'ข้อมูลไม่ครบ' } },
      { status: 400 }
    );
  }

  const maxBytes = Number(env.UPLOAD_MAX_BYTES);
  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `ไฟล์ใหญ่เกิน ${Math.floor(maxBytes / 1024 / 1024)} MB`,
        },
      },
      { status: 413 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // FAIL CLOSED: anything other than a definite "clean" refuses the upload.
  // A scanner that is down must block uploads, never wave them through.
  const scan = await scanBuffer(bytes);
  if (scan.status === 'infected') {
    await writeAuditLog({
      userId: session.user.id,
      action: 'file.upload.rejected',
      detail: { entityType, entityId, fileName: file.name, signature: scan.signature },
    });
    return NextResponse.json(
      {
        success: false,
        error: { code: 'FILE_INFECTED', message: 'ไฟล์นี้ตรวจพบไวรัส จึงไม่ถูกอัปโหลด' },
      },
      { status: 422 }
    );
  }
  if (scan.status === 'error') {
    console.error('virus scan unavailable', scan.message);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SCANNER_UNAVAILABLE',
          message: 'ระบบตรวจไวรัสไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง',
        },
      },
      { status: 503 }
    );
  }

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
      scanStatus: 'clean',
      scannedAt: new Date(),
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
