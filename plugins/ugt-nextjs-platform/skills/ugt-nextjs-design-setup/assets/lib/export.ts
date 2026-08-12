// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-design-setup/lib/export.ts
// kit-hash: a124c77a883f
// source: merged ugt-hrms app/api/{access-monitor,employee-monitor}/export/route.ts
// — installed by ugt-nextjs-design-setup (org UI kit)
//
// ทั้งสอง route ใน HRMS เขียน header/แถวของ CSV แยกกันเป็นสองลิสต์ แล้ว
// employee-monitor ก็หลุดจริง: header 15 คอลัมน์ แต่แถวมี 13 ค่า ไฟล์เลยเหลื่อม
// ทั้งไฟล์โดยไม่มีใครรู้ ไฟล์นี้จึงรับ "column spec ชุดเดียว" แล้วสร้างทั้งหัวและ
// แถวจากมันทั้งคู่ — ความเหลื่อมแบบนั้นเกิดไม่ได้อีก และ CSV กับ Excel จะได้
// คอลัมน์ตรงกันเสมอ
//
// ใช้จาก Route Handler เท่านั้น (exceljs เป็น node) — ห้ามเรียกจาก Server Action
// ไฟล์ใหญ่ ๆ ชน bodySizeLimit 1 MB

// exceljs โหลดแบบ dynamic: request ที่ขอ CSV จะได้ไม่ต้องแบก parser xlsx ทั้งก้อน
// และเทส CSV รันได้โดยไม่ต้องมี exceljs ติดตั้ง

/** เพดานแถวต่อหนึ่งไฟล์ export — ใส่ใน `take:`/`FETCH NEXT` ของ query ด้วย
 *  ไม่ใช่แค่เช็คทีหลัง เพราะ query ที่ไม่จำกัดแถวคือจุดที่ memory ระเบิด */
export const EXPORT_MAX_ROWS = 10_000;

export type ExportFormat = 'excel' | 'csv';

export interface ExportColumn<T> {
  /** หัวคอลัมน์ที่ผู้ใช้เห็น — ใช้ทั้งใน CSV และ Excel */
  header: string;
  /** ความกว้างคอลัมน์ Excel (ไม่ใส่ = 16) */
  width?: number;
  /** ดึงค่าจากแถว — คืน number เพื่อให้ Excel คำนวณต่อได้, คืน string เมื่อเป็นข้อความ
   *  วันที่ต้องผ่าน `formatExportDate()` จาก lib/format.ts (ISO yyyy-MM-dd) */
  value: (row: T) => string | number | null | undefined;
}

/** อักขระที่ทำให้ Excel/Sheets ตีความช่องนั้นเป็นสูตร — ค่าที่ผู้ใช้กรอกเองอาจ
 *  ขึ้นต้นด้วยตัวใดตัวหนึ่งได้ ปล่อยไว้คือ CSV injection (=cmd|'/c calc'!A1) */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  // ตัวเลขไม่ต้องกัน formula (เครื่องหมายลบข้างหน้าคือค่าติดลบจริง ๆ)
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '""';
  const guarded = FORMULA_LEAD.test(value) ? `'${value}` : value;
  return `"${guarded.replaceAll('"', '""')}"`;
}

/**
 * CSV ที่ Excel บน Windows เปิดแล้วภาษาไทยไม่กลายเป็นขยะ
 * - นำหน้าด้วย BOM (ไม่มี BOM = Excel เดา ANSI แล้วไทยเพี้ยนทั้งไฟล์)
 * - จบบรรทัดด้วย CRLF ตาม RFC 4180
 * - ทุกช่องอยู่ในเครื่องหมายคำพูด และกัน formula injection
 */
export function toCsv<T>(columns: readonly ExportColumn<T>[], rows: readonly T[]): string {
  const lines = [
    columns.map((c) => csvCell(c.header)).join(','),
    ...rows.map((row) => columns.map((c) => csvCell(c.value(row))).join(',')),
  ];
  return '﻿' + lines.join('\r\n') + '\r\n';
}

/** Workbook หนึ่งชีต หัวตารางตัวหนาพื้นเทา (แบบเดียวกับที่ HRMS ใช้อยู่) */
export async function toXlsx<T>(
  columns: readonly ExportColumn<T>[],
  rows: readonly T[],
  sheetName: string
): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  // ชื่อชีตยาวเกิน 31 ตัว หรือมี : \ / ? * [ ] แล้ว Excel จะฟ้องว่าไฟล์เสีย
  const sheet = workbook.addWorksheet(sheetName.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31));

  sheet.columns = columns.map((c, i) => ({ header: c.header, key: String(i), width: c.width ?? 16 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  for (const row of rows) {
    sheet.addRow(Object.fromEntries(columns.map((c, i) => [String(i), c.value(row) ?? ''])));
  }

  return workbook.xlsx.writeBuffer();
}

const CONTENT_TYPE: Record<ExportFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** ชื่อไฟล์ไปอยู่ใน HTTP header — ปล่อย " หรือขึ้นบรรทัดใหม่ผ่านไปคือ header injection */
function safeFilename(name: string): string {
  return name.replace(/[^\w.\-]+/g, '-').slice(0, 120) || 'export';
}

/**
 * แปลง rows → Response ที่เบราว์เซอร์ดาวน์โหลดได้เลย — จุดเดียวที่ route ต้องเรียก
 *
 * ```ts
 * return toExportResponse(format, COLUMNS, rows, {
 *   filename: `leave-requests-${bangkokToday(new Date())}`,
 *   sheetName: 'Leave Requests',
 * });
 * ```
 *
 * โยน Error เมื่อแถวเกิน EXPORT_MAX_ROWS — จงใจให้ล้มดัง ๆ แทนที่จะตัดแถวเงียบ ๆ
 * แล้วผู้ใช้ได้ไฟล์ที่ข้อมูลไม่ครบโดยไม่รู้ตัว (route ควรตอบ 400 ให้ไปแคบ filter ลง)
 */
export async function toExportResponse<T>(
  format: ExportFormat,
  columns: readonly ExportColumn<T>[],
  rows: readonly T[],
  opts: { filename: string; sheetName?: string }
): Promise<Response> {
  if (rows.length > EXPORT_MAX_ROWS) {
    throw new Error(`EXPORT_TOO_MANY_ROWS: ${rows.length} > ${EXPORT_MAX_ROWS}`);
  }

  const name = safeFilename(opts.filename);
  const body =
    format === 'csv'
      ? toCsv(columns, rows)
      : await toXlsx(columns, rows, opts.sheetName ?? 'Export');

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': CONTENT_TYPE[format],
      'Content-Disposition': `attachment; filename="${name}.${format === 'csv' ? 'csv' : 'xlsx'}"`,
      // ไฟล์ export มักมีข้อมูลบุคคล — อย่าให้ค้างใน cache ตัวกลาง
      'Cache-Control': 'no-store',
    },
  });
}
