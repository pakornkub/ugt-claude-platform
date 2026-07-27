#!/usr/bin/env node
// Audit trail — appends every agent tool call to .claude/logs/audit-<YYYY-MM-DD>.jsonl
//
// Invoked from hooks/hooks.json (PostToolUse / PostToolUseFailure / InstructionsLoaded).
// Pure shell command, no LLM call → zero tokens, zero context cost.
//
// **Key rule: never log file contents or the whole tool_input** — Write/Edit
// inputs contain code and possibly secrets; dumping them into an unattended
// file creates a brand-new leak. Keep only the metadata needed to trace
// "who touched what, when".
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CWD = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MAX_FIELD = 300;

function readStdin() {
  try {
    // fd 0 = stdin — the hook payload arrives as one JSON blob
    return JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

const truncate = (v) => {
  if (typeof v !== 'string') return undefined;
  return v.length > MAX_FIELD ? `${v.slice(0, MAX_FIELD)}…(truncated)` : v;
};

/** Extract only fields safe to keep — never content / old_string / new_string */
function safeSummary(event) {
  const input = event.tool_input ?? {};
  const out = {};
  if (input.file_path) out.file = String(input.file_path).replace(CWD, '.');
  if (input.command) out.command = truncate(String(input.command));
  if (input.pattern) out.pattern = truncate(String(input.pattern));
  if (input.url) out.url = truncate(String(input.url));
  if (input.description) out.description = truncate(String(input.description));
  // Write/Edit: record only the size of the change, never the content
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

// InstructionsLoaded — records which instruction file loaded, and when.
// This answers "why didn't Claude follow the rule" at its root: did the rule load at all?
if (event.file_path) record.instructions = String(event.file_path).replace(CWD, '.');
if (event.error) record.error = truncate(String(event.error));

try {
  const dir = join(CWD, '.claude', 'logs');
  mkdirSync(dir, { recursive: true });
  const day = record.ts.slice(0, 10);
  appendFileSync(join(dir, `audit-${day}.jsonl`), `${JSON.stringify(record)}\n`, 'utf8');
} catch {
  // A hook must never break the session — if the log can't be written, stay silent.
}

process.exit(0);
