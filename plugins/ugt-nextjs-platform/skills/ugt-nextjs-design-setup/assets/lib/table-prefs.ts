// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-design-setup/lib/table-prefs.ts
// kit-hash: 941d63a968fa
// source: ugt-hrms (port/adapt จาก gov-boi-smart) — installed by ugt-nextjs-design-setup (org UI kit)

// จำลำดับคอลัมน์และคอลัมน์ที่ซ่อนของตารางแต่ละหน้าไว้ใน localStorage
// port มาจาก gov-boi-smart `lib/table-prefs.ts` — เป็นรสนิยมของผู้ใช้
// ไม่ใช่ผลลัพธ์ข้อมูล จึงไม่ต้องอยู่ใน URL และไม่ต้องมีตาราง DB
//
// ปรับจากต้นทาง: รับ `defaultHidden` (มาจาก `initialColumnVisibility` ของ
// DataTable) — ตารางที่ยังไม่เคยบันทึก prefs จะได้เริ่มด้วยคอลัมน์ซ่อนชุดเดิม
// ไม่ใช่โชว์ทุกคอลัมน์
//
// localStorage เป็น external store จึงอ่านผ่าน useSyncExternalStore ไม่ใช่ setState ใน useEffect
// (React 19 ห้ามไว้ — eslint react-hooks/set-state-in-effect) · getServerSnapshot คืนลำดับ
// default ทำให้ SSR กับ hydrate ตรงกันเสมอ แล้วค่อยสลับเป็นค่าที่บันทึกไว้หลัง hydrate
import { useCallback, useSyncExternalStore } from 'react';

export interface TablePrefs {
  order: string[];
  hidden: string[];
}

export const prefsKey = (tableId: string) => `table-prefs:${tableId}`;

// คีย์ที่ไม่รู้จัก (เปลี่ยนคอลัมน์ทีหลัง) ถูกทิ้ง · คีย์ใหม่ต่อท้ายอัตโนมัติ
export function normalizeOrder(saved: unknown, keys: readonly string[]): string[] {
  const kept = Array.isArray(saved)
    ? saved.filter((k): k is string => typeof k === 'string' && keys.includes(k))
    : [];
  const unique = [...new Set(kept)];
  return [...unique, ...keys.filter((k) => !unique.includes(k))];
}

// ย้าย from ไปยังตำแหน่งของ to (pure) · ต้องจำ index ของ to ก่อนถอด from ออก
// ไม่งั้นตอนลากไปทางขวา index จะเลื่อนแล้วไปวางหน้า to แทนที่จะวางหลัง
export function moveKey(order: readonly string[], from: string, to: string): string[] {
  const next = [...order];
  if (from === to || !next.includes(from) || !next.includes(to)) return next;
  const target = next.indexOf(to);
  next.splice(next.indexOf(from), 1);
  next.splice(target, 0, from);
  return next;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener); // แท็บอื่นแก้ค่า
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

// React เรียก getSnapshot ทุก render — ต้องคืน reference เดิมเมื่อค่าดิบไม่เปลี่ยน
// ไม่งั้น re-render วนไม่จบ · เทียบด้วยสตริงดิบจึงจับได้ทั้งการเขียนของเราและของแท็บอื่น
const cache = new Map<string, { raw: string | null; value: TablePrefs }>();

function readPrefs(tableId: string, keysDep: string, hiddenDep: string): TablePrefs {
  const raw = localStorage.getItem(prefsKey(tableId));
  const cacheId = `${tableId}|${keysDep}|${hiddenDep}`;
  const hit = cache.get(cacheId);
  if (hit && hit.raw === raw) return hit.value;

  const keys = keysDep.split(',');
  let saved: { order?: unknown; hidden?: unknown } = {};
  try {
    saved = JSON.parse(raw ?? '{}') ?? {};
  } catch {
    saved = {}; // ค่าเสีย = ใช้ default การจำ setting ไม่สำคัญพอจะทำให้หน้าพัง
  }
  const value: TablePrefs = {
    order: normalizeOrder(saved.order, keys),
    hidden: Array.isArray(saved.hidden)
      ? saved.hidden.filter((k): k is string => typeof k === 'string' && keys.includes(k))
      : splitDep(hiddenDep),
  };
  cache.set(cacheId, { raw, value });
  return value;
}

// '' .split(',') ให้ [''] ไม่ใช่ [] — ต้องกันเอง
function splitDep(dep: string): string[] {
  return dep ? dep.split(',') : [];
}

// server ไม่มี localStorage — คืนลำดับ default (ต้อง cache ด้วย ไม่งั้น snapshot ไม่นิ่ง)
const defaults = new Map<string, TablePrefs>();

function readDefault(keysDep: string, hiddenDep: string): TablePrefs {
  const cacheId = `${keysDep}|${hiddenDep}`;
  const hit = defaults.get(cacheId);
  if (hit) return hit;
  const value: TablePrefs = { order: splitDep(keysDep), hidden: splitDep(hiddenDep) };
  defaults.set(cacheId, value);
  return value;
}

export function useTablePrefs(
  tableId: string,
  keys: readonly string[],
  defaultHidden: readonly string[] = []
) {
  // ponytail: ใช้ join(',') เป็น dep แทนการบังคับให้ caller memo array — คีย์คอลัมน์ห้ามมีจุลภาค
  const keysDep = keys.join(',');
  const hiddenDep = defaultHidden.join(',');
  const prefs = useSyncExternalStore(
    subscribe,
    useCallback(() => readPrefs(tableId, keysDep, hiddenDep), [tableId, keysDep, hiddenDep]),
    useCallback(() => readDefault(keysDep, hiddenDep), [keysDep, hiddenDep])
  );

  // localStorage คือ state จริง — เขียนไม่สำเร็จ = การตั้งค่านั้นไม่ถูกจำและหน้าจอไม่ขยับ
  const persist = (next: TablePrefs) => {
    try {
      localStorage.setItem(prefsKey(tableId), JSON.stringify(next));
    } catch {
      // โควตาเต็มหรือโหมดส่วนตัว — ยังใช้ตารางต่อได้ แค่ปรับคอลัมน์ไม่ติด
    }
    for (const listener of listeners) listener();
  };

  const move = (from: string, to: string) => {
    if (from === to) return;
    persist({ ...prefs, order: moveKey(prefs.order, from, to) });
  };

  const toggle = (key: string) =>
    persist({
      ...prefs,
      hidden: prefs.hidden.includes(key)
        ? prefs.hidden.filter((k) => k !== key)
        : [...prefs.hidden, key],
    });

  const reset = () => {
    try {
      localStorage.removeItem(prefsKey(tableId));
    } catch {
      // ลบไม่ได้ = ค่าเดิมยังอยู่ ผู้ใช้กดซ้ำได้
    }
    for (const listener of listeners) listener();
  };

  return { order: prefs.order, hidden: prefs.hidden, move, toggle, reset };
}
