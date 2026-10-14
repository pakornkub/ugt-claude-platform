'use server';

// lib/actions/leave-requests.ts — create a คำขอลา (every logged-in user may submit).
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type ActionResult = { success: true; id: number } | { success: false; code: string };

const createSchema = z.object({
  employeeName: z.string().trim().min(1).max(200),
  totalDays: z.number().int().min(1).max(60),
});

export async function createLeaveRequestAction(input: z.input<typeof createSchema>): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, code: 'UNAUTHORIZED' };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { success: false, code: 'INVALID_INPUT' };

  const row = await prisma.leaveRequest.create({
    data: { ...parsed.data, createdBy: session.user.id },
    select: { id: true },
  });

  revalidatePath('/leave');
  return { success: true, id: row.id };
}
