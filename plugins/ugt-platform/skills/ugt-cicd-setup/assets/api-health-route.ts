// Health endpoint ที่ Dockerfile HEALTHCHECK และ compose healthcheck ทั้งสองไฟล์เรียก
// ถ้าไม่มีไฟล์นี้ container จะไม่เคยขึ้นสถานะ healthy → stage Deploy fail ทุกครั้ง
//
// ต้องเข้าถึงได้โดยไม่ต้อง login — proxy.ts ของ ugt-auth-setup bypass path นี้ไว้แล้ว
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // [DB]

// บังคับ dynamic — ไม่งั้น Next.js จะ prerender เป็น static แล้วสถานะค้างที่ค่าตอน build
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {};

  // [DB] start — ลบทั้ง block นี้ (และ import ด้านบน) ถ้าโปรเจคไม่มี database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }
  // [DB] end

  // ไม่มี check เลย (โปรเจคไม่มี DB) → every() บน array ว่างคืน true → ok
  const ok = Object.values(checks).every((status) => status === 'ok');

  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      // ห้ามใส่ version / framework / commit sha — endpoint นี้เปิดสาธารณะ
      // ข้อมูลพวกนั้นทำให้คนนอกรู้ว่าควรยิงช่องโหว่รุ่นไหน
      checks,
    },
    { status: ok ? 200 : 503 }
  );
}
