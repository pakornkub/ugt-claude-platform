// installed by ugt-nextjs-auth-setup — [METHOD: LOCAL], run once
//
//   npx tsx scripts/create-first-user.ts "ชื่อ" you@company.co.th 'InitialPass1'
//
// แก้ปัญหาไก่กับไข่ของโปรเจคที่มีแต่ local login: บัญชี local สร้างได้จาก
// /admin/users เท่านั้น แต่หน้านั้นต้อง login ก่อน และยังไม่มีใครให้ login
// (SSO/LDAP ไม่เจอปัญหานี้ — บัญชีเกิดเองตอน bind สำเร็จครั้งแรก)
//
// รันครั้งเดียวตอนติดตั้ง แล้วเอาบัญชีนี้ไปกด /admin/setup เพื่อรับสิทธิ์
// Administrator จากนั้นสร้างคนอื่นผ่านหน้าเว็บได้ตามปกติ
// **อย่าใส่รหัสผ่านจริงลงใน shell history ที่แชร์กัน และให้เจ้าตัวเปลี่ยนทันที**

import { auth } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { passwordSchema } from '../lib/password-policy';

const [name, email, password] = process.argv.slice(2);

if (!name || !email || !password) {
  console.error('usage: npx tsx scripts/create-first-user.ts "<ชื่อ>" <email> <password>');
  process.exit(1);
}

// กฎเดียวกับทุกฟอร์มในแอป — บัญชีแรกไม่ใช่ข้อยกเว้น
const parsed = passwordSchema.safeParse(password);
if (!parsed.success) {
  console.error(`รหัสผ่านไม่ผ่านกฎ: ${parsed.error.issues[0]?.message}`);
  process.exit(1);
}

// สคริปต์นี้ไว้ปลุกโปรเจคเปล่า ไม่ใช่ทางลัดสร้างผู้ใช้ทั่วไป —
// มีคนอยู่แล้วเมื่อไหร่ ให้ไปใช้ /admin/users ซึ่งมี guard และ audit log ครบ
const existing = await prisma.user.count();
if (existing > 0) {
  console.error(`มีผู้ใช้ในระบบแล้ว ${existing} คน — สร้างคนถัดไปที่ /admin/users`);
  process.exit(1);
}

const created = await auth.api.signUpEmail({ body: { name, email, password } });
await prisma.user.update({ where: { id: created.user.id }, data: { authType: 'local' } });

console.log(`สร้างบัญชี ${email} แล้ว — เข้าสู่ระบบ แล้วไปที่ /admin/setup เพื่อรับสิทธิ์ Administrator`);
await prisma.$disconnect();
