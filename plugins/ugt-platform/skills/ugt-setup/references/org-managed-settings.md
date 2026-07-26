# Hard Boundary ระดับองค์กร — เอกสารสำหรับทีม IT (ไม่ใช่ของที่ `/ugt-setup` ติดตั้ง)

> **อ่านก่อน**: ไฟล์นี้เป็นรายการที่ต้องขอจาก IT/ผู้ดูแลเครื่อง — skill ติดตั้งให้ไม่ได้
> เพราะต้องเขียนไฟล์ในพื้นที่ระบบของทุกเครื่องและแจกด้วย MDM/Group Policy/Ansible
> ตราบใดที่ยังไม่ได้ deploy สิ่งเหล่านี้ **ถือว่ายังไม่มี hard boundary** อย่าเข้าใจผิดว่ามีแล้ว

## ทำไมต้องเป็นระดับ managed

กฎที่เขียนใน `CLAUDE.md` หรือใน skill เป็น **คำขอ** ไม่ใช่การบังคับ — doc ของ Claude Code
ระบุตรงว่า *"Settings rules are enforced by the client regardless of what Claude decides to
do. CLAUDE.md instructions shape Claude's behavior but are not a hard enforcement layer"*

`managed-settings.json` เป็นชั้นเดียวที่ **user และ project override ไม่ได้** — และ managed
CLAUDE.md เป็นไฟล์เดียวที่ `claudeMdExcludes` ตัดออกไม่ได้

## ตำแหน่งไฟล์

| OS | path |
| --- | --- |
| Windows | `C:\Program Files\ClaudeCode\managed-settings.json` |
| macOS | `/Library/Application Support/ClaudeCode/managed-settings.json` |
| Linux / WSL | `/etc/claude-code/managed-settings.json` |

managed CLAUDE.md วางที่โฟลเดอร์เดียวกันในชื่อ `CLAUDE.md` หรือใส่เนื้อหาลงคีย์ `claudeMd`
ใน `managed-settings.json` ตรง ๆ ก็ได้ (คีย์นี้ถูกอ่านเฉพาะใน managed/policy settings เท่านั้น)

## Template ที่เสนอให้เริ่ม

```json
{
  "permissions": {
    "deny": [
      "Read(.env.production)",
      "Read(//**/id_rsa)",
      "Read(~/.aws/**)",
      "Read(~/.ssh/**)",
      "Bash(git push --force*)",
      "Bash(git push -f *)",
      "Bash(curl * | sh)",
      "Bash(curl * | bash)"
    ]
  },
  "extraKnownMarketplaces": {
    "ugt": {
      "source": { "source": "github", "repo": "<org>/ugt-claude-platform" }
    }
  },
  "enabledPlugins": {
    "ugt-standard@ugt": true
  },
  "claudeMd": "ห้าม commit secret ลง git ทุกกรณี · ต้องรัน npm run build ผ่านก่อน push · ข้อมูลพนักงานเป็นข้อมูลส่วนบุคคลตาม PDPA ห้ามส่งออกนอกระบบขององค์กร"
}
```

ผลที่ได้:

- **deny** — กฎที่ client บังคับเอง ไม่ผ่านการตัดสินใจของโมเดล และโปรเจคปิดไม่ได้
- **extraKnownMarketplaces + enabledPlugins** — ทุกเครื่องได้ `ugt-standard` โดยไม่ต้องให้
  แต่ละคนไปรัน `/plugin marketplace add` เอง
- **claudeMd** — ข้อความที่อยู่ในทุก session ของทุกโปรเจคบนเครื่องนั้น และ user ตัดออกไม่ได้

## ตัวเลือกเพิ่มที่ควรพิจารณา

| คีย์ | ทำอะไร | ควรใช้เมื่อ |
| --- | --- | --- |
| `sandbox.enabled` | บังคับ sandbox isolation | ต้องการจำกัดไม่ให้ agent ออกนอก scope ของโปรเจค |
| `strictKnownMarketplaces` | จำกัดว่าเพิ่ม marketplace อื่นไม่ได้ | ต้องการให้ติดตั้งได้เฉพาะ plugin ที่องค์กรตรวจแล้ว (ต้องใส่คู่กับ `extraKnownMarketplaces` เพราะตัวมันเองไม่ได้ลงทะเบียน marketplace ให้) |
| `forceLoginMethod` / `forceLoginOrgUUID` | ล็อกวิธี login และ org | ต้องการกันการใช้บัญชีส่วนตัวทำงานของบริษัท |

## สิ่งที่ยังทำไม่ได้ด้วย managed settings

**Audit trail ระดับองค์กร** — `managed-settings.json` ไม่มีคีย์สำหรับส่ง log ออกนอกเครื่อง
ปัจจุบัน `ugt-platform` เขียน audit log ลง `.claude/logs/audit-<วันที่>.jsonl` ในโปรเจค
(ผ่าน hook `PostToolUse` / `PostToolUseFailure` / `InstructionsLoaded`) ถ้าองค์กรต้องการ
รวม log ไว้ที่เดียว ต้องเพิ่ม hook ที่ยิง `type: "http"` ไปยัง endpoint กลาง ซึ่งเป็นงาน
เฟสถัดไปและต้องมีคนดูแล endpoint นั้น

## Checklist สำหรับ IT

- [ ] เลือกชุด `permissions.deny` ที่จะบังคับ (เริ่มจาก template ข้างบน)
- [ ] ตัดสินใจว่าจะเปิด `sandbox.enabled` และ `strictKnownMarketplaces` ไหม
- [ ] เขียน `managed-settings.json` แล้วแจกด้วย MDM / Group Policy / Ansible
- [ ] ทดสอบบนเครื่องตัวอย่าง: `claude` แล้วดูว่า deny ทำงาน (สั่งสิ่งที่ถูก deny ต้องถูกบล็อก)
      และ `/plugin` แสดง `ugt-standard` ว่าติดตั้งแล้ว
- [ ] ประกาศให้ทีมทราบว่ามีกฎอะไรบังคับอยู่ — กฎที่ไม่มีใครรู้จะถูกเข้าใจว่าเป็นบั๊ก
