---
type: llm
focus: { source: file, path: lib/attachment-access.ts }
---
PASS only if canReadAttachment is implemented (no longer denies everything) and, for entityType leaveRequest, allows exactly: the user who created that leave request (the row's createdBy equals the session user's id) OR a user holding the users:read permission (literal or the project's PERMISSIONS constant). It must look up the leave request by the attachment's entityId; an unknown entityType must still be denied. FAIL if any authenticated user can read any attachment, or if it only checks files:read.
