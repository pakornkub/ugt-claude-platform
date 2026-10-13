// kit: ugt-nextjs-platform unreleased · ugt-nextjs-upload-setup/app/api/cron/attachments-sweep/route.ts
// kit-hash: f8e03d241227
import { timingSafeEqual } from 'node:crypto';
import { readdir, stat } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { deleteStoredFile } from '@/lib/storage';

/**
 * Attachment retention sweep — called by host cron, never by a user
 * (cicd references/scheduled-jobs.md; crontab row = admin handoff table I).
 *
 *   1. rows whose owning record is gone (pattern A/C orphans) → SOFT-deleted,
 *      so they wait out the retention window and stay recoverable
 *   2. bytes + row of attachments soft-deleted longer than RETENTION_DAYS
 *   3. files on the volume with no row at all (upload wrote the file, then the
 *      row insert failed) → deleted
 *
 * Idempotent: every step re-derives its work from the database and the volume,
 * and a file that is already gone counts as deleted — re-running, or running
 * after a half-finished run, only finishes the job.
 *
 * `POST …/api/cron/attachments-sweep?dryRun=1` counts what a real run would do
 * and touches nothing — run it once by hand before the first scheduled run.
 *
 * This is the ONLY code path that hard-deletes `Attachments` rows. The upload
 * history survives in ActivityLogs (`file.upload` carries id + fileName).
 */

export const dynamic = 'force-dynamic';

/** §3 Q4 answer — substitute the interviewed window (days) at install. */
const RETENTION_DAYS = 90;
/** Floor for the date guard below: a smaller window is treated as a typo. */
const MIN_RETENTION_DAYS = 7;
/** Orphans younger than this are left alone — an upload may be mid-flight. */
const ORPHAN_GRACE_MS = 86_400_000;
// ponytail: the purge takes one batch per run, so a backlog drains over several
// nights (`more: true` in the result). Loop the purge if that is too slow.
const BATCH = 500;

/**
 * EXTENSION POINT — orphan rows (references/attachment-linking.md "Orphan
 * sweep"). One entry per entityType: given entityIds, return the ones whose
 * owning record still EXISTS. A type with no entry is never swept — unknown
 * means keep, not delete. Pattern B (real FK) needs no entry.
 *
 *   LeaveRequest: async (ids) =>
 *     (await prisma.leaveRequest.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((r) => r.id),
 *
 * Count a soft-deleted owner as existing (no `isDeleted` filter) — it can be
 * restored, and its files must still be there when it is.
 */
const OWNERS: Record<string, (entityIds: string[]) => Promise<string[]>> = {};

function authorized(request: Request) {
  if (!env.CRON_SECRET) return false; // unset = every call refused
  const want = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const got = Buffer.from(request.headers.get('authorization') ?? '');
  return got.length === want.length && timingSafeEqual(got, want);
}

/**
 * In-code date guard (pitfalls hardening.md §4): the cutoff is decided here,
 * not by how often cron fires. A window edited to 0, negative or a non-integer
 * would purge files deleted a minute ago — refuse instead of running.
 */
function retentionCutoff(now: Date, days: number): Date {
  if (!Number.isInteger(days) || days < MIN_RETENTION_DAYS) {
    throw new Error(`RETENTION_DAYS=${days} is below the ${MIN_RETENTION_DAYS}-day floor — refusing to sweep`);
  }
  return new Date(now.getTime() - days * 86_400_000);
}

async function softDeleteOrphanRows(now: Date, dryRun: boolean) {
  const bornBefore = new Date(now.getTime() - ORPHAN_GRACE_MS);
  let orphaned = 0;
  for (const [entityType, existing] of Object.entries(OWNERS)) {
    // Walk every live row of the type by id — a page whose owners all exist
    // must not stop the walk.
    for (let after = ''; ; ) {
      const rows = await prisma.attachment.findMany({
        where: { entityType, isDeleted: false, createdAt: { lt: bornBefore }, id: { gt: after } },
        select: { id: true, entityId: true },
        orderBy: { id: 'asc' },
        take: BATCH,
      });
      if (!rows.length) break;
      after = rows.at(-1)!.id;
      const alive = new Set(await existing([...new Set(rows.map((r) => r.entityId))]));
      const ids = rows.filter((r) => !alive.has(r.entityId)).map((r) => r.id);
      if (ids.length && !dryRun) {
        await prisma.attachment.updateMany({
          where: { id: { in: ids } },
          data: { isDeleted: true, updatedBy: 'cron:attachments-sweep' },
        });
      }
      orphaned += ids.length;
    }
  }
  return { orphaned };
}

async function purgeExpired(cutoff: Date, dryRun: boolean) {
  // No DeletedAt column: `updatedAt` is stamped by the soft delete. A later
  // edit to a deleted row only pushes it further out — the safe direction.
  // Rows soft-deleted by step 1 of this run are newer than any cutoff.
  const rows = await prisma.attachment.findMany({
    where: { isDeleted: true, updatedAt: { lt: cutoff } },
    select: { id: true, storageKey: true },
    take: BATCH,
  });
  let failed = 0;
  if (!dryRun) {
    for (const row of rows) {
      try {
        await deleteStoredFile(row.storageKey); // file first: a crash leaves the row, so the next run retries
        await prisma.attachment.delete({ where: { id: row.id } });
      } catch (error) {
        failed++;
        console.error(`[cron] attachments-sweep purge ${row.id}`, error);
      }
    }
  }
  return { purged: rows.length - failed, failed, more: rows.length === BATCH };
}

async function deleteOrphanFiles(now: Date, dryRun: boolean) {
  const root = resolve(env.STORAGE_ROOT);
  // ponytail: lists the whole volume in memory — fine to ~10^6 files; walk one
  // yyyy/mm shard per run beyond that.
  const entries = await readdir(root, { recursive: true, withFileTypes: true }).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; // nothing uploaded yet
    throw error;
  });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name))
    .map((full) => ({ full, key: full.slice(root.length + 1).split(sep).join('/') }));

  let removed = 0;
  // ≤ 2100 parameters per SQL Server statement — stay well under it
  for (let i = 0; i < files.length; i += BATCH) {
    const chunk = files.slice(i, i + BATCH);
    const known = new Set(
      (
        await prisma.attachment.findMany({
          where: { storageKey: { in: chunk.map((f) => f.key) } },
          select: { storageKey: true },
        })
      ).map((r) => r.storageKey)
    );
    for (const f of chunk) {
      if (known.has(f.key)) continue;
      const mtime = (await stat(f.full).catch(() => null))?.mtimeMs; // gone since readdir = nothing to do
      if (mtime === undefined || now.getTime() - mtime < ORPHAN_GRACE_MS) continue;
      if (!dryRun) await deleteStoredFile(f.key);
      removed++;
    }
  }
  return { orphanFiles: removed };
}

export async function POST(request: Request) {
  if (!authorized(request)) return new Response('Unauthorized', { status: 401 });

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';
  const now = new Date();
  const cutoff = retentionCutoff(now, RETENTION_DAYS);

  const rows = await softDeleteOrphanRows(now, dryRun);
  const expired = await purgeExpired(cutoff, dryRun);
  const files = await deleteOrphanFiles(now, dryRun);

  const result = { dryRun, cutoff: cutoff.toISOString(), ...rows, ...expired, ...files };
  console.log(`[cron] attachments-sweep ${JSON.stringify(result)}`);
  return Response.json({ ok: expired.failed === 0, ...result }, { status: expired.failed === 0 ? 200 : 500 });
}
