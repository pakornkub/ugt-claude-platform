// source: ugt-hrms (port/adapt จาก gov-boi-smart) — installed by ugt-nextjs-design-setup (org UI kit)
// port มาจาก gov-boi-smart `lib/pagination.ts` ปรับ default ให้ตรงมติ HRMS

/**
 * ตัวเลือก "แถวต่อหน้า" ชุดเดียวของทั้งแอป (มติ full option set 2026-08:
 * 10/20/50 — เดิม 10–50 ทีละ 10) · `components/ui/data-table.tsx` re-export
 * ชุดนี้ให้ call site เดิม · ตารางที่ทำ pagination เองฝั่ง server ต้อง import
 * ชุดนี้ ห้ามประกาศชุดของตัวเอง
 */
export const ROWS_PER_PAGE_OPTIONS = [10, 20, 50] as const;

/**
 * ค่าเริ่มต้นตาราง config/CRUD = 10 (default ของ DataTable) · ตารางเฝ้าดู/
 * ตรวจสอบที่ผู้ใช้กวาดตาหาความผิดปกติ = 20 (ตั้งที่ call site)
 */
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

// pageSize จาก URL ต้องอยู่ในชุดตัวเลือกเท่านั้น — ค่านอกชุด/เพี้ยน → fallback
// (กันผู้ใช้แก้ URL ขอ pageSize=100000 แล้วดึงทั้งตาราง)
export function parsePageSize(
  raw: string | string[] | undefined,
  fallback: number = DEFAULT_PAGE_SIZE
): number {
  const parsed = Number(firstParam(raw));
  return (ROWS_PER_PAGE_OPTIONS as readonly number[]).includes(parsed) ? parsed : fallback;
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
