// source: gov-boi-smart lib/pagination.ts — installed by ugt-nextjs-design-setup (org UI kit)
// แปลงค่าดิบจาก searchParams เป็นพารามิเตอร์ query (pure) — ใช้ร่วมทุกหน้ารายการ
// table-query.ts (โหมด server ของ DataTable) พึ่ง firstParam จากไฟล์นี้

// DESIGN.md §4: pagination default 10 แถว/หน้า (ตัวเลือก 10/20/50)
export const DEFAULT_PAGE_SIZE = 10;

export interface PageParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

// searchParams ให้ค่าเป็น string | string[] | undefined — เอาค่าแรกเสมอ
export function firstParam(raw: string | string[] | undefined): string {
  return (Array.isArray(raw) ? raw[0] : raw) ?? '';
}

// ค่าเพี้ยนทุกแบบ (ว่าง/0/ติดลบ/ทศนิยม/ตัวอักษร) → หน้า 1 ไม่ throw
export function parsePageParams(
  raw: string | string[] | undefined,
  pageSize: number = DEFAULT_PAGE_SIZE
): PageParams {
  const parsed = Number(firstParam(raw));
  const page = Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

// ไม่มีข้อมูลก็ยังนับเป็น 1 หน้า — UI จะได้ไม่แสดง "หน้า 1 จาก 0"
export function getTotalPages(count: number, pageSize: number = DEFAULT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

// ตั้งค่า page ใหม่ใน query string เดิม โดยคงพารามิเตอร์อื่นไว้ครบ (pure)
// ใช้สร้างปลายทาง redirect เมื่อ ?page เกิน totalPages
export function withPage(params: string, page: number): string {
  const search = new URLSearchParams(params);
  search.set('page', String(page));
  return search.toString();
}
