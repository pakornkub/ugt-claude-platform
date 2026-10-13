/**
 * One-off: import the two sample rows that lived in the prototype's hard-coded
 * REQUESTS array (app/page.tsx) into the LeaveRequests table.
 *
 *   npx tsx scripts/seed-from-prototype.ts
 *
 * Idempotent — re-running does not duplicate rows. This is demo data for dev;
 * do NOT run it against production. Delete this file once dev no longer needs
 * the sample rows (decision recorded in docs/project-context/decisions.md).
 */
import { prisma } from '@/lib/prisma';

const PROTOTYPE_ROWS = [
  { employeeName: 'สมชาย', totalDays: 2, status: 'pending' },
  { employeeName: 'สมหญิง', totalDays: 1, status: 'approved' },
];

async function main() {
  for (const row of PROTOTYPE_ROWS) {
    const existing = await prisma.leaveRequest.findFirst({
      where: { employeeName: row.employeeName, createdBy: 'prototype-import' },
      select: { id: true },
    });
    if (existing) {
      console.log(`skip (already imported): ${row.employeeName}`);
      continue;
    }
    // CreatedBy stays NOT NULL per the org audit-column convention — auth is
    // not installed yet, so imported rows carry a fixed marker instead of a user.
    await prisma.leaveRequest.create({ data: { ...row, createdBy: 'prototype-import' } });
    console.log(`imported: ${row.employeeName}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
