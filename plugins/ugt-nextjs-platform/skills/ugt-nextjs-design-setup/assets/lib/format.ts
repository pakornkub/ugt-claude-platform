// source: merged ugt-hrms lib/format-date.ts + gov-boi-smart lib/format.ts — installed by ugt-nextjs-design-setup
// convention: จอ DD/MM/YYYY ค.ศ. · ไฟล์ export ISO yyyy-MM-dd · ทุกการ format ผ่านไฟล์นี้เท่านั้น

/**
 * Date formatting (DD/MM/YYYY) — ปี ค.ศ. เสมอทุก locale
 *
 * ใช้ Intl.DateTimeFormat: locale 'th-TH-u-ca-gregory' บังคับปฏิทินเกรกอเรียน
 * (th-TH เปล่าๆ จะเป็นพุทธศักราช), 'en-GB' ให้ DD/MM/YYYY เกรกอเรียน.
 *
 * Timezone contract:
 * - formatDate       = วันที่ wall-clock (SQL date) → อ่าน UTC parts เสมอ กัน +7h เลื่อนวัน
 * - formatDateTime   = instant จริง (เช่น ActivityLog.createdAt) → เวลาท้องถิ่นของผู้ดู
 * - formatExportDate = วันที่ wall-clock → ISO สำหรับไฟล์ export (UTC parts เดียวกับ formatDate)
 */

export type AppLocale = 'th' | 'en';

const INTL_LOCALES: Record<AppLocale, string> = { th: 'th-TH-u-ca-gregory', en: 'en-GB' };

const DATE_PARTS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
};

// Intl.DateTimeFormat constructor แพง — cache ต่อ (locale × timezone) มีสูงสุด 4 ตัว
// (DataTable เรียกใน cell ทุกแถว)
const FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function getFormatter(locale: AppLocale, utc: boolean): Intl.DateTimeFormat {
  const key = `${locale}:${utc ? 'utc' : 'local'}`;
  let formatter = FORMATTER_CACHE.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(
      INTL_LOCALES[locale],
      utc ? { ...DATE_PARTS, timeZone: 'UTC' } : DATE_PARTS
    );
    FORMATTER_CACHE.set(key, formatter);
  }
  return formatter;
}

