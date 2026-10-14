// kit: ugt-nextjs-platform 4.78.0 · ugt-nextjs-auth-setup/lib/org-email.ts
// kit-hash: a16426e1563a
// installed by ugt-nextjs-auth-setup — every project with SSO or LDAP
//
// องค์กรเดียวมีโดเมนอีเมลมากกว่าหนึ่งตัวที่หมายถึงกล่องเดียวกัน (เช่น ube.com กับ
// ube.co.th) — AD ส่งมาแบบหนึ่ง ฐาน HR อีกแบบ แล้วแถวเดียวกันโผล่สองอีเมล
// `ORG_EMAIL_DOMAINS` = รายการคั่น comma ตัวแรกคือโดเมนหลัก (ที่เก็บ/แสดง/ส่งเมล)
//
// โดเมนองค์กรเป็นของ SSO/LDAP เท่านั้น: บัญชี local บนโดเมนนี้สร้างไม่ได้และ
// login ไม่ได้ — ไม่งั้นคนที่ถือรหัส local บนอีเมลพนักงานจะได้ตัวตน SSO ของ
// พนักงานคนนั้นไปด้วยตอน Better Auth link บัญชีด้วยอีเมล (SKILL.md §2 ข้อ 10)
//
// ฟังก์ชันรับ `domains` เป็นพารามิเตอร์ (ค่าเริ่มต้นมาจาก env) เพื่อให้ test ส่งค่าเองได้
import { env } from '@/lib/env';

/** "ube.com, @UBE.co.th" → ['ube.com', 'ube.co.th'] — ตัวแรกคือโดเมนหลัก */
export function parseOrgDomains(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

const ORG_DOMAINS = parseOrgDomains(env.ORG_EMAIL_DOMAINS);

function splitEmail(email: string): { local: string; domain: string } | null {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return null;
  return { local: trimmed.slice(0, at), domain: trimmed.slice(at + 1).toLowerCase() };
}

/** อีเมลนี้อยู่บนโดเมนองค์กรไหม (ไม่สนตัวพิมพ์) — ไม่ได้ตั้ง env = false เสมอ */
export function isOrgEmail(email: string, domains: string[] = ORG_DOMAINS): boolean {
  const parts = splitEmail(email);
  return !!parts && domains.includes(parts.domain);
}

/**
 * อีเมลองค์กร → ตัวพิมพ์เล็กบนโดเมนหลัก (`Somchai.J@UBE.co.th` → `somchai.j@ube.com`)
 * อีเมลนอกองค์กรคืนตามเดิม (แค่ trim) — กล่องจดหมายองค์กรไม่สนตัวพิมพ์ แต่ของ
 * ข้างนอกเราไม่รู้ จึงไม่แตะ
 */
export function toCanonicalEmail(email: string, domains: string[] = ORG_DOMAINS): string {
  const parts = splitEmail(email);
  if (!parts || !domains.includes(parts.domain)) return email.trim();
  return `${parts.local.toLowerCase()}@${domains[0]}`;
}

/** ทุกรูปที่หมายถึงกล่องเดียวกัน — ใช้หาแถวที่เก็บไว้ก่อนมี ORG_EMAIL_DOMAINS */
export function orgEmailVariants(email: string, domains: string[] = ORG_DOMAINS): string[] {
  const parts = splitEmail(email);
  if (!parts || !domains.includes(parts.domain)) return [email.trim()];
  const local = parts.local.toLowerCase();
  // รูปเดิมตามที่เก็บไว้ด้วย — SQL Server collation ทั่วไปไม่สนตัวพิมพ์อยู่แล้ว แต่ไม่ต้องพึ่ง
  return [...new Set([email.trim(), ...domains.map((d) => `${local}@${d}`)])];
}
