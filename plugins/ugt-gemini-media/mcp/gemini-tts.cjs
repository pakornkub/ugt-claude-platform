#!/usr/bin/env node
// Minimal MCP server (stdio) for Gemini TTS. No dependencies — Node >= 18 (global fetch).
// ponytail: hand-rolled JSON-RPC instead of @modelcontextprotocol/sdk; switch to the SDK if we ever need resources/prompts/streaming.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');

const API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
const OUT_DIR = process.env.GEMINI_TTS_OUT_DIR || path.join(os.homedir(), 'gemini-tts');

const TOOL = {
  name: 'speak',
  description:
    'Convert text to speech with Gemini TTS and save it as a .wav file. Returns the file path. ' +
    'Style/tone can be steered in the text itself, e.g. "Say cheerfully: ...". Thai and English supported.',
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to speak (may start with a style instruction).' },
      voice: { type: 'string', description: 'Prebuilt voice name, e.g. Kore, Puck, Charon, Aoede, Fenrir, Leda, Zephyr. Default Kore.' },
      output_path: { type: 'string', description: `Absolute .wav path. Default: ${OUT_DIR}\\tts-<timestamp>.wav` },
      model: { type: 'string', description: `Default ${DEFAULT_MODEL}` },
    },
    required: ['text'],
  },
};

// Gemini returns raw 16-bit mono PCM @ 24 kHz — prepend a WAV header.
function pcmToWav(pcm, rate = 24000, channels = 1, bits = 16) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20);
  h.writeUInt16LE(channels, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE((rate * channels * bits) / 8, 28); h.writeUInt16LE((channels * bits) / 8, 32);
  h.writeUInt16LE(bits, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function speak({ text, voice = 'Kore', output_path, model = DEFAULT_MODEL }) {
  if (!API_KEY) throw new Error('GEMINI_API_KEY is not set');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`);
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error('No audio in response: ' + JSON.stringify(json).slice(0, 300));
  const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1]) || 24000;
  const wav = pcmToWav(Buffer.from(part.inlineData.data, 'base64'), rate);
  const out = output_path || path.join(OUT_DIR, `tts-${Date.now()}.wav`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, wav);
  return `Saved ${(wav.length / 1024).toFixed(0)} KB (${((wav.length - 44) / 2 / rate).toFixed(1)}s, voice ${voice}, ${model}) → ${out}`;
}

const send = (msg) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...msg }) + '\n');

readline.createInterface({ input: process.stdin }).on('line', async (line) => {
  let req;
  try { req = JSON.parse(line); } catch { return; }
  const { id, method, params } = req;
  if (id === undefined) return; // notifications need no reply
  try {
    if (method === 'initialize') {
      send({ id, result: {
        protocolVersion: params?.protocolVersion || '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'gemini-tts', version: '1.0.0' },
      } });
    } else if (method === 'tools/list') {
      send({ id, result: { tools: [TOOL] } });
    } else if (method === 'tools/call') {
      if (params?.name !== 'speak') throw new Error(`Unknown tool ${params?.name}`);
      try {
        send({ id, result: { content: [{ type: 'text', text: await speak(params.arguments || {}) }] } });
      } catch (e) {
        send({ id, result: { isError: true, content: [{ type: 'text', text: String(e.message || e) }] } });
      }
    } else if (method === 'ping') {
      send({ id, result: {} });
    } else {
      send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (e) {
    send({ id, error: { code: -32603, message: String(e.message || e) } });
  }
});
