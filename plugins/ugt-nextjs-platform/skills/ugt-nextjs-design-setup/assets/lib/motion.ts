// installed by ugt-nextjs-design-setup — ติดตั้งเฉพาะโปรเจคที่ตอบ "มี custom
// motion" ตอนสัมภาษณ์ (คู่กับ docs/MOTION.md) · dep: `motion`
//
// ตัวเลขกลางของข้อตกลง motion (DESIGN.md §7 / MOTION.md) ในรูปที่ import ได้ —
// จุดประสงค์เดียวคือกันแต่ละหน้าตั้งเลขเอง แล้ว 180ms หน้าหนึ่ง 400ms อีกหน้า
//
// ลำดับการตัดสินใจยังเป็นของเดิม ไฟล์นี้ไม่ได้เปลี่ยน:
//   1. เอาออกแล้วไม่เสียอะไร → ไม่ต้องใส่
//   2. CSS ทำได้ → ใช้ CSS (transition/animation ปกติ ไม่ต้องแตะไฟล์นี้)
//   3. ต้อง layout animation / enter–exit จริง ๆ → ค่อยใช้ `motion` กับค่าชุดนี้
//      และบันทึกจุดที่เพิ่มลง docs/MOTION.md
//
// motion/react เคารพ prefers-reduced-motion ให้เองเฉพาะบางกรณี — component ที่
// เคลื่อนตำแหน่ง (layout, slide) ต้องเช็ค useReducedMotion() เองแล้วปิดระยะเคลื่อน
// ตัวอย่างจริง: tab underline ของ ugt-hrms ใช้ layoutId + useReducedMotion

import type { Transition, Variants } from 'motion/react';

/** 150–250ms ease-out — ทุก transition ในแอปใช้ก้อนนี้ ไม่ตั้งเลขเอง */
export const MOTION_TRANSITION: Transition = { duration: 0.2, ease: 'easeOut' };

/** ระยะเคลื่อนสูงสุดตามข้อตกลง — เกินนี้อ่านเป็น "ของบิน" ไม่ใช่ "ของโผล่" */
export const MOTION_DISTANCE = 12;

/**
 * ชุด variants มาตรฐานสำหรับ enter/exit — ใช้กับ `motion.div` ตรง ๆ:
 *
 *   <motion.div variants={fadeSlideUp} initial="hidden" animate="visible" exit="hidden">
 *
 * ส่ง `reduced` (จาก useReducedMotion()) เพื่อตัดระยะเคลื่อนทิ้งให้เหลือแค่ fade —
 * "เงียบเมื่อผู้ใช้ขอ" เป็นกฎ ไม่ใช่ตัวเลือก
 */
export function fadeSlideUp(reduced: boolean | null): Variants {
  const y = reduced ? 0 : MOTION_DISTANCE;
  return {
    hidden: { opacity: 0, y, transition: MOTION_TRANSITION },
    visible: { opacity: 1, y: 0, transition: MOTION_TRANSITION },
  };
}

export function fadeOnly(): Variants {
  return {
    hidden: { opacity: 0, transition: MOTION_TRANSITION },
    visible: { opacity: 1, transition: MOTION_TRANSITION },
  };
}