function toWallClockDate(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  // string 'yyyy-MM-dd[Txx]' → ใช้เฉพาะส่วนวันที่ ตรึงเป็นเที่ยงคืน UTC (ไม่ parse เป็น local)
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** วันที่ wall-clock → `DD/MM/YYYY` (ค.ศ. เสมอ). คืน '' เมื่อว่าง/ไม่ valid. */
export function formatDate(value: string | Date | null | undefined, locale: AppLocale = 'th'): string {
  if (!value) return '';
  const d = toWallClockDate(value);
  if (!d) return '';
  return getFormatter(locale, true).format(d);
}

/** instant → `DD/MM/YYYY HH:MM` เวลาท้องถิ่น (ค.ศ. เสมอ). คืน '' เมื่อว่าง/ไม่ valid. */
export function formatDateTime(value: string | Date | null | undefined, locale: AppLocale = 'th'): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const date = getFormatter(locale, false).format(d);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${date} ${hh}:${mm}`;
}

// ─── Export (Excel/CSV) ──────────────────────────────────────────────────────

/**
 * วันที่ wall-clock → ISO `yyyy-MM-dd` สำหรับไฟล์ export (Excel/CSV). คืน '' เมื่อว่าง/ไม่ valid.
 *
 * ไฟล์ export ใช้ ISO โดยเจตนา ไม่ใช่ DD/MM/YYYY — Excel ตีความ DD/MM ตาม locale
 * ของ "ผู้เปิดไฟล์" แล้วสลับวันกับเดือนเงียบๆ (05/07 กลายเป็น 7 พ.ค. บนเครื่อง US)
 * ส่วน ISO yyyy-MM-dd อ่านตรงกันทุก locale และ sort เป็น text ได้ถูกลำดับ.
 *
 * Timezone contract เดียวกับ `formatDate`: อ่าน UTC parts เสมอ วันจึงไม่เลื่อน.
 */
export function formatExportDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = toWallClockDate(value);
  if (!d) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Long form (เดือนเป็นชื่อ) ────────────────────────────────────────────────

const LONG_CACHE = new Map<string, Intl.DateTimeFormat>();

/**
 * วันที่แบบยาว ปี ค.ศ. เสมอ — `5 กรกฎาคม 2026` / `5 July 2026`,
 * หรือมีชื่อวันนำหน้าเมื่อ `weekday: true` → `วันอาทิตย์ที่ 5 กรกฎาคม 2026`.
 *
 * ใช้กับหัวข้อ/บรรทัดเดี่ยวที่ต้องอ่านลื่น — ตาราง/ฟอร์มยังใช้ `formatDate` (DD/MM/YYYY).
 *
 * **Timezone contract เดียวกับ `formatDate`** (wall-clock, อ่าน UTC parts):
 * ปลอดภัยกับ SQL date และ string `'yyyy-MM-dd'`. ถ้ามี `Date` ที่สร้างจาก
 * local (ปฏิทินที่ผู้ใช้คลิก, `new Date()`) ให้แปลงเป็น key ก่อน —
 * `formatLongDate(format(picked, 'yyyy-MM-dd'), locale)` — ไม่งั้นวันเลื่อน.
 */
export function formatLongDate(
  value: string | Date | null | undefined,
  locale: AppLocale,
  opts?: { weekday?: boolean }
): string {
  if (!value) return '';
  const d = toWallClockDate(value);
  if (!d) return '';
  const withWeekday = opts?.weekday ?? false;
  const key = `${locale}:${withWeekday}`;
  let formatter = LONG_CACHE.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(INTL_LOCALES[locale], {
      ...(withWeekday ? { weekday: 'long' as const } : {}),
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    LONG_CACHE.set(key, formatter);
  }
  return formatter.format(d);
}

// ─── ชื่อเดือน ────────────────────────────────────────────────────────────────

const MONTH_NAMES_CACHE = new Map<AppLocale, readonly string[]>();

/**
 * ชื่อเดือนเต็มตาม locale — index 0 = มกราคม (ตรงกับ `Date.getMonth()`).
 * แหล่งเดียวของชื่อเดือนทั้งแอป: เลิก hardcode array ไทย ซึ่งทำให้ EN เห็นเดือนไทย.
 * ใช้ปี 2024 เป็นวันอ้างอิงเฉยๆ — ผลลัพธ์ไม่ขึ้นกับปี.
 */
export function getMonthNames(locale: AppLocale = 'th'): readonly string[] {
  let names = MONTH_NAMES_CACHE.get(locale);
  if (!names) {
    const formatter = new Intl.DateTimeFormat(INTL_LOCALES[locale], {
      month: 'long',
      timeZone: 'UTC',
    });
    names = Array.from({ length: 12 }, (_, m) => formatter.format(new Date(Date.UTC(2024, m, 1))));
    MONTH_NAMES_CACHE.set(locale, names);
  }
  return names;
}

// ─── ตัวเลข ──────────────────────────────────────────────────────────────────

// คั่นหลักพันโดย "ไม่แตะทศนิยม" — ค่า Decimal จาก DB มีทศนิยมได้หลายตำแหน่ง
// การปัดเศษคือการเปลี่ยนตัวเลข จึงคงทศนิยมไว้ครบตามที่ DB ให้มา
// (ด้วยเหตุนี้จึงไม่ใช้ Intl.NumberFormat ที่ปัดที่ 3 ตำแหน่งโดยปริยาย)
const NUMERIC_RE = /^(-?)(\d+)(\.\d+)?$/;

export function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  const m = NUMERIC_RE.exec(text);
  if (!m) return text; // ไม่ใช่ตัวเลขล้วน (เช่นค่าที่ format มาแล้ว) — คืนตามเดิม ไม่ทำพัง
  return `${m[1]}${m[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${m[3] ?? ''}`;
}

// ─── วันนี้ (เวลาไทย) ─────────────────────────────────────────────────────────

// วันที่ "วันนี้" ตามเวลาไทยเป็น 'YYYY-MM-DD' — ต้องคิดที่ timezone ไทยเสมอ ไม่ใช่ของเครื่อง
// (container = UTC · ระหว่าง 00:00–07:00 UTC วันที่ไทยเดินไปก่อนแล้วหนึ่งวัน)
// en-CA ให้รูปแบบ YYYY-MM-DD ตรง ๆ จึงเทียบกับวันที่ในโดเมนแบบ string ได้เลย
const BANGKOK_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function bangkokToday(now: Date): string {
  return BANGKOK_DATE.format(now);
}
