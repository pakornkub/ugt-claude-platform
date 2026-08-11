// source: ugt-hrms lib/http-error.ts — installed by ugt-nextjs-design-setup
// ทุก queryFn ที่ fetch แล้ว response ไม่ OK ต้องโยนตัวนี้ (แนบ status) —
// QueryProvider ใช้ status แยก 401 (session หมดอายุ) ออกจาก error ธรรมดา
// โยน Error เปล่าเมื่อไหร่ 401 จะกลายเป็น toast error ปกติแทนการพาไป login ใหม่

/** Thrown by queryFns when a fetch response is not OK, with the HTTP status attached. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Map a Server Action error string to an HTTP status code for route handlers. */
export function actionErrorStatus(error: string): number {
  if (error === 'Not authenticated') return 401;
  if (error === 'Forbidden') return 403;
  return 400;
}
