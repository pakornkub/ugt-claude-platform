// kit: ugt-nextjs-platform unreleased · ugt-nextjs-design-setup/lib/table-filter.ts
// kit-hash: 80ad7d2fd8c0
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
/**
 * DataTable column filters — match what the cell SHOWS, not the raw value.
 *
 * TanStack's `auto` filterFn compares the raw accessor value: a date column holds
 * ISO `2026-11-06T…` while the cell shows `06/11/2026`, and a status column holds a
 * code while the cell shows its label — typing what you see finds nothing (ugt-hrms
 * 2026-11-06). Text filters search the raw value + the DD/MM/YYYY forms; date
 * columns get a range calendar whose value rides in the same string filter state
 * behind a prefix no typed text starts with.
 *
 * Server tables (`serverQuery`) receive the same string in `filters[key]` — decode
 * it with `decodeDateRangeFilter` in the page/route (see auth-setup audit-logs page).
 */
import { bangkokToday, formatDate, formatDateTime, formatExportDate } from '@/lib/format';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T|$)/;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const RANGE_PREFIX = '\u001erange:';

export interface DateRangeFilter {
  from?: string; // yyyy-MM-dd, inclusive
  to?: string; // yyyy-MM-dd, inclusive
}

/** A cell value that is a date: a valid `Date` or an ISO `yyyy-MM-dd[T…]` string. */
export function isDateValue(value: unknown): value is Date | string {
  return (
    (value instanceof Date && !Number.isNaN(value.getTime())) ||
    (typeof value === 'string' && ISO_DATE.test(value))
  );
}

export function encodeDateRangeFilter({ from, to }: DateRangeFilter): string {
  return from || to ? `${RANGE_PREFIX}${from ?? ''}~${to ?? ''}` : '';
}

/** `null` = not a range (plain typed text, or empty). Malformed ends are dropped, not trusted. */
export function decodeDateRangeFilter(raw: string | undefined | null): DateRangeFilter | null {
  if (!raw?.startsWith(RANGE_PREFIX)) return null;
  const [from, to] = raw.slice(RANGE_PREFIX.length).split('~');
  return {
    from: DAY_KEY.test(from ?? '') ? from : undefined,
    to: DAY_KEY.test(to ?? '') ? to : undefined,
  };
}

/**
 * The calendar day the cell shows, as `yyyy-MM-dd`: a date-only value (no time, or exactly
 * UTC midnight — how SQL `date` columns arrive) by its UTC parts like `formatDate`; a
 * timestamp in Asia/Bangkok like `formatDateTime` (28/09 02:07 Bangkok is the 28th though
 * UTC says the 27th).
 */
export function dayKeyOf(value: Date | string): string {
  const iso = value instanceof Date ? value.toISOString() : value;
  const dateOnly = !iso.includes('T') || /T00:00:00(?:\.0+)?Z$/.test(iso);
  return dateOnly ? formatExportDate(value) : bangkokToday(new Date(value));
}

/**
 * Prisma bounds for a range on a DateTime column, days counted in Asia/Bangkok (+07:00 — the
 * server may run UTC) · `to` is inclusive, so the bound is the exclusive next midnight. A SQL
 * `date` (UTC midnight) lands inside its own day too.
 */
export function dateRangeWhere({ from, to }: DateRangeFilter): { gte?: Date; lt?: Date } {
  const where: { gte?: Date; lt?: Date } = {};
  if (from) where.gte = new Date(`${from}T00:00:00+07:00`);
  if (to) where.lt = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 86_400_000);
  return where;
}

/** Is the cell's day inside the range (inclusive, either end open)? Non-dates fail. */
export function matchesDateRangeFilter(value: unknown, range: DateRangeFilter): boolean {
  if (!isDateValue(value)) return false;
  const day = dayKeyOf(value);
  return (!range.from || day >= range.from) && (!range.to || day <= range.to);
}

/** The strings a cell can be found by: raw value + the DD/MM/YYYY forms shown on screen. */
function filterTexts(value: unknown): string[] {
  if (value == null) return [];
  if (isDateValue(value)) {
    const raw = value instanceof Date ? value.toISOString() : value;
    // formatDate(timestamp) would read the UTC day — use the day the cell shows (Bangkok)
    return [raw, formatDate(dayKeyOf(value)), formatDateTime(value)];
  }
  return [typeof value === 'object' ? JSON.stringify(value) : String(value)];
}

/** The DataTable's filterFn: a range filter → day match · text → contains (case-insensitive). */
export function matchesTextFilter(value: unknown, query: string | undefined | null): boolean {
  const range = decodeDateRangeFilter(query);
  if (range) return matchesDateRangeFilter(value, range);
  const q = query?.trim().toLowerCase();
  if (!q) return true;
  return filterTexts(value).some((t) => t.toLowerCase().includes(q));
}

/** Chip text: `DD/MM/YYYY – DD/MM/YYYY` (one end open → `≥` / `≤`). */
export function dateRangeFilterLabel({ from, to }: DateRangeFilter): string {
  if (from && to) return from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`;
  if (from) return `≥ ${formatDate(from)}`;
  return to ? `≤ ${formatDate(to)}` : '';
}

// ─── pick-from-list filter (status / type columns — `meta.filterOptions`) ────────
//
// A status column shows a translated label but holds a code — typing "รออนุมัติ" matched
// nothing (ugt-hrms 2026-10-27). Such columns get a tick list of the labels instead; the
// picked values ride as ONE string in the same column-filter state (chips, clear-all and
// the reset button need no second code path).

export interface FilterOption {
  value: string;
  label: string;
}

const OPTION_SEP = '\u001f'; // never inside a code or a label

export function encodeOptionFilter(values: readonly string[]): string {
  return values.join(OPTION_SEP);
}

export function decodeOptionFilter(raw: string | undefined | null): string[] {
  return raw ? raw.split(OPTION_SEP).filter(Boolean) : [];
}

/** Does the row's value pass the picked options? Nothing picked = everything passes. */
export function matchesOptionFilter(rowValue: string, raw: string | undefined | null): boolean {
  const picked = decodeOptionFilter(raw);
  return picked.length === 0 || picked.includes(rowValue);
}

/** Chip text: the picked options' labels, in the column's own order. */
export function optionFilterLabel(options: readonly FilterOption[], raw: string): string {
  const picked = new Set(decodeOptionFilter(raw));
  return options
    .filter((o) => picked.has(o.value))
    .map((o) => o.label)
    .join(', ');
}
