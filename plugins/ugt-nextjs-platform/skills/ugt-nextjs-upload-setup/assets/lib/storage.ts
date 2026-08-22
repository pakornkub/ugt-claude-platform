// kit: ugt-nextjs-platform 4.27.0 · ugt-nextjs-upload-setup/lib/storage.ts
// kit-hash: 902ad080c68a
import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { env } from '@/lib/env';

/**
 * Files live on a Docker volume mounted at STORAGE_ROOT — never in `public/`
 * (that would serve them unauthenticated) and never inside the image (a
 * redeploy replaces the container and the files would be gone).
 *
 * The path is derived from a generated id, NEVER from the uploaded filename.
 * The original name is kept in the database for display only.
 */

/** `2026/08/<uuid>` — sharded by month so no directory grows without bound. */
export function newStorageKey(): string {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}/${mm}/${randomUUID()}`;
}

/**
 * Absolute path for a stored key, with a containment check.
 * Even though keys are generated, this is the last line against a key that ever
 * reaches here from user input (`../../etc/passwd`).
 */
export function resolveStoragePath(storageKey: string): string {
  const root = resolve(env.STORAGE_ROOT);
  const full = resolve(join(root, storageKey));
  if (full !== root && !full.startsWith(root + sep)) {
    throw new Error('storage key escapes STORAGE_ROOT');
  }
  return full;
}

export async function writeStoredFile(storageKey: string, data: Buffer): Promise<void> {
  const full = resolveStoragePath(storageKey);
  await mkdir(dirname(full), { recursive: true });
  // No extension is ever written — the file on disk is opaque bytes, so nothing
  // on the host can be tricked into executing it by its name.
  await writeFile(full, data, { mode: 0o640 });
}

export async function readStoredFile(storageKey: string): Promise<Buffer> {
  return readFile(resolveStoragePath(storageKey));
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  try {
    await unlink(resolveStoragePath(storageKey));
  } catch (error) {
    // Already gone is fine — the database row is the source of truth.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

/** SHA-256 of the bytes — stored so a re-upload of the same file is detectable. */
export function checksum(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Sanitise a user-supplied filename for DISPLAY and for the download header.
 * It never becomes part of a path. Strips directory separators and control
 * characters, collapses whitespace, and caps the length.
 */
export function safeDisplayName(name: string): string {
  const cleaned = name
    .replaceAll('\\', '/')
    .split('/')
    .pop()!
    // eslint-disable-next-line no-control-regex -- stripping control chars is the point
    .replaceAll(/[\x00-\x1f\x7f]/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim();
  return (cleaned || 'file').slice(0, 200);
}
