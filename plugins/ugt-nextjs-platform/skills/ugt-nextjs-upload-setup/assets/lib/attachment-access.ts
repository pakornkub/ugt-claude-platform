// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-upload-setup/lib/attachment-access.ts
// kit-hash: ed917fa7412a
import 'server-only';

/**
 * EXTENSION POINT — who may read a given record's files.
 *
 * `FILES_READ` only says "this user may download files in general". It cannot
 * know whether *this* user may see *this* record: that answer lives in the
 * project's own domain rules (owner? same department? an approver in the
 * request's chain?).
 *
 * The skeleton denies everything except the uploader, which is the safe
 * starting point — a project that forgets to implement this leaks nothing.
 * Replace it with the real rule before shipping a feature that shares files.
 *
 * Never write this as `!canSeeAll` — derive scope from the session identity
 * (contract: auth.md), or a user with a narrow role inherits a broad one.
 */
export async function canReadAttachment(
  userId: string,
  attachment: { entityType: string; entityId: string }
): Promise<boolean> {
  switch (attachment.entityType) {
    // Example of the shape to follow — the record decides, not the file:
    //
    // case 'LeaveRequest': {
    //   const request = await prisma.leaveRequest.findUnique({
    //     where: { id: attachment.entityId },
    //     select: { requesterId: true, approverId: true },
    //   });
    //   return request?.requesterId === userId || request?.approverId === userId;
    // }

    default:
      return false;
  }
}
