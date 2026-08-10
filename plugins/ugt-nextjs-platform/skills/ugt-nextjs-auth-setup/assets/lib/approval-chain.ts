// source: ugt-hrms lib/services/workflow-resolver.ts (getAuthorizeChain) +
// hr-lookup.ts (getFirstApproverName, getHRSyncOrgs) — generalized by
// ugt-nextjs-auth-setup
//
// อ่าน **สายอนุมัติ** จาก view สิทธิ์อนุมัติขององค์กร: หนึ่งแถวต่อหนึ่งขั้น
// (EmpCode + Seq) โดยแต่ละแถวบอกว่าใครเป็นผู้อนุมัติขั้นนั้น
//
// ต่างจาก `superEmpCode` บน view พนักงาน ซึ่งเป็นหัวหน้าโดยตรงชั้นเดียวแบบ
// denormalize — ใช้แทนกันไม่ได้: สายอนุมัติจริงมีหลายขั้นและอาจไม่ใช่หัวหน้า
// สายตรงเสมอ (เช่นบางเรื่องข้ามไปฝ่ายบุคคล)
//
// ─── ข้อแตกต่างสำคัญจาก lib/directory.ts ────────────────────────────────────
// directory.ts **พังแบบเงียบ** (คืน null) เพราะมันทำงานระหว่าง login — ฐาน
// พนักงานล่มต้องไม่แปลว่าทุกคนเข้าระบบไม่ได้
//
// ไฟล์นี้ **พังแบบดัง** (โยน exception ต่อ) เพราะมันตอบคำถามว่า "คำขอนี้ต้อง
// ไปหาใคร" — คืน [] เงียบ ๆ ตอน query ล้ม แปลว่าคำขอถูกบันทึกโดยไม่มีผู้อนุมัติ
// ผู้ใช้เห็นว่า "ส่งแล้ว" และมันจะค้างอยู่อย่างนั้นจนกว่าจะมีคนมาทวงในอีกสองสัปดาห์
// ล้มตอนกดส่งยังดีกว่าเยอะ

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface ApprovalStep {
  /** ลำดับขั้น เริ่มที่ 1 */
  seq: number;
  approverEmpCode: string;
  approverName: string;
}

export interface OrgUnit {
  orgCode: string;
  orgName: string;
}

const IDENTIFIER = /^[a-zA-Z0-9_.@-]+$/;

// ⚠️ PLACEHOLDER: view สิทธิ์อนุมัติจริงขององค์กร (ชื่อสี่ส่วน) — ปกติคนละตัวกับ
// view พนักงานใน lib/directory.ts · ต้องผ่าน Prisma.raw เพราะเป็นตัวระบุ ไม่ใช่ค่า
const AUTHORIZE_VIEW = Prisma.raw('__LINKED_SERVER__.__HR_DB__.dbo.__HR_AUTHORIZE_VIEW__');

// จำนวนขั้นสูงสุดที่ยอมรับ — กันข้อมูลผิดปกติทำให้สายอนุมัติยาวไม่รู้จบ
// ต้องผ่าน Prisma.raw: `TOP ${n}` ธรรมดาจะกลายเป็น `TOP @P1` ซึ่ง T-SQL ไม่รับ
// ถ้าไม่ใส่วงเล็บ — ค่าเป็นค่าคงที่ในโค้ด ไม่ใช่ input จากผู้ใช้
const TOP_STEPS = Prisma.raw('TOP 10');

/**
 * สายอนุมัติของพนักงานคนหนึ่ง เรียงตามขั้น
 *
 * คืน `[]` เมื่อ **ไม่มีแถวจริง ๆ** (พนักงานยังไม่ถูกตั้งสายอนุมัติ) ซึ่งเป็นคนละ
 * เรื่องกับ query ล้ม — กรณีหลังโยนต่อโดยตั้งใจ ผู้เรียกต้องแยกสองกรณีนี้:
 * "ยังไม่ตั้งสาย" บอกผู้ใช้ให้ไปติดต่อ HR ส่วน "ระบบล่ม" ให้ลองใหม่
 */
export async function getApprovalChain(empCode: string): Promise<ApprovalStep[]> {
  if (!IDENTIFIER.test(empCode)) return [];
  try {
    const rows = await prisma.$queryRaw<
      Array<{ seq: number; approverEmpCode: string; approverName: string }>
    >`
      SELECT ${TOP_STEPS}
        CAST(u.Seq          AS INT)            AS seq,
        CAST(u.SuperEmpCode AS VARCHAR(50))    AS approverEmpCode,
        CAST(u.FullNameThai AS NVARCHAR(200))  AS approverName
      FROM ${AUTHORIZE_VIEW} AS u
      WHERE u.EmpCode = ${empCode}
      ORDER BY u.Seq ASC
    `;
    return rows
      .filter((r) => !!r.approverEmpCode)
      .map((r) => ({
        seq: Number(r.seq),
        approverEmpCode: r.approverEmpCode,
        approverName: r.approverName,
      }));
  } catch (error) {
    console.error('[approval-chain] chain lookup failed:', empCode, error); // NOSONAR typescript:S106 — server-side error log only
    throw error; // ตั้งใจ — ห้ามกลายเป็น "ไม่มีผู้อนุมัติ" โดยเงียบ
  }
}

/** ผู้อนุมัติขั้นแรก — null เมื่อพนักงานรายนี้ยังไม่ถูกตั้งสายอนุมัติ */
export async function getFirstApprover(empCode: string): Promise<ApprovalStep | null> {
  const chain = await getApprovalChain(empCode);
  return chain[0] ?? null;
}

/**
 * รายชื่อหน่วยงานทั้งหมด — ใช้เป็นตัวเลือกใน filter
 *
 * อันนี้พังแบบเงียบได้ (คืน []) ต่างจากสองตัวบน: มันเป็นแค่ตัวเลือกในดรอปดาวน์
 * ไม่ใช่คำตอบว่าคำขอต้องไปหาใคร
 */
export async function getOrgUnits(): Promise<OrgUnit[]> {
  try {
    return await prisma.$queryRaw<OrgUnit[]>`
      SELECT DISTINCT
        CAST(u.OrgCode3  AS VARCHAR(20))    AS orgCode,
        CAST(u.OrgTDesc3 AS NVARCHAR(200))  AS orgName
      FROM ${AUTHORIZE_VIEW} AS u
      WHERE u.OrgCode3 IS NOT NULL
      ORDER BY orgName
    `;
  } catch (error) {
    console.error('[approval-chain] org list failed:', error); // NOSONAR typescript:S106 — server-side error log only
    return [];
  }
}
