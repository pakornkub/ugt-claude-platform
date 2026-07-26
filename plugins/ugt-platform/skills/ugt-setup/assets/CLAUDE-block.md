<!-- ugt:start — บล็อกนี้ `ugt-setup` เป็นเจ้าของและเขียนทับได้ทั้งก้อนตอน /plugin update
     เนื้อหาของโปรเจคเองให้เขียนไว้ *นอก* marker เท่านั้น ไม่งั้นจะหายตอนอัปเดต
     (HTML comment ถูกตัดออกก่อนเข้า context จึงไม่กินโทเคน) -->

## Stack

Next.js (App Router) · TypeScript · React · Prisma → SQL Server ·
Better Auth (SSO Keycloak / AD-LDAP / Local) · Vitest · Jenkins + SonarQube + Docker

ชื่อโปรเจค `<project-name>` · basePath prod `<base-path-prod>` · dev `<base-path-dev>`

## คำสั่งที่ใช้จริง

```bash
npm run dev            # พัฒนา
npm run build          # ต้องผ่านก่อน push เสมอ
npm run lint           # eslint
npm run format:check   # prettier (pipeline เรียกชื่อนี้ตรง ๆ)
npm run test:coverage  # vitest + coverage (Quality Gate ต้องการ ≥ 60% บนโค้ดใหม่)
```

## กฎที่ผิดแล้วพังทุกครั้ง

- `DATABASE_URL` อยู่ใน `prisma.config.ts` **ที่เดียว** — ห้ามใส่ `url` ใน `datasource` ของ `schema.prisma`
- ห้ามอ่าน `process.env` ตรง ๆ ใน app code — `import { env } from '@/lib/env'` เสมอ
  (ยกเว้น `lib/env.ts`, `*.config.ts` ที่ root, `instrumentation*.ts`, `sentry.*.config.ts`, ไฟล์ test)
- หลังแก้ `schema.prisma` ทุกครั้ง: `npx prisma migrate dev` → **แล้วต้อง** `npx prisma generate`
- ตารางใหม่: `@@map("PascalCaseพหูพจน์")` + ทุก field `@map("PascalCase")` + audit columns ครบ
  (`Id/CreatedAt/UpdatedAt/CreatedBy/UpdatedBy/IsActive/IsDeleted`) · ลบข้อมูลด้วย `IsDeleted = 1` ไม่ hard delete
- ห้ามใช้ชื่อคอลัมน์ที่ชนคำสงวน T-SQL (`key`, `value`, `group`, `count`, `order`) — เติมคำขยาย
- ทุก Server Action ที่มีสิทธิ์: **session → permission → action → audit log** ตามลำดับนี้
- ห้าม `$queryRawUnsafe` / `$executeRawUnsafe` กับ input ผู้ใช้ — ใช้ tagged template
- โค้ด TS/TSX ใหม่ต้องผ่าน SonarQube Quality Gate ตั้งแต่สแกนแรก (`new_violations = 0`)
  — `ugt-clean-code` โหลดเองเมื่อแตะไฟล์ `.ts`/`.tsx` ทำตามนั้น

## State ของทีม (commit ไปกับ repo)

@.claude/state/checkpoint.md

@.claude/state/project-notes.md

- **อ่านสองไฟล์นี้เป็นความจริงล่าสุด** — ถ้าขัดกับ auto memory ให้ยึดไฟล์เหล่านี้
  (auto memory อยู่บนเครื่องคนเดียว ไม่ได้แชร์กับทีม)
- **จบงานทุกครั้งให้เรียก `/ugt-checkpoint`** เพื่ออัปเดต แล้ว commit ไปด้วย
- เจอ error ที่เสียเวลาแก้ → บันทึกลง Error Patterns ใน `project-notes.md` ทันทีตอนที่ยังจำรายละเอียดได้
- เก็บสองไฟล์นี้ให้สั้น (ไฟล์ละไม่เกิน ~100 บรรทัด) เพราะมันถูกโหลดเข้า context ทุก session

## จะเรียก skill ไหนเมื่อไหร่

| งาน | ทำอย่างไร |
| --- | --- |
| ติดตั้ง/แก้โครงสร้างพื้นฐาน (DB, auth, test/lint, CI, deploy) | เรียก `ugt-*` ที่ตรงเรื่องนั้น **ตรง ๆ** — มันมี interview ของตัวเองอยู่แล้ว ไม่ต้องผ่าน brainstorming |
| พัฒนา feature ใหม่ / แก้บั๊ก | เข้า pipeline ของ superpowers ตามปกติ (brainstorming → plan → TDD → review) |
| เขียน/แก้ไฟล์ `.ts`/`.tsx` | `ugt-clean-code` โหลดเองจาก `paths` — ไม่ต้องเรียก |
| จบงาน / ส่งต่อ session | `/ugt-checkpoint` |

## ความรู้ใหม่ไปไว้ที่ไหน

- จริงเฉพาะโปรเจคนี้ → `.claude/state/project-notes.md` หรือ `.claude/rules/<project>-*.md`
- จริงกับทุกโปรเจคที่ใช้ stack เดียวกัน → **เปิด PR เข้ารีโป `ugt-claude-platform`** ไม่ใช่แก้ไฟล์ skill
  ที่ติดตั้งมา (มันอยู่ใน plugin cache ที่จะถูกลบตอน update)
- ห้ามสร้าง `.claude/skills/ugt-<ชื่อเดิม>/` ทับ skill ของ platform — ถ้าต้อง extend ให้ตั้งชื่อใหม่

<!-- ugt:end -->
