// kit: ugt-nextjs-platform 4.30.0 · ugt-nextjs-auth-setup/lib/password-policy.ts
// kit-hash: 85dfdeb22d0a
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

/** ข้อความบอกกฎ แสดงใต้ช่องกรอกทุกที่ที่ตั้งรหัสผ่าน */
export const PASSWORD_POLICY_HINT =
  `อย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร และต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลข`;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `รหัสผ่านต้องยาวอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`)
  .max(PASSWORD_MAX_LENGTH, `รหัสผ่านต้องไม่เกิน ${PASSWORD_MAX_LENGTH} ตัวอักษร`)
  .regex(/[a-z]/, 'ต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
  .regex(/[A-Z]/, 'ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
  .regex(/\d/, 'ต้องมีตัวเลขอย่างน้อย 1 ตัว');
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
  message: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน',
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
  .extend({ currentPassword: z.string().min(1, 'กรอกรหัสผ่านปัจจุบัน') })
  .refine(confirmMatches, confirmMismatch);
export type ChangePasswordValues = z.infer<typeof newPasswordFields> & { currentPassword: string };

/** แอดมินตั้งรหัสให้ผู้ใช้คนอื่น — ไม่ต้องยืนยันสองครั้ง (คนตั้งไม่ใช่เจ้าของรหัส) */
export const setPasswordFormSchema = z.object({ password: passwordSchema });
export type SetPasswordValues = z.infer<typeof setPasswordFormSchema>;
