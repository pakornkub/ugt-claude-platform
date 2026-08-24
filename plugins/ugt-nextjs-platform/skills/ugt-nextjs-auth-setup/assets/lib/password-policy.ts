// kit: ugt-nextjs-platform 4.46.1 · ugt-nextjs-auth-setup/lib/password-policy.ts
// kit-hash: 0e49cdd56308
// installed by ugt-nextjs-auth-setup — [METHOD: LOCAL] only
//
// ที่เดียวที่นิยาม "รหัสผ่านที่รับได้" ของโปรเจค — ใช้ร่วมกันทั้งฟอร์มตั้งรหัสใหม่,
// เปลี่ยนรหัสผ่าน และหน้าที่แอดมินสร้างผู้ใช้ ถ้าสามที่นี้ตรวจกันคนละแบบ ผู้ใช้จะ
// เจอกฎที่เปลี่ยนไปตามหน้าจอ และกฎที่หลวมที่สุดคือกฎจริงของระบบ
//
// `minPasswordLength` ใน lib/auth.ts เป็นพื้นของ Better Auth (กันฝั่ง API)
// ส่วนความซับซ้อนอยู่ที่นี่ — ต้องตรงกัน: แก้ที่นี่แล้วแก้ที่นั่นด้วย

import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;
/** ตรงกับ maxPasswordLength ของ Better Auth — สายอักขระยาว ๆ ทำให้ hash กิน CPU */
export const PASSWORD_MAX_LENGTH = 128;

// PASSWORD_POLICY_HINT deleted — the hint text now lives at auth.passwordPolicy.hint
// (Task 1), interpolated with PASSWORD_MIN_LENGTH by each consumer:
//   t('passwordPolicy.hint', { min: PASSWORD_MIN_LENGTH })

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, 'PASSWORD_TOO_SHORT')
  .max(PASSWORD_MAX_LENGTH, 'PASSWORD_TOO_LONG')
  .regex(/[a-z]/, 'PASSWORD_NEED_LOWER')
  .regex(/[A-Z]/, 'PASSWORD_NEED_UPPER')
  .regex(/\d/, 'PASSWORD_NEED_DIGIT');
// EXTENSION POINT: โปรเจคที่ต้องบังคับอักขระพิเศษเพิ่มบรรทัดนี้ แล้วแก้ HINT ให้ตรง
//   .regex(/[^\w\s]/, 'ต้องมีอักขระพิเศษอย่างน้อย 1 ตัว')

// ─── ฟอร์ม ───────────────────────────────────────────────────────────────────
// ทุกฟอร์มรหัสผ่าน resolve จาก schema ในไฟล์นี้ (react-hook-form + zodResolver)
// — อย่าประกาศกฎซ้ำที่ component ไม่งั้นกฎที่หลวมกว่าจะกลายเป็นกฎจริง

/** ช่อง "รหัสใหม่ + ยืนยัน" ก่อนผูกกฎว่าต้องตรงกัน — ฐานของสองฟอร์มล่าง */
const newPasswordFields = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
});

const confirmMatches = (v: { password: string; confirmPassword: string }) =>
  v.password === v.confirmPassword;
const confirmMismatch = {
  message: 'PASSWORD_MISMATCH',
  path: ['confirmPassword'] as const,
};

/** หน้า reset จากลิงก์ในอีเมล — ไม่มีรหัสเดิมให้กรอก (ผู้ใช้จำไม่ได้อยู่แล้ว) */
export const newPasswordSchema = newPasswordFields.refine(confirmMatches, confirmMismatch);
export type NewPasswordValues = z.infer<typeof newPasswordFields>;

/**
 * เปลี่ยนรหัสผ่านเอง — ต้องยืนยันรหัสเดิมด้วย (แลปท็อปที่เปิดค้างไว้ = ยึดบัญชี
 * ได้ทันทีถ้าเชื่อแค่ session) · refine ผูกหลัง extend ไม่ใช่ก่อน เพราะผลลัพธ์
 * ของ .refine() ไม่ใช่ ZodObject อีกต่อไปจึง .extend() ต่อไม่ได้
 */
export const changePasswordFormSchema = newPasswordFields
  .extend({ currentPassword: z.string().min(1, 'CURRENT_PASSWORD_REQUIRED') })
  .refine(confirmMatches, confirmMismatch);
export type ChangePasswordValues = z.infer<typeof newPasswordFields> & { currentPassword: string };

/** แอดมินตั้งรหัสให้ผู้ใช้คนอื่น — ไม่ต้องยืนยันสองครั้ง (คนตั้งไม่ใช่เจ้าของรหัส) */
export const setPasswordFormSchema = z.object({ password: passwordSchema });
export type SetPasswordValues = z.infer<typeof setPasswordFormSchema>;
