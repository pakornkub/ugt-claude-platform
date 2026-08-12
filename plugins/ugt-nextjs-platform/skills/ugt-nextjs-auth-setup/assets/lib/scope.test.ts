// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-auth-setup/lib/scope.test.ts
// kit-hash: 0b9fb2044ef4
// installed by ugt-nextjs-auth-setup alongside lib/scope.ts
// ทดสอบเฉพาะส่วนที่บริสุทธิ์ — การไล่สายบังคับบัญชาและด่านตัดสินใจ
// (ส่วนที่แตะฐานข้อมูลไม่ทดสอบที่นี่ ต้องเจอของจริงถึงจะมีความหมาย)
import { describe, expect, it } from 'vitest';
import { collectSubtreeEmpCodes, isEmpCodeAllowed, scopeWhere, type DataScope } from './scope';

const scope = (over: Partial<DataScope> = {}): DataScope => ({
  viewAll: false,
  ownEmpCode: 'E001',
  ownOrgCode: 'ORG1',
  subordinateEmpCodes: [],
  ...over,
});

describe('collectSubtreeEmpCodes', () => {
  const edges = [
    { empCode: 'E002', superEmpCode: 'E001' },
    { empCode: 'E003', superEmpCode: 'E002' },
    { empCode: 'E004', superEmpCode: 'E001' },
    { empCode: 'E999', superEmpCode: 'X' }, // คนละสาย
  ];

  it('เก็บลูกน้องทั้งสาย ไม่ใช่แค่ชั้นแรก', () => {
    expect(collectSubtreeEmpCodes(edges, 'E001').sort()).toEqual(['E002', 'E003', 'E004']);
  });

  it('ไม่รวมตัวเอง — ไม่งั้น isEmpCodeAllowed จะผ่านด้วยเหตุผลผิด', () => {
    expect(collectSubtreeEmpCodes(edges, 'E001')).not.toContain('E001');
  });

  it('วนเป็นวงก็ไม่ค้าง (ข้อมูล HR จริงมีเคสคีย์ผิดจนเป็นวง)', () => {
    const cyclic = [
      { empCode: 'A', superEmpCode: 'B' },
      { empCode: 'B', superEmpCode: 'A' },
    ];
    expect(collectSubtreeEmpCodes(cyclic, 'A')).toEqual(['B']);
  });

  it('หัวหน้าว่าง (null) ไม่ทำให้เกิดสายลอย', () => {
    expect(collectSubtreeEmpCodes([{ empCode: 'E002', superEmpCode: null }], 'E001')).toEqual([]);
  });
});

describe('isEmpCodeAllowed', () => {
  it('viewAll ผ่านทุกกรณี', () => {
    expect(isEmpCodeAllowed(scope({ viewAll: true }), 'E999')).toBe(true);
  });

  it('ตัวเองผ่าน คนอื่นไม่ผ่าน', () => {
    expect(isEmpCodeAllowed(scope(), 'E001')).toBe(true);
    expect(isEmpCodeAllowed(scope(), 'E002')).toBe(false);
  });

  it('ลูกน้องผ่าน', () => {
    expect(isEmpCodeAllowed(scope({ subordinateEmpCodes: ['E002'] }), 'E002')).toBe(true);
  });

  it('บัญชีที่ยังไม่ผูกพนักงาน เห็นอะไรไม่ได้เลย และค่าว่างไม่ใช่กุญแจผ่าน', () => {
    expect(isEmpCodeAllowed(scope({ ownEmpCode: null }), 'E001')).toBe(false);
    expect(isEmpCodeAllowed(scope({ ownEmpCode: null }), '')).toBe(false);
  });
});

describe('scopeWhere', () => {
  it('viewAll ไม่ใส่เงื่อนไข', () => {
    expect(scopeWhere(scope({ viewAll: true }))).toEqual({});
  });

  it('จำกัดเป็นตัวเอง + ลูกน้อง', () => {
    expect(scopeWhere(scope({ subordinateEmpCodes: ['E002'] }))).toEqual({
      empCode: { in: ['E001', 'E002'] },
    });
  });

  it('ไม่ผูกพนักงาน → in: [] คือศูนย์แถว ไม่ใช่ทุกแถว', () => {
    expect(scopeWhere(scope({ ownEmpCode: null }))).toEqual({ empCode: { in: [] } });
  });
});
