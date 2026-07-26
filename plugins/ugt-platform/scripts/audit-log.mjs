#!/usr/bin/env node
// Audit trail — บันทึกทุก tool call ของ agent ลง .claude/logs/audit-<YYYY-MM-DD>.jsonl
//
// เรียกจาก hooks/hooks.json (PostToolUse / PostToolUseFailure / InstructionsLoaded)
// ทำงานเป็น shell command ล้วน ไม่เรียก LLM → ไม่กินโทเคนและไม่กิน context เลย
//
// **กฎสำคัญ: ห้าม log เนื้อหาไฟล์หรือ tool_input ทั้งก้อน** — input ของ Write/Edit
// มีโค้ดและอาจมี secret ปนอยู่ ถ้า dump ลงไฟล์ที่ไม่มีใครดูแลก็เท่ากับสร้างที่รั่ว
// ใหม่ขึ้นมาเอง เก็บแค่ metadata ที่พอสืบย้อนได้ว่า "ใครแตะอะไรเมื่อไหร่"
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CWD = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MAX_FIELD = 300;

function readStdin() {
  try {
    // fd 0 = stdin — hook payload มาเป็น JSON ก้อนเดียว
    return JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

const truncate = (v) => {
  if (typeof v !== 'string') return undefined;
  return v.length > MAX_FIELD ? `${v.slice(0, MAX_FIELD)}…(ตัด)` : v;
};

/** ดึงเฉพาะ field ที่ปลอดภัยพอจะเก็บ — ไม่เอา content / old_string / new_string */
function safeSummary(event) {
  const input = event.tool_input ?? {};
  const out = {};
  if (input.file_path) out.file = String(input.file_path).replace(CWD, '.');
  if (input.command) out.command = truncate(String(input.command));
  if (input.pattern) out.pattern = truncate(String(input.pattern));
  if (input.url) out.url = truncate(String(input.url));
  if (input.description) out.description = truncate(String(input.description));
  // Write/Edit: บอกแค่ขนาดที่เปลี่ยน ไม่เก็บตัวเนื้อหา
  for (const key of ['content', 'new_string']) {
    if (typeof input[key] === 'string') out.bytes = (out.bytes ?? 0) + input[key].length;
  }
  return out;
}

const event = readStdin();
const record = {
  ts: new Date().toISOString(),
  session: event.session_id ?? null,
  hook: event.hook_event_name ?? null,
  tool: event.tool_name ?? null,
  ...safeSummary(event),
};

// InstructionsLoaded — บันทึกว่า instruction ไฟล์ไหนถูกโหลดจริงเมื่อไหร่
// (ใช้ตอบคำถาม "ทำไม Claude ไม่ทำตามกฎ" ได้ตรงจุดที่สุด: กฎถูกโหลดหรือเปล่า)
if (event.file_path) record.instructions = String(event.file_path).replace(CWD, '.');
if (event.error) record.error = truncate(String(event.error));

try {
  const dir = join(CWD, '.claude', 'logs');
  mkdirSync(dir, { recursive: true });
  const day = record.ts.slice(0, 10);
  appendFileSync(join(dir, `audit-${day}.jsonl`), `${JSON.stringify(record)}\n`, 'utf8');
} catch {
  // hook ต้องไม่ทำให้ session พัง — เขียน log ไม่ได้ก็ปล่อยผ่านเงียบ ๆ
}

process.exit(0);
