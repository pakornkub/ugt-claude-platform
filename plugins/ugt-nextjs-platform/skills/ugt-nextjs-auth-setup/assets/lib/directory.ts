// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-auth-setup/lib/directory.ts
// kit-hash: bfe1ad6c11c1
// source: ugt-hrms lib/hr-lookup.ts — generalized by ugt-nextjs-auth-setup
// (HR-domain helpers removed: work-group/shift rules, leave quota, approval
//  chains, subordinate BFS — those are feature code, not identity)
//
// ทำไมต้องมีไฟล์นี้: SSO กับ LDAP ให้แค่ "คุณคือใคร" — username, อีเมล, ชื่อที่แสดง
// แต่แอปในองค์กรต้องรู้มากกว่านั้นแทบทุกตัว: รหัสพนักงาน หน่วยงาน ตำแหน่ง
// ศูนย์ต้นทุน ชื่อไทย ผู้บังคับบัญชา ข้อมูลชุดนี้อยู่ในฐานพนักงานกลางที่อ่านผ่าน
// linked server ไม่ได้อยู่ใน Keycloak หรือ AD
//
// **read-only เท่านั้น** — กฎการเขียน SQL ข้าม linked server (SELECT อย่างเดียว,
// CAST ทุกคอลัมน์, ห้าม recursive CTE, ต้องไม่บล็อก flow หลัก) อยู่ใน
// ugt-nextjs-database-setup → references/raw-sql-and-sp.md ที่เดียว ไม่ทำซ้ำที่นี่

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** ข้อมูลพนักงานหนึ่งคนจากฐานกลาง — ปรับชื่อฟิลด์/คอลัมน์ให้ตรง view ขององค์กร */
export interface DirectoryPerson {
  loginName: string;
  empCode: string;
  email: string | null;
  nameEn: string | null;
  nameTh: string | null;
  position: string | null;
  department: string | null;
  /** รหัสหน่วยงาน — ใช้ทำ scope "เห็นเฉพาะหน่วยงานตัวเอง" */
  orgCode: string | null;
  /** รหัสพนักงานของหัวหน้า — ใช้ทำสายอนุมัติ */
  superEmpCode: string | null;
}

// ตัวระบุตัวตนที่รับได้ ตรวจก่อนส่งเข้า query เสมอ แม้ค่าจะถูกส่งเป็น parameter —
// ค่าที่หลุด format เข้ามาแปลว่ามีที่ไหนสักแห่งข้าม validation มา ให้รู้ตั้งแต่ตรงนี้
const IDENTIFIER = /^[a-zA-Z0-9_.@-]+$/;

// ⚠️ PLACEHOLDER: เปลี่ยนเป็น view จริงขององค์กร (ชื่อสี่ส่วน) แล้วแม็ปชื่อคอลัมน์
// ด้านล่างให้ตรงของจริง
//
// ชื่อ view กับรายชื่อคอลัมน์ต้องผ่าน `Prisma.raw` เพราะเป็น "ตัวระบุ" ไม่ใช่ "ค่า" —
// ถ้าใส่เป็น `${...}` ธรรมดาใน $queryRaw มันจะกลายเป็น parameter แล้ว SQL พังทันที
// ทั้งสองค่าเป็นค่าคงที่ในโค้ด ไม่ใช่ input จากผู้ใช้ (ค่าที่มาจากผู้ใช้ห้ามเข้า raw)
const VIEW = Prisma.raw('__LINKED_SERVER__.__HR_DB__.dbo.__HR_EMPLOYEE_VIEW__');

const COLUMNS = Prisma.raw(`
  CAST(u.ADLoginName   AS VARCHAR(100))  AS loginName,
  CAST(u.EmpCode       AS VARCHAR(50))   AS empCode,
  CAST(u.CurrentEmail  AS VARCHAR(100))  AS email,
  CAST(u.FullNameEng   AS NVARCHAR(200)) AS nameEn,
  CAST(u.FullNameThai  AS NVARCHAR(200)) AS nameTh,
  CAST(u.PostNameEng   AS NVARCHAR(200)) AS position,
  CAST(u.CostCenterEng AS NVARCHAR(200)) AS department,
  CAST(u.OrgCode3      AS VARCHAR(20))   AS orgCode,
  CAST(u.SuperEmpCode  AS VARCHAR(50))   AS superEmpCode
`);

/**
 * หาพนักงานจากชื่อผู้ใช้ AD (คีย์เดียวกับที่ใช้ login)
 *
 * คืน null เมื่อไม่พบ **หรือเมื่อ linked server ล่ม** โดยตั้งใจ — ฟังก์ชันนี้ถูก
 * เรียกระหว่าง login ถ้ามันโยน exception ฐานพนักงานล่มจะกลายเป็น "ทุกคน login
 * ไม่ได้" ซึ่งแย่กว่าการที่ชื่อไทยหายไปชั่วคราวมาก
 */
