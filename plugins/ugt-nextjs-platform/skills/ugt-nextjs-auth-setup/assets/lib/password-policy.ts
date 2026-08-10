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

/** ฟอร์มที่ให้กรอกรหัสใหม่สองครั้ง — ใช้ร่วมกันทั้งหน้า reset และ dialog เปลี่ยนรหัส */
export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน',
    path: ['confirmPassword'],
  });
