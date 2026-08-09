import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { PERMISSIONS } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/actions/auth';
import { readStoredFile } from '@/lib/storage';
// EXTENSION POINT: the project decides who may read a given record's files.
import { canReadAttachment } from '@/lib/attachment-access';

/**
 * Download. Every byte leaves through here — files are on a volume, not in
 * `public/`, precisely so that this guard cannot be bypassed by knowing a URL.
 *
 * session → permission → per-record scope → clean-scan check → stream + audit
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'ต้องเข้าสู่ระบบก่อน' } },
      { status: 401 }
    );
  }

  const permissions = await getUserPermissions(session.user.id);
  if (!permissions.has(PERMISSIONS.FILES_READ)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ดาวน์โหลดไฟล์' } },
      { status: 403 }
    );
  }

  const attachment = await prisma.attachment.findFirst({
    where: { id, isDeleted: false },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      storageKey: true,
      fileName: true,
      fileSize: true,
      scanStatus: true,
    },
  });

  // 404 for both "missing" and "not yours" — a different status would confirm
  // that an id exists to someone who may not see it.
  if (!attachment || !(await canReadAttachment(session.user.id, attachment))) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบไฟล์' } },
      { status: 404 }
    );
  }

  if (attachment.scanStatus !== 'clean') {
    return NextResponse.json(
      { success: false, error: { code: 'FILE_NOT_AVAILABLE', message: 'ไฟล์นี้ไม่พร้อมใช้งาน' } },
      { status: 409 }
    );
  }

  const bytes = await readStoredFile(attachment.storageKey);

  await writeAuditLog({
    userId: session.user.id,
    action: 'file.download',
    detail: { attachmentId: attachment.id, fileName: attachment.fileName },
  });

  const encoded = encodeURIComponent(attachment.fileName);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      // ALWAYS octet-stream + attachment, whatever the file claims to be.
      // Serving user content inline is how an uploaded .svg or .html becomes
      // stored XSS on your own domain — virus-free and still dangerous.
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
      'Content-Length': String(attachment.fileSize),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
