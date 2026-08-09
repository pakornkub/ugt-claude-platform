# Project Context — สารบัญ

<!-- ไฟล์เดียวในโฟลเดอร์นี้ที่โหลดทุก session (CLAUDE.md import) — คุมให้สั้น ~25 บรรทัด
     เนื้อหาจริงเปิดอ่านเมื่อเกี่ยวข้องเท่านั้น · อัปเดตผ่าน /ugt-handoff -->

| ไฟล์ | มีอะไร | เปิดเมื่อ |
| --- | --- | --- |
| `board.md` | สถานะ feature ทั้งโปรเจค | อยากรู้ว่าอะไรเสร็จ/ค้าง/ติดอะไร |
| `architecture.md` | module map · data flow · ตารางหลัก · ⚠ deviations | **ก่อน plan/implement ทุก feature** |
| `business-rules.md` | กติกา business ตามที่ระบบทำจริง (pointer เข้าโค้ด) | ก่อนแตะ logic ของโดเมนนั้น |
| `api.md` | ตาราง endpoint ทั้งหมด | ก่อนเพิ่ม/แก้/เรียก API |
| `decisions.md` | มติทั้งหมด (ยกเว้น design) — ห้าม revisit เงียบ ๆ | **ก่อนเสนอเปลี่ยนแนวทาง/lib/โครงสร้าง** |
| `troubleshooting.md` | อาการ→สาเหตุ→วิธีแก้ ที่เคยเจอในโปรเจคนี้ | เจอ error แปลก — เปิดก่อนเริ่ม debug |

บ้านความรู้อื่น (ไม่อยู่โฟลเดอร์นี้):

- มติเรื่อง design → `docs/DESIGN.md` §10 (sync mode ของ design-setup ใช้)
- งานถึงไหน / คิวถัดไป / คำถามค้าง → `.claude/state/handoff.md` (โหลดทุก session)
- ที่มาความต้องการ (as-requested) → `docs/requirements-brief/` — freeze หลัง feature นั้น done
