# __PROJECT_NAME__ — Motion Inventory

> รายการจุด motion ที่**เพิ่มเอง**นอกเหนือจากที่ shadcn/tw-animate ให้มา
> (dialog/dropdown/skeleton มี motion ในตัวแล้ว — ไม่ต้องจดที่นี่)
> กฎรวม (จาก `DESIGN.md` ส่วน 7): **150–250ms ease-out · ระยะ ≤ 12px** ·
> CSS ก่อนเสมอ — แพ็กเกจ `motion` เฉพาะ layout animation (`layoutId`) และ
> enter/exit ของ element ที่ mount/unmount (`AnimatePresence`) · ทุกจุดเงียบ
> เมื่อ `prefers-reduced-motion: reduce` (จุดที่ใช้ `motion` ต้องเรียก
> `useReducedMotion()` เอง)

| # | จุด | ที่ | กลไก | สถานะ |
| --- | --- | --- | --- | --- |
| | | | | |

## กฎการเพิ่มจุดใหม่

1. ถาม "ไม่มี animation แล้วเสียอะไร" — ถ้าไม่เสีย = ไม่ใส่
2. CSS transition/animation ก่อนเสมอ · `motion` เมื่อต้อง
   layoutId/AnimatePresence เท่านั้น
3. duration 150–250ms · ease-out · ระยะเคลื่อน ≤ 12px
4. จุดที่ใช้ `motion`: guard ด้วย `useReducedMotion()` แล้วปิด transform
   (เหลือ opacity ได้)
