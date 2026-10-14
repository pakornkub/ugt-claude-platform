// kit: ugt-nextjs-platform 4.78.0 · ugt-nextjs-upload-setup/lib/jobs/retention-cutoff.test.ts
// kit-hash: ea6f5c5fb6ae
// Locks the date guard: a bad window must refuse, never purge early.
import { describe, expect, it } from 'vitest';
import { retentionCutoff } from './retention-cutoff';

describe('retentionCutoff', () => {
  const now = new Date('2026-10-14T00:00:00Z');

  it('subtracts whole days', () => {
    expect(retentionCutoff(now, 90).toISOString()).toBe('2026-07-16T00:00:00.000Z');
  });

  it('refuses a window below the floor, zero, negative or fractional', () => {
    for (const days of [6, 0, -1, 7.5, Number.NaN]) expect(() => retentionCutoff(now, days)).toThrow(/refusing/);
  });
});
