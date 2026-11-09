// kit: ugt-nextjs-platform 4.86.0 · ugt-nextjs-design-setup/lib/table-filter.test.ts
// kit-hash: 25098058e4d4
import { describe, expect, it } from 'vitest';
import {
  dateRangeFilterLabel,
  dateRangeWhere,
  dayKeyOf,
  decodeDateRangeFilter,
  encodeDateRangeFilter,
  matchesTextFilter,
} from './table-filter';

describe('DataTable text filter', () => {
  it('finds a date by the DD/MM/YYYY the cell shows, not only the raw ISO', () => {
    expect(matchesTextFilter('2026-11-06T03:00:00.000Z', '06/11/2026')).toBe(true);
    expect(matchesTextFilter('2026-11-06', '06/11')).toBe(true);
    expect(matchesTextFilter('2026-11-06', '07/11')).toBe(false);
    // 28/09 02:07 Bangkok — found by the 28th the cell shows, not the UTC 27th
    expect(matchesTextFilter('2026-09-27T19:07:00.000Z', '28/09/2026')).toBe(true);
    expect(matchesTextFilter('2026-09-27T19:07:00.000Z', '27/09/2026')).toBe(false);
  });

  it('matches plain text case-insensitively and lets an empty filter through', () => {
    expect(matchesTextFilter('Approved', 'appr')).toBe(true);
    expect(matchesTextFilter(null, 'x')).toBe(false);
    expect(matchesTextFilter('anything', '  ')).toBe(true);
  });
});

describe('DataTable date-range filter', () => {
  it('round-trips and ignores plain typed text', () => {
    const raw = encodeDateRangeFilter({ from: '2026-09-27', to: '2026-09-28' });
    expect(decodeDateRangeFilter(raw)).toEqual({ from: '2026-09-27', to: '2026-09-28' });
    expect(decodeDateRangeFilter('27/09')).toBeNull();
    expect(encodeDateRangeFilter({})).toBe('');
  });

  it('reads a timestamp by its Bangkok day and a date-only value by its UTC day', () => {
    // 28/09 02:07 Bangkok = 27/09 19:07Z — the screen shows the 28th
    expect(dayKeyOf('2026-09-27T19:07:00.000Z')).toBe('2026-09-28');
    // SQL date arrives as UTC midnight — the 27th everywhere
    expect(dayKeyOf('2026-09-27T00:00:00.000Z')).toBe('2026-09-27');
    expect(dayKeyOf('2026-09-27')).toBe('2026-09-27');
  });

  it('filters inclusively, with either end open', () => {
    const only28 = encodeDateRangeFilter({ from: '2026-09-28', to: '2026-09-28' });
    expect(matchesTextFilter('2026-09-27T19:07:00.000Z', only28)).toBe(true);
    expect(matchesTextFilter('2026-09-27T00:00:00.000Z', only28)).toBe(false);
    expect(matchesTextFilter(null, only28)).toBe(false);

    const from28 = encodeDateRangeFilter({ from: '2026-09-28' });
    expect(matchesTextFilter('2026-10-30', from28)).toBe(true);
    expect(matchesTextFilter('2026-09-01', from28)).toBe(false);
  });

  it('bounds a server query by Bangkok days, to-day inclusive', () => {
    expect(dateRangeWhere({ from: '2026-09-28', to: '2026-09-28' })).toEqual({
      gte: new Date('2026-09-27T17:00:00.000Z'),
      lt: new Date('2026-09-28T17:00:00.000Z'),
    });
    expect(dateRangeWhere({ to: '2026-09-28' })).toEqual({ lt: new Date('2026-09-28T17:00:00.000Z') });
    // malformed ends were dropped by decode → no bound, never Invalid Date
    expect(dateRangeWhere(decodeDateRangeFilter('\u001erange:junk~') ?? {})).toEqual({});
  });

  it('labels the chip in DD/MM/YYYY', () => {
    expect(dateRangeFilterLabel({ from: '2026-09-27', to: '2026-09-28' })).toBe(
      '27/09/2026 – 28/09/2026'
    );
    expect(dateRangeFilterLabel({ from: '2026-09-27', to: '2026-09-27' })).toBe('27/09/2026');
    expect(dateRangeFilterLabel({ to: '2026-09-28' })).toBe('≤ 28/09/2026');
  });
});
