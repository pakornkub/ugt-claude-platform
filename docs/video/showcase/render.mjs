// Render showcase.html (three.js + DOM) frame-by-frame to H.264 via ffmpeg.
// Serve docs/video over HTTP first (module imports):  npx http-server -p 8124 docs/video
// then (here, after `npm i`):  node render.mjs <startFrame> <endFrame> <out.mp4>    (FF=/path/to/ffmpeg if not on PATH)
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs'; import path from 'path';
const [, , startF, endF, out] = process.argv;
const FPS = 30, FF = process.env.FF || 'ffmpeg', PAGE = process.env.PAGE || 'http://127.0.0.1:8124/showcase/showcase.html';
const THREE_DIR = process.env.THREE_DIR || path.join(process.cwd(), 'node_modules/three');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => console.log('PAGEERR', e.message));
// serve three.js (build + addons) from node_modules instead of the CDN in the import map
await p.route('https://cdn.jsdelivr.net/npm/three@*/**', r => {
  const f = path.join(THREE_DIR, new URL(r.request().url()).pathname.replace(/^\/npm\/three@[^/]+\//, ''));
  r.fulfill({ body: fs.readFileSync(f), contentType: 'text/javascript' });
});
await p.addInitScript(() => { window.__RENDER = true; });
await p.goto(PAGE); await p.waitForFunction(() => window.__ready); await p.evaluate(() => window.__ready);
const ff = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let f = +startF; f < +endF; f++) {
  await p.evaluate(t => window.render(t), f / FPS);
  const buf = await p.screenshot({ type: 'jpeg', quality: 94 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 100 === 0) console.log(out, 'frame', f);
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
