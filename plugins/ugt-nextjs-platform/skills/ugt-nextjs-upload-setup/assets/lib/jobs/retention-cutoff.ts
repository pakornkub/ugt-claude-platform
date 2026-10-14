// lib/jobs/retention-cutoff.ts — the in-code date guard for destructive cron jobs
// (pitfalls hardening.md §4): the cutoff is decided here, not by how often cron
// fires. A window edited to 0, negative or a non-integer would purge data deleted
// a minute ago — refuse instead of running.
export const MIN_RETENTION_DAYS = 7;

export function retentionCutoff(now: Date, days: number, minDays = MIN_RETENTION_DAYS): Date {
  if (!Number.isInteger(days) || days < minDays) {
    throw new Error(`RETENTION_DAYS=${days} is below the ${minDays}-day floor — refusing to sweep`);
  }
  return new Date(now.getTime() - days * 86_400_000);
}
