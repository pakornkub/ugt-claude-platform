// installed by ugt-nextjs-design-setup alongside lib/export.ts
// ล็อกเฉพาะ 4 อย่างที่พังเงียบ ๆ: BOM · formula injection · จำนวนคอลัมน์ตรงกัน · ตัวเลขยังเป็นตัวเลข
// (toXlsx ไม่มีเทสที่นี่ — เป็น exceljs ล้วน ๆ พังแล้วเห็นทันทีตอนเปิดไฟล์)
import { describe, expect, it } from 'vitest';
import { toCsv, type ExportColumn } from './export';

interface Row {
  name: string;
  amount: number;
}

const COLUMNS: ExportColumn<Row>[] = [
  { header: 'ชื่อ', value: (r) => r.name },
  { header: 'จำนวน', value: (r) => r.amount },
];

describe('toCsv', () => {
  it('นำหน้าด้วย BOM — ไม่มี BOM แล้ว Excel บน Windows อ่านไทยเป็นขยะ', () => {
    expect(toCsv(COLUMNS, [])).toMatch(/^﻿/);
  });

  it('กันค่าที่ขึ้นต้นด้วย = ไม่ให้กลายเป็นสูตร', () => {
    const csv = toCsv(COLUMNS, [{ name: '=1+1', amount: 1 }]);
    expect(csv).toContain(`"'=1+1"`);
  });

  it('ตัวเลขติดลบยังเป็นตัวเลข ไม่โดน guard และไม่ถูกครอบด้วยเครื่องหมายคำพูด', () => {
    const csv = toCsv(COLUMNS, [{ name: 'a', amount: -5 }]);
    expect(csv.trimEnd().split('\r\n')[1]).toBe('"a",-5');
  });

  it('ทุกแถวมีจำนวนคอลัมน์เท่าหัวตาราง', () => {
    const rows: Row[] = [
      { name: 'a"b', amount: 1 },
      { name: 'c,d', amount: 2 },
    ];
    const lines = toCsv(COLUMNS, rows).trimEnd().split('\r\n');
    const cells = (line: string) => line.match(/(?:"(?:[^"]|"")*"|[^,]*)/g)?.filter(Boolean).length;
    expect(lines).toHaveLength(3);
    for (const line of lines) expect(cells(line)).toBe(COLUMNS.length);
  });
});
