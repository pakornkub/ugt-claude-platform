// source: gov-boi-smart lib/table-query.ts — installed by ugt-nextjs-design-setup
// (ต้องมี lib/pagination.ts ที่ export firstParam อยู่ในโปรเจกต์ด้วย)
// แปลง searchParams เป็นสถานะตาราง (sort + filter รายคอลัมน์) และแปลงกลับ — pure ทั้งไฟล์
// allowlist คือประตูความปลอดภัย: ค่าจาก URL ต้องไม่ถึง orderBy/where ของ Prisma
// โดยไม่ผ่านรายชื่อฟิลด์ที่หน้านั้นประกาศไว้ · คีย์แปลกปลอมถูกทิ้งเงียบ ไม่ throw
// (ผู้ใช้แก้ URL มั่วไม่ควรได้หน้า error)
import { firstParam } from '@/lib/pagination';

export const FILTER_PREFIX = 'f_';

export interface TableFields {
  readonly sortable: readonly string[];
  readonly filterable: readonly string[];
}

export interface TableQuery {
  sort: string | null;
  dir: 'asc' | 'desc';
  filters: Record<string, string>;
}

export function parseTableQuery(
  sp: Record<string, string | string[] | undefined>,
  fields: TableFields
): TableQuery {
  const rawSort = firstParam(sp.sort).trim();
  // วนจาก allowlist ไม่ใช่จากคีย์ที่ผู้ใช้ส่งมา — คีย์นอกรายการจึงไม่มีทางหลุดเข้าไป
  const filters: Record<string, string> = {};
  for (const key of fields.filterable) {
    const value = firstParam(sp[FILTER_PREFIX + key]).trim();
    if (value) filters[key] = value;
  }
  return {
    sort: fields.sortable.includes(rawSort) ? rawSort : null,
    dir: firstParam(sp.dir) === 'desc' ? 'desc' : 'asc',
    filters,
  };
}

// undefined = ไม่ได้สั่ง sort → หน้าเรียกใช้ค่า default ของตัวเองต่อ
export function toOrderBy(q: TableQuery): Record<string, 'asc' | 'desc'> | undefined {
  return q.sort ? { [q.sort]: q.dir } : undefined;
}

// SQL Server collation เป็น case-insensitive อยู่แล้ว ไม่ต้องใส่ mode (Prisma ไม่รองรับบน MSSQL)
export function toWhere(q: TableQuery): Record<string, { contains: string }> {
  return Object.fromEntries(Object.entries(q.filters).map(([k, v]) => [k, { contains: v }]));
}

export function toParams(q: TableQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (q.sort) {
    params.set('sort', q.sort);
    params.set('dir', q.dir);
  }
  for (const [key, value] of Object.entries(q.filters)) params.set(FILTER_PREFIX + key, value);
  return params;
}

// baseParams ที่หน้าส่งมามีสถานะตารางชุดเดิมติดอยู่ด้วย — ต้องล้างก่อนใส่ชุดใหม่
// page ถูกลบทุกครั้ง: เงื่อนไขเปลี่ยนแล้วเลขหน้าเดิมไม่มีความหมาย
export function withTableQuery(baseParams: string, q: TableQuery): string {
  const params = new URLSearchParams(baseParams);
  params.delete('page');
  params.delete('sort');
  params.delete('dir');
  for (const key of [...params.keys()]) {
    if (key.startsWith(FILTER_PREFIX)) params.delete(key);
  }
  for (const [key, value] of toParams(q)) params.set(key, value);
  return params.toString();
}
