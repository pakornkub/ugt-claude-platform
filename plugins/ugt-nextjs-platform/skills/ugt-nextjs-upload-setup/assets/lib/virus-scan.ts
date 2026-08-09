import 'server-only';
import net from 'node:net';
import { env } from '@/lib/env';

/**
 * ClamAV client speaking clamd's INSTREAM protocol directly over TCP.
 *
 * No npm client on purpose: the protocol is ~40 lines, and a scanner sitting on
 * the upload path is not somewhere to inherit a dependency's release cadence.
 *
 * Protocol: send `zINSTREAM\0`, then chunks as [4-byte BE length][bytes], then
 * a zero-length chunk to end. clamd replies `stream: OK` or
 * `stream: <signature> FOUND`.
 */

export type ScanResult =
  | { status: 'clean' }
  | { status: 'infected'; signature: string }
  | { status: 'error'; message: string };

const CHUNK = 64 * 1024;

export async function scanBuffer(data: Buffer): Promise<ScanResult> {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: env.CLAMAV_HOST,
      port: Number(env.CLAMAV_PORT),
    });
    let reply = '';
    let settled = false;

    const finish = (result: ScanResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    // A scanner that hangs must not hang the request — but a timeout is an
    // ERROR, never a pass. See the fail-closed rule in the SKILL.
    socket.setTimeout(Number(env.CLAMAV_TIMEOUT_MS));
    socket.on('timeout', () => finish({ status: 'error', message: 'clamd timeout' }));
    socket.on('error', (err) => finish({ status: 'error', message: err.message }));
    socket.on('data', (buf) => {
      reply += buf.toString('utf8');
    });

    socket.on('end', () => {
      const text = reply.trim();
      if (text.endsWith('OK')) return finish({ status: 'clean' });
      const found = /:\s*(.+?)\s+FOUND$/.exec(text);
      if (found) return finish({ status: 'infected', signature: found[1] });
      finish({ status: 'error', message: text || 'empty reply from clamd' });
    });

    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      for (let offset = 0; offset < data.length; offset += CHUNK) {
        const slice = data.subarray(offset, offset + CHUNK);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(slice.length, 0);
        socket.write(size);
        socket.write(slice);
      }
      socket.write(Buffer.alloc(4)); // zero-length chunk = end of stream
    });
  });
}

/** True when clamd answers PING — used by /api/health so a dead scanner is visible. */
export async function pingScanner(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: env.CLAMAV_HOST,
      port: Number(env.CLAMAV_PORT),
    });
    let reply = '';
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(3000);
    socket.on('timeout', () => done(false));
    socket.on('error', () => done(false));
    socket.on('data', (buf) => {
      reply += buf.toString('utf8');
    });
    socket.on('end', () => done(reply.trim().endsWith('PONG')));
    socket.on('connect', () => socket.write('zPING\0'));
  });
}
