// source: ugt-hrms lib/services/permission-group-select.ts — installed by
// ugt-nextjs-auth-setup
//
// ตัวช่วย "เลือกทั้งกลุ่ม" ของ permission checklist ในฟอร์มบทบาท — client
// convenience ล้วน ๆ: payload ที่ส่งขึ้น server ยังเป็น permission ids แบน ๆ
// เหมือนเดิม แยกเป็นฟังก์ชันบริสุทธิ์เพื่อให้ทดสอบได้โดยไม่ต้อง render อะไร

/** สถานะ checkbox หัวกลุ่ม: เลือกครบ / บางส่วน (indeterminate) / ไม่เลือกเลย */
export type GroupSelectState = 'all' | 'some' | 'none';

export function groupState(
  groupIds: readonly string[],
  selectedIds: readonly string[]
): GroupSelectState {
  if (groupIds.length === 0) return 'none';
  const selected = new Set(selectedIds);
  const count = groupIds.reduce((n, id) => (selected.has(id) ? n + 1 : n), 0);
  if (count === 0) return 'none';
  if (count === groupIds.length) return 'all';
  return 'some';
}

/** แปลงสถานะกลุ่ม → ค่า checked ของ Checkbox (เลี่ยง nested ternary ที่ call site) */
export function groupCheckedValue(state: GroupSelectState): boolean | 'indeterminate' {
  if (state === 'all') return true;
  if (state === 'some') return 'indeterminate';
  return false;
}

/**
 * สลับเลือกทั้งกลุ่ม: ทั้งกลุ่มถูกเลือกอยู่แล้ว → เอาออกทั้งกลุ่ม;
 * ไม่งั้น → เพิ่มเฉพาะตัวที่ยังขาด (คงลำดับเดิม ต่อท้ายด้วยตัวที่เพิ่ง add)
 */
export function toggleGroup(groupIds: readonly string[], selectedIds: readonly string[]): string[] {
  if (groupState(groupIds, selectedIds) === 'all') {
    const inGroup = new Set(groupIds);
    return selectedIds.filter((id) => !inGroup.has(id));
  }
  const selected = new Set(selectedIds);
  const missing = groupIds.filter((id) => !selected.has(id));
  return [...selectedIds, ...missing];
}