export async function getDirectoryPerson(loginName: string): Promise<DirectoryPerson | null> {
  if (!IDENTIFIER.test(loginName)) return null;
  try {
    const rows = await prisma.$queryRaw<DirectoryPerson[]>`
      SELECT TOP 1 ${COLUMNS} FROM ${VIEW} AS u WHERE u.ADLoginName = ${loginName}
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error('[directory] lookup failed:', loginName, error); // NOSONAR typescript:S106 — server-side error log only
    return null;
  }
}

/** เหมือนด้านบนแต่ค้นด้วยรหัสพนักงาน — ใช้ตอนต้องแสดงชื่อเจ้าของ record */
export async function getDirectoryPersonByEmpCode(
  empCode: string
): Promise<DirectoryPerson | null> {
  if (!IDENTIFIER.test(empCode)) return null;
  try {
    const rows = await prisma.$queryRaw<DirectoryPerson[]>`
      SELECT TOP 1 ${COLUMNS} FROM ${VIEW} AS u WHERE u.EmpCode = ${empCode}
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error('[directory] lookup by empCode failed:', empCode, error); // NOSONAR typescript:S106 — server-side error log only
    return null;
  }
}

/**
 * ค้นพนักงานด้วยชื่อ/รหัส/ชื่อผู้ใช้ AD — ใช้ในกล่องค้นหาตอนแอดมินตั้งบัญชี AD
 * ล่วงหน้า และในตัวเลือก "ผู้รับผิดชอบ" ของฟีเจอร์ต่าง ๆ
 *
 * จำกัดผลไว้ 50 แถวเสมอ และไม่ค้นจากอักษรเดียว: view นี้อยู่อีกเซิร์ฟเวอร์
 * ผลลัพธ์หลายพันแถวคือค่าใช้จ่ายที่จ่ายข้ามเครือข่ายทุกครั้งที่มีคนพิมพ์
 */
export async function searchDirectory(query: string): Promise<DirectoryPerson[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const term = `%${trimmed}%`;
  try {
    return await prisma.$queryRaw<DirectoryPerson[]>`
      SELECT TOP 50 ${COLUMNS}
      FROM ${VIEW} AS u
      WHERE u.ADLoginName  LIKE ${term}
         OR u.EmpCode      LIKE ${term}
         OR u.FullNameEng  LIKE ${term}
         OR u.FullNameThai LIKE ${term}
      ORDER BY u.FullNameEng
    `;
  } catch (error) {
    console.error('[directory] search failed:', error); // NOSONAR typescript:S106 — server-side error log only
    return [];
  }
}

/** เส้นสายบังคับบัญชาหนึ่งเส้น: พนักงาน → หัวหน้าโดยตรง */
export interface DirectoryEdge {
  empCode: string;
  superEmpCode: string | null;
}

/**
 * ดึงคู่ (พนักงาน, หัวหน้า) ทั้ง view ครั้งเดียวเพื่อเอาไปไล่สายใน JS
 *
 * **จงใจไม่ใช้ recursive CTE** ถึงจะเขียนสั้นกว่ามาก — CTE แบบวนซ้ำข้าม linked
 * server ทำให้ SQL Server ดึงข้อมูลข้ามเครือข่ายรอบใหม่ทุกชั้นความลึก
 * ดึงทีเดียวแล้ว BFS ในหน่วยความจำเร็วกว่าและคาดเดาได้กว่า (กฎเดียวกับที่
 * ugt-nextjs-database-setup → references/raw-sql-and-sp.md เขียนไว้)
 *
 * ponytail: อ่านทั้ง view ทุกครั้งที่เรียก พอสำหรับองค์กรหลักพันคน
 * ถ้าโตกว่านั้นค่อยแคชผลไว้ต่อ request
 */
export async function getDirectoryEdges(): Promise<DirectoryEdge[]> {
  try {
    return await prisma.$queryRaw<DirectoryEdge[]>`
      SELECT
        CAST(u.EmpCode      AS VARCHAR(50)) AS empCode,
        CAST(u.SuperEmpCode AS VARCHAR(50)) AS superEmpCode
      FROM ${VIEW} AS u
      WHERE u.EmpCode IS NOT NULL
    `;
  } catch (error) {
    console.error('[directory] edge list failed:', error); // NOSONAR typescript:S106 — server-side error log only
    return [];
  }
}

/**
 * ฟิลด์ที่เอาไปเขียนทับบนแถว user — เรียกจากทั้ง LDAP login และ SSO session hook
 * เพื่อให้ทั้งสองทางได้ข้อมูลชุดเดียวกัน ถ้าแยกกันเขียน ผู้ใช้ SSO กับผู้ใช้ AD
 * จะมีฟิลด์ไม่เท่ากันโดยไม่มีใครรู้ จนกว่าจะมีหน้าจอที่ต้องใช้ฟิลด์นั้น
 *
 * คืน `{}` เมื่อหาไม่เจอ — spread ลงใน update ได้เลยโดยไม่ล้างของเดิมทิ้ง
 */
export function directoryUserFields(person: DirectoryPerson | null) {
  if (!person) return {};
  return {
    empCode: person.empCode || undefined,
    fullNameThai: person.nameTh || undefined,
    position: person.position || undefined,
    department: person.department || undefined,
    orgCode: person.orgCode || undefined,
    superEmpCode: person.superEmpCode || undefined,
  };
}
